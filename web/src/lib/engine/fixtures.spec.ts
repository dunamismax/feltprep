// FeltPrep's hand-worked fixtures (fixtures.ts), and the rule that heads-up
// play never makes an odd chip while the imported fixtures that need three or
// more players keep covering odd chips (rule 11.2).

import { describe, expect, it } from 'vitest';
import { cards } from './cards.ts';
import { checkState } from './fuzz.ts';
import { HAND_FIXTURES, fixtureStates } from './fixtures.ts';
import { finalStacks, isOver } from './state.ts';
import { ruleHand, ruleHandStates } from './testing.ts';

const total = (stacks: readonly (number | null)[]) =>
	stacks.reduce<number>((sum, s) => sum + (s ?? 0), 0);

describe('FeltPrep’s hand-worked fixtures', () => {
	it('are named once each', () => {
		expect(new Set(HAND_FIXTURES.map((f) => f.name)).size).toBe(HAND_FIXTURES.length);
	});

	it.each(HAND_FIXTURES.map((f) => [`${f.name} (rules ${f.rules.join(', ')})`, f] as const))(
		'%s',
		(_, fixture) => {
			const states = fixtureStates(fixture);
			for (const state of states) checkState(state, total(fixture.stacks));
			const first = states[0];
			const state = states.at(-1)!;
			const want = fixture.expect;
			expect(isOver(state)).toBe(true);
			if (want.button !== undefined) expect(first.button).toBe(want.button);
			if (want.smallBlind !== undefined) expect(first.smallBlindSeat).toBe(want.smallBlind);
			if (want.bigBlind !== undefined) expect(first.bigBlindSeat).toBe(want.bigBlind);
			if (want.deckTop !== undefined) {
				const top = cards(want.deckTop);
				expect(first.deck.slice(0, top.length)).toEqual(top);
			}
			for (const [seat, text] of Object.entries(want.holes ?? {})) {
				expect(first.holeCards[Number(seat)]).toEqual(cards(text));
			}
			if (want.board !== undefined)
				expect(state.board).toEqual(want.board ? cards(want.board) : []);
			expect(total(want.final)).toBe(total(fixture.stacks));
			expect(finalStacks(state)).toEqual(want.final);
			const result = state.result!;
			expect(result.pots.map((p) => [p.amount, p.winners])).toEqual(want.pots);
			for (const pot of result.pots) expect(pot.shares.reduce((a, b) => a + b, 0)).toBe(pot.amount);
			expect(result.uncalled).toEqual(want.uncalled);
			expect(result.shown).toEqual(want.shown);
			expect(result.mucked).toEqual(want.mucked);
			expect(result.tabled).toBe(want.tabled);
		}
	);

	it('include at least eight heads-up hands at 2 to 15 big blinds, and one below', () => {
		const headsUp = HAND_FIXTURES.filter((f) => f.stacks.filter((s) => s).length === 2);
		const bigBlind = (f: (typeof HAND_FIXTURES)[number]) => (f.blinds ?? [50, 100])[1];
		const inRange = headsUp.filter((f) =>
			f.stacks.every((s) => s === null || (s >= 2 * bigBlind(f) && s <= 15 * bigBlind(f)))
		);
		expect(inRange.length).toBeGreaterThanOrEqual(8);
		expect(headsUp.some((f) => f.stacks.some((s) => s !== null && s < bigBlind(f)))).toBe(true);
	});

	it('cover both button positions and each seat winning heads-up', () => {
		const headsUp = HAND_FIXTURES.filter((f) => f.stacks.length === 2);
		expect(new Set(headsUp.map((f) => f.button))).toEqual(new Set([0, 1]));
		const winners = headsUp.flatMap((f) =>
			f.expect.pots.flatMap(([, w]) => (w.length === 1 ? w : []))
		);
		expect(new Set(winners)).toEqual(new Set([0, 1]));
		expect(headsUp.some((f) => f.expect.pots.some(([, w]) => w.length === 2))).toBe(true);
	});
});

describe('odd chips (rule 11.2)', () => {
	it('never arise heads-up: every split pot in a two-player fixture divides evenly', () => {
		for (const fixture of HAND_FIXTURES.filter((f) => f.stacks.filter((s) => s).length === 2)) {
			const result = fixtureStates(fixture).at(-1)!.result!;
			for (const pot of result.pots) {
				expect(new Set(pot.shares).size).toBe(1);
				expect(pot.amount % pot.winners.length).toBe(0);
			}
		}
	});

	it.each(['odd chip goes left of the button', 'three-way split with two odd chips'])(
		'stay covered by the imported fixture “%s”, with three or more players',
		(name) => {
			const fixture = ruleHand(name);
			expect(fixture.stacks.filter((s) => s).length).toBeGreaterThanOrEqual(3);
			const result = ruleHandStates(fixture).at(-1)!.result!;
			expect(finalStacks(ruleHandStates(fixture).at(-1)!)).toEqual(fixture.final);
			expect(result.pots.some((p) => new Set(p.shares).size > 1)).toBe(true);
		}
	);
});
