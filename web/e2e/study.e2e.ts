import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// The page must show what the committed solution says, so the expected numbers
// are read from the solution file itself.
interface Table {
	spot: string;
	actions: string[];
	hands: string[];
	frequencies: number[][];
}
const solution = JSON.parse(
	readFileSync(new URL('../../solutions/jam-or-fold/solution.json', import.meta.url), 'utf8')
) as { decisions: Table[] };
const tableFor = (spot: string) => solution.decisions.find((d) => d.spot === spot)!;
const frequency = (spot: string, hand: string) => {
	const t = tableFor(spot);
	return t.frequencies[t.hands.indexOf(hand)][1];
};

function watch(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	void page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (event) => {
			throw new Error(`Content Security Policy violation: ${event.violatedDirective}`);
		});
	});
	return errors;
}

async function sidewaysOverflow(page: Page): Promise<number> {
	return page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
}

test('the study view shows the solved strategy for the button at 10 big blinds', async ({
	page
}) => {
	const errors = watch(page);
	await page.goto('/study/jam-or-fold/10');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jam or fold at 10 big blinds');
	const grid = page.getByRole('grid');
	await expect(grid.getByRole('button')).toHaveCount(169);
	for (const hand of ['AA', 'K9o', '72o', 'T4s']) {
		const cell = grid.locator(`[data-hand="${hand}"]`);
		expect(Number(await cell.getAttribute('data-frequency'))).toBeCloseTo(
			frequency('jof-10bb-button', hand),
			9
		);
	}
	await expect(page.getByTestId('summary')).toContainText('The button jams');
	await expect(page.getByTestId('exploitability')).toContainText('big blinds per hand');
	await expect(page.getByText('Real players can also limp')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Read the B-5 results' })).toBeVisible();
	expect(await sidewaysOverflow(page)).toBe(0);
	expect(errors).toEqual([]);
});

test('a tapped hand shows its frequencies and values', async ({ page }) => {
	await page.goto('/study/jam-or-fold/10');
	await page.locator('[data-hand="K9o"]').click();
	const detail = page.getByTestId('hand-detail');
	await expect(detail).toContainText('K9o');
	await expect(detail).toContainText('King-Nine offsuit · 12 combinations');
	await expect(detail.getByRole('row')).toHaveCount(3);
	await expect(page.locator('[data-hand="K9o"]')).toHaveAttribute('aria-pressed', 'true');
});

test('the grid works from the keyboard', async ({ page }) => {
	await page.goto('/study/jam-or-fold/10');
	await page.locator('[data-hand="AA"]').focus();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowDown');
	await expect(page.locator('[data-hand="KK"]')).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByTestId('hand-detail')).toContainText('Pair of kings');
	// One tab stop for the whole grid.
	await expect(page.locator('[role="grid"] button[tabindex="0"]')).toHaveCount(1);
});

test('the big blind’s calls are one tap away and can be linked to', async ({ page }) => {
	await page.goto('/study/jam-or-fold/10');
	await page.getByRole('button', { name: /Big blind/ }).click();
	await expect(page.getByTestId('summary')).toContainText('the big blind calls');
	await expect(page).toHaveURL(/#big-blind$/);
	const cell = page.locator('[data-hand="A2o"]');
	expect(Number(await cell.getAttribute('data-frequency'))).toBeCloseTo(
		frequency('jof-10bb-big-blind', 'A2o'),
		9
	);
	await page.goto('/study/jam-or-fold/4#big-blind');
	await expect(page.getByTestId('summary')).toContainText('the big blind calls');
});

test('every solved depth has its page, and others do not', async ({ page }) => {
	await page.goto('/study/jam-or-fold/10');
	await page.getByRole('link', { name: '15', exact: true }).click();
	await expect(page).toHaveURL(/\/study\/jam-or-fold\/15$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jam or fold at 15 big blinds');
	expect((await page.goto('/study/jam-or-fold/16'))?.status()).toBe(404);
});
