// P3.7 · the M1 journey (Gate C): lesson → study → drill → practice hand → a
// mistake drilled from the table → review → back to the lesson, against the
// production build, in every browser project and again at 360 × 640. Along the
// way it checks Gate C's M1 items that a browser can measure: no sideways
// scrolling, controls in reach with the board and cards visible, 44-pixel
// targets 8 pixels apart, nothing moving under a finger, a grade within 200 ms
// and the drill within a second of the tap (Chromium, processor slowed four
// times), and a reload returning to the same decision.
//
// Seeded deals: practice seed 8 at 10 big blinds deals AcQc on the button in
// hand 1, which the journey folds (a mistake). The drill reached from the
// lesson is answered from the committed solution, whatever it deals.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface Table {
	spot: string;
	actions: string[];
	hands: string[];
	values: number[][];
}
const solution = JSON.parse(
	readFileSync(new URL('../../solutions/jam-or-fold/solution.json', import.meta.url), 'utf8')
) as { decisions: Table[] };
const RANKS = '23456789TJQKA';

const place = (page: Page, key: string) => page.locator(`[data-place="${key}"]`);
const PLACES = ['fold', 'call', 'raise', 'all-in'];

/** The class of the hole cards on screen. */
async function handOnScreen(page: Page): Promise<string> {
	const codes = await page
		.getByTestId('hole-cards')
		.getByRole('img')
		.evaluateAll((els) => els.map((e) => e.getAttribute('data-card') ?? ''));
	const cards = codes
		.map((c) => ({
			rank: RANKS.indexOf(c.slice(0, -1) === '10' ? 'T' : c.slice(0, -1)),
			suit: c.slice(-1)
		}))
		.sort((a, b) => b.rank - a.rank);
	const kind = cards[0].rank === cards[1].rank ? '' : cards[0].suit === cards[1].suit ? 's' : 'o';
	return RANKS[cards[0].rank] + RANKS[cards[1].rank] + kind;
}

/** The best action for the drill decision on screen, at 10 big blinds on the button. */
async function bestOnButton(page: Page): Promise<string> {
	const table = solution.decisions.find((d) => d.spot === 'jof-10bb-button')!;
	const v = table.values[table.hands.indexOf(await handOnScreen(page))];
	return table.actions[v.indexOf(Math.max(...v))];
}

async function noSidewaysScroll(page: Page) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBe(0);
}

/** Gate C: every action control in view, 44 × 44 or larger, 8 pixels apart, with the board and cards visible. */
async function controlsInReach(page: Page, board: boolean) {
	const viewport = page.viewportSize()!;
	const boxes = await Promise.all(PLACES.map(async (k) => (await place(page, k).boundingBox())!));
	for (const b of boxes) {
		expect(b.width).toBeGreaterThanOrEqual(44);
		expect(b.height).toBeGreaterThanOrEqual(44);
		expect(b.y).toBeGreaterThanOrEqual(0);
		expect(b.y + b.height).toBeLessThanOrEqual(viewport.height);
	}
	for (let i = 1; i < boxes.length; i++) {
		expect(boxes[i].x - (boxes[i - 1].x + boxes[i - 1].width)).toBeGreaterThanOrEqual(8);
	}
	await expect(page.getByTestId('hole-cards')).toBeInViewport({ ratio: 1 });
	if (board) await expect(page.getByTestId('board')).toBeInViewport({ ratio: 1 });
	return boxes;
}

async function throttle(page: Page, browserName: string) {
	if (browserName !== 'chromium') return false;
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
	return true;
}

