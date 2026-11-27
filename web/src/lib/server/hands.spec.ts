// Stored hands against a real PostgreSQL 18 database. Runs only when
// TEST_DATABASE_URL names a scratch database it may migrate and write to;
// CI has no database, so there it is skipped (AGENTS.md section 7).

import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { historyFromDict, replay } from '../engine/history.ts';
import { Action } from '../engine/state.ts';
import { newPracticeSession, nextHand, takeAction } from '../practice/table.ts';
import { checkUpload, uploadOf, type CheckedHand } from '../practice/upload.ts';
import * as schema from './db/schema.ts';
import { handsOf, isGuestToken, newGuestToken, storeHand, tokenHash } from './hands.ts';
import { jamOrFoldAt } from './solutions.ts';

const url = process.env.TEST_DATABASE_URL;

describe('guest tokens', () => {
	it('are 32 random bytes in base64url, stored only as their SHA-256', () => {
		const token = newGuestToken();
		expect(isGuestToken(token)).toBe(true);
		expect(newGuestToken()).not.toBe(token);
		expect(tokenHash(token)).toMatch(/^[0-9a-f]{64}$/);
		expect(isGuestToken('short')).toBe(false);
		expect(isGuestToken(undefined)).toBe(false);
	});
});

describe.skipIf(!url)('stored practice hands (TEST_DATABASE_URL)', () => {
	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle({ client: pool, schema });
	const tokens = [newGuestToken(), newGuestToken()];

	async function checkedHand(seed: number): Promise<CheckedHand> {
		const solution = await jamOrFoldAt(10);
		let session = newPracticeSession(10, seed);
		session = takeAction(solution, session, Action.fold());
		session = nextHand(solution, session);
		const result = checkUpload(JSON.parse(JSON.stringify(uploadOf(session, session.finished[0]))));
		if (!result.ok) throw new Error(result.error);
		return result.hand;
	}

	beforeAll(async () => {
		await migrate(db, {
			migrationsFolder: resolve(import.meta.dirname, '../../../drizzle'),
			migrationsSchema: 'drizzle',
			migrationsTable: '__drizzle_migrations'
		});
	});

	afterAll(async () => {
		for (const token of tokens) {
			await db.execute(sql`delete from app.guests where token_hash = ${tokenHash(token)}`);
		}
		await pool.end();
	});

	it('stores a hand once per key and replays it from the database', async () => {
		const hand = await checkedHand(0);
		expect(await storeHand(db, tokens[0], hand)).toBe('stored');
		expect(await storeHand(db, tokens[0], hand)).toBe('duplicate');
		const rows = await handsOf(db, tokens[0]);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			clientKey: hand.key,
			historyFormat: 1,
			stack: 10,
			playerSeat: hand.player,
			netChips: hand.netChips
		});
		const state = replay(historyFromDict(rows[0].history));
		expect(state.result).not.toBeNull();
	});

	it('keeps each guest’s hands apart', async () => {
		const hand = await checkedHand(0);
		expect(await storeHand(db, tokens[1], hand)).toBe('stored');
		expect(await handsOf(db, tokens[1])).toHaveLength(1);
		expect(await handsOf(db, newGuestToken())).toEqual([]);
	});

	it('keeps no token in the database, only its hash', async () => {
		const { rows } = await pool.query<{ n: number }>(
			'select count(*)::int as n from app.guests where token_hash = $1 or token_hash = $2',
			[tokens[0], tokenHash(tokens[0])]
		);
		expect(rows[0].n).toBe(1);
		const raw = await pool.query('select 1 from app.guests where token_hash = $1', [tokens[0]]);
		expect(raw.rowCount).toBe(0);
	});
});
