import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`the style page in the ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('shows every token at AA contrast and the whole deck, within the CSP and the width', async ({
			page
		}) => {
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.addInitScript(() => {
				document.addEventListener('securitypolicyviolation', (event) => {
					throw new Error(`Content Security Policy violation: ${event.violatedDirective}`);
				});
			});
			await page.goto('/style');
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Style');
			await expect(page.getByTestId('contrast-summary')).toHaveText(/^All \d+ pass$/);
			await expect(page.getByTestId('deck').getByRole('img')).toHaveCount(52);
			await expect(page.getByRole('img', { name: 'Ten of diamonds' }).first()).toBeVisible();
			await expect(page.getByRole('img', { name: 'Face-down card' })).toBeVisible();
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBe(0);
			expect(errors).toEqual([]);
		});
	});
}
