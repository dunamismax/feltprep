// Engine states for the action panel's examples on /style and for Gate A's
// interface test: an opening decision, a decision where raising is not
// allowed, and an all-in for less than a full raise. Each is played on the
// engine from a fixed deck, never written out by hand.

import { FULL_DECK } from '../engine/cards.ts';
import {
	Action,
	apply,
	handConfig,
	legalActions,
	startHand,
	type HandState,
	type LegalActions
} from '../engine/state.ts';

export interface PanelExample {
	readonly id: string;
	readonly title: string;
	readonly state: HandState;
	readonly legal: LegalActions;
	readonly behind: number;
	readonly bigBlind: number;
}

function example(id: string, title: string, state: HandState): PanelExample {
	const legal = legalActions(state);
	return { id, title, state, legal, behind: state.stacks[legal.seat], bigBlind: 100 };
}

export function panelExamples(): PanelExample[] {
	const deal = (stacks: number[]) => startHand(handConfig(50, 100), stacks, 0, { deck: FULL_DECK });
	const opening = deal([1000, 1000]);
	const facingAllIn = apply(deal([1000, 1000]), Action.raiseTo(1000));
	// The big blind has 2.5 big blinds in all; after a raise to 2 the smallest
	// full raise would be to 3, so its only raise is all-in for less.
	const shortAllIn = apply(deal([1000, 250]), Action.raiseTo(200));
	return [
		example('opening', 'Button at 10 big blinds, first to act', opening),
		example('facing-all-in', 'Big blind facing an all-in: raising is not allowed', facingAllIn),
		example(
			'short-all-in',
			'Big blind with 2.5 big blinds facing a raise to 2: all-in for less than a full raise',
			shortAllIn
		)
	];
}
