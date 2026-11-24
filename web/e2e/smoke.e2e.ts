import { expect, test } from '@playwright/test';

test('the home page names FeltPrep and says it is in development', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/FeltPrep/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeltPrep');
	await expect(page.getByText('in development', { exact: false })).toBeVisible();
});

test('nothing on the home page scrolls sideways', async ({ page }) => {
	await page.goto('/');
	const overflow = await page.evaluate(() => {
		const root = document.documentElement;
		return root.scrollWidth - root.clientWidth;
	});
	expect(overflow).toBe(0);
});

test('/healthz reports status and revision without a database', async ({ request }) => {
	const response = await request.get('/healthz');
	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBe('no-store');
	const body = (await response.json()) as Record<string, unknown>;
	expect(body.status).toBe('ok');
	expect(body.database).toBe('not configured');
	expect(body.revision).toMatch(/^([0-9a-f]{40}(-dirty)?|unknown)$/);
});
