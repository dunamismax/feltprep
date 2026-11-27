// The short-stack practice opponent (P3.5): inside the jam-or-fold game it
// plays the reference strategy, drawing each action with the reference's
// frequencies for its hand; everywhere else (after a limp or a smaller raise,
// and after the flop) it plays the imported rule-based heuristic. Either way
// it is an opponent to play against, never a grade.

import { Action, allows, legalActions, type HandState } from '../engine/state.ts';
import type { Random } from '../engine/random.ts';
import { seatView } from '../engine/view.ts';
import { locateJamOrFold } from '../solver/jam-or-fold-hand.ts';
import type { LoadedSolution } from '../spots/reader.ts';
import { HeuristicPolicy } from './heuristic.ts';

export type OpponentSource = 'reference' | 'heuristic';

const heuristic = new HeuristicPolicy();
const DRAW = 1_000_000;

/** The reference's action at `state` for the player to act, or null outside the game. */
export function referenceAction(
	solution: LoadedSolution,
	state: HandState,
	rng: Random
): Action | null {
	const located = locateJamOrFold(state, Action.fold());
	if (!located.inside) return null;
	const table = solution.solution.decisions.find((d) => d.spot === located.spot);
	const h = table ? table.hands.indexOf(located.hand) : -1;
	if (!table || h < 0) return null;
	const frequencies = table.frequencies[h];
	const draw = rng.below(DRAW) / DRAW;
	let a = frequencies.length - 1;
	for (let i = 0, sum = 0; i < frequencies.length; i++) {
		sum += frequencies[i];
		if (draw < sum) {
			a = i;
			break;
		}
	}
	const name = table.actions[a];
	const legal = legalActions(state);
	const action =
		name === 'fold'
			? Action.fold()
			: name === 'call'
				? Action.call()
				: Action.of(legal.raiseKind ?? 'raise', legal.maxTo);
	return allows(legal, action) ? action : null;
}

/** The opponent's action at `state`, and which of its two parts chose it. */
export function opponentAction(
	solution: LoadedSolution,
	state: HandState,
	rng: Random
): { action: Action; source: OpponentSource } {
	const reference = referenceAction(solution, state, rng);
	if (reference) return { action: reference, source: 'reference' };
	const seat = state.toAct;
	if (seat === null) throw new RangeError('nobody is to act');
	return { action: heuristic.act(seatView(state, seat)), source: 'heuristic' };
}
