// The engine runs in a browser (A-3): this file runs in headless Chromium
// (Vitest's client project) and deals and plays complete hands there, from
// the browser's own cryptographic randomness and from a seed.

import { describe, expect, it } from 'vitest';
import { checkState, playRandomHand } from './fuzz.ts';
import {
	Action,
	apply,
	cryptoRandom,
	handConfig,
	isOver,
	legalActions,
	seededRandom,
	startHand
} from './index.ts';

describe('the engine in a browser', () => {
	it('runs where there is no Node', () => {
		expect(typeof window).toBe('object');
		expect('process' in globalThis && 'versions' in (globalThis.process ?? {})).toBe(false);
	});

	it('deals from Web Crypto and plays a hand to the end', () => {
		let state = startHand(handConfig(50, 100), [1_000, 1_000], 0, { rng: cryptoRandom });
		expect([...state.deck].sort((a, b) => a - b)).toEqual(Array.from({ length: 52 }, (_, c) => c));
		// The button calls, then both players check every street to showdown.
		while (!isOver(state)) {
			const legal = legalActions(state);
			state = apply(state, legal.canCheck ? Action.check() : Action.call());
			checkState(state, 2_000);
		}
		expect(state.result?.showdown).toBe(true);
		expect(state.stacks.reduce((a, b) => a + b, 0)).toBe(2_000);
	});

	it('plays seeded random hands with every invariant checked', () => {
		const rng = seededRandom(42);
		for (let seats = 2; seats <= 9; seats++) {
			for (let i = 0; i < 25; i++) expect(isOver(playRandomHand(seats, rng))).toBe(true);
		}
	});
});
