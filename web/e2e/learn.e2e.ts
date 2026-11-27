// P3.2: the first lesson, read on a phone and a desktop in both themes, with
// its license, its links to the study view and the drill, and the way back
// to it from a graded decision.

import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`the first lesson in the ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('reads within the width and the CSP, states its license and its limits', async ({
			page
		}) => {
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.addInitScript(() => {
				document.addEventListener('securitypolicyviolation', (event) => {
					throw new Error(`Content Security Policy violation: ${event.violatedDirective}`);
				});
			});
			await page.goto('/learn/jam-or-fold-10bb');
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				'Jam or fold: heads-up at 10 big blinds'
			);
			const lesson = page.getByTestId('lesson');
			await expect(lesson.getByRole('heading', { level: 2 }).first()).toHaveText('The spot');
			await expect(lesson).toContainText('only jam or fold');
			await expect(lesson).toContainText('limp or make a smaller raise');
			const license = page.getByTestId('lesson-license');
			await expect(license).toContainText('CC-BY-SA-4.0');
			await expect(
				license.getByRole('link', {
					name: 'Creative Commons Attribution-ShareAlike 4.0 International'
				})
			).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/');
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBe(0);
			expect(errors).toEqual([]);
		});
	});
}

test('the lesson leads to its study view and its drill, and the list leads to it', async ({
	page
}) => {
	await page.goto('/');
	await page.getByRole('link', { name: /Learn/ }).click();
	await expect(page).toHaveURL(/\/learn\/jam-or-fold-10bb$/);
	await page.goto('/learn');
	await page.getByRole('link', { name: /Jam or fold: heads-up at 10 big blinds/ }).click();
	const spots = page.getByTestId('lesson-spots');
	await expect(spots.getByRole('link', { name: 'Study' })).toHaveCount(2);
	await spots.getByRole('link', { name: 'Drill' }).first().click();
	await expect(page).toHaveURL(/\/drill\/jam-or-fold\/10\?seat=button$/);
	await expect(page.getByTestId('prompt')).toContainText('on the button with 10 big blinds');

	await page.goto('/learn/jam-or-fold-10bb');
	await page
		.getByTestId('lesson')
		.getByRole('link', { name: /big blind.s chart/ })
		.click();
	await expect(page).toHaveURL(/\/study\/jam-or-fold\/10#big-blind$/);
	expect((await page.goto('/learn/no-such-lesson'))?.status()).toBe(404);
});

test('graded feedback links back to the lesson for its spot', async ({ page }) => {
	await page.goto('/drill/jam-or-fold/10?seed=23&seat=button');
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 20');
	await page.locator('[data-place="all-in"]').click();
	await page.getByTestId('lesson-link').click();
	await expect(page).toHaveURL(/\/learn\/jam-or-fold-10bb$/);

	// At 10 big blinds (seed 8: AcQc on the button) a mistake at the table links
	// to the lesson; at 12 there is no lesson for the spot yet, so no link.
	await page.goto('/practice/10?seed=8');
	await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
	await page.locator('[data-place="fold"]').click();
	await page.getByTestId('decision-lesson').click();
	await expect(page).toHaveURL(/\/learn\/jam-or-fold-10bb$/);
	await page.goto('/practice/12?seed=8');
	await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
	await page.locator('[data-place="fold"]').click();
	await expect(page.getByTestId('decision-verdict')).toHaveText('Mistake');
	await expect(page.getByTestId('decision-lesson')).toHaveCount(0);
});
