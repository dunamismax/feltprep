// What the study view shows for one decision (P3.3): each hand class's
// frequencies and values from a decision table, laid out on the 13 × 13 grid,
// and the share of all dealt hands that take each action. Numbers are read
// from the solution, never recomputed.

import { CLASSES, NUM_COMBOS, classByName, type ClassKind } from '../solver/classes.ts';
import type { DecisionTable } from '../spots/types.ts';
import { RANK_NAMES } from '../engine/cards.ts';

export interface HandRow {
	readonly name: string;
	readonly kind: ClassKind;
	readonly row: number;
	readonly col: number;
	readonly combos: number;
	readonly reach: number;
	/** Parallel to the table's actions. */
	readonly frequencies: readonly number[];
	readonly values: readonly number[];
}

/** The table's rows in grid order: aces first, suited above the diagonal. */
export function gridRows(table: DecisionTable): HandRow[] {
	const at = new Map(table.hands.map((h, i) => [h, i]));
	return CLASSES.map((c) => {
		const i = at.get(c.name);
		if (i === undefined) throw new RangeError(`${table.spot} has no row for ${c.name}`);
		return {
			name: c.name,
			kind: c.kind,
			row: c.row,
			col: c.col,
			combos: c.combos.length,
			reach: table.reach[i],
			frequencies: table.frequencies[i],
			values: table.values[i]
		};
	});
}

/**
 * The share of all two-card hands dealt that reach this decision and take
 * action `a`, counting each class by its combinations and reach.
 */
export function actionShare(rows: readonly HandRow[], a: number): number {
	let sum = 0;
	for (const r of rows) sum += r.combos * r.reach * r.frequencies[a];
	return sum / NUM_COMBOS;
}

/** A frequency as a whole percentage, with "<1%" and ">99%" for slivers. */
export function percent(x: number): string {
	if (x <= 0.0005) return '0%';
	if (x >= 0.9995) return '100%';
	if (x < 0.005) return '<1%';
	if (x > 0.995) return '>99%';
	return `${Math.round(x * 100)}%`;
}

/** A value in big blinds with its sign, such as "+1.41 bb" or "−0.50 bb". */
export function bb(x: number, digits = 2): string {
	const rounded = Number(x.toFixed(digits));
	const text = Math.abs(rounded).toFixed(digits);
	if (rounded === 0) return `${text} bb`;
	return `${rounded > 0 ? '+' : '−'}${text} bb`;
}

/** A small positive number in scientific form, such as "2.3 × 10⁻⁸". */
export function scientific(x: number): string {
	if (x === 0) return '0';
	const exp = Math.floor(Math.log10(Math.abs(x)));
	if (exp >= -2 && exp <= 3) return String(Number(x.toPrecision(2)));
	const mantissa = (x / 10 ** exp).toFixed(1);
	const sup = String(exp)
		.split('')
		.map((ch) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(ch)])
		.join('');
	return `${mantissa} × 10${sup}`;
}

/** A class in words, such as "Ace-King suited" or "Pair of sevens". */
export function className(name: string): string {
	const c = classByName(name);
	const hi = RANK_NAMES[c.high];
	const lo = RANK_NAMES[c.low];
	if (c.kind === 'pair') return `Pair of ${hi === 'Six' ? 'sixes' : `${hi.toLowerCase()}s`}`;
	return `${hi}-${lo} ${c.kind}`;
}
