// Stored practice hands under a guest identity (P3.5b, Q-4's default of no
// sign-in). The guest's browser holds a random 32-byte token in an HTTP-only
// cookie; the database keeps only the token's SHA-256. The token is never
// signed because nothing about it needs vouching for: it is unguessable, and
// it names nothing but the guest's own hands.

import { createHash, randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { FORMAT as HISTORY_FORMAT } from '../engine/history.ts';
import type { CheckedHand } from '../practice/upload.ts';
import * as schema from './db/schema.ts';

const { guests, practiceHands } = schema;
type Db = NodePgDatabase<typeof schema>;

export const GUEST_COOKIE = 'feltprep_guest';
/** About 13 months, the longest a browser keeps a cookie. */
export const GUEST_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export function newGuestToken(): string {
	return randomBytes(32).toString('base64url');
}

export function isGuestToken(token: string | undefined): token is string {
	return token !== undefined && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function tokenHash(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/** The guest's id for `token`, creating the guest on first use. */
export async function guestId(db: Db, token: string): Promise<string> {
	const hash = tokenHash(token);
	const created = await db
		.insert(guests)
		.values({ tokenHash: hash })
		.onConflictDoNothing({ target: guests.tokenHash })
		.returning({ id: guests.id });
	if (created.length) return created[0].id;
	const [found] = await db.select({ id: guests.id }).from(guests).where(eq(guests.tokenHash, hash));
	return found.id;
}

/** Store a checked hand for the guest; a second upload of the same key stores nothing. */
export async function storeHand(
	db: Db,
	token: string,
	hand: CheckedHand
): Promise<'stored' | 'duplicate'> {
	const guest = await guestId(db, token);
	const inserted = await db
		.insert(practiceHands)
		.values({
			guestId: guest,
			clientKey: hand.key,
			historyFormat: HISTORY_FORMAT,
			history: hand.history,
			stack: hand.stack,
			playerSeat: hand.player,
			netChips: hand.netChips
		})
		.onConflictDoNothing({ target: [practiceHands.guestId, practiceHands.clientKey] })
		.returning({ id: practiceHands.id });
	return inserted.length ? 'stored' : 'duplicate';
}

/** The guest's stored hands, newest first. */
export async function handsOf(db: Db, token: string) {
	const [guest] = await db
		.select({ id: guests.id })
		.from(guests)
		.where(eq(guests.tokenHash, tokenHash(token)));
	if (!guest) return [];
	return db
		.select()
		.from(practiceHands)
		.where(eq(practiceHands.guestId, guest.id))
		.orderBy(desc(practiceHands.storedAt));
}
