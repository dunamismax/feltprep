// Benchmarks B-1 to B-3 (BUILD.md, Gate B) and the solver's basic contract.
// Every expected value comes from outside the code under test: Kuhn's
// closed-form solution, derivations written out here, and the closed form of
// the polarized river game.

import { describe, expect, it } from 'vitest';
import { kuhnPoker, polarizedRiver } from './benchmark-games.ts';
import { actionValues, bestResponse, exploitability, gameValue, solve } from './cfr.ts';
import {
	decision,
	strategyFrom,
	terminal,
	validateGame,
	type Decision,
	type Game
} from './game.ts';

const rows =
	(table: Record<string, readonly (readonly number[])[]>) => (node: Decision, type: number) =>
		table[node.id][type];

describe('games', () => {
	it('accepts the benchmark games and rejects malformed ones', () => {
		validateGame(kuhnPoker());
		validateGame(polarizedRiver({ pot: 1, bet: 1, nuts: 2, air: 2, catchers: 1 }));
		const bad: Game = { ...kuhnPoker(), prior: new Float64Array(9).fill(0.2) };
		expect(() => validateGame(bad)).toThrow(/sums to/);
		const twice: Game = {
			...kuhnPoker(),
			root: decision('x', 0, [
				['a', decision('x', 1, [['b', terminal(0)]])],
				['c', terminal(0)]
			])
		};
		expect(() => validateGame(twice)).toThrow(/used twice/);
	});
});

describe('B-2: the best-response evaluator against hand-derived values', () => {
	it('Kuhn poker when both players only check and call', () => {
		// Every hand goes check-check to showdown, so the game is worth 0.
		// Player 0's best response (player 1 checks behind and calls any bet):
		// K bets and is called, +2 (checking wins only 1); Q gains 0 either way
		// (+2 or -2 when betting, +1 or -1 when checking, each half the time);
		// J checks and loses 1 (a bet loses 2). (2 + 0 - 1) / 3 = 1/3.
		// Player 1's (player 0 checks and calls any bet) is the mirror: K bets
		// after the check for +2, Q gains 0, J checks for -1: also 1/3.
		const game = kuhnPoker();
		const passive = strategyFrom(
			game,
			rows({
				p0: [
					[1, 0],
					[1, 0],
					[1, 0]
				],
				'p1-after-check': [
					[1, 0],
					[1, 0],
					[1, 0]
				],
				'p0-facing-bet': [
					[0, 1],
					[0, 1],
					[0, 1]
				],
				'p1-facing-bet': [
					[0, 1],
					[0, 1],
					[0, 1]
				]
			})
		);
		const e = exploitability(game, passive);
		expect(e.value).toBeCloseTo(0, 12);
		expect(e.bestResponse[0]).toBeCloseTo(1 / 3, 12);
		expect(e.bestResponse[1]).toBeCloseTo(1 / 3, 12);
		expect(e.nashConv).toBeCloseTo(2 / 3, 12);
		// The responders' choices: player 0 bets only the king.
		const br0 = bestResponse(game, passive, 0).strategy.get('p0');
		expect(Array.from(br0 as Float64Array)).toEqual([1, 0, 1, 0, 0, 1].map((x) => x));
	});

	it('Kuhn poker at a published equilibrium: nobody gains by deviating', () => {
		// Kuhn's solution with alpha = 0: player 0 checks every card, folds J to a
		// bet, calls with Q a third of the time and always with K; player 1 bets
		// K and a third of its Js after a check, and calls a bet with K always
		// and Q a third of the time. Player 0's value is -1/18.
		const game = kuhnPoker();
		const third = 1 / 3;
		const eq = strategyFrom(
			game,
			rows({
				p0: [
					[1, 0],
					[1, 0],
					[1, 0]
				],
				'p0-facing-bet': [
					[1, 0],
					[1 - third, third],
					[0, 1]
				],
				'p1-after-check': [
					[1 - third, third],
					[1, 0],
					[0, 1]
				],
				'p1-facing-bet': [
					[1, 0],
					[1 - third, third],
					[0, 1]
				]
			})
		);
		const e = exploitability(game, eq);
		expect(e.value).toBeCloseTo(-1 / 18, 12);
		expect(e.bestResponse[0]).toBeCloseTo(-1 / 18, 12);
		expect(e.bestResponse[1]).toBeCloseTo(1 / 18, 12);
		expect(e.nashConv).toBeCloseTo(0, 12);
	});

	it('a three-hand river game with fixed strategies', () => {
		// Pot 2 (1 from each player), bet 1. The bettor holds H (beats M) or L
		// (loses to M) with even chances; the caller holds M. The bettor bets H
		// always and L a quarter of the time; the caller calls half the time.
		//   H bets:  1/2 x (+2) + 1/2 x (+1) = 1.5
		//   L bets:  1/2 x (-2) + 1/2 x (+1) = -0.5; L checks: -1
		//   value:   1/2 x 1.5 + 1/2 x (1/4 x -0.5 + 3/4 x -1) = 0.3125
		// Bettor's best response: bet both (1.5 and -0.5 beat 1 and -1): 0.5.
		// Caller's best response, facing a bet: H weighs 1/2, L 1/8. Calling
		// pays -2 x 1/2 + 2 x 1/8 = -0.75, folding -1 x 5/8 = -0.625, so fold;
		// after a check (L, weight 3/8) it wins 1: -0.625 + 0.375 = -0.25.
		const game = polarizedRiver({ pot: 2, bet: 1, nuts: 1, air: 1, catchers: 1 });
		const fixed = strategyFrom(
			game,
			rows({
				bettor: [
					[0, 1],
					[0.75, 0.25]
				],
				caller: [[0.5, 0.5]]
			})
		);
		expect(gameValue(game, fixed)).toBeCloseTo(0.3125, 12);
		expect(bestResponse(game, fixed, 0).value).toBeCloseTo(0.5, 12);
		expect(bestResponse(game, fixed, 1).value).toBeCloseTo(-0.25, 12);
		expect(exploitability(game, fixed).nashConv).toBeCloseTo(0.25, 12);
	});

	it('gives each type’s value of each action at a decision', () => {
		// In the passive Kuhn profile a king that checks wins the ante (+1) and
		// one that bets is called (+2); a jack loses 1 by checking, 2 by betting.
		const game = kuhnPoker();
		const passive = strategyFrom(game, (node) => (node.id.includes('facing') ? [0, 1] : [1, 0]));
		const root = actionValues(game, passive).get('p0');
		expect(Array.from(root?.values ?? [])).toEqual([-1, -2, 0, 0, 1, 2]);
		expect(Array.from(root?.reach ?? [])).toEqual([1, 1, 1]);
		// Player 1's response to a bet is never reached: its values are NaN.
		const facing = actionValues(game, passive).get('p1-facing-bet');
		expect(Array.from(facing?.mass ?? [])).toEqual([0, 0, 0]);
		expect(Number.isNaN(facing?.values[0])).toBe(true);
	});
});

