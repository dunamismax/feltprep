// A short-stack practice session (P3.5): heads-up hands at a fixed depth
// against the practice opponent, the button alternating every hand. A hand is
// fully determined by the session's seed, its number and the player's own
// actions, so the session stores only those and replays the rest: a reload
// returns to the same decision, and a test that fixes the seed plays known
// hands. Each of the player's decisions is graded as the drill grades it.

import { dealSeed } from '../drill/jam-or-fold.ts';
import { gradeAction } from '../drill/jam-or-fold.ts';
import { evaluate, describe as describeRank } from '../engine/evaluator.ts';
import { historyOf, historyToDict, type JsonObject } from '../engine/history.ts';
import { seededRandom } from '../engine/random.ts';
import {
	allows,
	apply,
	finalStacks,
	handConfig,
	legalActions,
	startHand,
	type Action,
	type ActionKind,
	type HandState,
	type Street
} from '../engine/state.ts';
import type { LoadedSolution } from '../spots/reader.ts';
import type { Verdict } from '../spots/types.ts';
import { opponentAction, type OpponentSource } from './opponent.ts';

export const BIG_BLIND = 100;
export const SMALL_BLIND = 50;
/** The depths a short-stack table offers. */
export const PRACTICE_STACKS: readonly number[] = [10, 11, 12, 13, 14, 15];
/** Finished hands kept in the browser for review. */
export const KEEP_HANDS = 50;

export interface StoredAction {
	readonly kind: ActionKind;
	readonly amount: number | null;
}

export interface PlayerDecision {
	readonly street: Street;
	readonly action: StoredAction;
	readonly verdict: Verdict;
}

export interface OpponentDecision {
	readonly street: Street;
	readonly action: StoredAction;
	readonly source: OpponentSource;
}

export interface FinishedHand {
	readonly number: number;
	readonly stack: number;
	/** The engine seat the player sat in. */
	readonly player: number;
	/** The engine's versioned hand history (format 1), enough to replay the hand. */
	readonly history: JsonObject;
	/** The player's result in big blinds. */
	readonly net: number;
	readonly decisions: readonly PlayerDecision[];
}

export interface PracticeSession {
	readonly version: 1;
	readonly stack: number;
	readonly seed: number;
	/** The engine seat the player sits in for the whole session. */
	readonly player: 0 | 1;
	/** The hand being played, counting from 0. */
	readonly hand: number;
	/** The player's actions so far in that hand. */
	readonly actions: readonly StoredAction[];
	/** Finished hands, oldest first, at most KEEP_HANDS. */
	readonly finished: readonly FinishedHand[];
	/** The player's total over every hand of the session, in big blinds. */
	readonly net: number;
	readonly played: number;
}

export function newPracticeSession(stack: number, seed: number): PracticeSession {
	return {
		version: 1,
		stack,
		seed: seed >>> 0,
		player: (seed & 1) as 0 | 1,
		hand: 0,
		actions: [],
		finished: [],
		net: 0,
		played: 0
	};
}

/** The button for hand `n`: it alternates, starting from a seat the seed picks. */
export function buttonOf(session: PracticeSession, n: number): number {
	return ((session.seed >>> 1) + n) & 1;
}

export interface Played {
	/** The hand at the player's next decision, or finished. */
	readonly state: HandState;
	readonly decisions: readonly PlayerDecision[];
	readonly opponent: readonly OpponentDecision[];
	/** True when the hand waits for the player. */
	readonly waiting: boolean;
}

/**
 * Replay the current hand: deal it from the seed, apply the player's stored
 * actions in turn and let the opponent answer, until the player must act or
 * the hand is over.
 */
export function playCurrent(solution: LoadedSolution, session: PracticeSession): Played {
	const n = session.hand;
	const chips = session.stack * BIG_BLIND;
	let state = startHand(handConfig(SMALL_BLIND, BIG_BLIND), [chips, chips], buttonOf(session, n), {
		rng: seededRandom(dealSeed(session.seed, n))
	});
	const bot = seededRandom(dealSeed(session.seed ^ 0x5bd1e995, n));
	const decisions: PlayerDecision[] = [];
	const opponent: OpponentDecision[] = [];
	let next = 0;
	while (state.result === null) {
		if (state.toAct === session.player) {
			if (next >= session.actions.length) return { state, decisions, opponent, waiting: true };
			const action = session.actions[next++];
			const verdict = gradeAction(solution, state, action);
			decisions.push({ street: state.street, action, verdict });
			state = apply(state, action);
		} else {
			const { action, source } = opponentAction(solution, state, bot);
			opponent.push({ street: state.street, action, source });
			state = apply(state, action);
		}
	}
	if (next < session.actions.length)
		throw new RangeError('the session holds actions after the hand ended');
	return { state, decisions, opponent, waiting: false };
}

/** Add the player's `action`, which the engine must allow at the current decision. */
export function takeAction(
	solution: LoadedSolution,
	session: PracticeSession,
	action: Action
): PracticeSession {
	const played = playCurrent(solution, session);
	if (!played.waiting || !allows(legalActions(played.state), action)) {
		throw new RangeError('the engine does not offer that action here');
	}
	return {
		...session,
		actions: [...session.actions, { kind: action.kind, amount: action.amount }]
	};
}

/** The player's result in a finished hand, in big blinds. */
export function netOf(state: HandState, player: number): number {
	const final = finalStacks(state)[player] ?? 0;
	return (final - (state.startingStacks[player] ?? 0)) / BIG_BLIND;
}

/** Close the finished current hand and move to the next one. */
export function nextHand(solution: LoadedSolution, session: PracticeSession): PracticeSession {
	const played = playCurrent(solution, session);
	if (played.waiting) throw new RangeError('the hand is not over');
	const net = netOf(played.state, session.player);
	const hand: FinishedHand = {
		number: session.hand,
		stack: session.stack,
		player: session.player,
		history: historyToDict(historyOf(played.state)),
		net,
		decisions: played.decisions
	};
	return {
		...session,
		hand: session.hand + 1,
		actions: [],
		finished: [...session.finished, hand].slice(-KEEP_HANDS),
		net: session.net + net,
		played: session.played + 1
	};
}

/** Why a finished hand ended as it did, in one sentence for the player. */
export function outcome(state: HandState, player: number): string {
	const result = state.result;
	if (!result) return '';
	const other = 1 - player;
	const net = netOf(state, player);
	const amount = `${String(Number(Math.abs(net).toFixed(2)))} bb`;
	if (!result.showdown) {
		return state.folded[player]
			? `You folded and lose ${amount}.`
			: `Your opponent folded; you win ${amount}.`;
	}
	const name = (seat: number) => {
		const holes = state.holeCards[seat];
		return holes ? describeRank(evaluate([...holes, ...state.board])).toLowerCase() : '';
	};
	if (net > 0) return `Your ${name(player)} beats their ${name(other)}; you win ${amount}.`;
	if (net < 0) return `Their ${name(other)} beats your ${name(player)}; you lose ${amount}.`;
	return `Both hold ${name(player)}: the pot is split.`;
}
