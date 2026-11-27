// Gate C's accessibility item (P3.7): no axe-core WCAG 2.2 AA violation on
// any page of the M1 journey, in both themes, at every project's size, with
// the states a player meets on each page (a decision waiting, feedback shown,
// a hand's result, a review on its mistake); and the journey's decisions can
// be taken from the keyboard alone.
//
// Seeded deals: practice seed 8 at 10 big blinds deals AcQc on the button.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page, where: string) {
	const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
	const found = results.violations.map(
		(v) =>
			`${where}: ${v.id} (${v.impact}) ${v.help} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
	);
	expect(found).toEqual([]);
}

const place = (page: Page, key: string) => page.locator(`[data-place="${key}"]`);

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`the ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('every page of the journey passes axe-core’s WCAG 2.2 AA rules', async ({ page }) => {
			for (const path of ['/', '/learn', '/learn/jam-or-fold-10bb', '/study/jam-or-fold/10']) {
				await page.goto(path);
				await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
				await expectNoViolations(page, path);
			}
			await page.locator('[data-hand="AQs"]').click();
			await expectNoViolations(page, 'study, a hand selected');

			await page.goto('/drill/jam-or-fold/10?seed=23&seat=button');
			await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 20');
			await expectNoViolations(page, 'drill, deciding');
			await place(page, 'all-in').click();
			await expect(page.getByTestId('verdict')).toHaveText('Mistake');
			await expectNoViolations(page, 'drill, a mistake');

			await page.goto('/practice/10?seed=8');
			await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
			await expectNoViolations(page, 'practice, deciding');
			await place(page, 'raise').click();
			await expect(page.getByRole('dialog', { name: 'Choose a size' })).toBeVisible();
			await expectNoViolations(page, 'practice, sizing a raise');
			await page.getByRole('button', { name: 'Cancel' }).click();
			await place(page, 'fold').click();
			await expect(page.getByTestId('decision-verdict')).toHaveText('Mistake');
			await expectNoViolations(page, 'practice, a hand’s result');

			await page.getByTestId('drill-this-spot').click();
			await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');
			await expectNoViolations(page, 'drill of one spot');

			await page.goto('/practice/10/review');
			await expect(page.getByTestId('review-band')).toHaveText('Mistake');
			await expectNoViolations(page, 'review');
		});
	});
}

test('the journey’s decisions can be taken from the keyboard alone', async ({
	page,
	browserName
}) => {
	// WebKit on macOS moves focus with Tab only to form fields unless the
	// system setting is changed; Option+Tab reaches buttons and links.
	const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
	/** Tab until the focused element matches `selector` (and holds `text`), then press Enter. */
	async function activate(selector: string, text = '') {
		for (let i = 0; i < 60; i++) {
			await page.keyboard.press(tab);
			const here = await page.evaluate(
				([s, t]) => {
					const e = document.activeElement;
					return !!e && e.matches(s) && (e.textContent ?? '').includes(t);
				},
				[selector, text] as const
			);
			if (here) {
				await page.keyboard.press('Enter');
				return;
			}
		}
		throw new Error(`could not reach ${selector} with the keyboard`);
	}

	await page.goto('/');
	await activate('a[href$="/learn/jam-or-fold-10bb"]');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Jam or fold: heads-up at 10 big blinds'
	);

	await page.goto('/practice/10?seed=8');
	await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
	await activate('[data-place="fold"]');
	await expect(page.getByTestId('decision-verdict')).toHaveText('Mistake');
	await activate('[data-testid="drill-this-spot"]');
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');
	await activate('[data-place="all-in"]');
	await expect(page.getByTestId('verdict')).toHaveText('Acceptable');
	await activate('button', 'Next hand');
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 10');

	// The raise sheet opens, sizes and closes from the keyboard.
	await page.goto('/drill/jam-or-fold/10?seed=3&seat=button');
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 20');
	await activate('[data-place="raise"]');
	await expect(page.getByRole('dialog', { name: 'Choose a size' })).toBeVisible();
	await activate('[aria-label="Larger"]');
	await expect(page.getByTestId('raise-amount')).toHaveText('2.5 bb');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Choose a size' })).toBeHidden();
});
