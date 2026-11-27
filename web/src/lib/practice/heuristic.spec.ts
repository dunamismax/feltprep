// The first two tests are imported from RiverMind Poker,
// web/src/lib/server/bots/bots.spec.ts at commit 233b9c6 ("score hands as
// Chen does" and "RiverMind Easy opens strong hands and folds weak ones"),
// GPL-3.0-or-later (licenses/GPL-3.0.txt). The legality test is FeltPrep's,
// as BUILD.md's reuse assessment asks: 1,000 hands at 2 seats from both
// positions. Changes on import are in docs/provenance.md.

import { describe, expect, it } from 'vitest';
import { cards, FULL_DECK } from '../engine/cards.ts';
import { seededRandom } from '../engine/random.ts';
import { allows, apply, handConfig, legalActions, startHand, Action } from '../engine/state.ts';
import { seatView } from '../engine/view.ts';
import { HeuristicPolicy, chenScore, handStrength } from './heuristic.ts';

const DECK = FULL_DECK;

describe('the heuristic bot', () => {
	it('score hands as Chen does', () => {
		const scores = ['AsAh', '7c2d', 'KsQs', 'Td9d', '5h4h', 'Ac2c', 'JcTd', '2s2h'].map((h) =>
			chenScore(cards(h) as [number, number])
		);
		expect(scores).toEqual([20, -1, 10, 8, 6, 7, 7, 5]);
		expect(handStrength(cards('AsKs') as [number, number], cards('Qs7s2d'))).toBe(
			0.5962072155411656
		);
		expect(handStrength(cards('7c2d') as [number, number], cards('AsKsQh9d'))).toBe(
			0.16666666666666666
		);
	});

	it('RiverMind Easy opens strong hands and folds weak ones', () => {
		const bot = new HeuristicPolicy();
		// Cards go round one at a time, so one seat holds As Ah and the other 2c 7d.
		const top = cards('As2cAh7d');
		const state = startHand(handConfig(50, 100), [10_000, 10_000], 0, {
			deck: [...top, ...DECK.filter((c) => !top.includes(c))]
		});
		const strong = state.holeCards.findIndex((h) => h![0] >> 2 === 12);
		expect(state.holeCards[strong]!.map((c) => c >> 2)).toEqual([12, 12]);
		const weak = 1 - strong;
		expect(state.toAct).toBe(0);
		if (strong === 0) {
			expect(bot.act(seatView(state, 0))).toEqual(Action.raiseTo(250));
			expect(bot.act(seatView(apply(state, Action.raiseTo(250)), weak)).kind).toBe('fold');
		} else {
			expect(bot.act(seatView(state, 0)).kind).toBe('fold');
		}
	});

	it('plays 1,000 short-stack hands legally from both seats', () => {
		const bot = new HeuristicPolicy();
		const rng = seededRandom(2026);
		let decisions = 0;
		for (let hand = 0; hand < 1000; hand++) {
			const stacks = [1000 + (hand % 6) * 100, 1500 - (hand % 4) * 100];
			let state = startHand(handConfig(50, 100), stacks, hand % 2, { rng });
			while (state.result === null) {
				const action = bot.act(seatView(state, state.toAct!));
				expect(allows(legalActions(state), action)).toBe(true);
				state = apply(state, action);
				decisions++;
			}
		}
		expect(decisions).toBeGreaterThan(1000);
	});
});
