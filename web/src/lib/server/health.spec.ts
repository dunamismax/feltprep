import { describe, expect, it } from 'vitest';
import { checkHealth } from './health.ts';

describe('checkHealth', () => {
	it('is healthy with no database configured', async () => {
		expect(await checkHealth('abc123', undefined)).toEqual({
			status: 'ok',
			revision: 'abc123',
			database: 'not configured'
		});
	});

	it('is healthy when the database answers', async () => {
		expect(await checkHealth('abc123', () => Promise.resolve(1))).toEqual({
			status: 'ok',
			revision: 'abc123',
			database: 'ok'
		});
	});

	it('reports an error when the database fails', async () => {
		const report = await checkHealth('abc123', () => Promise.reject(new Error('refused')));
		expect(report).toEqual({ status: 'error', revision: 'abc123', database: 'error' });
	});

	it('reports an error when the database does not answer in time', async () => {
		const report = await checkHealth('abc123', () => new Promise(() => {}), 20);
		expect(report.database).toBe('error');
		expect(report.status).toBe('error');
	});
});
