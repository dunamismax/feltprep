// The exact pre-flop equity table of every class against every class (P2.2).
//
// For each ordered pair of classes (i, j) the table counts, over every pair of
// disjoint combinations (one from each class) and every one of the
// C(48, 5) = 1,712,304 boards they can meet, how often i wins and how often j
// wins; ties are the rest. Card removal is therefore exact.
//
// Method. Rather than enumerate boards per matchup (equity.ts does that, and
// checks this table), the builder visits each five-card board once. On a
// board it ranks all 1,081 live two-card hands, then sweeps them from worst
// to best, keeping per-class counts of the strictly weaker hands seen so far
// and how many of those hold each card. A hand of class i with cards a and b
// beats exactly `count[j] - holding[j][a] - holding[j][b]` weaker hands of
// class j that share no card with it (no other hand of class j can hold both
// a and b). Hands of equal rank are added to the counts only after the whole
// group is scored, so ties never count as wins.
//
// Suits are interchangeable, so the count for a class pair is the same on a
// board and on any suit relabelling of it. Only one board of each relabelling
// class (134,459 of the 2,598,960) is visited, weighted by the size of its
// class.

import { evaluate } from '../engine/evaluator.ts';
import { CLASSES, NUM_CLASSES, classIndex } from './classes.ts';

/** Boards a pair of disjoint hole-card pairs can meet: 48 choose 5. */
export const PREFLOP_BOARDS = 1_712_304;

const PERMUTATIONS: readonly (readonly number[])[] = (() => {
	const out: number[][] = [];
	const walk = (prefix: number[]) => {
		if (prefix.length === 4) out.push(prefix);
		else for (let s = 0; s < 4; s++) if (!prefix.includes(s)) walk([...prefix, s]);
	};
	walk([]);
	return out;
})();

function sortedKey(
	cards: ArrayLike<number>,
	perm: readonly number[] | null,
	buf: Int32Array
): number {
	const n = cards.length;
	for (let i = 0; i < n; i++) {
		const c = cards[i];
		buf[i] = perm ? (c & ~3) | perm[c & 3] : c;
	}
	for (let i = 1; i < n; i++) {
		const v = buf[i];
		let j = i - 1;
		while (j >= 0 && buf[j] > v) {
			buf[j + 1] = buf[j];
			j--;
		}
		buf[j + 1] = v;
	}
	let key = 0;
	for (let i = 0; i < n; i++) key = key * 64 + buf[i];
	return key;
}

/**
 * One board from each class of boards that differ only by relabelling suits,
 * with the number of boards in its class. `cards` is flat, `size` cards per
 * board; the weights sum to 52 choose `size`.
 */
export function canonicalBoards(size: number): { cards: Int32Array; weights: Int32Array } {
	if (!Number.isInteger(size) || size < 1 || size > 5) throw new RangeError('size is 1 to 5');
	const cards: number[] = [];
	const weights: number[] = [];
	const board = new Int32Array(size);
	const buf = new Int32Array(size);
	const visit = () => {
		const own = sortedKey(board, null, buf);
		let fixed = 0;
		for (const perm of PERMUTATIONS) {
			const key = sortedKey(board, perm, buf);
			if (key < own) return;
			if (key === own) fixed++;
		}
		for (let i = 0; i < size; i++) cards.push(board[i]);
		weights.push(PERMUTATIONS.length / fixed);
	};
	const pick = (from: number, slot: number) => {
		if (slot === size) {
			visit();
			return;
		}
		for (let c = from; c <= 52 - (size - slot); c++) {
			board[slot] = c;
			pick(c + 1, slot + 1);
		}
	};
	pick(0, 0);
	return { cards: Int32Array.from(cards), weights: Int32Array.from(weights) };
}

/** Disjoint combination pairs for every ordered class pair, row-major (i * 169 + j). */
export function comboPairCounts(): Float64Array {
	const counts = new Float64Array(NUM_CLASSES * NUM_CLASSES);
	for (const a of CLASSES) {
		for (const b of CLASSES) {
			let n = 0;
			for (const [x, y] of a.combos) {
				for (const [u, v] of b.combos) if (x !== u && x !== v && y !== u && y !== v) n++;
			}
			counts[a.index * NUM_CLASSES + b.index] = n;
		}
	}
	return counts;
}

/**
 * Add the wins on boards `from` to `to` of `boards` into `wins`, where
 * wins[i * 169 + j] counts (combination pair, board) deals on which class i
 * beats class j. All counts are whole numbers below 2^53, so the sums are exact.
 */
