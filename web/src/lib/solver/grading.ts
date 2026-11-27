// Grading (docs/grading.md, "A verdict"): the bands of Q-7 applied to the
// numbers a solution stores. Nothing here estimates anything; it compares.

import type { LoadedSolution } from '../spots/reader.ts';
import type { Band, GradingSettings, NotGradedReason, Verdict } from '../spots/types.ts';

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

const notGraded = (reason: NotGradedReason, detail: string): Verdict => ({
	graded: false,
	reason,
	detail
});

/**
 * Grade taking `action` with `hand` at spot `spotId`, against `solution`
 * (null when no registered solution covers the decision). Every number comes
 * from the solution; this computes only the loss and the band.
 */
export function gradeDecision(
	solution: LoadedSolution | null,
	spotId: string,
	hand: string,
	action: string
): Verdict {
	const spot = solution?.manifest.spots.find((s) => s.id === spotId);
	if (!solution || !spot) {
		return notGraded(
			'no-reference',
			'No checked solution covers this decision, so it is not graded.'
		);
	}
	if (!solution.grades) {
		return notGraded(
			'unverified-reference',
			'The solution for this spot has not passed every check yet, so it is shown for study only.'
		);
	}
	const a = spot.actions.indexOf(action);
	if (a < 0) {
		return notGraded(
			'action-outside-game',
			`The solved game allows only ${spot.actions.join(' or ')} here, so ${action} is not graded.`
		);
	}
	const table = solution.solution.decisions.find((d) => d.spot === spotId);
	const h = table ? table.hands.indexOf(hand) : -1;
	const settings = solution.manifest.grading;
	if (!table || h < 0 || table.reach[h] < settings.minReach) {
		return notGraded(
			'outside-range',
			'This hand is not in the range the solution assumes at this point, so the reference says nothing reliable about it.'
		);
	}
	const values = table.values[h];
	const frequencies = table.frequencies[h];
	const loss = losses(values)[a];
	const best = spot.actions[values.indexOf(Math.max(...values))];
	const measured = solution.manifest.exploitability.find((e) => e.game === spot.game);
	const band = bandOf(
		loss,
		spot.pot,
		frequencies[a],
		table.margins[h],
		measured ? measured.value : 0,
		settings
	);
	return {
		graded: true,
		solution: solution.manifest.id,
		spot: spotId,
		hand,
		action,
		frequencies: Object.fromEntries(spot.actions.map((x, i) => [x, frequencies[i]])),
		values: Object.fromEntries(spot.actions.map((x, i) => [x, values[i]])),
		best,
		loss,
		lossOfPot: loss / spot.pot,
		margin: table.margins[h],
		band
	};
}
