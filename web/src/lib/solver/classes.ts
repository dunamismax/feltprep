// The 169 starting-hand classes: 13 pairs, 78 suited and 78 offsuit hands.
//
// Classes are numbered by their cell in the usual 13 × 13 grid, with aces in
// the first row and column: index = row * 13 + col. Pairs sit on the
// diagonal, suited hands above it (col > row) and offsuit hands below it. A
// card is rank * 4 + suit, as in the engine (cards.ts).

import { RANKS } from '../engine/cards.ts';

export type ClassKind = 'pair' | 'suited' | 'offsuit';

export interface HandClass {
	readonly index: number;
	/** "AA", "AKs" or "AKo": the higher rank first. */
	readonly name: string;
	readonly kind: ClassKind;
	/** Ranks from 0 (deuce) to 12 (ace); `high` ≥ `low`. */
	readonly high: number;
	readonly low: number;
	readonly row: number;
	readonly col: number;
	/** Every two-card combination of the class, each as [higher card, lower card]. */
	readonly combos: readonly (readonly [number, number])[];
}

export const NUM_CLASSES = 169;
/** Two-card combinations in a deck: 52 choose 2. */
export const NUM_COMBOS = 1326;

function build(): HandClass[] {
	const classes: HandClass[] = [];
	for (let row = 0; row < 13; row++) {
		for (let col = 0; col < 13; col++) {
			const a = 12 - row;
			const b = 12 - col;
			const kind: ClassKind = row === col ? 'pair' : col > row ? 'suited' : 'offsuit';
			const high = Math.max(a, b);
			const low = Math.min(a, b);
			const combos: [number, number][] = [];
			for (let s1 = 0; s1 < 4; s1++) {
				for (let s2 = 0; s2 < 4; s2++) {
					if (kind === 'pair' ? s2 <= s1 : kind === 'suited' ? s2 !== s1 : s2 === s1) continue;
					combos.push([high * 4 + s1, low * 4 + s2]);
				}
			}
			const name =
				RANKS[high] + RANKS[low] + (kind === 'pair' ? '' : kind === 'suited' ? 's' : 'o');
			classes.push({ index: row * 13 + col, name, kind, high, low, row, col, combos });
		}
	}
	return classes;
}

export const CLASSES: readonly HandClass[] = build();

const BY_NAME = new Map(CLASSES.map((c) => [c.name, c]));

/** The class with this name, such as "T9s". */
export function classByName(name: string): HandClass {
	const found = BY_NAME.get(name);
	if (!found) throw new RangeError(`not a hand class: ${JSON.stringify(name)}`);
	return found;
}

/** The class index of two distinct cards. */
export function classIndex(c1: number, c2: number): number {
	if (c1 === c2) throw new RangeError('two distinct cards are needed');
	const r1 = c1 >> 2;
	const r2 = c2 >> 2;
	const high = Math.max(r1, r2);
	const low = Math.min(r1, r2);
	if (high === low) return (12 - high) * 14;
	// Suited hands sit above the diagonal: row of the higher rank, column of the lower.
	return (c1 & 3) === (c2 & 3) ? (12 - high) * 13 + (12 - low) : (12 - low) * 13 + (12 - high);
}

/** Index of an unordered pair of distinct cards among the 1,326 combinations. */
export function comboIndex(c1: number, c2: number): number {
	const a = Math.min(c1, c2);
	const b = Math.max(c1, c2);
	return (b * (b - 1)) / 2 + a;
}
