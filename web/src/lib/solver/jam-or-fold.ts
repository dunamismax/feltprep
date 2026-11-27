// The heads-up jam-or-fold game (P2.4, docs/grading.md "The jam-or-fold
// game"). Blinds are half a big blind (the button) and one big blind, with no
// ante. The button either folds or moves all-in for the effective stack S;
// facing that, the big blind calls or folds. Called hands are dealt to the
// river. Player 0 is the button and player 1 the big blind; each holds one of
// the 169 hand classes, dealt with exact card removal from the pre-flop table.
//
// Payoffs are the button's, in big blinds, against its stack before the hand:
//   button folds              -0.5
//   jam, big blind folds      +1
//   jam, big blind calls      2S x equity - S

import { CLASSES, NUM_CLASSES, NUM_COMBOS } from './classes.ts';
import {
	actionValues,
	exploitability,
	solve,
	type Exploitability,
	type NodeValues
} from './cfr.ts';
import { decision, terminal, type Game, type Strategy } from './game.ts';
import type { PreflopTable } from './preflop-table.ts';

export const JAM_OR_FOLD_STACKS: readonly number[] = Array.from({ length: 14 }, (_, i) => i + 2);
export const BUTTON_NODE = 'button';
export const BIG_BLIND_NODE = 'big-blind';

/** The chance of each pair of classes being dealt, prior[button * 169 + big blind]. */
export function classPrior(table: PreflopTable): Float64Array {
	const prior = new Float64Array(NUM_CLASSES * NUM_CLASSES);
	// Ordered pairs of disjoint combinations: 1,326 for the button, then 1,225
	// (50 choose 2) for the big blind.
	const total = NUM_COMBOS * 1225;
	for (let i = 0; i < prior.length; i++) prior[i] = table.pairs[i] / total;
	return prior;
}

/** The jam-or-fold game at effective stack `stack` big blinds. */
export function jamOrFoldGame(table: PreflopTable, stack: number): Game {
	if (!(stack >= 1)) throw new RangeError('the effective stack is at least one big blind');
	const K = NUM_CLASSES;
	const called = new Float64Array(K * K);
	for (let i = 0; i < K; i++) {
		for (let j = 0; j < K; j++) {
			if (table.pairCount(i, j) > 0) called[i * K + j] = 2 * stack * table.equity(i, j) - stack;
		}
	}
	const names = CLASSES.map((c) => c.name);
	return {
		types: [K, K],
		typeNames: [names, names],
		prior: classPrior(table),
		root: decision(BUTTON_NODE, 0, [
			['fold', terminal(-0.5)],
			[
				'jam',
				decision(BIG_BLIND_NODE, 1, [
					['fold', terminal(1)],
					['call', terminal(called)]
				])
			]
		])
	};
}

/**
 * Each class's value of each action, computed directly from the equity table
 * and the other player's frequencies, without the game tree: the separate
 * calculation B-11 checks the solver's values against.
 *
 * `jam[i]` is the button's jam frequency with class i and `call[j]` the big
 * blind's calling frequency with class j. Returns [fold, jam] per button
 * class and [fold, call] per big-blind class, in big blinds for that player.
 */
export function directValues(
	table: PreflopTable,
	stack: number,
	jam: ArrayLike<number>,
	call: ArrayLike<number>
): { button: [number, number][]; bigBlind: [number, number][] } {
	const K = NUM_CLASSES;
	const button: [number, number][] = [];
	for (let i = 0; i < K; i++) {
		// Given the button holds class i, the big blind holds class j with
		// chance pairs(i, j) / sum over j of pairs(i, j).
		let weight = 0;
		let value = 0;
		for (let j = 0; j < K; j++) {
			const w = table.pairCount(i, j);
			if (w === 0) continue;
			const showdown = 2 * stack * table.equity(i, j) - stack;
			value += w * ((1 - call[j]) * 1 + call[j] * showdown);
			weight += w;
		}
		button.push([-0.5, value / weight]);
	}
	const bigBlind: [number, number][] = [];
	for (let j = 0; j < K; j++) {
		// Facing a jam, the button holds class i with chance proportional to
		// pairs(i, j) times its jam frequency.
		let weight = 0;
		let value = 0;
		for (let i = 0; i < K; i++) {
			const w = table.pairCount(i, j) * jam[i];
			if (w === 0) continue;
			value += w * (2 * stack * table.equity(j, i) - stack);
			weight += w;
		}
		bigBlind.push([-1, weight > 0 ? value / weight : NaN]);
	}
	return { button, bigBlind };
}

/** Round to ten decimal places, the precision the artifact stores. */
export function round10(x: number): number {
	return Math.round(x * 1e10) / 1e10;
}

/** One depth's finished reference: frequencies, exact values and exploitability. */
export interface DepthSolution {
	readonly stack: number;
	readonly iterations: number;
	/** The button's jam frequency per class, rounded to ten decimals. */
	readonly jam: Float64Array;
	/** The big blind's calling frequency per class, rounded likewise. */
	readonly call: Float64Array;
	/** Exploitability of exactly these rounded frequencies. */
	readonly exploitability: Exploitability;
	/** [fold, jam] per button class and [fold, call] per big-blind class, exact for these frequencies. */
	readonly buttonValues: Float64Array;
	readonly bigBlindValues: Float64Array;
}

/**
 * Solve the game at `stack` with `iterations` of CFR+, round the frequencies
 * to the stored precision, and evaluate exactly those rounded frequencies:
 * the stored values and exploitability belong to the stored strategy.
 */
export function solveJamOrFold(
	table: PreflopTable,
	stack: number,
	iterations: number
): DepthSolution {
	const game = jamOrFoldGame(table, stack);
	const { average } = solve(game, { iterations });
	const K = NUM_CLASSES;
	const jam = new Float64Array(K);
	const call = new Float64Array(K);
	const button = average.get(BUTTON_NODE) as Float64Array;
	const big = average.get(BIG_BLIND_NODE) as Float64Array;
	for (let i = 0; i < K; i++) {
		jam[i] = round10(button[i * 2 + 1]);
		call[i] = round10(big[i * 2 + 1]);
	}
	const rounded: Strategy = new Map([
		[
			BUTTON_NODE,
			Float64Array.from({ length: 2 * K }, (_, x) => (x % 2 ? jam[x >> 1] : 1 - jam[x >> 1]))
		],
		[
			BIG_BLIND_NODE,
			Float64Array.from({ length: 2 * K }, (_, x) => (x % 2 ? call[x >> 1] : 1 - call[x >> 1]))
		]
	]);
	const values = actionValues(game, rounded);
	return {
		stack,
		iterations,
		jam,
		call,
		exploitability: exploitability(game, rounded),
		buttonValues: (values.get(BUTTON_NODE) as NodeValues).values,
		bigBlindValues: (values.get(BIG_BLIND_NODE) as NodeValues).values
	};
}
