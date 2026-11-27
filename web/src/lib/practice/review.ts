// Hand review (P3.6): a finished practice hand replayed from its stored
// history, one step per action, with each of the player's decisions graded
// again against the current reference through the same path the table and the
// drill use. A step shows the hand as it stood when that action was chosen, so
// the opponent's cards stay hidden until a showdown at the end.

import { gradeAction } from '../drill/jam-or-fold.ts';
import { historyFromDict } from '../engine/history.ts';
import {
	apply,
	startHand,
	type Action,
	type ActionRecord,
	type HandState
} from '../engine/state.ts';
import type { LoadedSolution } from '../spots/reader.ts';
import type { Verdict } from '../spots/types.ts';
import { inBigBlinds } from '../table/actions.ts';
import type { FinishedHand } from './table.ts';

export interface ReviewStep {
	/** The hand when this step's action was chosen, or the final hand for the last step. */
	readonly state: HandState;
	/** Who acted, or null for the last step, the hand's end. */
	readonly actor: number | null;
	/** What they did, as recorded by the engine. */
	readonly record: ActionRecord | null;
	readonly action: Action | null;
	/** The player's decisions only: the verdict against the reference. */
	readonly verdict: Verdict | null;
}

/** Every step of `hand`, the last one the finished hand. */
export function reviewSteps(solution: LoadedSolution, hand: FinishedHand): ReviewStep[] {
	const history = historyFromDict(hand.history);
	let state = startHand(history.config, history.startingStacks, history.button, {
		deck: history.deck
	});
	const steps: ReviewStep[] = [];
	for (const action of history.actions) {
		const actor = state.toAct;
		const verdict = actor === hand.player ? gradeAction(solution, state, action) : null;
		const next = apply(state, action);
		steps.push({
			state,
			actor,
			record: next.actions[next.actions.length - 1] ?? null,
			action,
			verdict
		});
		state = next;
	}
	steps.push({ state, actor: null, record: null, action: null, verdict: null });
	return steps;
}

/** An action in words for a sentence whose subject is the actor: "folded", "raised to 3 bb". */
export function actionWords(record: ActionRecord, bigBlind: number): string {
	const bb = (chips: number) => `${inBigBlinds(chips, bigBlind)} bb`;
	if (record.kind === 'fold') return 'folded';
	if (record.kind === 'check') return 'checked';
	if (record.allIn && (record.kind === 'raise' || record.kind === 'bet')) {
		return `moved all-in for ${bb(record.to)}`;
	}
	if (record.kind === 'call') return `called ${bb(record.added)}${record.allIn ? ', all-in' : ''}`;
	if (record.kind === 'bet') return `bet ${bb(record.to)}`;
	return `raised to ${bb(record.to)}`;
}
