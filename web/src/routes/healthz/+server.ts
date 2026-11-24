import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { version } from '$app/env';
import { getDb, hasDatabase } from '#lib/server/db/index.ts';
import { checkHealth } from '#lib/server/health.ts';
import type { RequestHandler } from './$types';

// Answered on every request, never prerendered.
export const prerender = false;

// Liveness and readiness probe: 200 with {"status","revision","database"}
// while healthy, 503 when a configured database does not answer. The revision
// is the commit the app was built from (vite.config.ts).
export const GET: RequestHandler = async () => {
	const ping = hasDatabase() ? () => getDb().execute(sql`select 1`) : undefined;
	const report = await checkHealth(version, ping);
	return json(report, {
		status: report.status === 'ok' ? 200 : 503,
		headers: { 'cache-control': 'no-store' }
	});
};
