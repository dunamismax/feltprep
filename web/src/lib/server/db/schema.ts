// Drizzle schema for learner state only (A-6): guests and their stored
// practice hands (P3.5b). Lessons and solutions never live here.
//
// Everything is in schema `app`. In production the host's provisioner creates
// it, owned by feltprep_owner, and the web role reaches its tables through the
// owner's default privileges; locally the first migration creates it. Keys are
// UUIDs drawn by the database, so the web role needs no sequence rights.
//
// After changing this file, run `pnpm run db:generate`, review the SQL and
// commit it under web/drizzle/. Migrations are forward-only and run while the
// previous release still serves (AGENTS.md section 6).

import {
	index,
	integer,
	jsonb,
	pgSchema,
	smallint,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';

export const app = pgSchema('app');

/**
 * A guest (Q-4: no sign-in). The browser holds a random 32-byte token in an
 * HTTP-only cookie; only its SHA-256 is stored, so a database copy cannot be
 * turned back into anyone's cookie.
 */
export const guests = app.table('guests', {
	id: uuid('id').primaryKey().defaultRandom(),
	tokenHash: text('token_hash').notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/** A finished short-stack practice hand, as the engine's versioned hand history. */
export const practiceHands = app.table(
	'practice_hands',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		guestId: uuid('guest_id')
			.notNull()
			.references(() => guests.id, { onDelete: 'cascade' }),
		/** The browser's key for the hand ("<seed>:<number>"), so a retry stores it once. */
		clientKey: text('client_key').notNull(),
		/** The hand-history document's format (engine/history.ts FORMAT). */
		historyFormat: smallint('history_format').notNull(),
		history: jsonb('history').notNull(),
		/** Effective stack in big blinds. */
		stack: smallint('stack').notNull(),
		/** The engine seat the player sat in. */
		playerSeat: smallint('player_seat').notNull(),
		/** The player's result in chips (a big blind is 100). */
		netChips: integer('net_chips').notNull(),
		storedAt: timestamp('stored_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		unique('practice_hands_guest_key').on(table.guestId, table.clientKey),
		index('practice_hands_guest_stored_idx').on(table.guestId, table.storedAt)
	]
);
