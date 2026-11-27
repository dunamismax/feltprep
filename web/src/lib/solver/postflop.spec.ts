// P5.1: post-flop river spots built through the engine. Every path of the tree
// replays on the engine with the same amounts, card removal is exact, and the
// payoffs follow from the chips, checked by hand on small spots.

import { describe, expect, it } from 'vitest';
import { cards } from '../engine/cards.ts';
import { apply, finalStacks, legalActions, allows, type HandState } from '../engine/state.ts';
import { actionValues, exploitability, solve } from './cfr.ts';
import type { GameNode } from './game.ts';
import {
	buildRiver,
	riverStart,
	treeActions,
	type RiverSpot,
	type WeightedCombo
} from './postflop.ts';

const combo = (text: string, weight = 1): WeightedCombo => ({
	cards: cards(text) as [number, number],
	weight
});

const BOARD = cards('Ks 9d 5c 2h 7s');
const spot = (over: Partial<RiverSpot> = {}): RiverSpot => ({
	board: BOARD,
	pot: 1000,
	stack: 9750,
	bigBlind: 100,
	ranges: [
		[combo('AhKh'), combo('QcQd'), combo('8c8d'), combo('As9s')],
		[combo('AcKd'), combo('6d4d'), combo('JhTh'), combo('9h9c'), combo('Ks2s')]
	],
	betSizes: [0.33, 0.75],
	raiseSizes: [1],
	maxBets: 3,
	...over
});

describe('riverStart', () => {
	it('reaches the river with the stated pot, stacks and board, the big blind to act', () => {
		const s = riverStart(spot());
		expect(s.street).toBe(3);
		expect(s.board).toEqual(BOARD);
		expect(s.contributions).toEqual([500, 500]);
		expect(s.stacks).toEqual([9750, 9750]);
		expect(s.toAct).toBe(0);
	});
});

describe('buildRiver', () => {
	it('offers only what the engine allows, on every path, ending where the engine ends', () => {
		const sp = spot();
		const built = buildRiver(sp);
		let leaves = 0;
		const walk = (node: GameNode, state: HandState) => {
			if (node.kind === 'terminal') {
				expect(state.result).not.toBeNull();
				leaves++;
				return;
			}
			expect(state.result).toBeNull();
			expect(built.states.get(node.id)).toEqual(state);
			const offered = treeActions(sp, state);
			expect(offered.map((o) => o.name)).toEqual(node.actions);
			const legal = legalActions(state);
			offered.forEach(({ action }, i) => {
				expect(allows(legal, action)).toBe(true);
				walk(node.children[i], apply(state, action));
			});
		};
		walk(built.game.root, riverStart(sp));
		expect(leaves).toBeGreaterThan(10);
		// Sizes: a third of 1000 is 330, three quarters 750, and all-in 9,750.
		expect(built.game.root.kind === 'decision' && built.game.root.actions).toEqual([
			'check',
			'bet330',
			'bet750',
			'allin9750'
		]);
	});

	it('clamps a size below the minimum bet and merges repeats', () => {
		const built = buildRiver(spot({ betSizes: [0.01, 0.05, 0.75], stack: 700 }));
		// 1% and 5% of 1000 are below the 100-chip minimum: one bet of 100; 75% is all-in at 700.
		expect(built.game.root.kind === 'decision' && built.game.root.actions).toEqual([
			'check',
			'bet100',
			'allin700'
		]);
	});

	it('deals only combinations the board allows, never two that share a card', () => {
		const sp = spot({
			ranges: [
				[combo('AhKh'), combo('Ks2c'), combo('QcQd', 0.5)],
				[combo('AcKd'), combo('QsQh'), combo('AhQh')]
			]
		});
		const { game } = buildRiver(sp);
		// Ks2c touches the board (Ks); AhKh and AhQh share the Ah.
		expect(game.typeNames).toEqual([
			['AhKh', 'QcQd'],
			['AcKd', 'QsQh', 'AhQh']
		]);
		// Separately: pairs dealable, with weights 1 or 0.5, normalised.
		const w = [
			[1, 1, 0],
			[0.5, 0.5, 0.5]
		];
		const total = w.flat().reduce((a, b) => a + b, 0);
		expect([...game.prior]).toEqual(w.flat().map((x) => x / total));
	});

	it('pays what the chips say, at a fold and at a showdown', () => {
		// AhKh (top pair) against 6d4d (nothing): the big blind bets 750 and is called.
		const sp = spot({
			ranges: [[combo('AhKh')], [combo('6d4d')]],
			betSizes: [0.75],
			raiseSizes: []
		});
		const { game } = buildRiver(sp);
		const root = game.root;
		if (root.kind !== 'decision') throw new Error('no decision');
		const bet = root.children[root.actions.indexOf('bet750')];
		if (bet.kind !== 'decision') throw new Error('no decision');
		const called = bet.children[bet.actions.indexOf('call')];
		const folded = bet.children[bet.actions.indexOf('fold')];
		// Called: the big blind wins 500 (half the pot) + 750; scale × (+1).
		expect(called.kind === 'terminal' && called.scale).toBe(1250);
		expect(called.kind === 'terminal' && (called.payoff as Float64Array)[0]).toBe(1);
		// Folded: the button gives up half the pot, the bet comes back.
		expect(folded.kind === 'terminal' && folded.payoff).toBe(500);
		// The engine agrees on the chips: the big blind ends 1,250 up on the river.
		let s = riverStart(sp);
		s = apply(s, treeActions(sp, s)[1].action);
		s = apply(s, treeActions(sp, s).find((a) => a.name === 'call')!.action);
		expect(finalStacks(s)[0]! - 10250).toBe(1250);
	});

	it('solves a small spot to a near-equilibrium whose values add up', () => {
		const { game } = buildRiver(spot());
		const { average } = solve(game, { iterations: 2000 });
		const e = exploitability(game, average);
		expect(e.exploitability).toBeLessThan(0.002 * 1000);
		expect(actionValues(game, average).size).toBeGreaterThan(5);
	});
});
