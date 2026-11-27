import { describe, expect, it } from 'vitest';
import { card } from '../engine/cards.ts';
import { CLASSES, NUM_COMBOS, classByName, classIndex, comboIndex } from './classes.ts';

describe('hand classes', () => {
	it('has 13 pairs, 78 suited and 78 offsuit classes covering all 1,326 combinations', () => {
		const kinds = { pair: 0, suited: 0, offsuit: 0 };
		for (const c of CLASSES) kinds[c.kind]++;
		expect(kinds).toEqual({ pair: 13, suited: 78, offsuit: 78 });
		expect(CLASSES.reduce((n, c) => n + c.combos.length, 0)).toBe(NUM_COMBOS);
		const seen = new Set<number>();
		for (const c of CLASSES) {
			expect(c.combos.length).toBe({ pair: 6, suited: 4, offsuit: 12 }[c.kind]);
			for (const [x, y] of c.combos) seen.add(comboIndex(x, y));
		}
		expect(seen.size).toBe(NUM_COMBOS);
	});

	it('lays the classes out in the usual grid: aces first, suited above the diagonal', () => {
		expect(CLASSES[0].name).toBe('AA');
		expect(CLASSES[1].name).toBe('AKs');
		expect(CLASSES[13].name).toBe('AKo');
		expect(CLASSES[12].name).toBe('A2s');
		expect(CLASSES[156].name).toBe('A2o');
		expect(CLASSES[168].name).toBe('22');
		expect(classByName('T9s')).toMatchObject({ row: 4, col: 5, kind: 'suited' });
		expect(new Set(CLASSES.map((c) => c.name)).size).toBe(169);
	});

	it('finds the class of every combination, in either card order', () => {
		for (const c of CLASSES) {
			for (const [x, y] of c.combos) {
				expect(classIndex(x, y)).toBe(c.index);
				expect(classIndex(y, x)).toBe(c.index);
			}
		}
		expect(CLASSES[classIndex(card('7h'), card('2h'))].name).toBe('72s');
		expect(CLASSES[classIndex(card('2c'), card('7h'))].name).toBe('72o');
		expect(() => classIndex(5, 5)).toThrow(RangeError);
	});
});
