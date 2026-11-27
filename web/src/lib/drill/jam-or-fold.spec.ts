import { describe, expect, it } from 'vitest';
import { Action, legalActions, options } from '../engine/state.ts';
import { jamOrFoldAt } from '../server/solutions.ts';
import { BIG_BLIND, dealDrill, judge, reason, type DrillDeal } from './jam-or-fold.ts';

const solution = await jamOrFoldAt(10);

/** The first deal of a seed whose hand is `hand`, for tests that need a given class. */
function find(hand: string, seat: 'button' | 'big-blind', stack = 10): DrillDeal {
	for (let i = 0; i < 20000; i++) {
		const deal = dealDrill(7, i, stack, seat);
		if (deal.hand === hand) return deal;
	}
	throw new Error(`no ${hand} dealt`);
}

describe('dealDrill', () => {
	it('deals the same hand for the same seed and index, and others otherwise', () => {
		const a = dealDrill(42, 3, 10, 'both');
		expect(dealDrill(42, 3, 10, 'both').state).toEqual(a.state);
		expect(dealDrill(42, 4, 10, 'both').state.deck).not.toEqual(a.state.deck);
		expect(dealDrill(43, 3, 10, 'both').state.deck).not.toEqual(a.state.deck);
	});

	it('stops at the button’s first decision with the blinds posted', () => {
		const deal = dealDrill(1, 0, 10, 'button');
		expect(deal.seat).toBe('button');
		expect(deal.player).toBe(deal.state.button);
		expect(deal.state.actions).toEqual([]);
		expect(deal.state.startingStacks).toEqual([10 * BIG_BLIND, 10 * BIG_BLIND]);
		expect(legalActions(deal.state).maxTo).toBe(10 * BIG_BLIND);
	});

	it('stops at the big blind facing an all-in', () => {
		const deal = dealDrill(1, 0, 12, 'big-blind');
		expect(deal.player).not.toBe(deal.state.button);
		expect(deal.state.actions).toHaveLength(1);
		expect(deal.state.actions[0]).toMatchObject({ kind: 'raise', to: 1200, allIn: true });
		const legal = legalActions(deal.state);
		expect(legal.canFold).toBe(true);
		expect(legal.call).toBe(1100);
		expect(legal.raiseKind).toBeNull();
	});

	it('uses both seats of the engine and both roles when mixed', () => {
		const deals = Array.from({ length: 64 }, (_, i) => dealDrill(9, i, 10, 'both'));
		expect(new Set(deals.map((d) => d.player))).toEqual(new Set([0, 1]));
		expect(new Set(deals.map((d) => d.seat))).toEqual(new Set(['button', 'big-blind']));
	});

	it('names the hand dealt by its class', () => {
		for (let i = 0; i < 50; i++) {
			const deal = dealDrill(5, i, 10, 'both');
			const [a, b] = deal.state.holeCards[deal.player]!;
			const [hi, lo] = [a, b].sort((x, y) => y - x);
			const ranks = '23456789TJQKA'[hi >> 2] + '23456789TJQKA'[lo >> 2];
			const kind = hi >> 2 === lo >> 2 ? '' : (hi & 3) === (lo & 3) ? 's' : 'o';
			expect(deal.hand).toBe(ranks + kind);
		}
	});
});

describe('judge', () => {
	// B-9's bound: folding AA on the button loses at least the 1.5 pot, a mistake.
	it('marks folding aces on the button a mistake', () => {
		const verdict = judge(solution, find('AA', 'button'), Action.fold());
		expect(verdict).toMatchObject({ graded: true, band: 'mistake', best: 'jam' });
		if (verdict.graded) expect(verdict.loss).toBeGreaterThanOrEqual(1.5);
	});

	it('accepts jamming aces, at no loss', () => {
		const deal = find('AA', 'button');
		const verdict = judge(solution, deal, Action.raiseTo(legalActions(deal.state).maxTo));
		expect(verdict).toMatchObject({ graded: true, band: 'acceptable', loss: 0, action: 'jam' });
	});

	it('grades the big blind’s call or fold', () => {
		const deal = find('72o', 'big-blind');
		expect(judge(solution, deal, Action.fold())).toMatchObject({
			graded: true,
			band: 'acceptable',
			action: 'fold'
		});
		expect(judge(solution, deal, Action.call())).toMatchObject({ graded: true, action: 'call' });
	});

	it('does not grade a limp or a smaller raise, which leave the game', () => {
		const deal = find('KQs', 'button');
		for (const action of [Action.call(), Action.raiseTo(250)]) {
			expect(judge(solution, deal, action)).toMatchObject({
				graded: false,
				reason: 'action-outside-game'
			});
		}
	});

	it('refuses an action the engine does not offer', () => {
		const deal = find('KQs', 'big-blind');
		expect(() => judge(solution, deal, Action.raiseTo(2000))).toThrow(RangeError);
		expect(() => judge(solution, deal, Action.check())).toThrow(RangeError);
	});

	it('answers every action the engine offers, from both seats', () => {
		for (let i = 0; i < 200; i++) {
			const deal = dealDrill(11, i, 10, 'both');
			for (const action of options(legalActions(deal.state))) {
				expect(() => judge(solution, deal, action)).not.toThrow();
			}
		}
	});
});

describe('reason', () => {
	it('names the better action and the cost', () => {
		const text = reason(judge(solution, find('AA', 'button'), Action.fold()));
		expect(text).toMatch(
			/^With AA, folding −0\.50 bb and jamming \+\d+\.\d\d bb: folding gives up/
		);
	});

	it('says why a right answer is right', () => {
		const deal = find('AA', 'button');
		const text = reason(judge(solution, deal, Action.raiseTo(1000)));
		expect(text).toMatch(/so jamming is the play\.$/);
	});

	it('passes on the reason a decision is not graded', () => {
		expect(reason(judge(solution, find('KQs', 'button'), Action.call()))).toMatch(/limp/);
	});
});
