// Games whose answers are known in closed form, for benchmarks B-1 to B-3.

import { decision, terminal, type Game } from './game.ts';

/**
 * Kuhn poker: a three-card deck (J, Q, K), an ante of 1 each, one card each,
 * and one bet of 1. Player 0 checks or bets; after a check player 1 checks or
 * bets and player 0 may call or fold; after a bet player 1 calls or folds.
 * Its equilibria give player 0 a value of exactly -1/18 (Kuhn, 1950).
 */
export function kuhnPoker(): Game {
	const names = ['J', 'Q', 'K'];
	const prior = new Float64Array(9);
	for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j) prior[i * 3 + j] = 1 / 6;
	const showdown = (amount: number) => {
		const m = new Float64Array(9);
		for (let i = 0; i < 3; i++)
			for (let j = 0; j < 3; j++) m[i * 3 + j] = Math.sign(i - j) * amount;
		return terminal(m);
	};
	return {
		types: [3, 3],
		typeNames: [names, names],
		prior,
		root: decision('p0', 0, [
			[
				'check',
				decision('p1-after-check', 1, [
					['check', showdown(1)],
					[
						'bet',
						decision('p0-facing-bet', 0, [
							['fold', terminal(-1)],
							['call', showdown(2)]
						])
					]
				])
			],
			[
				'bet',
				decision('p1-facing-bet', 1, [
					['fold', terminal(1)],
					['call', showdown(2)]
				])
			]
		])
	};
}

export interface PolarizedRiver {
	/** The pot before the bet; each player has put in half of it. */
	readonly pot: number;
	/** The one bet size the bettor may use. */
	readonly bet: number;
	/** Hands in the bettor's range that beat every caller hand. */
	readonly nuts: number;
	/** Hands in the bettor's range that lose to every caller hand. */
	readonly air: number;
	/** Bluff-catchers: the caller's hands, which beat air and lose to the nuts. */
	readonly catchers: number;
}

/**
 * The river game with a polarized bettor (player 0) and a bluff-catcher
 * (player 1). The bettor checks, which goes to showdown, or bets; the caller
 * then calls or folds. Every pair of hands is equally likely. When the range
 * holds enough air, the equilibrium bluffs B / (P + 2B) of the betting range
 * and calls P / (P + B) of the time.
 */
export function polarizedRiver(spec: PolarizedRiver): Game {
	const { pot, bet, nuts, air, catchers } = spec;
	const n0 = nuts + air;
	const prior = new Float64Array(n0 * catchers).fill(1 / (n0 * catchers));
	const matrix = (win: number) => {
		const m = new Float64Array(n0 * catchers);
		for (let t0 = 0; t0 < n0; t0++) {
			for (let t1 = 0; t1 < catchers; t1++) m[t0 * catchers + t1] = t0 < nuts ? win : -win;
		}
		return terminal(m);
	};
	const bettor = [
		...Array.from({ length: nuts }, (_, i) => `nuts-${i + 1}`),
		...Array.from({ length: air }, (_, i) => `air-${i + 1}`)
	];
	return {
		types: [n0, catchers],
		typeNames: [bettor, Array.from({ length: catchers }, (_, i) => `catcher-${i + 1}`)],
		prior,
		root: decision('bettor', 0, [
			['check', matrix(pot / 2)],
			[
				'bet',
				decision('caller', 1, [
					['fold', terminal(pot / 2)],
					['call', matrix(pot / 2 + bet)]
				])
			]
		])
	};
}
