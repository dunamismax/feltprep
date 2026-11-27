// Whether a decision in a full hand played on the engine falls inside the
// jam-or-fold game (P2.5), and which spot and action it is there. A decision
// is inside only when every part of the stated game holds: two players, no
// ante, blinds of half and one big blind, an effective stack of a whole
// number of big blinds from 2 to 15, before the flop, and either the button's
// first action or the big blind facing a jam with nothing else before it.

import { CLASSES, classIndex } from './classes.ts';
import { JAM_OR_FOLD_STACKS } from './jam-or-fold.ts';
import { PREFLOP, type Action, type HandState } from '../engine/state.ts';

export type Located =
	| {
			readonly inside: true;
			readonly spot: string;
			readonly action: 'fold' | 'jam' | 'call';
			/** The actor's hand class, such as "AKs". */
			readonly hand: string;
			readonly stack: number;
	  }
	| {
			readonly inside: false;
			readonly reason: 'outside-game' | 'action-outside-game';
			readonly detail: string;
	  };

const outside = (detail: string): Located => ({ inside: false, reason: 'outside-game', detail });

/** Locate `action`, taken by the player to act in `state`, in the jam-or-fold game. */
export function locateJamOrFold(state: HandState, action: Action): Located {
	const seat = state.toAct;
	if (seat === null) throw new RangeError('nobody is to act');
	const dealt = state.dealtIn.flatMap((d, s) => (d ? [s] : []));
	if (dealt.length !== 2) return outside('The jam-or-fold game is heads-up only.');
	const { smallBlind, bigBlind, ante } = state.config;
	if (ante !== 0 || smallBlind * 2 !== bigBlind) {
		return outside('The jam-or-fold game has blinds of half and one big blind and no ante.');
	}
	const stacks = dealt.map((s) => state.startingStacks[s] ?? 0);
	const effective = Math.min(...stacks) / bigBlind;
	if (!JAM_OR_FOLD_STACKS.includes(effective)) {
		return outside(
			`The jam-or-fold reference covers effective stacks of 2 to 15 big blinds in whole steps, not ${+effective.toFixed(2)}.`
		);
	}
	if (state.street !== PREFLOP) return outside('The jam-or-fold game ends before the flop.');
	const jamTo = effective * bigBlind;
	const holes = state.holeCards[seat];
	if (!holes) throw new RangeError('the player to act has no cards');
	const hand = CLASSES[classIndex(holes[0], holes[1])].name;
	const prior = state.actions;

	if (seat === state.button && prior.length === 0) {
		if (action.kind === 'fold') {
			return {
				inside: true,
				spot: `jof-${effective}bb-button`,
				action: 'fold',
				hand,
				stack: effective
			};
		}
		if (action.kind === 'raise' && (action.amount ?? 0) >= jamTo) {
			return {
				inside: true,
				spot: `jof-${effective}bb-button`,
				action: 'jam',
				hand,
				stack: effective
			};
		}
		return {
			inside: false,
			reason: 'action-outside-game',
			detail:
				'In the jam-or-fold game the button only moves all-in or folds; a limp or a smaller raise is not graded.'
		};
	}
	const jammed =
		prior.length === 1 &&
		prior[0].seat === state.button &&
		prior[0].kind === 'raise' &&
		prior[0].to >= jamTo;
	if (seat !== state.button && jammed) {
		if (action.kind === 'fold' || action.kind === 'call') {
			return {
				inside: true,
				spot: `jof-${effective}bb-big-blind`,
				action: action.kind,
				hand,
				stack: effective
			};
		}
		return {
			inside: false,
			reason: 'action-outside-game',
			detail: 'Facing an all-in, the jam-or-fold game only calls or folds.'
		};
	}
	return outside(
		'This decision comes after a limp or a smaller raise, which the jam-or-fold game does not contain.'
	);
}
