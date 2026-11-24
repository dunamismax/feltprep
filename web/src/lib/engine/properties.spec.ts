// Gate A's properties, the part the fuzzer does not cover by itself: at every
// decision of seeded random hands, every action the engine offers (fold,
// check or call, and a bet or raise at its minimum and at its maximum)
// applies cleanly and leaves a state that keeps every invariant. The fuzzer
// (fuzz.ts) already rejects actions just outside the legal set and checks
// that each hand ends.

import { describe, expect, it } from 'vitest';
import { checkState, randomAction, randomConfig, randomStacks, choice } from './fuzz.ts';
import { seededRandom } from './random.ts';
import { apply, isOver, legalActions, options, startHand } from './state.ts';

describe('every offered action applies', () => {
	it.each([2, 3, 4, 5, 6, 7, 8, 9])(
		'%i seats: 250 hands, every option at every decision',
		(seats) => {
			const rng = seededRandom(7_000 + seats);
			let tried = 0;
			for (let hand = 0; hand < 250; hand++) {
				const config = randomConfig(rng);
				const stacks = randomStacks(seats, config, rng);
				const total = stacks.reduce<number>((sum, s) => sum + (s ?? 0), 0);
				const dealt = stacks.map((_, s) => s).filter((s) => stacks[s]);
				let state = startHand(config, stacks, choice(rng, dealt), { rng });
				while (!isOver(state)) {
					const legal = legalActions(state);
					const offered = options(legal);
					expect(offered.length).toBeGreaterThan(0);
					for (const action of offered) {
						checkState(apply(state, action), total);
						tried++;
					}
					state = apply(state, randomAction(state, legal, rng));
				}
			}
			expect(tried).toBeGreaterThan(1_000);
		}
	);
});
