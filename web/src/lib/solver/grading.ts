// Grading (docs/grading.md, "A verdict"): the bands of Q-7 applied to the
// numbers a solution stores. Nothing here estimates anything; it compares.

import type { Band, GradingSettings } from '../spots/types.ts';

/** Q-7's default thresholds and the contract's minimum reach. */
export const DEFAULT_GRADING: GradingSettings = {
	acceptableFrequency: 0.05,
	acceptableLoss: 0.01,
	inaccuracyLoss: 0.05,
	minReach: 0.01
};

/** Each action's loss against the best action: max value minus its value. */
export function losses(values: readonly number[]): number[] {
	const best = Math.max(...values);
	return values.map((v) => best - v);
}

/**
 * The band of an action with this `loss` (big blinds) in a pot of `pot`
 * big blinds, taken with `frequency` by the reference, for a hand whose loss
 * can move by `margin` between solves, in a solution measured at
 * `exploitability` big blinds per hand.
 */
export function bandOf(
	loss: number,
	pot: number,
	frequency: number,
	margin: number,
	exploitability: number,
	settings: GradingSettings = DEFAULT_GRADING
): Band {
	if (frequency >= settings.acceptableFrequency) return 'acceptable';
	const kinder = Math.max(0, loss - margin) / pot;
	if (kinder <= settings.acceptableLoss) return 'acceptable';
	if (kinder <= settings.inaccuracyLoss) return 'inaccuracy';
	return loss < exploitability ? 'inaccuracy' : 'mistake';
}
