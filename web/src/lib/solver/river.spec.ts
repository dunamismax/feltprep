// P5.2: the river solver on spots built through the engine.
//
// - B-3 through the builder: the polarized river game on a real board matches
//   its closed form (bluffs B / (P + 2B) of the bets, calls P / (P + B)).
// - The pairwise calculation of river-direct.ts against values worked out by
//   hand, and B-11 against it at every decision and every hand in range of a
//   small reference spot.
// - The reference spots as stated, and the committed manifest of their solves
//   (pnpm run river:bench) against them.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cards } from '../engine/cards.ts';
import { actionValues, exploitability, solve } from './cfr.ts';
import { decisions, uniformStrategy } from './game.ts';
import { DEFAULT_GRADING } from './grading.ts';
import { buildRiver, liveCombos, type RiverSpot } from './postflop.ts';
import { DirectRiver } from './river-direct.ts';
import { RIVER_SPOTS, riverSpot } from './river-spots.ts';
import { parseRange } from './ranges.ts';

const BOARD = cards('Ks 9d 5c 2h 7s');

describe('B-3 through the builder: the polarized river matches its closed form', () => {
	// The big blind holds the nuts (three sets of kings) or air (four-three,
	// which loses to every caller hand); the button holds bluff-catchers (queens),
	// which beat air and lose to the nuts. No hand of one group shares a card
	// with another, so every pair is equally likely, as the closed form assumes.
	// The one bet size equals the stack, so it merges with all-in and nobody can
	// raise. The button may bet after a check, but against a range of air that
	// gains nothing, so the game's equilibrium bets and calls as the closed form
	// says.
	it.each([
		[1000, 0.5],
		[1000, 1],
		[1000, 2]
	])('pot %i, bet %f of the pot', (pot, f) => {
		const bet = f * pot;
		const spot: RiverSpot = {
			board: BOARD,
			pot,
			stack: bet,
			bigBlind: 100,
			ranges: [parseRange('KcKd, KcKh, KdKh, 43'), parseRange('QQ')],
			betSizes: [f],
			raiseSizes: [],
			maxBets: 1
		};
		const built = buildRiver(spot);
		const { game } = built;
		const root = game.root;
		if (root.kind !== 'decision') throw new Error('no decision');
		expect(root.actions).toEqual(['check', `allin${bet}`]);
		const { average } = solve(game, { iterations: 4000 });
		const e = exploitability(game, average).exploitability;
		expect(e / pot).toBeLessThan(1e-3);

		const nuts = built.combos[0].map((c) => c.cards[0] >> 2 === 11);
		const sigma = average.get('root') as Float64Array;
		let bluffs = 0;
		let bets = 0;
		built.combos[0].forEach((c, t) => {
			bets += c.weight * sigma[t * 2 + 1];
			if (!nuts[t]) bluffs += c.weight * sigma[t * 2 + 1];
		});
		const facing = root.children[1];
		if (facing.kind !== 'decision') throw new Error('no decision');
		expect(facing.actions).toEqual(['fold', 'call']);
		const call = average.get(facing.id) as Float64Array;
		let calls = 0;
		built.combos[1].forEach((_, t) => (calls += call[t * 2 + 1] / built.combos[1].length));

		expect(Math.abs(bluffs / bets - bet / (pot + 2 * bet))).toBeLessThan(0.005);
		expect(Math.abs(calls - pot / (pot + bet))).toBeLessThan(0.005);
	});
});

describe('the pairwise calculation (river-direct.ts)', () => {
	// One hand each: the big blind's top pair (AhKh) against the button's
	// queens (QcQd), pot 1,000 and a stack of 1,000, so the only bet is all-in.
	// Under the uniform strategy every action is taken half the time:
	//   checking:  the button checks behind (+500, a showdown won) or bets, and
	//              the big blind folds (−500) or calls (+1,500): 0.5 × 500 +
	//              0.5 × (0.5 × −500 + 0.5 × 1,500) = 500
	//   all-in:    the button folds (+500) or calls (+1,500): 1,000
	// and the button with queens after a check: checking −500, betting
	// 0.5 × 500 + 0.5 × −1,500 = −500.
	const spot: RiverSpot = {
		board: BOARD,
		pot: 1000,
		stack: 1000,
		bigBlind: 100,
		ranges: [parseRange('AhKh'), parseRange('QcQd')],
		betSizes: [1],
		raiseSizes: [],
		maxBets: 1
	};
	const built = buildRiver(spot);
	const uniform = uniformStrategy(built.game);
	const direct = new DirectRiver(built, spot);

	it('equals the values worked out by hand', () => {
		expect(direct.values(uniform, 'root', 0)).toEqual([500, 1000]);
		expect(direct.values(uniform, '/check', 0)).toEqual([-500, -500]);
		expect(direct.cannotLose(uniform, 'root', 0)).toBe(true);
		expect(direct.cannotLose(uniform, '/check', 0)).toBe(false);
	});

	it('agrees with the solver’s evaluator on the same game', () => {
		const values = actionValues(built.game, uniform);
		expect(Array.from(values.get('root')?.values ?? [])).toEqual([500, 1000]);
		expect(Array.from(values.get('/check')?.values ?? [])).toEqual([-500, -500]);
	});
});

