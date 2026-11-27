// Exact all-in equity by enumeration (P2.2): hand against hand, hand against a
// range and range against range, on any board from pre-flop to river. Every
// remaining board is dealt once, so the results are exact counts, not
// estimates; cards held by either player or on the board are never dealt
// again, and range combinations that share a card with the other hand or the
// board are left out.
//
// This is the direct enumerator. The pre-flop class table (preflop-table.ts)
// is computed by a different method and is checked against this one (B-4).

import { evaluate } from '../engine/evaluator.ts';

/** Two hole cards. */
export type Hole = readonly [number, number];

/** A range as weighted two-card combinations. */
export interface WeightedHole {
	readonly cards: Hole;
	readonly weight: number;
}

/**
 * Outcomes from the first player's side. For hand against hand these are
 * counts of boards; for ranges, sums of the two combinations' weights over
 * boards. `total` is win + tie + loss.
 */
export interface Tally {
	win: number;
	tie: number;
	loss: number;
	total: number;
}

/** The first player's share of the pot: wins plus half the ties. */
export function equityOf(t: Tally): number {
	if (t.total === 0) throw new RangeError('no deal is possible: the ranges share every card');
	return (t.win + t.tie / 2) / t.total;
}

function emptyTally(): Tally {
	return { win: 0, tie: 0, loss: 0, total: 0 };
}

function checkBoard(board: readonly number[]): void {
	if (board.length > 5 || board.length === 1 || board.length === 2) {
		throw new RangeError('a board has 0, 3, 4 or 5 cards');
	}
	checkDistinct(board);
}

function checkDistinct(cards: readonly number[]): void {
	const seen = new Set<number>();
	for (const c of cards) {
		if (!Number.isInteger(c) || c < 0 || c > 51) throw new RangeError(`not a card: ${c}`);
		if (seen.has(c)) throw new RangeError('a card appears twice');
		seen.add(c);
	}
}

/** Call `visit` once for each way to complete `board` to five cards from `live`. */
function forEachRunout(
	board: readonly number[],
	live: readonly number[],
	visit: (full: Int32Array) => void
): void {
	const full = new Int32Array(5);
	board.forEach((c, i) => (full[i] = c));
	const need = 5 - board.length;
	const n = live.length;
	const pick = (from: number, slot: number) => {
		if (slot === 5) {
			visit(full);
			return;
		}
		for (let i = from; i <= n - (5 - slot); i++) {
			full[slot] = live[i];
			pick(i + 1, slot + 1);
		}
	};
	if (need === 0) visit(full);
	else pick(0, board.length);
}

function liveCards(dead: readonly number[]): number[] {
	const out = new Set(dead);
	const live: number[] = [];
	for (let c = 0; c < 52; c++) if (!out.has(c)) live.push(c);
	return live;
}

/** Exact outcomes of `a` against `b` over every completion of `board`. */
export function handVsHand(a: Hole, b: Hole, board: readonly number[] = []): Tally {
	checkBoard(board);
	checkDistinct([...a, ...b, ...board]);
	const tally = emptyTally();
	const seven1 = new Array<number>(7);
	const seven2 = new Array<number>(7);
	seven1[5] = a[0];
	seven1[6] = a[1];
	seven2[5] = b[0];
	seven2[6] = b[1];
	forEachRunout(board, liveCards([...a, ...b, ...board]), (full) => {
		for (let i = 0; i < 5; i++) seven1[i] = seven2[i] = full[i];
		const r1 = evaluate(seven1);
		const r2 = evaluate(seven2);
		if (r1 < r2) tally.win++;
		else if (r1 > r2) tally.loss++;
		else tally.tie++;
		tally.total++;
	});
	return tally;
}

/**
 * Exact outcomes of `hand` against `range` on `board`: each combination of the
 * range that shares no card with the hand or the board counts with its
 * weight on every board it can meet.
 */
export function handVsRange(
	hand: Hole,
	range: readonly WeightedHole[],
	board: readonly number[] = []
): Tally {
	checkBoard(board);
	checkDistinct([...hand, ...board]);
	const blocked = new Set([...hand, ...board]);
	const villains = range.filter(
		(v) => v.weight > 0 && !blocked.has(v.cards[0]) && !blocked.has(v.cards[1])
	);
	const tally = emptyTally();
	const hero = new Array<number>(7);
	const other = new Array<number>(7);
	hero[5] = hand[0];
	hero[6] = hand[1];
	forEachRunout(board, liveCards([...hand, ...board]), (full) => {
		for (let i = 0; i < 5; i++) hero[i] = other[i] = full[i];
		const mine = evaluate(hero);
		for (const v of villains) {
			const [x, y] = v.cards;
			let clash = false;
			for (let i = board.length; i < 5; i++) if (full[i] === x || full[i] === y) clash = true;
			if (clash) continue;
			other[5] = x;
			other[6] = y;
			const theirs = evaluate(other);
			if (mine < theirs) tally.win += v.weight;
			else if (mine > theirs) tally.loss += v.weight;
			else tally.tie += v.weight;
			tally.total += v.weight;
		}
	});
	return tally;
}

/** Exact outcomes of range `r1` against range `r2` on `board`, weighted by both. */
export function rangeVsRange(
	r1: readonly WeightedHole[],
	r2: readonly WeightedHole[],
	board: readonly number[] = []
): Tally {
	const tally = emptyTally();
	for (const h of r1) {
		if (h.weight <= 0) continue;
		if (board.includes(h.cards[0]) || board.includes(h.cards[1])) continue;
		const t = handVsRange(h.cards, r2, board);
		tally.win += h.weight * t.win;
		tally.tie += h.weight * t.tie;
		tally.loss += h.weight * t.loss;
		tally.total += h.weight * t.total;
	}
	return tally;
}
