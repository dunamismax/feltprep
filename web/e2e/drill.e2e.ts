import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Expected answers come from the committed solution file, not from the app.
interface Table {
	spot: string;
	actions: string[];
	hands: string[];
	values: number[][];
	frequencies: number[][];
	margins: number[];
}
const solution = JSON.parse(
	readFileSync(new URL('../../solutions/jam-or-fold/solution.json', import.meta.url), 'utf8')
) as { decisions: Table[] };

const RANKS = '23456789TJQKA';

/** The class of the two cards on screen, from their data-card attributes ("10d", "Ah"). */
async function handOnScreen(page: Page): Promise<string> {
	const codes = await page
		.getByTestId('hole-cards')
		.getByRole('img')
		.evaluateAll((els) => els.map((e) => e.getAttribute('data-card') ?? ''));
	const cards = codes.map((c) => {
		const rank = c.slice(0, -1) === '10' ? 'T' : c.slice(0, -1);
		return { rank: RANKS.indexOf(rank), suit: c.slice(-1) };
	});
	cards.sort((a, b) => b.rank - a.rank);
	const [hi, lo] = cards;
	const kind = hi.rank === lo.rank ? '' : hi.suit === lo.suit ? 's' : 'o';
	return RANKS[hi.rank] + RANKS[lo.rank] + kind;
}

/** The reference's numbers for the decision on screen. */
async function reference(page: Page, stack: number) {
	const prompt = (await page.getByTestId('prompt').textContent()) ?? '';
	const seat = prompt.includes('on the button') ? 'button' : 'big-blind';
	const table = solution.decisions.find((d) => d.spot === `jof-${stack}bb-${seat}`)!;
	const hand = await handOnScreen(page);
	const h = table.hands.indexOf(hand);
	const values = table.values[h];
	const best = table.actions[values.indexOf(Math.max(...values))];
	const worst = table.actions[values.indexOf(Math.min(...values))];
	const loss = Math.max(...values) - Math.min(...values);
	const worstFrequency = table.frequencies[h][values.indexOf(Math.min(...values))];
	return { seat, hand, best, worst, loss, worstFrequency, margin: table.margins[h] };
}

const PLACE: Record<string, string> = { fold: 'fold', jam: 'all-in', call: 'call' };
const place = (page: Page, key: string) => page.locator(`[data-place="${key}"]`);

test.beforeEach(({ page }) => {
	page.on('pageerror', (error) => {
		throw error;
	});
});

test('a whole session answered as the reference answers is all acceptable, and counts', async ({
	page
}) => {
	await page.goto('/drill/jam-or-fold/10?seed=20261126&seat=both');
	const seats = new Set<string>();
	for (let i = 1; i <= 20; i++) {
		await expect(page.getByTestId('progress-line')).toHaveText(`Decision ${i} of 20`);
		const ref = await reference(page, 10);
		seats.add(ref.seat);
		await place(page, PLACE[ref.best]).click();
		await expect(page.getByTestId('verdict')).toHaveText('Acceptable');
		await expect(page.getByTestId('reason')).toContainText(ref.hand);
		await page.getByRole('button', { name: i === 20 ? 'Finish' : 'Next hand' }).click();
	}
	expect(seats).toEqual(new Set(['button', 'big-blind']));
	const summary = page.getByTestId('summary');
	await expect(summary).toContainText('Session complete');
	await expect(page.getByTestId('count-acceptable')).toHaveText('20');
	await expect(page.getByTestId('count-mistakes')).toHaveText('0');
	await expect(page.getByTestId('progress')).toContainText('1 session, 20 of 20 graded');
});

test('the worse action is graded by what it gives up', async ({ page }) => {
	await page.goto('/drill/jam-or-fold/10?seed=5&seat=button');
	for (let i = 0; i < 20; i++) {
		const ref = await reference(page, 10);
		const pot = 1.5;
		const clear = ref.worstFrequency < 0.05 && (ref.loss - ref.margin) / pot > 0.05;
		if (clear) {
			await place(page, PLACE[ref.worst]).click();
			await expect(page.getByTestId('verdict')).toHaveText('Mistake');
			await expect(page.getByTestId('feedback')).toContainText(
				`giving up ${ref.loss.toFixed(2)} bb`
			);
			return;
		}
		await place(page, PLACE[ref.best]).click();
		await page.getByRole('button', { name: /Next hand|Finish/ }).click();
	}
	throw new Error('no clear mistake was dealt in 20 hands');
});

test('a limp or a smaller raise is shown as not graded', async ({ page }) => {
	await page.goto('/drill/jam-or-fold/10?seed=3&seat=button');
	await place(page, 'call').click();
	await expect(page.getByTestId('verdict')).toHaveText('Not graded');
	await expect(page.getByTestId('reason')).toContainText('limp');
	await page.getByRole('button', { name: 'Next hand' }).click();

	await place(page, 'raise').click();
	const sheet = page.getByRole('dialog', { name: 'Choose a size' });
	await expect(sheet).toBeVisible();
	await expect(page.getByTestId('raise-amount')).toHaveText('2 bb');
	await sheet.getByRole('button', { name: 'Larger' }).click();
	await expect(page.getByTestId('raise-amount')).toHaveText('2.5 bb');
	await sheet.getByRole('button', { name: 'Raise 2.5 bb' }).click();
	await expect(page.getByTestId('verdict')).toHaveText('Not graded');
});

test('a reload returns to the same decision, and to its feedback', async ({ page }) => {
	await page.goto('/drill/jam-or-fold/12?seed=99&seat=both');
	await place(page, 'fold').click();
	await page.getByRole('button', { name: 'Next hand' }).click();
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 20');
	const hand = await handOnScreen(page);
	await page.reload();
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 20');
	expect(await handOnScreen(page)).toBe(hand);

	await place(page, 'fold').click();
	const verdict = await page.getByTestId('verdict').textContent();
	await page.goto('/drill/jam-or-fold/12');
	await expect(page.getByTestId('verdict')).toHaveText(verdict ?? '');
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 20');
});

test('the controls stay in place and in reach while deciding and after feedback', async ({
	page
}) => {
	await page.goto('/drill/jam-or-fold/10?seed=8&seat=both');
	const boxes = async () =>
		Promise.all(
			['fold', 'call', 'raise', 'all-in'].map(
				async (key) => (await place(page, key).boundingBox())!
			)
		);
	const before = await boxes();
	const viewport = page.viewportSize()!;
	for (const box of before) {
		expect(box.width).toBeGreaterThanOrEqual(44);
		expect(box.height).toBeGreaterThanOrEqual(44);
		expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
	}
	for (let i = 1; i < before.length; i++) {
		expect(before[i].x - (before[i - 1].x + before[i - 1].width)).toBeGreaterThanOrEqual(8);
	}
	await expect(page.getByTestId('hole-cards')).toBeInViewport();
	await place(page, 'fold').click();
	await expect(page.getByTestId('feedback')).toBeVisible();
	expect(await boxes()).toEqual(before);
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBe(0);
});
