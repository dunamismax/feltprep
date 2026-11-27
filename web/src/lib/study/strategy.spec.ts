import { describe, expect, it } from 'vitest';
import type { DecisionTable } from '../spots/types.ts';
import { CLASSES } from '../solver/classes.ts';
import { actionShare, bb, className, gridRows, percent, scientific } from './strategy.ts';

function table(jam: (name: string) => number): DecisionTable {
	const hands = CLASSES.map((c) => c.name).reverse();
	return {
		spot: 'test',
		actions: ['fold', 'jam'],
		hands,
		reach: hands.map(() => 1),
		frequencies: hands.map((h) => [1 - jam(h), jam(h)]),
		values: hands.map(() => [-0.5, 0]),
		margins: hands.map(() => 0)
	};
}

describe('gridRows', () => {
	it('puts aces first, suited above the diagonal and offsuit below', () => {
		const rows = gridRows(table(() => 0));
		expect(rows[0]).toMatchObject({ name: 'AA', row: 0, col: 0, combos: 6 });
		expect(rows[1]).toMatchObject({ name: 'AKs', kind: 'suited', row: 0, col: 1, combos: 4 });
		expect(rows[13]).toMatchObject({ name: 'AKo', kind: 'offsuit', row: 1, col: 0, combos: 12 });
		expect(rows[168].name).toBe('22');
	});
});

describe('actionShare', () => {
	it('counts classes by their combinations', () => {
		// Every pair jams: 13 pairs × 6 combinations = 78 of 1,326 hands.
		const rows = gridRows(table((h) => (h.length === 2 ? 1 : 0)));
		expect(actionShare(rows, 1)).toBeCloseTo(78 / 1326, 12);
		expect(actionShare(rows, 0)).toBeCloseTo(1 - 78 / 1326, 12);
	});
	it('is everything when everything jams', () => {
		expect(actionShare(gridRows(table(() => 1)), 1)).toBeCloseTo(1, 12);
	});
});

describe('formatting', () => {
	it('rounds percentages and keeps slivers visible', () => {
		expect([0, 1e-8, 0.003, 0.5, 0.624, 0.997, 0.99999999, 1].map(percent)).toEqual([
			'0%',
			'0%',
			'<1%',
			'50%',
			'62%',
			'>99%',
			'100%',
			'100%'
		]);
	});
	it('signs big blinds with a true minus', () => {
		expect(bb(1.408148528)).toBe('+1.41 bb');
		expect(bb(-0.5)).toBe('−0.50 bb');
		expect(bb(-0.001)).toBe('0.00 bb');
	});
	it('writes tiny numbers in scientific form', () => {
		expect(scientific(2.31345e-8)).toBe('2.3 × 10⁻⁸');
		expect(scientific(0.001)).toBe('1.0 × 10⁻³');
		expect(scientific(0.05)).toBe('0.05');
	});
	it('names classes in words', () => {
		expect(className('AKs')).toBe('Ace-King suited');
		expect(className('T9o')).toBe('Ten-Nine offsuit');
		expect(className('77')).toBe('Pair of sevens');
		expect(className('66')).toBe('Pair of sixes');
	});
});
