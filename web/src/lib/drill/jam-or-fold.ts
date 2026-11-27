// The jam-or-fold drill (P3.4): seeded deals at a chosen depth and seat, each
// a real hand on the engine stopped at the decision, and the verdict for the
// action taken. Grading goes through the same path a full practice hand uses
// (`locateJamOrFold`, then `gradeDecision`), so the drill and the table can
// never disagree. Plain and browser-safe, so grading happens on the device.

import { CLASSES, classIndex } from '../solver/classes.ts';
import { gradeDecision } from '../solver/grading.ts';
import { locateJamOrFold } from '../solver/jam-or-fold-hand.ts';
import { cardStr, cards as parseCards } from '../engine/cards.ts';
import { seededRandom, shuffle } from '../engine/random.ts';
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

/** Two hole cards, as engine card numbers. */
export type Holes = readonly [number, number];

/**
 * Deal decision `index` of a session: shuffle with the session's seed, post
 * the blinds at `stack` big blinds each and, for the big blind, let the button
 * move all-in first. The same seed and index always give the same deal. With
 * `holes`, the player is dealt exactly those two cards and the rest of the
 * deck is shuffled from the same seed (P3.9: a drill that starts on a chosen
 * decision).
 */
export function dealDrill(
	seed: number,
	index: number,
	stack: number,
	mode: SeatMode,
	holes: Holes | null = null
): DrillDeal {
	const rng = seededRandom(dealSeed(seed, index));
	const seat: Seat = mode === 'both' ? (rng.below(2) === 0 ? 'button' : 'big-blind') : mode;
	const button = rng.below(2);
	const chips = stack * BIG_BLIND;
	const config = handConfig(SMALL_BLIND, BIG_BLIND);
	let state: HandState;
	if (holes) {
		if (holes[0] === holes[1]) throw new RangeError('two different cards are needed');
		const deck = shuffle(
			Array.from({ length: 52 }, (_, c) => c),
			rng
		);
		// Where the player's two cards come from in the deck: deal a deck in
		// order, so each card dealt names its own position.
		const probe = startHand(config, [chips, chips], button, {
			deck: Array.from({ length: 52 }, (_, c) => c)
		});
		const seatOf = seat === 'button' ? button : 1 - button;
		const at = probe.holeCards[seatOf];
		if (!at) throw new Error('the player has no cards');
		for (let k = 0; k < 2; k++) {
			const from = deck.indexOf(holes[k]);
			[deck[at[k]], deck[from]] = [deck[from], deck[at[k]]];
		}
		state = startHand(config, [chips, chips], button, { deck });
	} else {
		state = startHand(config, [chips, chips], button, { rng });
	}
	if (seat === 'big-blind') state = apply(state, Action.raiseTo(legalActions(state).maxTo));
	const player = state.toAct;
	if (player === null) throw new Error('nobody is to act');
	const dealt = state.holeCards[player];
	if (!dealt) throw new Error('the player has no cards');
	const hand = CLASSES[classIndex(dealt[0], dealt[1])].name;
	return { index, seat, player, state, hand };
}

/** Decisions in a drill of one spot (P3.9's proposal). */
export const TARGETED_LENGTH = 10;

/**
 * The deals of a drill of one spot, started from a decision the player got
 * wrong: deal 0 is that decision (the same seat and cards), the odd deals are
 * hand classes next to it in the grid whose best action differs, nearest
 * first, and the even deals are random hands at the same seat (null). Seeded,
 * so a test plays known deals.
 */
export function targetedPlan(
	solution: LoadedSolution,
	stack: number,
	seat: Seat,
	holes: Holes,
	seed: number
): (Holes | null)[] {
	const table = solution.solution.decisions.find((d) => d.spot === `jof-${stack}bb-${seat}`);
	if (!table) throw new RangeError(`no decision table for ${stack} big blinds, ${seat}`);
	const rng = seededRandom(dealSeed(seed ^ 0x7f4a7c15, 0));
	const bestOf = (name: string) => {
		const v = table.values[table.hands.indexOf(name)];
		return v.indexOf(Math.max(...v));
	};
	const target = CLASSES[classIndex(holes[0], holes[1])];
	const best = bestOf(target.name);
	const distance = (c: (typeof CLASSES)[number]) =>
		Math.max(Math.abs(c.row - target.row), Math.abs(c.col - target.col));
	const others = shuffle(
		CLASSES.filter((c) => c.index !== target.index),
		rng
	).sort((a, b) => distance(a) - distance(b));
	const differ = others.filter((c) => bestOf(c.name) !== best);
	const pool = (differ.length ? differ : others).slice(0, Math.ceil((TARGETED_LENGTH - 1) / 2));
	const plan: (Holes | null)[] = [holes];
	for (let i = 1; i < TARGETED_LENGTH; i++) {
		if (i % 2 === 0) {
			plan.push(null);
			continue;
		}
		const c = pool[((i - 1) / 2) % pool.length];
		const [x, y] = c.combos[rng.below(c.combos.length)];
		plan.push([x, y]);
	}
	return plan;
}

/** Two hole cards as text for a link, such as "AsKd". */
export function holesText(holes: Holes): string {
	return cardStr(holes[0]) + cardStr(holes[1]);
}

/** Two different hole cards read from a link, or null. */
export function parseHoles(text: string | null): Holes | null {
	if (!text || !/^[2-9TJQKAtjqka][cdhs][2-9TJQKAtjqka][cdhs]$/.test(text)) return null;
	try {
		const [a, b] = parseCards(text);
		return a === b ? null : [a, b];
	} catch {
		return null;
	}
}

/**
 * The query that opens a drill of one spot: the seat and the two cards, and
 * whether to offer the way back to the practice table. Nothing about the player.
 */
export function targetQuery(seat: Seat, holes: Holes, from: 'practice' | null): string {
	const q = new URLSearchParams({ seat, cards: holesText(holes) });
	if (from) q.set('from', from);
	return `?${q.toString()}`;
}

/**
 * The verdict for taking `action` in `state`, a heads-up hand at the player's
 * decision, against `solution`. The drill and the practice table both grade
 * through here.
 */
export function gradeAction(solution: LoadedSolution, state: HandState, action: Action): Verdict {
	if (!allows(legalActions(state), action)) {
		throw new RangeError('the engine does not offer that action here');
	}
	const located = locateJamOrFold(state, action);
	if (!located.inside) return { graded: false, reason: located.reason, detail: located.detail };
	return gradeDecision(solution, located.spot, located.hand, located.action);
}

/** The verdict for taking `action` in `deal`, against `solution`. */
export function judge(solution: LoadedSolution, deal: DrillDeal, action: Action): Verdict {
	return gradeAction(solution, deal.state, action);
}
