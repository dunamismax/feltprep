// The action panel's four places (P3.4, reused by the practice table): fold,
// check or call, a sized bet or raise, and all-in. Everything here comes from
// the engine's legal actions for the current state, never from a second copy
// of the rules (AGENTS.md section 8). A place the engine does not allow is
// shown disabled, so the controls never move when the options change.

import { Action, type LegalActions } from '../engine/state.ts';

/** Chips as big blinds for display only, such as 50 → "0.5" and 1000 → "10". */
export function inBigBlinds(chips: number, bigBlind: number): string {
	return String(Number((chips / bigBlind).toFixed(2)));
}

export interface Place {
	readonly key: 'fold' | 'call' | 'raise' | 'all-in';
	readonly label: string;
	/** A second line, such as an amount. */
	readonly detail: string;
	/** The action a tap takes; null for the raise place, which opens sizing. */
	readonly action: Action | null;
	readonly enabled: boolean;
}

/**
 * The four places for `legal`, where `behind` is the actor's chips behind and
 * `bigBlind` sets the display unit.
 */
export function places(legal: LegalActions, behind: number, bigBlind: number): Place[] {
	const bb = (chips: number) => `${inBigBlinds(chips, bigBlind)} bb`;
	const raise = legal.raiseKind;
	const callAllIn = legal.call > 0 && legal.call >= behind;
	return [
		{
			key: 'fold',
			label: 'Fold',
			detail: '',
			action: legal.canFold ? Action.fold() : null,
			enabled: legal.canFold
		},
		legal.canCheck
			? { key: 'call', label: 'Check', detail: '', action: Action.check(), enabled: true }
			: {
					key: 'call',
					label: 'Call',
					detail: legal.call > 0 ? (callAllIn ? `${bb(legal.call)}, all-in` : bb(legal.call)) : '',
					action: legal.call > 0 ? Action.call() : null,
					enabled: legal.call > 0
				},
		{
			key: 'raise',
			label: raise === 'bet' ? 'Bet' : 'Raise',
			detail: raise && legal.minTo < legal.maxTo ? 'choose size' : '',
			action: null,
			enabled: raise !== null && legal.minTo < legal.maxTo
		},
		{
			key: 'all-in',
			label: 'All-in',
			detail: raise ? bb(legal.maxTo) : '',
			action: raise ? Action.of(raise, legal.maxTo) : null,
			enabled: raise !== null
		}
	];
}

/** Steps for the sizing control: half a big blind, clamped to the legal range. */
export function stepSize(
	amount: number,
	delta: number,
	legal: LegalActions,
	bigBlind: number
): number {
	const step = Math.max(1, Math.round(bigBlind / 2));
	const next = amount + delta * step;
	return Math.min(legal.maxTo, Math.max(legal.minTo, next));
}

/** An action in words, such as "fold", "call" or "raise to 2.5 bb". */
export function describeAction(action: Action, bigBlind: number): string {
	if (action.amount === null) return action.kind;
	const to = `${inBigBlinds(action.amount, bigBlind)} bb`;
	return action.kind === 'bet' ? `bet ${to}` : `raise to ${to}`;
}
