// Imported from RiverMind Poker (https://github.com/dunamismax/rivermind-poker),
// web/src/lib/server/engine/random.ts at commit 233b9c6.
// Licensed GPL-3.0-or-later (licenses/GPL-3.0.txt): it stays under the GPL
// inside AGPL-licensed FeltPrep. Changes on import are in docs/provenance.md.
//
// Caller-supplied randomness for the engine (rule 1.1). Practice hands deal
// from `cryptoRandom`; seeded generators are for tests, drills under test,
// evaluation and benchmarks. Nothing here imports a Node module, so the engine
// runs in the browser as well as in Node.

/** A source of uniform whole numbers. */
export interface Random {
	/** A uniform whole number from 0 to `bound - 1`. */
	below(bound: number): number;
}

/**
 * Cryptographic randomness from the Web Crypto API, which browsers and Node
 * both provide as `globalThis.crypto`. Rejection sampling keeps every result
 * equally likely.
 */
export const cryptoRandom: Random = {
	below(bound) {
		if (!Number.isInteger(bound) || bound < 1 || bound > 2 ** 32) {
			throw new RangeError('bound must be a whole number from 1 to 2^32');
		}
		const limit = 2 ** 32 - (2 ** 32 % bound);
		const word = new Uint32Array(1);
		for (;;) {
			globalThis.crypto.getRandomValues(word);
			if (word[0] < limit) return word[0] % bound;
		}
	}
};

/**
 * A seeded generator for tests (SplitMix32 on a 32-bit state). It is not the
 * Python engine's Mersenne Twister, so seeded deals differ between the two;
 * differential tests pass whole deck orders instead.
 */
export function seededRandom(seed: number): Random {
	let state = seed >>> 0;
	const next = () => {
		state = (state + 0x9e3779b9) >>> 0;
		let z = state;
		z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
		z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
		return (z ^ (z >>> 15)) >>> 0;
	};
	return {
		below(bound) {
			if (!Number.isInteger(bound) || bound < 1 || bound > 2 ** 32) {
				throw new RangeError('bound must be a whole number from 1 to 2^32');
			}
			// Rejection sampling keeps every result equally likely.
			const limit = 2 ** 32 - (2 ** 32 % bound);
			for (;;) {
				const value = next();
				if (value < limit) return value % bound;
			}
		}
	};
}

/** Shuffle in place the way Python's `random.shuffle` does (Fisher-Yates from the end). */
export function shuffle<T>(items: T[], rng: Random): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = rng.below(i + 1);
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}
