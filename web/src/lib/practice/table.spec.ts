import { describe, expect, it } from 'vitest';
import { historyFromDict, replay } from '../engine/history.ts';
import { seededRandom } from '../engine/random.ts';
import { Action, legalActions, options, startHand, handConfig } from '../engine/state.ts';
import { jamOrFoldAt } from '../server/solutions.ts';
import { referenceAction } from './opponent.ts';
import {
	buttonOf,
	netOf,
	newPracticeSession,
	nextHand,
	outcome,
	playCurrent,
	takeAction,
	type PracticeSession
} from './table.ts';

const solution = await jamOrFoldAt(10);

/** Play `hands` hands choosing uniformly among the engine's options. */
function playRandomly(session: PracticeSession, hands: number, seed: number): PracticeSession {
	const rng = seededRandom(seed);
	for (let h = 0; h < hands; h++) {
		for (;;) {
			const played = playCurrent(solution, session);
			if (!played.waiting) break;
			const choices = options(legalActions(played.state));
			session = takeAction(solution, session, choices[rng.below(choices.length)]);
		}
		session = nextHand(solution, session);
	}
	return session;
}

describe('a practice session', () => {
	it('alternates the button every hand and seats the player by the seed', () => {
		const s = newPracticeSession(10, 6);
		expect([0, 1, 2, 3].map((n) => buttonOf(s, n))).toEqual([1, 0, 1, 0]);
		expect(newPracticeSession(10, 6).player).toBe(0);
		expect(newPracticeSession(10, 7).player).toBe(1);
	});

	it('replays the same decision from the same seed and actions', () => {
		let s = newPracticeSession(10, 1234);
		const first = playCurrent(solution, s);
		expect(playCurrent(solution, s).state).toEqual(first.state);
		if (first.waiting) {
			s = takeAction(solution, s, Action.fold());
			expect(playCurrent(solution, s).state).toEqual(playCurrent(solution, s).state);
		}
	});

	it('plays 300 hands from both seats with every chip accounted for', () => {
		for (const seed of [10, 11]) {
			const s = playRandomly(newPracticeSession(10, seed), 150, seed);
			expect(s.played).toBe(150);
			expect(s.finished).toHaveLength(50);
			for (const hand of s.finished) {
				const state = replay(historyFromDict(hand.history));
				expect(state.result).not.toBeNull();
				expect(netOf(state, hand.player)).toBe(hand.net);
				// Heads-up: what one player wins the other loses.
				expect(netOf(state, 1 - hand.player)).toBe(-hand.net);
			}
		}
	});

	it('grades the player’s first decision and leaves later ones ungraded', () => {
		const s = playRandomly(newPracticeSession(10, 77), 60, 5);
		const graded = s.finished.flatMap((h) => h.decisions.filter((d) => d.verdict.graded));
		const ungraded = s.finished.flatMap((h) => h.decisions.filter((d) => !d.verdict.graded));
		expect(graded.length).toBeGreaterThan(0);
		expect(ungraded.length).toBeGreaterThan(0);
		for (const d of graded) expect(d.street).toBe(0);
	});

	it('refuses an action the engine does not offer', () => {
		// Seed 0: the player is on the button for hand 0, so the hand waits for them.
		const s = newPracticeSession(10, 0);
		const played = playCurrent(solution, s);
		expect(played.waiting).toBe(true);
		expect(() => takeAction(solution, s, Action.raiseTo(5000))).toThrow(RangeError);
		expect(() => nextHand(solution, s)).toThrow(RangeError);
	});
});

describe('the practice opponent', () => {
	it('draws the reference’s frequencies inside the jam-or-fold game', () => {
		// The button's decision at 10 bb, for a class the reference mixes.
		const table = solution.solution.decisions.find((d) => d.spot === 'jof-10bb-button')!;
		const h = table.frequencies.findIndex((f) => f[1] > 0.2 && f[1] < 0.8);
		expect(h).toBeGreaterThanOrEqual(0);
		const hand = table.hands[h];
		// Find a deal that gives the button this class.
		let state = null;
		for (let i = 0; state === null; i++) {
			const s = startHand(handConfig(50, 100), [1000, 1000], 0, { rng: seededRandom(i) });
			const [a, b] = s.holeCards[0]!;
			const [hi, lo] = [a, b].sort((x, y) => y - x);
			const name =
				'23456789TJQKA'[hi >> 2] +
				'23456789TJQKA'[lo >> 2] +
				(hi >> 2 === lo >> 2 ? '' : (hi & 3) === (lo & 3) ? 's' : 'o');
			if (name === hand) state = s;
		}
		const rng = seededRandom(9);
		let jams = 0;
		const draws = 20000;
		for (let i = 0; i < draws; i++) {
			const action = referenceAction(solution, state, rng)!;
			if (action.kind === 'raise') {
				expect(action.amount).toBe(1000);
				jams++;
			}
		}
		expect(Math.abs(jams / draws - table.frequencies[h][1])).toBeLessThan(0.015);
	});

	it('hands over to the heuristic after a limp', () => {
		let s = newPracticeSession(10, 0);
		// Seed 0 seats the player in seat 0 with the button on hand 0.
		expect(buttonOf(s, 0)).toBe(0);
		s = takeAction(solution, s, Action.call());
		const played = playCurrent(solution, s);
		expect(played.opponent[0].source).toBe('heuristic');
	});
});

describe('outcome', () => {
	it('says who folded or whose hand won, and how much', () => {
		const s = playRandomly(newPracticeSession(12, 31), 40, 3);
		const texts = s.finished.map((h) => outcome(replay(historyFromDict(h.history)), h.player));
		expect(texts.some((t) => /^Your opponent folded; you win \d/.test(t))).toBe(true);
		expect(texts.some((t) => /^You folded and lose \d/.test(t))).toBe(true);
		expect(texts.some((t) => / beats /.test(t))).toBe(true);
	});
});
