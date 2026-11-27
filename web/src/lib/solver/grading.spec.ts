// The verdict bands of D-20 (docs/grading.md): a hand just inside and just
// outside each boundary, the margin's kinder band, the frequency rule and
// the exploitability floor.

import { describe, expect, it } from 'vitest';
import { bandOf, DEFAULT_GRADING, losses } from './grading.ts';

// Pot 2: the acceptable boundary is a loss of 0.01 (0.5%), the inaccuracy
// boundary 0.06 (3%). The old defaults (1% and 5%) sit between them, so a
// loss of 0.015 or 0.08 checks that they no longer apply.
const POT = 2;
const eps = 1e-6;

describe('bandOf', () => {
	it('puts losses on either side of each boundary in the right band', () => {
		expect(bandOf(0, POT, 0, 0, 0)).toBe('acceptable');
		expect(bandOf(0.01 - eps, POT, 0, 0, 0)).toBe('acceptable');
		expect(bandOf(0.01 + eps, POT, 0, 0, 0)).toBe('inaccuracy');
		expect(bandOf(0.015, POT, 0, 0, 0)).toBe('inaccuracy');
		expect(bandOf(0.06 - eps, POT, 0, 0, 0)).toBe('inaccuracy');
		expect(bandOf(0.06 + eps, POT, 0, 0, 0)).toBe('mistake');
		expect(bandOf(0.08, POT, 0, 0, 0)).toBe('mistake');
	});

	it('gives a loss within the margin of a boundary the kinder band', () => {
		const margin = 0.001;
		expect(bandOf(0.01 + margin / 2, POT, 0, margin, 0)).toBe('acceptable');
		expect(bandOf(0.01 + 2 * margin, POT, 0, margin, 0)).toBe('inaccuracy');
		expect(bandOf(0.06 + margin / 2, POT, 0, margin, 0)).toBe('inaccuracy');
		expect(bandOf(0.06 + 2 * margin, POT, 0, margin, 0)).toBe('mistake');
	});

	it('accepts any action the reference takes at least 5% of the time', () => {
		expect(bandOf(1, POT, 0.05, 0, 0)).toBe('acceptable');
		expect(bandOf(1, POT, 0.05 - eps, 0, 0)).toBe('mistake');
	});

	it('never calls a loss below the reference’s exploitability a mistake', () => {
		expect(bandOf(0.5, POT, 0, 0, 0.6)).toBe('inaccuracy');
		expect(bandOf(0.5, POT, 0, 0, 0.4)).toBe('mistake');
	});

	it('uses the owner’s bands (D-20)', () => {
		expect(DEFAULT_GRADING).toEqual({
			acceptableFrequency: 0.05,
			acceptableLoss: 0.005,
			inaccuracyLoss: 0.03,
			minReach: 0.01
		});
		expect(losses([-0.5, 1.25, 0.25])).toEqual([1.75, 0, 1]);
	});
});
