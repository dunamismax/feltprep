// Gate A's interface item and P3.5's table. Each test plays seeded hands in
// the browser while replaying the same session on the engine here in Node, and
// checks at every decision that the action panel offers exactly the engine's
// legal actions, with its minimum and maximum raise.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { seededRandom } from '../src/lib/engine/random.ts';
import { Action, legalActions, type LegalActions } from '../src/lib/engine/state.ts';
import { panelExamples } from '../src/lib/table/examples.ts';
import { loadSolution } from '../src/lib/spots/reader.ts';
import { sliceSolution } from '../src/lib/spots/slice.ts';
import type { Registry } from '../src/lib/spots/types.ts';
import {
	newPracticeSession,
	nextHand,
	outcome,
	playCurrent,
	takeAction,
	type PracticeSession
} from '../src/lib/practice/table.ts';
import { uploadOf } from '../src/lib/practice/upload.ts';

const root = new URL('../../solutions/', import.meta.url);
const registry = JSON.parse(readFileSync(new URL('registry.json', root), 'utf8')) as Registry;
const whole = await loadSolution(registry, 'jam-or-fold-hu', (p) =>
	Promise.resolve(new Uint8Array(readFileSync(new URL(p, root))))
);

const bb = (chips: number) => `${Number((chips / 100).toFixed(2))} bb`;
const place = (page: Page, key: string) => page.locator(`[data-place="${key}"]`);

/** The panel shows exactly `legal`: each place enabled or not, with the engine's amounts. */
async function expectPanel(page: Page, legal: LegalActions, scope = page.locator('body')) {
	const at = (key: string) => scope.locator(`[data-place="${key}"]`);
	await (legal.canFold ? expect(at('fold')).toBeEnabled() : expect(at('fold')).toBeDisabled());
	if (legal.canCheck) {
		await expect(at('call')).toBeEnabled();
		await expect(at('call')).toHaveText('Check');
	} else if (legal.call > 0) {
		await expect(at('call')).toBeEnabled();
		await expect(at('call')).toContainText(bb(legal.call));
	} else {
		await expect(at('call')).toBeDisabled();
	}
	if (legal.raiseKind === null) {
		await expect(at('raise')).toBeDisabled();
		await expect(at('all-in')).toBeDisabled();
		return;
	}
	await expect(at('all-in')).toBeEnabled();
	await expect(at('all-in')).toContainText(bb(legal.maxTo));
	if (legal.minTo === legal.maxTo) {
		await expect(at('raise')).toBeDisabled();
		return;
	}
	await expect(at('raise')).toBeEnabled();
	await at('raise').click();
	const sheet = scope.getByRole('dialog', { name: 'Choose a size' });
	await expect(sheet.getByTestId('raise-amount')).toHaveText(bb(legal.minTo));
	await expect(sheet.getByRole('slider')).toHaveAttribute('min', String(legal.minTo));
	await expect(sheet.getByRole('slider')).toHaveAttribute('max', String(legal.maxTo));
	await sheet.getByRole('button', { name: 'Cancel' }).click();
}

test.beforeEach(({ page }) => {
	page.on('pageerror', (error) => {
		throw error;
	});
});

test('the panel examples offer exactly the engine’s legal actions', async ({ page }) => {
	await page.goto('/style');
	const examples = panelExamples();
	const seen = { noRaise: false, shortAllIn: false };
	for (const example of examples) {
		const scope = page.getByTestId(`panel-${example.id}`);
		await scope.scrollIntoViewIfNeeded();
		await expectPanel(page, example.legal, scope);
		if (example.legal.raiseKind === null) seen.noRaise = true;
		if (example.legal.raiseKind && example.legal.maxTo < example.legal.minTo + 100) {
			seen.shortAllIn = true;
		}
	}
	// The short all-in really is less than a full raise: a raise to 2 reopens to 3.
	const short = examples.find((e) => e.id === 'short-all-in')!;
	expect(short.legal.maxTo).toBe(250);
	expect(short.legal.maxTo).toBeLessThan(300);
	expect(seen).toEqual({ noRaise: true, shortAllIn: true });
});

