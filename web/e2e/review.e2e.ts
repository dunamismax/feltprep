// P3.6: a finished hand is reviewed from the table, step by step, showing
// only what the player could see until a showdown; each decision is marked
// graded or not, and a graded mistake shows its cost and explanation, drills
// in one tap and links to its lesson.
//
// At 10 big blinds, seed 8 deals the player AcQc on the button in hand 1, and
// seed 5 puts the player in the big blind with AKo facing a jam.

import { expect, test, type Page } from '@playwright/test';

const place = (page: Page, key: string) => page.locator(`[data-place="${key}"]`);

test.beforeEach(({ page }) => {
	page.on('pageerror', (error) => {
		throw error;
	});
});

test('a mistake is reviewed from the table, drilled in one tap and linked to its lesson', async ({
	page
}) => {
	await page.goto('/practice/10?seed=8');
	await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
	await place(page, 'fold').click();
	await page.getByTestId('review-hand').click();
	await expect(page).toHaveURL(/\/practice\/10\/review\?hand=0$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hand 1 at 10 big blinds');
	await expect(page.getByTestId('step-line')).toHaveText('Step 1 of 2');
	await expect(page.getByTestId('step-action')).toHaveText('Before the flop: you folded.');
	await expect(page.getByTestId('review-band')).toHaveText('Mistake');
	await expect(page.getByTestId('review-cost')).toContainText('bb');
	await expect(page.getByTestId('review-reason')).toContainText('Folding AQs');
	await expect(page.getByTestId('decision-jump')).toHaveText(/you folded\s*Mistake/);
	await expect(page.getByTestId('review-lesson')).toHaveAttribute(
		'href',
		'/learn/jam-or-fold-10bb'
	);
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('step-action')).toHaveText('You folded and lose 0.5 bb.');

	await page.getByRole('button', { name: 'Back' }).click();
	await page.getByTestId('review-drill').click();
	await expect(page).toHaveURL(/\/drill\/jam-or-fold\/10\?seat=button&cards=AcQc&from=practice$/);
	await expect(page.getByTestId('progress-line')).toHaveText('Decision 1 of 10');

	// The table moved on to the next hand when the review opened.
	await page.goto('/practice/10');
	await expect(page.getByTestId('session-line')).toContainText('Hand 2');
});

test('a review opens on the mistake, with its cost and reason in view', async ({ page }) => {
	await page.goto('/practice/10?seed=5');
	await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
	await place(page, 'fold').click();
	await page.getByTestId('review-hand').click();
	await expect(page.getByTestId('step-line')).toHaveText('Step 2 of 3');
	await expect(page.getByTestId('step-action')).toHaveText('Before the flop: you folded.');
	await expect(page.getByTestId('review-band')).toHaveText('Mistake');
	await expect(page.getByTestId('review-reason')).toBeInViewport();
	await expect(page.getByTestId('review-drill')).toBeInViewport();
});

test('the opponent’s cards stay hidden until the showdown at the end', async ({ page }) => {
	await page.goto('/practice/10?seed=5');
	await expect(page.getByTestId('session-line')).toHaveText('Hand 1');
	await place(page, 'call').click();
	await page.getByTestId('review-hand').click();
	await expect(page.getByTestId('step-line')).toHaveText('Step 1 of 3');
	await expect(page.getByTestId('step-action')).toContainText(
		'the practice opponent moved all-in for 10 bb'
	);
	const opponent = page.getByTestId('opponent-cards').getByRole('img');
	await expect(opponent).toHaveCount(2);
	await expect(opponent.first()).toHaveAccessibleName('Face-down card');
	await expect(page.getByTestId('board').getByRole('img')).toHaveCount(0);
	await expect(page.getByTestId('review-verdict')).toHaveCount(0);

	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByTestId('step-action')).toContainText('you called 9 bb, all-in');
	await expect(page.getByTestId('review-band')).toHaveText('Acceptable');
	await expect(opponent.first()).toHaveAccessibleName('Face-down card');

	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
	await expect(opponent.first()).not.toHaveAccessibleName('Face-down card');
	await expect(page.getByTestId('board').getByRole('img')).toHaveCount(5);
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBe(0);
});

test('a review with no hands says so, and leads to the table', async ({ page }) => {
	await page.goto('/practice/13/review');
	await expect(page.getByTestId('no-hands')).toContainText('No finished hands at 13 big blinds');
	expect((await page.goto('/practice/9/review'))?.status()).toBe(404);
});
