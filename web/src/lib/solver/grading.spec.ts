// The verdict bands of Q-7 (docs/grading.md): a hand just inside and just
// outside each boundary, the margin's kinder band, the frequency rule and
// the exploitability floor.

import { describe, expect, it } from 'vitest';
import { bandOf, DEFAULT_GRADING, losses } from './grading.ts';

// Pot 2: the acceptable boundary is a loss of 0.02 (1%), the inaccuracy
// boundary 0.1 (5%).
const POT = 2;
const eps = 1e-6;

describe('bandOf', () => {
	it('puts losses on either side of each boundary in the right band', () => {
		expect(bandOf(0, POT, 0, 0, 0)).toBe('acceptable');
		expect(bandOf(0.02 - eps, POT, 0, 0, 0)).toBe('acceptable');
		expect(bandOf(0.02 + eps, POT, 0, 0, 0)).toBe('inaccuracy');
		expect(bandOf(0.1 - eps, POT, 0, 0, 0)).toBe('inaccuracy');
		expect(bandOf(0.1 + eps, POT, 0, 0, 0)).toBe('mistake');
	});

	it('gives a loss within the margin of a boundary the kinder band', () => {
		const margin = 0.001;
		expect(bandOf(0.02 + margin / 2, POT, 0, margin, 0)).toBe('acceptable');
		expect(bandOf(0.02 + 2 * margin, POT, 0, margin, 0)).toBe('inaccuracy');
		expect(bandOf(0.1 + margin / 2, POT, 0, margin, 0)).toBe('inaccuracy');
		expect(bandOf(0.1 + 2 * margin, POT, 0, margin, 0)).toBe('mistake');
	});

	it('accepts any action the reference takes at least 5% of the time', () => {
		expect(bandOf(1, POT, 0.05, 0, 0)).toBe('acceptable');
		expect(bandOf(1, POT, 0.05 - eps, 0, 0)).toBe('mistake');
	});

	it('never calls a loss below the reference’s exploitability a mistake', () => {
		expect(bandOf(0.5, POT, 0, 0, 0.6)).toBe('inaccuracy');
		expect(bandOf(0.5, POT, 0, 0, 0.4)).toBe('mistake');
	});

	it('uses Q-7’s defaults', () => {
		expect(DEFAULT_GRADING).toEqual({
			acceptableFrequency: 0.05,
			acceptableLoss: 0.01,
			inaccuracyLoss: 0.05,
			minReach: 0.01
		});
		expect(losses([-0.5, 1.25, 0.25])).toEqual([1.75, 0, 1]);
	});
});