function journey(label: string) {
	test(`the M1 journey${label}`, async ({ page, browserName }) => {
		page.on('pageerror', (error) => {
			throw error;
		});
		const timings: Record<string, number> = {};

		// Lesson.
		await page.goto('/');
		await noSidewaysScroll(page);
		await page.getByRole('link', { name: /Learn/ }).click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Jam or fold: heads-up at 10 big blinds'
		);
		await noSidewaysScroll(page);

		// Study.
		await page.getByTestId('lesson-spots').getByRole('link', { name: 'Study' }).first().click();
		await expect(page).toHaveURL(/\/study\/jam-or-fold\/10#button$/);
		await page.locator('[data-hand="AQs"]').click();
		await expect(page.getByTestId('hand-detail')).toContainText('AQs');
		await noSidewaysScroll(page);

		// Drill, from the lesson: a grade within 200 ms of the tap.
		await page.goBack();
		await page.getByTestId('lesson-spots').getByRole('link', { name: 'Drill' }).first().click();
		await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 20');
		await expect(page.getByTestId('prompt')).toContainText('on the button');
		const before = await controlsInReach(page, false);
		const best = await bestOnButton(page);
		const throttled = await throttle(page, browserName);
		const tapped = Date.now();
		await place(page, best === 'jam' ? 'all-in' : 'fold').click();
		await expect(page.getByTestId('verdict')).toHaveText('Acceptable');
		timings.grade = Date.now() - tapped;
		if (throttled) expect(timings.grade).toBeLessThanOrEqual(200);
		expect(
			await Promise.all(PLACES.map(async (k) => (await place(page, k).boundingBox())!))
		).toEqual(before);
		await noSidewaysScroll(page);

		// Practice, seeded: the table, then a mistake.
		await page.goto('/practice/10?seed=8');
		await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
		await expect(place(page, 'fold')).toBeEnabled();
		const waiting = await controlsInReach(page, true);
		await page.reload();
		await expect(place(page, 'fold')).toBeEnabled();
		expect(await handOnScreen(page)).toBe('AQs');
		await place(page, 'fold').click();
		await expect(page.getByTestId('decision-verdict')).toHaveText('Mistake');
		await expect(page.getByTestId('decision-cost')).toBeVisible();
		await expect(page.getByTestId('decision-reason')).toContainText('Folding AQs');
		expect(
			await Promise.all(PLACES.map(async (k) => (await place(page, k).boundingBox())!))
		).toEqual(waiting);
		await noSidewaysScroll(page);

		// The mistake drilled from the table in one tap, its first deal ready within a second.
		const drill = page.getByTestId('drill-this-spot');
		await expect(drill).toBeInViewport();
		const opened = Date.now();
		await drill.click();
		await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');
		await expect(place(page, 'fold')).toBeEnabled();
		timings.drill = Date.now() - opened;
		if (throttled) expect(timings.drill).toBeLessThanOrEqual(1000);
		expect(await handOnScreen(page)).toBe('AQs');
		await place(page, 'all-in').click();
		await expect(page.getByTestId('verdict')).toHaveText('Acceptable');
		await page.getByRole('button', { name: 'Next hand' }).click();
		await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 10');
		await page.reload();
		await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 10');
		for (let i = 2; i <= 10; i++) {
			await expect(page.getByTestId('progress-line')).toHaveText(`Decision ${i} of 10`);
			await place(page, (await bestOnButton(page)) === 'jam' ? 'all-in' : 'fold').click();
			await expect(page.getByTestId('verdict')).toHaveText('Acceptable');
			await page.getByRole('button', { name: i === 10 ? 'Finish' : 'Next hand' }).click();
		}
		await expect(page.getByTestId('spot-result')).toContainText('You got the spot right this time');
		await noSidewaysScroll(page);

		// One more tap: back at the table, at the next hand.
		await page.getByTestId('back-to-table').click();
		await expect(page.getByTestId('session-line')).toContainText('Hand 2');

		// Review the hand with the mistake, then back to its lesson.
		await page.getByTestId('review-link').click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hand 1 at 10 big blinds');
		await expect(page.getByTestId('review-band')).toHaveText('Mistake');
		await expect(page.getByTestId('review-reason')).toContainText('Folding AQs');
		await expect(page.getByTestId('review-drill')).toBeVisible();
		await noSidewaysScroll(page);
		await page.getByTestId('review-lesson').click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Jam or fold: heads-up at 10 big blinds'
		);
		test.info().annotations.push({
			type: 'timings (ms)',
			description: `grade ${timings.grade}, drill ${timings.drill}${throttled ? ' at 4× throttling' : ''}`
		});
	});
}

journey('');

test.describe('at 360 × 640', () => {
	test.use({ viewport: { width: 360, height: 640 } });
	journey(' at 360 × 640');
});