export function accumulateWins(
	boards: { cards: Int32Array; weights: Int32Array },
	from: number,
	to: number,
	wins: Float64Array
): void {
	const K = NUM_CLASSES;
	const handA = new Int32Array(1081);
	const handB = new Int32Array(1081);
	const handClass = new Int32Array(1081);
	const order = new Float64Array(1081);
	const count = new Int32Array(K);
	const holding = new Int32Array(52 * K);
	const boardWins = new Int32Array(K * K);
	const seven = [0, 0, 0, 0, 0, 0, 0];
	const onBoard = new Uint8Array(52);

	for (let b = from; b < to; b++) {
		onBoard.fill(0);
		for (let i = 0; i < 5; i++) {
			const c = boards.cards[b * 5 + i];
			seven[i] = c;
			onBoard[c] = 1;
		}
		let n = 0;
		for (let y = 1; y < 52; y++) {
			if (onBoard[y]) continue;
			for (let x = 0; x < y; x++) {
				if (onBoard[x]) continue;
				seven[5] = x;
				seven[6] = y;
				handA[n] = x;
				handB[n] = y;
				handClass[n] = classIndex(x, y);
				// Sort key: worst rank first (higher is worse), then the hand's index.
				order[n] = (7463 - evaluate(seven)) * 2048 + n;
				n++;
			}
		}
		order.sort();
		count.fill(0);
		holding.fill(0);
		boardWins.fill(0);
		let start = 0;
		while (start < n) {
			const rank = Math.floor(order[start] / 2048);
			let end = start;
			while (end < n && Math.floor(order[end] / 2048) === rank) end++;
			for (let g = start; g < end; g++) {
				const h = order[g] % 2048;
				const row = handClass[h] * K;
				const offA = handA[h] * K;
				const offB = handB[h] * K;
				for (let j = 0; j < K; j++) {
					boardWins[row + j] += count[j] - holding[offA + j] - holding[offB + j];
				}
			}
			for (let g = start; g < end; g++) {
				const h = order[g] % 2048;
				const k = handClass[h];
				count[k]++;
				holding[handA[h] * K + k]++;
				holding[handB[h] * K + k]++;
			}
			start = end;
		}
		const weight = boards.weights[b];
		for (let i = 0; i < K * K; i++) if (boardWins[i]) wins[i] += weight * boardWins[i];
	}
}

/** The serialized table (format 1), over class pairs i ≤ j in row-major order. */
export interface PreflopTableFile {
	readonly format: 1;
	readonly kind: 'preflop-class-equity';
	/** Boards each disjoint combination pair meets. */
	readonly boards: number;
	readonly classes: readonly string[];
	/** For i ≤ j: disjoint combination pairs, deals i wins, deals j wins. */
	readonly pairs: readonly number[];
	readonly winsLow: readonly number[];
	readonly winsHigh: readonly number[];
}

export function serializeTable(wins: Float64Array, pairs: Float64Array): PreflopTableFile {
	const K = NUM_CLASSES;
	const p: number[] = [];
	const w: number[] = [];
	const l: number[] = [];
	for (let i = 0; i < K; i++) {
		for (let j = i; j < K; j++) {
			p.push(pairs[i * K + j]);
			w.push(wins[i * K + j]);
			l.push(wins[j * K + i]);
		}
	}
	return {
		format: 1,
		kind: 'preflop-class-equity',
		boards: PREFLOP_BOARDS,
		classes: CLASSES.map((c) => c.name),
		pairs: p,
		winsLow: w,
		winsHigh: l
	};
}

/** Exact pre-flop class matchups read from a table file. */
export class PreflopTable {
	readonly pairs: Float64Array;
	readonly wins: Float64Array;

	constructor(file: PreflopTableFile) {
		const K = NUM_CLASSES;
		if (file.format !== 1 || file.kind !== 'preflop-class-equity') {
			throw new RangeError('not a format 1 pre-flop class equity table');
		}
		if (file.boards !== PREFLOP_BOARDS || file.classes.some((c, i) => c !== CLASSES[i].name)) {
			throw new RangeError('the table’s boards or classes do not match');
		}
		const size = (K * (K + 1)) / 2;
		if ([file.pairs, file.winsLow, file.winsHigh].some((a) => a.length !== size)) {
			throw new RangeError('the table has the wrong number of entries');
		}
		this.pairs = new Float64Array(K * K);
		this.wins = new Float64Array(K * K);
		let e = 0;
		for (let i = 0; i < K; i++) {
			for (let j = i; j < K; j++, e++) {
				this.pairs[i * K + j] = this.pairs[j * K + i] = file.pairs[e];
				this.wins[i * K + j] = file.winsLow[e];
				this.wins[j * K + i] = file.winsHigh[e];
			}
		}
	}

	/** Disjoint combination pairs of classes i and j. */
	pairCount(i: number, j: number): number {
		return this.pairs[i * NUM_CLASSES + j];
	}

	/** Deals (combination pair and board) on which class i beats class j, and ties. */
	outcomes(i: number, j: number): { win: number; tie: number; loss: number; total: number } {
		const total = this.pairs[i * NUM_CLASSES + j] * PREFLOP_BOARDS;
		const win = this.wins[i * NUM_CLASSES + j];
		const loss = this.wins[j * NUM_CLASSES + i];
		return { win, tie: total - win - loss, loss, total };
	}

	/** Class i's all-in equity against class j: wins plus half the ties. */
	equity(i: number, j: number): number {
		const t = this.outcomes(i, j);
		return (t.win + t.tie / 2) / t.total;
	}
}
