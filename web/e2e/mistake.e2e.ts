// P3.9 and Gate C's two mistake-to-drill items (D-25): a graded mistake at
// the end of a practice hand shows its cost and explanation at once, one tap
// on "Drill this spot" starts a drill whose first deal is that decision (the
// same depth, seat and cards) within a second on a throttled processor, and
// one tap after the drill returns to the table at the next hand.
//
// Seed 8 at 12 big blinds seats the player on the button with AcQc in the
// first hand; folding it is a mistake (the solution's values, checked below).

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface Table {
	spot: string;
	actions: string[];
	hands: string[];
	values: number[][];
	frequencies: number[][];
}
const solution = JSON.parse(
	readFileSync(new URL('../../solutions/jam-or-fold/solution.json', import.meta.url), 'utf8')
) as { decisions: Table[] };
const at12 = solution.decisions.find((d) => d.spot === 'jof-12bb-button')!;
const aqs = at12.values[at12.hands.indexOf('AQs')];
const foldLoss = Math.max(...aqs) - aqs[at12.actions.indexOf('fold')];

const place = (page: Page, key: string) => page.locator(`[data-place="${key}"]`);
const cardsOn = (page: Page) =>
	page
		.getByTestId('hole-cards')
		.getByRole('img')
		.evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));

test.beforeEach(({ page }) => {
	page.on('pageerror', (error) => {
		throw error;
	});
});

test('a mistake at the table shows its cost and why, and one tap drills it', async ({
	page,
	browserName
}) => {
	expect(foldLoss / 1.5).toBeGreaterThan(0.03);
	await page.goto('/practice/12?seed=8');
	await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
	expect(await cardsOn(page)).toEqual(['Ac', 'Qc']);
	await place(page, 'fold').click();

	// At once, without another tap: the verdict, its cost and the explanation.
	const decision = page.getByTestId('graded-decision');
	await expect(decision.getByTestId('decision-verdict')).toHaveText('Mistake');
	await expect(decision.getByTestId('decision-cost')).toHaveText(`${foldLoss.toFixed(2)} bb`);
	await expect(decision.getByTestId('decision-reason')).toContainText('Folding AQs');
	await expect(decision.getByTestId('decision-reason')).toContainText('equity');
	const drill = decision.getByTestId('drill-this-spot');
	await expect(drill).toBeInViewport();
	const box = (await drill.boundingBox())!;
	expect(box.height).toBeGreaterThanOrEqual(44);
	expect(await drill.getAttribute('href')).toBe(
		'/drill/jam-or-fold/12?seat=button&cards=AcQc&from=practice'
	);

	// One tap, and the first deal accepts an answer within a second, with the
	// processor slowed four times where the browser allows it (Chromium).
	if (browserName === 'chromium') {
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
	}
	const started = Date.now();
	await drill.click();
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');
	await expect(place(page, 'fold')).toBeEnabled();
	const elapsed = Date.now() - started;
	if (browserName === 'chromium') expect(elapsed).toBeLessThanOrEqual(1000);
	test.info().annotations.push({ type: 'mistake-to-drill ms', description: String(elapsed) });
	expect(await cardsOn(page)).toEqual(['Ac', 'Qc']);
	await expect(page.getByTestId('spot-line')).toHaveText(' · drilling AQs on the button');
	await expect(page.getByTestId('prompt')).toContainText('on the button with 12 big blinds');

	// The same decision, answered right this time; then nine more at the same seat.
	await place(page, 'all-in').click();
	await expect(page.getByTestId('verdict')).toHaveText('Acceptable');
	for (let i = 2; i <= 10; i++) {
		await page.getByRole('button', { name: 'Next hand' }).click();
		await expect(page.getByTestId('progress-line')).toHaveText(`Decision ${i} of 10`);
		await expect(page.getByTestId('prompt')).toContainText('on the button');
		await place(page, 'fold').click();
		await expect(page.getByTestId('verdict')).toBeVisible();
	}
	await page.getByRole('button', { name: 'Finish' }).click();
	await expect(page.getByTestId('spot-result')).toContainText(
		'You got the spot right this time: AQs on the button'
	);
	await expect(page.getByTestId('progress')).toContainText('1 session');

	// One more tap: back at the table, at the next hand.
	await page.getByTestId('back-to-table').click();
	await expect(page).toHaveURL(/\/practice\/12$/);
	await expect(page.getByTestId('session-line')).toContainText('Hand 2');
});

test('a drill of one spot survives a reload, and a drill mistake drills its own spot', async ({
	page
}) => {
	await page.goto('/drill/jam-or-fold/12?seat=big-blind&cards=Kd5c&seed=4');
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');
	expect(await cardsOn(page)).toEqual(['Kd', '5c']);
	await place(page, 'fold').click();
	await page.getByRole('button', { name: 'Next hand' }).click();
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 10');
	const second = await cardsOn(page);
	await page.reload();
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 2 of 10');
	expect(await cardsOn(page)).toEqual(second);

	// A clear mistake in an ordinary drill offers the same path.
	await page.goto('/drill/jam-or-fold/10?seed=23&seat=button');
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 20');
	const first = await cardsOn(page);
	await place(page, 'all-in').click();
	await expect(page.getByTestId('verdict')).toHaveText('Mistake');
	await page.getByRole('button', { name: 'Drill this spot' }).click();
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');
	expect(await cardsOn(page)).toEqual(first);
	await expect(page.getByTestId('spot-line')).toContainText('Q5o on the button');
	await page.reload();
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');
	await expect(page.getByTestId('spot-line')).toContainText('Q5o on the button');
	expect(await cardsOn(page)).toEqual(first);
});

test('a decision outside the solved game says it is not graded, and why', async ({ page }) => {
	await page.goto('/practice/12?seed=8');
	await place(page, 'call').click();
	// The limp leaves the jam-or-fold game; play the hand out by checking or folding.
	for (let i = 0; i < 8; i++) {
		if (await page.getByTestId('result').isVisible()) break;
		const check = place(page, 'call');
		if ((await check.textContent())?.includes('Check')) await check.click();
		else await place(page, 'fold').click();
	}
	await expect(page.getByTestId('result')).toBeVisible();
	await expect(page.getByTestId('graded-decision')).toHaveCount(0);
	await expect(page.getByTestId('not-graded').first()).toContainText('Not graded');
	await expect(page.getByTestId('not-graded').first()).toContainText('limp');
});
