// Fold and showdown values between two ranges of two-card combinations, in
// time linear in the number of combinations, with exact card removal
// (P5.1, docs/solver.md).
//
// The prior of a pair is w0[t0] × w1[t1] / norm unless the two combinations
// share a card. A sum over the other player's combinations that share no card
// with mine is therefore the sum over all of them, minus those holding my
// first card, minus those holding my second, plus the one combination holding
// both (counted twice above), which can only be the same two cards. A
// showdown does the same over the combinations weaker (or stronger) than mine,
// after sorting both ranges by strength once per board; the same two cards
// are a tie, so no correction is needed there.
//
// Values are counterfactual, as in cfr.ts: type t's value weighs in the deal
// and the other player's reach, not t's own. A type that cannot be at the node
// (it holds a card dealt by chance above it) gets zero.

import { evaluate } from '../engine/evaluator.ts';
import type { CardDeal, ShowdownTable } from './game.ts';

/** Per-card lookups for one deal, built once. */
export interface Removal {
	readonly deal: CardDeal;
	/** holders[p][c]: the types of player p whose combination holds card c. */
	readonly holders: readonly [readonly Int32Array[], readonly Int32Array[]];
	/** same[p][t]: the other player's type with the same two cards as t, or −1. */
	readonly same: readonly [Int32Array, Int32Array];
}

const cache = new WeakMap<CardDeal, Removal>();

export function removalOf(deal: CardDeal): Removal {
	const hit = cache.get(deal);
	if (hit) return hit;
	const holders = ([0, 1] as const).map((p) => {
		const lists: number[][] = Array.from({ length: 52 }, () => []);
		const cards = deal.cards[p];
		for (let t = 0; t < cards.length / 2; t++) {
			lists[cards[2 * t]].push(t);
			lists[cards[2 * t + 1]].push(t);
		}
		return lists.map((l) => Int32Array.from(l));
	}) as unknown as [Int32Array[], Int32Array[]];
	const key = (a: number, b: number) => (a < b ? a * 52 + b : b * 52 + a);
	const index = ([0, 1] as const).map((p) => {
		const m = new Map<number, number>();
		const cards = deal.cards[p];
		for (let t = 0; t < cards.length / 2; t++) m.set(key(cards[2 * t], cards[2 * t + 1]), t);
		return m;
	});
	const same = ([0, 1] as const).map((p) => {
		const cards = deal.cards[p];
		const other = index[1 - p];
		const out = new Int32Array(cards.length / 2);
		for (let t = 0; t < out.length; t++) {
			out[t] = other.get(key(cards[2 * t], cards[2 * t + 1])) ?? -1;
		}
		return out;
	}) as unknown as [Int32Array, Int32Array];
	const r: Removal = { deal, holders, same };
	cache.set(deal, r);
	return r;
}

const byCard = new Float64Array(52);

/**
 * out[t] = payoff × Σ_u prior(t, u) × reach[u] for player p's types t, over
 * the other player's types u; zero where `alive` is given and alive[t] is 0.
 * With payoff 1 this is the chance of being at the node with t, own choices
 * aside.
 */
export function foldInto(
	rm: Removal,
	p: 0 | 1,
	payoff: number,
	reach: Float64Array,
	alive: Uint8Array | null,
	out: Float64Array
): void {
	const o = 1 - p;
	const wo = rm.deal.weights[o];
	const co = rm.deal.cards[o];
	byCard.fill(0);
	let total = 0;
	for (let u = 0; u < reach.length; u++) {
		const q = wo[u] * reach[u];
		if (q === 0) continue;
		total += q;
		byCard[co[2 * u]] += q;
		byCard[co[2 * u + 1]] += q;
	}
	const wp = rm.deal.weights[p];
	const cp = rm.deal.cards[p];
	const same = rm.same[p];
	const f = payoff / rm.deal.norm;
	for (let t = 0; t < out.length; t++) {
		if (alive !== null && alive[t] === 0) {
			out[t] = 0;
			continue;
		}
		const s = same[t];
		const sum = total - byCard[cp[2 * t]] - byCard[cp[2 * t + 1]] + (s >= 0 ? wo[s] * reach[s] : 0);
		out[t] = f * wp[t] * sum;
	}
}

/**
 * out[t] = scale × Σ_u prior(t, u) × reach[u] × (+1 if t's hand beats u's,
 * −1 if it loses, 0 for a tie): player p's showdown values on `table`.
 */
export function showdownInto(
	rm: Removal,
	table: ShowdownTable,
	p: 0 | 1,
	scale: number,
	reach: Float64Array,
	out: Float64Array
): void {
	const o = 1 - p;
	const wo = rm.deal.weights[o];
	const co = rm.deal.cards[o];
	const cp = rm.deal.cards[p];
	const rp = table.rank[p];
	const ro = table.rank[o];
	const mine = table.order[p];
	const theirs = table.order[o];
	out.fill(0);
	// Weaker hands than mine: walk both orders from the weakest.
	byCard.fill(0);
	let cum = 0;
	let j = 0;
	for (let i = 0; i < mine.length; i++) {
		const t = mine[i];
		const r = rp[t];
		while (j < theirs.length && ro[theirs[j]] > r) {
			const u = theirs[j++];
			const q = wo[u] * reach[u];
			cum += q;
			byCard[co[2 * u]] += q;
			byCard[co[2 * u + 1]] += q;
		}
		out[t] = cum - byCard[cp[2 * t]] - byCard[cp[2 * t + 1]];
	}
	// Stronger hands than mine: walk both orders from the strongest.
	byCard.fill(0);
	cum = 0;
	j = theirs.length - 1;
	for (let i = mine.length - 1; i >= 0; i--) {
		const t = mine[i];
		const r = rp[t];
		while (j >= 0 && ro[theirs[j]] < r) {
			const u = theirs[j--];
			const q = wo[u] * reach[u];
			cum += q;
			byCard[co[2 * u]] += q;
			byCard[co[2 * u + 1]] += q;
		}
		out[t] -= cum - byCard[cp[2 * t]] - byCard[cp[2 * t + 1]];
	}
	const wp = rm.deal.weights[p];
	const f = scale / rm.deal.norm;
	for (let i = 0; i < mine.length; i++) {
		const t = mine[i];
		out[t] *= f * wp[t];
	}
}

/** Rank and order both players' combinations on a complete five-card board. */
export function showdownTable(deal: CardDeal, board: readonly number[]): ShowdownTable {
	if (board.length !== 5) throw new RangeError('a showdown needs five board cards');
	const dead = new Set(board);
	const sides = ([0, 1] as const).map((p) => {
		const cards = deal.cards[p];
		const n = cards.length / 2;
		const rank = new Int32Array(n);
		const live: number[] = [];
		for (let t = 0; t < n; t++) {
			const a = cards[2 * t];
			const b = cards[2 * t + 1];
			if (dead.has(a) || dead.has(b)) {
				rank[t] = -1;
				continue;
			}
			rank[t] = evaluate([a, b, ...board]);
			live.push(t);
		}
		live.sort((x, y) => rank[y] - rank[x] || x - y);
		return { rank, order: Int32Array.from(live) };
	});
	return {
		board: [...board],
		rank: [sides[0].rank, sides[1].rank],
		order: [sides[0].order, sides[1].order]
	};
}
