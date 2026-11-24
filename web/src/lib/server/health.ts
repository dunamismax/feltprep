export type DatabaseHealth = 'ok' | 'error' | 'not configured';

export interface HealthReport {
	status: 'ok' | 'error';
	revision: string;
	database: DatabaseHealth;
}

/**
 * Report the app's health. With no database configured the app is healthy,
 * since nothing needs one yet. With one, `ping` must succeed within
 * `timeoutMs`. Never throws: a failure or a timeout becomes an `error` report.
 */
export async function checkHealth(
	revision: string,
	ping: (() => Promise<unknown>) | undefined,
	timeoutMs = 3000
): Promise<HealthReport> {
	if (!ping) return { status: 'ok', revision, database: 'not configured' };

	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error('database ping timed out')), timeoutMs);
	});
	try {
		await Promise.race([ping(), timeout]);
		return { status: 'ok', revision, database: 'ok' };
	} catch {
		return { status: 'error', revision, database: 'error' };
	} finally {
		clearTimeout(timer);
	}
}
