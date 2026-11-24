import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import { DATABASE_URL } from '$app/env/private';

export type Database = NodePgDatabase<typeof schema>;

let instance: Database | undefined;

/** Whether a database is configured. The app runs without one. */
export function hasDatabase(): boolean {
	return DATABASE_URL !== undefined;
}

/**
 * The shared Drizzle client over a `pg` pool, created on first use, so that
 * building and serving pages never needs a database.
 */
export function getDb(): Database {
	if (!instance) {
		if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
		const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
		// Without a listener, an idle connection that breaks would end the process.
		pool.on('error', (error) => console.error('database pool:', error.message));
		// adapter-node emits this once the HTTP server has closed on SIGTERM.
		process.once('sveltekit:shutdown', () => void pool.end());
		instance = drizzle({ client: pool, schema });
	}
	return instance;
}
