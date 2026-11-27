// Apply the committed Drizzle migrations to DATABASE_URL. Migrations are
// forward-only and run while the previous release still serves, so each one
// must leave that release working (AGENTS.md section 6).
//
//   pnpm run db:migrate                          local development (web/.env)
//   node scripts/db-migrate.ts                   in a release, run by deploy/cutover.sh
//   node scripts/db-migrate.ts --check           read the migrations only; no database
//   node scripts/db-migrate.ts [--check] DIR     another migrations folder (default ../drizzle)
//
// Environment:
//   DATABASE_URL   the role that runs migrations (production: feltprep_migration)
//   DB_OWNER_ROLE  optional; the migration runs `SET ROLE` to it first, so every
//                  table belongs to the owner and the web role gets its rights
//                  through the owner's default privileges (the host's role model)
//
// Bookkeeping lives in drizzle.__drizzle_migrations, as on every site on the
// host. Plain Node runs this file with production dependencies only (pg and
// drizzle-orm are `dependencies` for that reason). Exits non-zero on failure.

import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

function fail(message: string): never {
	console.error(`migrate: ${message}`);
	process.exit(1);
}

const args = process.argv.slice(2);
const checkOnly = args[0] === '--check';
const rest = checkOnly ? args.slice(1) : args;
if (rest.length > 1) fail('usage: db-migrate.ts [--check] [MIGRATIONS_FOLDER]');
const migrationsFolder = rest[0] ?? resolve(import.meta.dirname, '..', 'drizzle');

const config = {
	migrationsFolder,
	migrationsSchema: 'drizzle',
	migrationsTable: '__drizzle_migrations'
};

// Fails on a missing journal or migration file, which is what --check is for.
let count: number;
try {
	count = readMigrationFiles(config).length;
} catch (error) {
	fail(`${migrationsFolder}: ${error instanceof Error ? error.message : String(error)}`);
}
if (checkOnly) {
	console.log(`migrate: ${count} migration(s) in ${migrationsFolder}`);
	process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is not set');
const owner = process.env.DB_OWNER_ROLE;
if (owner !== undefined && !/^[a-z_][a-z0-9_]*$/.test(owner)) fail('invalid DB_OWNER_ROLE');

// One connection, so SET ROLE applies to every statement the migrator runs.
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
try {
	await client.connect();
	if (owner) await client.query(`set role ${client.escapeIdentifier(owner)}`);
	await migrate(drizzle({ client }), config);
	const { rows } = await client.query<{ applied: number }>(
		'select count(*)::int as applied from drizzle.__drizzle_migrations'
	);
	console.log(`migrate: ${rows[0].applied} of ${count} migration(s) in the database`);
} catch (error) {
	fail(error instanceof Error ? error.message : String(error));
} finally {
	await client.end().catch(() => {});
}
