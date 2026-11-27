// The jam-or-fold drill (P3.4): seeded deals at a chosen depth and seat, each
// a real hand on the engine stopped at the decision, and the verdict for the
// action taken. Grading goes through the same path a full practice hand uses
// (`locateJamOrFold`, then `gradeDecision`), so the drill and the table can
// never disagree. Plain and browser-safe, so grading happens on the device.

import { CLASSES, classIndex } from '../solver/classes.ts';
import { gradeDecision } from '../solver/grading.ts';
import { locateJamOrFold } from '../solver/jam-or-fold-hand.ts';
import { seededRandom } from '../engine/random.ts';
import {
	Action,
	allows,
	apply,
	handConfig,
	legalActions,
	startHand,
	type HandState
} from '../engine/state.ts';
import type { LoadedSolution } from '../spots/reader.ts';
import type { Seat, Verdict } from '../spots/types.ts';

/** Chips in a big blind. Blinds are 50 and 100, so amounts in big blinds stay exact. */
export const BIG_BLIND = 100;
export const SMALL_BLIND = 50;

/** Which seat the player drills: one of them, or a mix of both. */
export type SeatMode = Seat | 'both';
export const SEAT_MODES: readonly SeatMode[] = ['both', 'button', 'big-blind'];

/** Decisions in one drill session. */
export const SESSION_LENGTH = 20;

export interface DrillDeal {
	readonly index: number;
	/** The player's role in the jam-or-fold game. */
	readonly seat: Seat;
	/** The engine seat the player sits in: 0 or 1, both used. */
	readonly player: number;
	/** The hand at the player's decision. */
	readonly state: HandState;
	/** The player's hand class, such as "AKs". */
	readonly hand: string;
}

/** A 32-bit seed for deal `index` of a session seeded with `seed`. */
export function dealSeed(seed: number, index: number): number {
	let z = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
	z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
	z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
	return (z ^ (z >>> 16)) >>> 0;
}

/**
 * Deal decision `index` of a session: shuffle with the session's seed, post
 * the blinds at `stack` big blinds each and, for the big blind, let the button
 * move all-in first. The same seed and index always give the same deal.
 */
export function dealDrill(seed: number, index: number, stack: number, mode: SeatMode): DrillDeal {
	const rng = seededRandom(dealSeed(seed, index));
	const seat: Seat = mode === 'both' ? (rng.below(2) === 0 ? 'button' : 'big-blind') : mode;
	const button = rng.below(2);
	const chips = stack * BIG_BLIND;
	let state = startHand(handConfig(SMALL_BLIND, BIG_BLIND), [chips, chips], button, { rng });
	if (seat === 'big-blind') state = apply(state, Action.raiseTo(legalActions(state).maxTo));
	const player = state.toAct;
	if (player === null) throw new Error('nobody is to act');
	const holes = state.holeCards[player];
	if (!holes) throw new Error('the player has no cards');
	const hand = CLASSES[classIndex(holes[0], holes[1])].name;
	return { index, seat, player, state, hand };
}

/** The verdict for taking `action` in `deal`, against `solution`. */
export function judge(solution: LoadedSolution, deal: DrillDeal, action: Action): Verdict {
	if (!allows(legalActions(deal.state), action)) {
		throw new RangeError('the engine does not offer that action here');
	}
	const located = locateJamOrFold(deal.state, action);
	if (!located.inside) return { graded: false, reason: located.reason, detail: located.detail };
	return gradeDecision(solution, located.spot, located.hand, located.action);
}

const VERB: Record<string, string> = { jam: 'jamming', fold: 'folding', call: 'calling' };

function signed(x: number): string {
	const r = Number(x.toFixed(2));
	return r === 0 ? '0.00' : `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}`;
}

/** One sentence that says why the verdict is what it is, from its own numbers. */
export function reason(verdict: Verdict): string {
	if (!verdict.graded) return verdict.detail;
	const { hand, action, best, values, frequencies, loss } = verdict;
	const actions = Object.keys(values);
	const worth = actions.map((a) => `${VERB[a] ?? a} ${signed(values[a])} bb`).join(' and ');
	const mixed = actions.filter((a) => frequencies[a] >= 0.05);
	if (mixed.length > 1) {
		const shares = mixed.map((a) => `${a}s ${Math.round(frequencies[a] * 100)}%`).join(' and ');
		return `With ${hand} the reference mixes: it ${shares}, because ${worth} are worth almost the same.`;
	}
	if (action === best) {
		return `With ${hand}, ${worth}, so ${VERB[best] ?? best} is the play.`;
	}
	return `With ${hand}, ${worth}: ${VERB[action] ?? action} gives up ${loss.toFixed(2)} bb against ${VERB[best] ?? best}.`;
}
