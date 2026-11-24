// Apply the committed Drizzle migrations in web/drizzle/ to DATABASE_URL.
// Migrations are forward-only (AGENTS.md section 6). Exits non-zero on failure.
//
//   DATABASE_URL=postgres://localhost/feltprep_dev pnpm run db:migrate

import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
try {
	await migrate(drizzle({ client: pool }), {
		migrationsFolder: resolve(import.meta.dirname, '..', 'drizzle')
	});
	console.log('Migrations applied; the database is up to date.');
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	await pool.end();
}
