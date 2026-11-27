import { expect, test } from '@playwright/test';

test('the home page names FeltPrep and says it is in development', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/FeltPrep/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeltPrep');
	await expect(page.getByText('in development', { exact: false })).toBeVisible();
	await page.getByRole('link', { name: /Jam or fold, heads-up/ }).click();
	await expect(page).toHaveURL(/\/study\/jam-or-fold\/10$/);
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

test('the home page sends a strict Content Security Policy and breaks none of it', async ({
	page
}) => {
	const violations: string[] = [];
	page.on('console', (message) => {
		if (/content.security.policy|refused to/i.test(message.text())) violations.push(message.text());
	});
	await page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (event) => {
			console.error(`Content Security Policy violation: ${event.violatedDirective}`);
		});
	});
	const response = await page.goto('/');
	const policy = response?.headers()['content-security-policy'] ?? '';
	expect(policy).toContain("default-src 'self'");
	expect(policy).toContain("object-src 'none'");
	expect(policy).toContain("frame-ancestors 'none'");
	expect(policy).not.toContain('unsafe-inline');
	// SvelteKit's inline start-up script ran: it defines this global.
	await expect
		.poll(() =>
			page.evaluate(() => Object.keys(window).some((key) => key.startsWith('__sveltekit_')))
		)
		.toBe(true);
	expect(violations).toEqual([]);
});
