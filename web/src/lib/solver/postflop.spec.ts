// P5.1: post-flop river spots built through the engine. Every path of the tree
// replays on the engine with the same amounts, card removal is exact, and the
// payoffs follow from the chips, checked by hand on small spots.

import { describe, expect, it } from 'vitest';
import { cards } from '../engine/cards.ts';
import { evaluate } from '../engine/evaluator.ts';
import { apply, finalStacks, legalActions, allows, type HandState } from '../engine/state.ts';
import { actionValues, exploitability, gameValue, solve } from './cfr.ts';
import { terminal, uniformStrategy, validateGame, type GameNode } from './game.ts';
import {
	buildRiver,
	buildSpot,
	riverStart,
	spotStart,
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
			if (node.kind === 'terminal' || node.kind === 'showdown') {
				expect(state.result).not.toBeNull();
				leaves++;
				return;
			}
			if (node.kind === 'chance') throw new Error('a river spot deals no cards');
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
		// Called: the big blind wins 500 (half the pot) + 750, with the stronger hand.
		if (called.kind !== 'showdown') throw new Error('no showdown');
		expect(called.scale).toBe(1250);
		expect(called.table.rank[0][0]).toBeLessThan(called.table.rank[1][0]);
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

describe('the linear showdown', () => {
	it('gives the same values and best responses as a plain matrix of who wins', () => {
		const sp = spot({
			ranges: [
				[combo('AhKh'), combo('QcQd'), combo('8c8d'), combo('As9s'), combo('Ah9h', 0.5)],
				[combo('AcKd'), combo('6d4d'), combo('JhTh'), combo('9h9c'), combo('Ks2s'), combo('Kh9h')]
			]
		});
		const { game } = buildRiver(sp);
		// The same game written the old way: each showdown a matrix of +1, 0
		// and −1 from the evaluator, no card deal, so every sum runs over pairs.
		const [n0, n1] = game.types;
		const rank = (name: string) => evaluate([...cards(name), ...BOARD]);
		const wins = new Float64Array(n0 * n1);
		for (let i = 0; i < n0; i++) {
			for (let j = 0; j < n1; j++) {
				wins[i * n1 + j] = Math.sign(rank(game.typeNames[1][j]) - rank(game.typeNames[0][i]));
			}
		}
		const plain = (node: GameNode): GameNode => {
			if (node.kind === 'showdown') return terminal(wins, node.scale);
			if (node.kind !== 'decision') return node;
			return { ...node, children: node.children.map(plain) };
		};
		const naive = { ...game, root: plain(game.root), deal: undefined };
		const { average } = solve(game, { iterations: 300 });
		for (const s of [uniformStrategy(game), average]) {
			const a = exploitability(game, s);
			const b = exploitability(naive, s);
			// Chips, in the thousands: agreement to a millionth of a chip.
			expect(a.value).toBeCloseTo(b.value, 6);
			expect(a.bestResponse[0]).toBeCloseTo(b.bestResponse[0], 6);
			expect(a.bestResponse[1]).toBeCloseTo(b.bestResponse[1], 6);
			const va = actionValues(game, s);
			const vb = actionValues(naive, s);
			for (const [id, x] of va) {
				const y = vb.get(id)!;
				x.mass.forEach((m, t) => expect(m).toBeCloseTo(y.mass[t], 12));
				x.values.forEach((v, i) => {
					if (Number.isNaN(v)) expect(y.values[i]).toBeNaN();
					else expect(v).toBeCloseTo(y.values[i], 6);
				});
			}
		}
	});
});

describe('buildSpot with chance cards', () => {
	const TURN = cards('As Ks Qd 2c');
	const checks = { betSizes: [], raiseSizes: [], maxBets: 0 } as const;

	it('values a turn checked down as worked out by hand', () => {
		// Broadway straight (JhTh) against a set of aces (AhAd) on As Ks Qd 2c.
		// 44 river cards are unseen. The aces fill up or make quads with Ac,
		// Kh Kd Kc, Qh Qs Qc or 2h 2d 2s: 10 cards; the straight holds on the
		// other 34. Pot 1000: the big blind is worth 500 × (34 − 10) / 44.
		const { game } = buildSpot(
			spot({ board: TURN, ranges: [[combo('JhTh')], [combo('AhAd')]], ...checks })
		);
		expect(gameValue(game, uniformStrategy(game))).toBeCloseTo((500 * 24) / 44, 9);
	});

	it('values each hand as an enumeration of every river and every opposing hand', () => {
		const ranges: RiverSpot['ranges'] = [
			[combo('JhTh'), combo('AhQh', 0.5), combo('3c3d'), combo('Kc2d'), combo('8s7s')],
			[combo('AhAd'), combo('KdQc'), combo('JcTc', 0.7), combo('Th9h'), combo('3h3s')]
		];
		const { game } = buildSpot(spot({ board: TURN, ranges, ...checks }));
		const values = actionValues(game, uniformStrategy(game)).get('root')!;
		const deck = Array.from({ length: 52 }, (_, c) => c);
		ranges[0].forEach((mine, t) => {
			let total = 0;
			let weight = 0;
			for (const theirs of ranges[1]) {
				const used = [...TURN, ...mine.cards, ...theirs.cards];
				if (new Set(used).size !== 8) continue;
				const w = mine.weight * theirs.weight;
				weight += w;
				const rivers = deck.filter((c) => !used.includes(c));
				expect(rivers).toHaveLength(44);
				for (const c of rivers) {
					const a = evaluate([...mine.cards, ...TURN, c]);
					const b = evaluate([...theirs.cards, ...TURN, c]);
					total += (w / 44) * 500 * Math.sign(b - a);
				}
			}
			expect(values.values[t]).toBeCloseTo(total / weight, 9);
		});
	});

	it('deals the turn and the river on the flop, each pair of cards once per order', () => {
		const flop = cards('As Ks Qd');
		const ranges: RiverSpot['ranges'] = [
			[combo('JhTh'), combo('3c3d')],
			[combo('AhAd'), combo('Th9h')]
		];
		const { game } = buildSpot(spot({ board: flop, ranges, ...checks }));
		const deck = Array.from({ length: 52 }, (_, c) => c);
		let expected = 0;
		for (const mine of ranges[0]) {
			for (const theirs of ranges[1]) {
				const used = [...flop, ...mine.cards, ...theirs.cards];
				if (new Set(used).size !== 7) continue;
				const rest = deck.filter((c) => !used.includes(c));
				expect(rest).toHaveLength(45);
				for (const turn of rest) {
					for (const river of rest) {
						if (river === turn) continue;
						const board = [...flop, turn, river];
						const a = evaluate([...mine.cards, ...board]);
						const b = evaluate([...theirs.cards, ...board]);
						expected += Math.sign(b - a) * 500 * (1 / 45) * (1 / 44);
					}
				}
			}
		}
		// Three of the four pairs can be dealt (JhTh and Th9h share the Th).
		expect(gameValue(game, uniformStrategy(game))).toBeCloseTo(expected / 3, 9);
	});

	it('runs out the board after an all-in on the turn, at what the chips say', () => {
		const sp = spot({
			board: TURN,
			ranges: [[combo('JhTh'), combo('3c3d')], [combo('AhAd')]],
			betSizes: [],
			raiseSizes: [],
			maxBets: 1
		});
		const { game } = buildSpot(sp);
		const root = game.root;
		if (root.kind !== 'decision') throw new Error('no decision');
		expect(root.actions).toEqual(['check', 'allin9750']);
		const shove = root.children[1];
		if (shove.kind !== 'decision') throw new Error('no decision');
		const called = shove.children[shove.actions.indexOf('call')];
		if (called.kind !== 'chance') throw new Error('no runout');
		expect(called.cards).toHaveLength(48);
		expect(called.weight).toBe(1 / 44);
		for (const child of called.children) {
			expect(child.kind === 'showdown' && child.scale).toBe(500 + 9750);
		}
		// The button's value of calling with the aces, given a shove made half
		// the time with each hand: 500 + 9,750 = 10,250 chips at stake. Against
		// the straight the aces win on 10 of 44 rivers and lose on 34; against
		// 3c3d they win on all 44 (a set of threes still loses to the aces,
		// and no straight is possible without both a 4 and a 5).
		const v = actionValues(game, uniformStrategy(game)).get(shove.id)!;
		const call = shove.actions.indexOf('call');
		const k = shove.actions.length;
		const vsStraight = (10250 * (10 - 34)) / 44;
		const vsThrees = 10250;
		expect(v.values[0 * k + call]).toBeCloseTo((vsStraight + vsThrees) / 2, 9);
	});

	it('replays every path on the engine, with the dealt card on the board below it', () => {
		const sp = spot({
			board: TURN,
			ranges: [[combo('JhTh')], [combo('AhAd')]],
			betSizes: [0.5],
			raiseSizes: [],
			maxBets: 1
		});
		const built = buildSpot(sp);
		let deals = 0;
		const walk = (node: GameNode, state: HandState | null, board: readonly number[]) => {
			if (node.kind === 'terminal' || node.kind === 'showdown') return;
			if (node.kind === 'chance') {
				deals += node.cards.length;
				expect(node.cards).toHaveLength(52 - board.length);
				node.children.forEach((child, i) => walk(child, null, [...board, node.cards[i]]));
				return;
			}
			const s = built.states.get(node.id)!;
			expect(s.board).toEqual(board);
			if (state !== null) expect(s).toEqual(state);
			const offered = treeActions(sp, s);
			expect(offered.map((o) => o.name)).toEqual(node.actions);
			const legal = legalActions(s);
			offered.forEach(({ action }, i) => {
				expect(allows(legal, action)).toBe(true);
				const next = apply(s, action);
				walk(node.children[i], next.street === s.street ? next : null, board);
			});
		};
		walk(built.game.root, spotStart(sp), TURN);
		expect(deals).toBeGreaterThan(48);
		validateGame(built.game);
	});

	it('solves a small turn spot to a near-equilibrium', () => {
		const { game } = buildSpot(
			spot({
				board: TURN,
				ranges: [
					[combo('JhTh'), combo('3c3d'), combo('Kc2d'), combo('8s7s')],
					[combo('AhAd'), combo('KdQc'), combo('Th9h'), combo('6h5h')]
				],
				betSizes: [0.75],
				raiseSizes: [],
				maxBets: 2
			})
		);
		const { average } = solve(game, { iterations: 400 });
		expect(exploitability(game, average).exploitability).toBeLessThan(0.005 * 1000);
	});
});
