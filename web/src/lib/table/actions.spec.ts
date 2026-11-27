import { describe, expect, it } from 'vitest';
import { Action, allows, apply, handConfig, legalActions, startHand } from '../engine/state.ts';
import { seededRandom } from '../engine/random.ts';
import { randomAction } from '../engine/fuzz.ts';
import { describeAction, inBigBlinds, places, stepSize } from './actions.ts';

const start = (stacks: number[]) =>
	startHand(handConfig(50, 100), stacks, 0, { rng: seededRandom(1) });

describe('places', () => {
	it('offers the button fold, a limp, a sized raise and all-in at 10 big blinds', () => {
		const state = start([1000, 1000]);
		const p = places(legalActions(state), state.stacks[0], 100);
		expect(p.map((x) => [x.key, x.label, x.detail, x.enabled])).toEqual([
			['fold', 'Fold', '', true],
			['call', 'Call', '0.5 bb', true],
			['raise', 'Raise', 'choose size', true],
			['all-in', 'All-in', '10 bb', true]
		]);
		expect(p[3].action).toEqual(Action.raiseTo(1000));
	});

	it('offers only fold and an all-in call facing an all-in for the whole stack', () => {
		let state = start([1000, 1000]);
		state = apply(state, Action.raiseTo(1000));
		const p = places(legalActions(state), state.stacks[1], 100);
		expect(p.map((x) => [x.key, x.label, x.detail, x.enabled])).toEqual([
			['fold', 'Fold', '', true],
			['call', 'Call', '9 bb, all-in', true],
			['raise', 'Raise', '', false],
			['all-in', 'All-in', '', false]
		]);
	});

	it('offers check, not fold, when nothing is owed', () => {
		let state = start([1000, 1000]);
		state = apply(state, Action.call());
		const p = places(legalActions(state), state.stacks[1], 100);
		expect(p[0].enabled).toBe(false);
		expect(p[1]).toMatchObject({ label: 'Check', enabled: true });
	});

	it('offers only all-in when a raise cannot be smaller than all-in', () => {
		// The big blind has 2.5 big blinds left after a min-raise to 2: the only raise is all-in.
		let state = start([1000, 250]);
		state = apply(state, Action.raiseTo(200));
		const legal = legalActions(state);
		const p = places(legal, state.stacks[1], 100);
		expect(legal.minTo).toBe(legal.maxTo);
		expect(p[2].enabled).toBe(false);
		expect(p[3]).toMatchObject({ enabled: true, detail: '2.5 bb' });
	});

	it('only ever offers actions the engine allows, over many random hands', () => {
		const rng = seededRandom(3);
		for (let hand = 0; hand < 300; hand++) {
			let state = startHand(handConfig(50, 100), [1000 + hand, 1500], hand % 2, { rng });
			while (state.result === null) {
				const legal = legalActions(state);
				for (const place of places(legal, state.stacks[legal.seat], 100)) {
					if (place.action) expect(allows(legal, place.action)).toBe(place.enabled);
				}
				state = apply(state, randomAction(state, legal, rng));
			}
		}
	});
});

describe('sizing and words', () => {
	it('steps half a big blind inside the legal range', () => {
		const legal = legalActions(start([1000, 1000]));
		expect(stepSize(200, 1, legal, 100)).toBe(250);
		expect(stepSize(200, -1, legal, 100)).toBe(200);
		expect(stepSize(980, 1, legal, 100)).toBe(1000);
	});

	it('shows chips as big blinds and actions in words', () => {
		expect(inBigBlinds(50, 100)).toBe('0.5');
		expect(inBigBlinds(1234, 100)).toBe('12.34');
		expect(describeAction(Action.raiseTo(250), 100)).toBe('raise to 2.5 bb');
		expect(describeAction(Action.fold(), 100)).toBe('fold');
	});
});