describe('B-11 on a reference spot: every hand in range at every decision', () => {
	// The smallest reference spot, solved briefly: B-11 compares values for the
	// strategy as it stands, so it needs no convergence.
	const ref = RIVER_SPOTS.find((s) => s.id === 'river-10');
	if (!ref) throw new Error('no river-10');
	const spot = riverSpot(ref);
	const built = buildRiver(spot);
	const { average } = solve(built.game, { iterations: 100 });
	const values = actionValues(built.game, average);
	const direct = new DirectRiver(built, spot);

	it.each(decisions(built.game).map((d) => d.id))('%s', (id) => {
		const nv = values.get(id);
		if (!nv) throw new Error(`no values at ${id}`);
		const k = nv.node.actions.length;
		let checked = 0;
		for (let t = 0; t < built.game.types[nv.node.player]; t++) {
			if (!(nv.mass[t] > 0) || nv.reach[t] < DEFAULT_GRADING.minReach) continue;
			const d = direct.values(average, id, t);
			expect(d).not.toBeNull();
			d?.forEach((v, a) => {
				expect(Math.abs(v - nv.values[t * k + a])).toBeLessThan(1e-9 * spot.pot);
			});
			checked++;
		}
		expect(checked).toBeGreaterThan(0);
	});
});

describe('the reference river spots', () => {
	it('are at least 20, with distinct boards, three sets of sizes and two depths', () => {
		expect(RIVER_SPOTS.length).toBeGreaterThanOrEqual(20);
		expect(new Set(RIVER_SPOTS.map((s) => s.id)).size).toBe(RIVER_SPOTS.length);
		expect(new Set(RIVER_SPOTS.map((s) => s.board)).size).toBe(RIVER_SPOTS.length);
		expect(new Set(RIVER_SPOTS.map((s) => s.sizes.id)).size).toBeGreaterThanOrEqual(3);
		const depths = new Set(RIVER_SPOTS.map((s) => (s.line.stack / s.line.pot).toFixed(1)));
		expect(depths.size).toBeGreaterThanOrEqual(2);
		for (const ref of RIVER_SPOTS) {
			const spot = riverSpot(ref);
			expect(new Set(spot.board).size).toBe(5);
			expect(liveCombos(spot.ranges[0], spot.board).length).toBeGreaterThan(0);
			expect(liveCombos(spot.ranges[1], spot.board).length).toBeGreaterThan(0);
			// 100 big blinds or 25 before the hand, as each line says.
			expect((spot.pot / 2 + spot.stack) % 100).toBe(0);
			expect(() => buildRiver(spot)).not.toThrow();
		}
	});

	it('match the committed manifest of their solves, each within B-6’s threshold', () => {
		const manifest = JSON.parse(
			readFileSync(
				new URL('../../../../solutions/river-reference/manifest.json', import.meta.url),
				'utf8'
			)
		) as {
			kind: string;
			spots: {
				id: string;
				board: string;
				pot: number;
				stack: number;
				ranges: { 'big-blind': string; button: string };
				sizes: { bets: number[]; raises: number[]; maxBets: number };
				reached: number;
				iterations: number;
				marginIterations: number;
				targetExploitability: number;
				exploitability: number;
				file: { sha256: string };
			}[];
		};
		expect(manifest.kind).toBe('river-reference');
		expect(manifest.spots.map((s) => s.id)).toEqual(RIVER_SPOTS.map((s) => s.id));
		for (const ref of RIVER_SPOTS) {
			const s = manifest.spots.find((x) => x.id === ref.id);
			expect(s).toBeDefined();
			if (!s) continue;
			expect(s.board).toBe(ref.board);
			expect(s.pot).toBe(ref.line.pot / 100);
			expect(s.stack).toBe(ref.line.stack / 100);
			expect(s.ranges).toEqual({ 'big-blind': ref.line.ranges[0], button: ref.line.ranges[1] });
			expect(s.sizes).toEqual({
				bets: ref.sizes.betSizes,
				raises: ref.sizes.raiseSizes,
				maxBets: ref.sizes.maxBets
			});
			expect(s.targetExploitability).toBeLessThanOrEqual(0.005);
			expect(s.exploitability).toBeLessThanOrEqual(s.targetExploitability);
			expect(s.iterations).toBeGreaterThanOrEqual(s.reached);
			expect(s.marginIterations).toBe(2 * s.iterations);
			expect(s.file.sha256).toMatch(/^[0-9a-f]{64}$/);
		}
	});
});