test('seeded hands offer the engine’s actions at every decision, from both seats', async ({
	page
}) => {
	test.setTimeout(120_000);
	const seed = 4242;
	const solution = sliceSolution(whole, 'jof-10bb');
	let session: PracticeSession = newPracticeSession(10, seed);
	const choose = seededRandom(1);
	const roles = new Set<string>();
	await page.goto(`/practice/10?seed=${seed}`);
	for (let hand = 0; hand < 6; hand++) {
		for (;;) {
			const played = playCurrent(solution, session);
			if (!played.waiting) break;
			const legal = legalActions(played.state);
			await expect(page.getByTestId('your-turn')).toBeVisible();
			await expectPanel(page, legal);
			roles.add(played.state.button === session.player ? 'button' : 'big-blind');
			// Mostly check or call, sometimes all-in, sometimes fold.
			const r = choose.below(10);
			let action: Action;
			if (r < 2 && legal.raiseKind) action = Action.of(legal.raiseKind, legal.maxTo);
			else if (r < 3 && legal.canFold) action = Action.fold();
			else action = legal.canCheck ? Action.check() : Action.call();
			const key =
				action.kind === 'fold'
					? 'fold'
					: action.kind === 'check' || action.kind === 'call'
						? 'call'
						: 'all-in';
			await place(page, key).click();
			session = takeAction(solution, session, action);
		}
		const finished = playCurrent(solution, session).state;
		await expect(page.getByTestId('outcome')).toHaveText(outcome(finished, session.player));
		if (!finished.result?.showdown) {
			await expect(
				page.getByTestId('opponent-cards').getByRole('img', { name: 'Face-down card' })
			).toHaveCount(2);
		}
		await page.getByRole('button', { name: 'Next hand' }).click();
		session = nextHand(solution, session);
		await expect(page.getByTestId('session-line')).toContainText(`Hand ${hand + 2}`);
	}
	expect(roles).toEqual(new Set(['button', 'big-blind']));
});

test('the button alternates and a reload returns to the same decision', async ({ page }) => {
	const seed = 0;
	const solution = sliceSolution(whole, 'jof-12bb');
	let session = newPracticeSession(12, seed);
	await page.goto(`/practice/12?seed=${seed}`);
	await expect(page.getByText('You · Button')).toBeVisible();
	// Limp, so the hand goes on past the first decision.
	await place(page, 'call').click();
	session = takeAction(solution, session, Action.call());
	const played = playCurrent(solution, session);
	const board = await page.getByTestId('board').innerHTML();
	if (played.waiting) {
		await page.reload();
		await expect(page.getByTestId('your-turn')).toBeVisible();
		expect(await page.getByTestId('board').innerHTML()).toBe(board);
		await expectPanel(page, legalActions(played.state));
		while (playCurrent(solution, session).waiting) {
			await place(page, 'call').click();
			const legal = legalActions(playCurrent(solution, session).state);
			session = takeAction(solution, session, legal.canCheck ? Action.check() : Action.call());
		}
	}
	const sent = page.waitForRequest((r) => r.url().endsWith('/api/hands') && r.method() === 'POST');
	await page.getByRole('button', { name: 'Next hand' }).click();
	const body = (await sent).postDataJSON() as { key: string; stack: number; player: number };
	expect(body).toMatchObject({ key: `${seed}:0`, stack: 12, player: session.player });
	await expect(page.getByText('You · Big blind')).toBeVisible();
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBe(0);
});

test('the hands endpoint replays each hand and refuses an action the engine does not offer', async ({
	request
}) => {
	const solution = sliceSolution(whole, 'jof-10bb');
	let session = newPracticeSession(10, 0);
	session = nextHand(solution, takeAction(solution, session, Action.raiseTo(1000)));
	const upload = uploadOf(session, session.finished[0]);
	const post = (data: unknown) => request.post('/api/hands', { data });

	// A hand the table played passes the check; the test server has no database.
	const valid = await post(upload);
	expect(valid.status()).toBe(503);
	expect(await valid.json()).toMatchObject({ stored: false });

	// A raise past the stack, a check facing the big blind, an action after the end.
	const actions = upload.history.actions as object[];
	for (const tampered of [
		[{ action: 'raise', amount: 1500 }, { action: 'call' }],
		[{ action: 'check' }],
		[...actions, { action: 'fold' }]
	]) {
		const response = await post({ ...upload, history: { ...upload.history, actions: tampered } });
		expect(response.status()).toBe(422);
	}
	expect((await post({ ...upload, history: { ...upload.history, actions: [] } })).status()).toBe(
		422
	);
	expect((await post({ ...upload, stack: 9 })).status()).toBe(400);
	expect(
		(
			await request.post('/api/hands', {
				data: 'not json',
				headers: { 'content-type': 'application/json' }
			})
		).status()
	).toBe(400);
	expect((await post({ ...upload, key: 'x'.repeat(40_000) })).status()).toBe(413);
});
