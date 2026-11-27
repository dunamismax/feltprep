import { describe, expect, it } from 'vitest';
import { Action, legalActions, options } from '../engine/state.ts';
import { jamOrFoldAt } from '../server/solutions.ts';
import { CLASSES, classIndex } from '../solver/classes.ts';
import { cards } from '../engine/cards.ts';
import {
	BIG_BLIND,
	TARGETED_LENGTH,
	dealDrill,
	holesText,
	judge,
	parseHoles,
	targetQuery,
	targetedPlan,
	type DrillDeal
} from './jam-or-fold.ts';

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

describe('a drill of one spot', () => {
	const kd5c = cards('Kd5c') as [number, number];

	it('deals exactly the chosen cards, from both seats and both buttons', () => {
		const buttons = new Set<number>();
		for (const seat of ['button', 'big-blind'] as const) {
			for (let i = 0; i < 20; i++) {
				const deal = dealDrill(31, i, 12, seat, kd5c);
				expect(deal.seat).toBe(seat);
				expect([...deal.state.holeCards[deal.player]!].sort()).toEqual([...kd5c].sort());
				expect(deal.hand).toBe('K5o');
				expect(new Set(deal.state.deck).size).toBe(52);
				buttons.add(deal.state.button);
				if (seat === 'big-blind') expect(deal.state.actions[0]).toMatchObject({ allIn: true });
			}
		}
		expect(buttons).toEqual(new Set([0, 1]));
		expect(dealDrill(31, 4, 12, 'button', kd5c).state).toEqual(
			dealDrill(31, 4, 12, 'button', kd5c).state
		);
	});

	it('plans the decision first, then neighbours whose best action differs, then random hands', async () => {
		const at12 = await jamOrFoldAt(12);
		const plan = targetedPlan(at12, 12, 'big-blind', kd5c, 77);
		expect(plan).toHaveLength(TARGETED_LENGTH);
		expect(plan[0]).toEqual(kd5c);
		const table = at12.solution.decisions.find((d) => d.spot === 'jof-12bb-big-blind')!;
		const best = (name: string) => {
			const v = table.values[table.hands.indexOf(name)];
			return v.indexOf(Math.max(...v));
		};
		const target = CLASSES[classIndex(kd5c[0], kd5c[1])];
		for (let i = 1; i < TARGETED_LENGTH; i++) {
			const h = plan[i];
			if (i % 2 === 0) {
				expect(h).toBeNull();
				continue;
			}
			expect(h).not.toBeNull();
			const c = CLASSES[classIndex(h![0], h![1])];
			expect(c.name).not.toBe('K5o');
			expect(best(c.name)).not.toBe(best('K5o'));
			expect(
				Math.max(Math.abs(c.row - target.row), Math.abs(c.col - target.col))
			).toBeLessThanOrEqual(3);
		}
		expect(targetedPlan(at12, 12, 'big-blind', kd5c, 77)).toEqual(plan);
	});

	it('reads and writes the cards in a link, and nothing else', () => {
		expect(holesText(kd5c)).toBe('Kd5c');
		expect(parseHoles('Kd5c')).toEqual(kd5c);
		for (const bad of [null, '', 'KdKd', 'Kd5', 'Kd5cAs', 'Xd5c', '10d5c']) {
			expect(parseHoles(bad)).toBeNull();
		}
		expect(targetQuery('big-blind', kd5c, 'practice')).toBe(
			'?seat=big-blind&cards=Kd5c&from=practice'
		);
		expect(targetQuery('button', kd5c, null)).toBe('?seat=button&cards=Kd5c');
	});
});
