// P3.6: a finished practice hand replays step by step from its stored
// history, and each of the player's decisions is graded again through the
// table's own path, from both seats.

import { describe, expect, it } from 'vitest';
import { Action, legalActions } from '../engine/state.ts';
import { jamOrFoldAt } from '../server/solutions.ts';
import { actionWords, reviewSteps } from './review.ts';
import {
	newPracticeSession,
	nextHand,
	playCurrent,
	takeAction,
	type PracticeSession
} from './table.ts';

const solution = await jamOrFoldAt(12);

/** Play hand 0 of `seed`, folding at the first decision or jamming, to its end. */
function finish(seed: number, jam: boolean): PracticeSession {
	let s = newPracticeSession(12, seed);
	for (let i = 0; i < 20; i++) {
		const p = playCurrent(solution, s);
		if (!p.waiting) break;
		const legal = legalActions(p.state);
		const action =
			jam && legal.raiseKind !== null
				? Action.raiseTo(legal.maxTo)
				: legal.canCheck
					? Action.check()
					: jam
						? Action.call()
						: Action.fold();
		s = takeAction(solution, s, action);
	}
	return nextHand(solution, s);
}

describe('reviewSteps', () => {
	it('replays every action to the stored result, grading only the player’s', () => {
		const seats = new Set<number>();
		for (let seed = 1; seed <= 40; seed++) {
			for (const jam of [false, true]) {
				const s = finish(seed, jam);
				const hand = s.finished[0];
				const steps = reviewSteps(solution, hand);
				const end = steps[steps.length - 1];
				expect(end.actor).toBeNull();
				expect(end.state.result).not.toBeNull();
				const mine = steps.filter((x) => x.actor === hand.player);
				expect(mine.map((x) => x.verdict)).toEqual(hand.decisions.map((d) => d.verdict));
				expect(
					steps
						.filter((x) => x.actor !== hand.player && x.actor !== null)
						.every((x) => x.verdict === null)
				).toBe(true);
				seats.add(steps[0].state.button === hand.player ? 0 : 1);
			}
		}
		expect(seats).toEqual(new Set([0, 1]));
	});

	it('names actions in words', () => {
		const s = finish(8, false);
		const steps = reviewSteps(solution, s.finished[0]);
		expect(actionWords(steps[0].record!, 100)).toBe('folded');
		const jam = reviewSteps(solution, finish(8, true).finished[0]);
		expect(actionWords(jam[0].record!, 100)).toBe('moved all-in for 12 bb');
	});
});
