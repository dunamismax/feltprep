// P5.1: the linear-time fold and showdown values equal the plain sum over
// every pair of combinations, computed here separately with the evaluator,
// on random ranges with shared cards, weights, reaches and dead types.

import { describe, expect, it } from 'vitest';
import { evaluate } from '../engine/evaluator.ts';
import type { CardDeal } from './game.ts';
import { foldInto, removalOf, showdownInto, showdownTable } from './removal.ts';

/** A small deterministic generator (mulberry32), so failures replay. */
function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function setup(seed: number) {
	const r = rng(seed);
	const deck = Array.from({ length: 52 }, (_, c) => c);
	for (let i = 51; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	const board = deck.slice(0, 5);
	// Ranges from the next 14 cards, so they overlap a lot, plus a few that
	// touch the board, which the showdown must leave out.
	const pool = deck.slice(5, 19);
	const pick = () => {
		const out: [number, number][] = [];
		const seen = new Set<string>();
		while (out.length < 30) {
			const a = pool[Math.floor(r() * pool.length)];
			const b = r() < 0.1 ? board[Math.floor(r() * 5)] : pool[Math.floor(r() * pool.length)];
			const key = [a, b].sort((x, y) => x - y).join();
			if (a === b || seen.has(key)) continue;
			seen.add(key);
			out.push([a, b]);
		}
		return out;
	};
	const combos = [pick(), pick()];
	const weights = combos.map((c) => Float64Array.from(c, () => (r() < 0.2 ? 0 : 0.1 + r())));
	let norm = 0;
	combos[0].forEach(([a, b], i) =>
		combos[1].forEach(([x, y], j) => {
			if (a !== x && a !== y && b !== x && b !== y) norm += weights[0][i] * weights[1][j];
		})
	);
	const deal: CardDeal = {
		cards: [Uint8Array.from(combos[0].flat()), Uint8Array.from(combos[1].flat())],
		weights: [weights[0], weights[1]],
		norm
	};
	const reach = combos.map((c) => Float64Array.from(c, () => (r() < 0.2 ? 0 : r())));
	const alive = combos.map((c) => Uint8Array.from(c, () => (r() < 0.15 ? 0 : 1)));
	return { board, combos, deal, reach, alive };
}

const shares = (a: readonly number[], b: readonly number[]) => a.some((c) => b.includes(c));

describe('foldInto and showdownInto', () => {
	it.each([1, 2, 3, 4, 5, 6, 7, 8])('equal the sum over every pair (seed %i)', (seed) => {
		const { board, combos, deal, reach, alive } = setup(seed);
		const rm = removalOf(deal);
		const table = showdownTable(deal, board);
		for (const p of [0, 1] as const) {
			const o = 1 - p;
			const n = combos[p].length;
			const fold = new Float64Array(n);
			const show = new Float64Array(n);
			foldInto(rm, p, 3, reach[o], alive[p], fold);
			showdownInto(rm, table, p, 2.5, reach[o], show);
			for (let t = 0; t < n; t++) {
				let f = 0;
				let sd = 0;
				const mine = combos[p][t];
				for (let u = 0; u < combos[o].length; u++) {
					const theirs = combos[o][u];
					if (shares(mine, theirs)) continue;
					const m = (deal.weights[p][t] * deal.weights[o][u] * reach[o][u]) / deal.norm;
					f += 3 * m;
					if (shares(mine, board) || shares(theirs, board)) continue;
					const a = evaluate([...mine, ...board]);
					const b = evaluate([...theirs, ...board]);
					sd += 2.5 * m * Math.sign(b - a);
				}
				expect(fold[t]).toBeCloseTo(alive[p][t] ? f : 0, 12);
				expect(show[t]).toBeCloseTo(shares(mine, board) ? 0 : sd, 12);
			}
		}
	});

	it('finds the opposite combination with the same two cards', () => {
		const deal: CardDeal = {
			cards: [Uint8Array.from([1, 2, 3, 4]), Uint8Array.from([4, 3, 5, 6, 2, 1])],
			weights: [Float64Array.of(1, 1), Float64Array.of(1, 1, 1)],
			norm: 1
		};
		const rm = removalOf(deal);
		expect([...rm.same[0]]).toEqual([2, 0]);
		expect([...rm.same[1]]).toEqual([1, -1, 0]);
		expect([...rm.holders[1][3]]).toEqual([0]);
	});
});