describe('B-1: CFR+ solves Kuhn poker', () => {
	const game = kuhnPoker();
	const { average } = solve(game, { iterations: 2_000 });
	const e = exploitability(game, average);

	it('reaches the value -1/18 within 0.001 and exploitability under 0.001', () => {
		expect(Math.abs(e.value - -1 / 18)).toBeLessThan(0.001);
		expect(e.exploitability).toBeLessThan(0.001);
	});

	it('is deterministic', () => {
		const again = solve(game, { iterations: 2_000 }).average;
		for (const [id, row] of average)
			expect(Array.from(again.get(id) ?? [])).toEqual(Array.from(row));
	});

	it('plays the shape of Kuhn’s solution', () => {
		// Player 1 always bets a king after a check and always folds a jack to a
		// bet; player 0 always calls with a king.
		expect(average.get('p1-after-check')?.[2 * 2 + 1]).toBeCloseTo(1, 3);
		expect(average.get('p1-facing-bet')?.[0]).toBeCloseTo(1, 3);
		expect(average.get('p0-facing-bet')?.[2 * 2 + 1]).toBeCloseTo(1, 3);
	});
});

describe('B-3: the polarized river game matches its closed form', () => {
	it.each([
		[1, 0.5],
		[1, 1],
		[1, 2],
		[3, 1]
	])('pot %d, bet %d', (pot, bet) => {
		const spec = { pot, bet, nuts: 3, air: 3, catchers: 2 };
		const game = polarizedRiver(spec);
		const { average } = solve(game, { iterations: 4_000 });
		const bettor = average.get('bettor') as Float64Array;
		const caller = average.get('caller') as Float64Array;
		let bets = 0;
		let bluffs = 0;
		for (let t = 0; t < 6; t++) {
			bets += bettor[t * 2 + 1];
			if (t >= spec.nuts) bluffs += bettor[t * 2 + 1];
		}
		const call = (caller[1] + caller[3]) / 2;
		const bluffShare = bet / (pot + 2 * bet);
		const callShare = pot / (pot + bet);
		expect(Math.abs(bluffs / bets - bluffShare)).toBeLessThan(0.005);
		expect(Math.abs(call - callShare)).toBeLessThan(0.005);
		// The nuts always bet; at equilibrium the value is
		// 1/2 (c (P/2 + B) + (1 - c) P/2) - 1/2 (P/2).
		for (let t = 0; t < spec.nuts; t++) expect(bettor[t * 2 + 1]).toBeCloseTo(1, 3);
		const value =
			0.5 * (callShare * (pot / 2 + bet) + (1 - callShare) * (pot / 2)) - 0.5 * (pot / 2);
		const e = exploitability(game, average);
		expect(Math.abs(e.value - value)).toBeLessThan(0.001 * pot);
		expect(e.exploitability).toBeLessThan(0.001 * pot);
	});
});
