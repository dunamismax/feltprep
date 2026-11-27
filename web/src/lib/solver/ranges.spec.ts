// Range notation (P5.2): every count below is worked out by hand from the
// deck: a pair class has 6 combinations, a suited class 4 and an offsuit 12.

import { describe, expect, it } from 'vitest';
import { cards } from '../engine/cards.ts';
import { comboCount, parseRange } from './ranges.ts';

const count = (text: string) => parseRange(text).length;

describe('parseRange', () => {
	it.each([
		['AA', 6],
		['AKs', 4],
		['AKo', 12],
		['AK', 16],
		['TT+', 5 * 6],
		['TT-77', 4 * 6],
		['77-TT', 4 * 6],
		['A2s+', 12 * 4],
		['K9o+', 4 * 12],
		['A5s-A2s', 4 * 4],
		['A2s-A5s', 4 * 4],
		['QJ-Q9', 3 * 16],
		['AsKd', 1],
		['AA, KK, AKs', 6 + 6 + 4],
		['', 0]
	])('%s has %i combinations', (text, n) => {
		expect(count(text)).toBe(n);
	});

	it('gives each combination its cards, higher first, and its weight', () => {
		const r = parseRange('AsKd, QJs:0.5, 22:0');
		expect(r[0]).toEqual({ cards: cards('As Kd'), weight: 1 });
		expect(r.slice(1).every((c) => c.weight === 0.5)).toBe(true);
		expect(r).toHaveLength(5);
		for (const {
			cards: [a, b]
		} of r)
			expect(a).toBeGreaterThan(b);
		expect(comboCount(r)).toBe(1 + 4 * 0.5);
	});

	it('refuses what it cannot read and a combination named twice', () => {
		expect(() => parseRange('AA, QQ+')).toThrow(/named twice/);
		expect(() => parseRange('AKs, AsKs')).toThrow(/named twice/);
		expect(() => parseRange('KA')).toThrow(/higher rank/);
		expect(() => parseRange('AK:1.5')).toThrow(/weight/);
		expect(() => parseRange('AK:')).toThrow(/weight/);
		expect(() => parseRange('AsAs')).toThrow(/different cards/);
		expect(() => parseRange('A1s')).toThrow(/not range notation/);
		expect(() => parseRange('AKs-QJs')).toThrow(/not range notation/);
	});

	it('counts the re-raised pot’s ranges as worked out by hand', () => {
		// 99+ 36, AJs+ 12, KQs 4, AQo+ 24, A5s-A4s 8, KTs, T9s, 87s, 76s 4 each.
		expect(count('99+, AJs+, KQs, AQo+, A5s-A4s, KTs, T9s, 87s, 76s')).toBe(100);
		// QQ-22 66, AQs-ATs 12, KJs-KTs 8, QJs-QTs 8, JTs, T9s, 98s, 87s 4 each, AQo-AJo 24, KQo 12.
		expect(count('QQ-22, AQs-ATs, KJs-KTs, QJs-QTs, JTs, T9s, 98s, 87s, AQo-AJo, KQo')).toBe(146);
	});
});
