// Why a jam-or-fold verdict is what it is, in plain English (P3.9, D-25).
// One function writes the explanation the drill, the end of a practice hand
// and review all show, so they can never disagree, and every number in it is
// taken from the reference: the stored frequencies and values, and the exact
// pre-flop equity table the solution was built from (its manifest's input).
// B-13 (explain.spec.ts) checks each printed number against a separately
// written calculation and checks the wording against the verdict.
//
// The numbers, for effective stack S, in big blinds against the stack before
// the hand (the same payoffs as jam-or-fold.ts):
//   the button folds                -0.5 (its small blind)
//   jam, the big blind folds        +1   (the big blind's blind)
//   jam, the big blind calls        2S x equity - S
//   the big blind folds to a jam    -1
//   it calls                        2S x equity - S, so a call needs equity (S - 1) / 2S

import { NUM_CLASSES, classByName } from './classes.ts';
import type { PreflopTable } from './preflop-table.ts';
import type { DecisionTable, Verdict } from '../spots/types.ts';

/** The numbers an explanation draws on at one depth, per hand class. */
export interface JamOrFoldFacts {
	readonly stack: number;
	/** For each button class: how often the big blind calls its jam. */
	readonly callChance: readonly number[];
	/** For each button class: its equity when the big blind calls. */
	readonly equityWhenCalled: readonly number[];
	/** For each big-blind class: its equity against the hands that jam. */
	readonly equityAgainstJam: readonly number[];
}

const round = (x: number) => Math.round(x * 1e8) / 1e8;

/**
 * The facts at `stack` from the equity table and the reference's own
 * frequencies: `jam[i]` is the button's jam frequency with class i and
 * `call[j]` the big blind's calling frequency with class j.
 */
export function jamOrFoldFacts(
	table: PreflopTable,
	stack: number,
	jam: ArrayLike<number>,
	call: ArrayLike<number>
): JamOrFoldFacts {
	const K = NUM_CLASSES;
	const callChance: number[] = [];
	const equityWhenCalled: number[] = [];
	const equityAgainstJam: number[] = [];
	for (let i = 0; i < K; i++) {
		let dealt = 0;
		let called = 0;
		let won = 0;
		for (let j = 0; j < K; j++) {
			const w = table.pairCount(i, j);
			dealt += w;
			called += w * call[j];
			won += w * call[j] * table.equity(i, j);
		}
		callChance.push(round(called / dealt));
		equityWhenCalled.push(called > 0 ? round(won / called) : 0);
	}
	for (let j = 0; j < K; j++) {
		let jams = 0;
		let won = 0;
		for (let i = 0; i < K; i++) {
			const w = table.pairCount(i, j) * jam[i];
			jams += w;
			won += w * table.equity(j, i);
		}
		equityAgainstJam.push(jams > 0 ? round(won / jams) : 0);
	}
	return { stack, callChance, equityWhenCalled, equityAgainstJam };
}

/** The facts at `stack` from a solution's two decision tables at that depth. */
export function factsFromTables(
	table: PreflopTable,
	stack: number,
	decisions: readonly DecisionTable[]
): JamOrFoldFacts {
	const find = (spot: string) => {
		const d = decisions.find((x) => x.spot === spot);
		if (!d) throw new RangeError(`no decision table for ${spot}`);
		return d;
	};
	const button = find(`jof-${stack}bb-button`);
	const big = find(`jof-${stack}bb-big-blind`);
	const freq = (d: DecisionTable, action: string) => {
		const a = d.actions.indexOf(action);
		const out = new Float64Array(NUM_CLASSES);
		d.hands.forEach((h, k) => (out[classByName(h).index] = d.frequencies[k][a]));
		return out;
	};
	return jamOrFoldFacts(table, stack, freq(button, 'jam'), freq(big, 'call'));
}

/** What an explanation says. */
export interface Explanation {
	/** At most two sentences. */
	readonly text: string;
	/** A plain definition of a term the text uses, for the first time it appears. */
	readonly gloss: string | null;
}

export const EQUITY_GLOSS =
	'Equity is your share of the pot if the rest of the cards are dealt with no more betting: 40% equity wins 40% of the time, counting ties as half.';

/** A chance as a whole percentage. */
function pct(x: number): string {
	return `${Math.round(x * 100)}%`;
}

/** Two chances that are compared, with one decimal when whole numbers would hide the difference. */
function pctPair(a: number, b: number): [string, string] {
	if (Math.round(a * 100) !== Math.round(b * 100) || Math.abs(a - b) < 0.0005) {
		return [pct(a), pct(b)];
	}
	return [
		`${(Math.round(a * 1000) / 10).toFixed(1)}%`,
		`${(Math.round(b * 1000) / 10).toFixed(1)}%`
	];
}

/** A value in big blinds with its sign: "+0.21 bb", "−0.50 bb". */
function bb(x: number): string {
	const r = Math.round(x * 100) / 100;
	if (r === 0) return '0.00 bb';
	return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2)} bb`;
}

/** Whether the reference plays more than one action with this hand (each at least 5%). */
export function isMixed(verdict: Verdict & { graded: true }): boolean {
	return Object.values(verdict.frequencies).filter((f) => f >= 0.05).length > 1;
}

/**
 * The explanation of `verdict`, a jam-or-fold verdict at the depth `facts`
 * describes, or of why it is not graded. `define` adds the definition of
 * equity, for the first explanation a player sees in a session.
 */
export function explain(
	verdict: Verdict,
	facts: JamOrFoldFacts | null,
	define = false
): Explanation {
	if (!verdict.graded) return { text: verdict.detail, gloss: null };
	if (!facts || !verdict.spot.startsWith(`jof-${facts.stack}bb-`)) {
		throw new RangeError(`no facts for ${verdict.spot}`);
	}
	const { hand, action, best, values, frequencies, band } = verdict;
	const k = classByName(hand).index;
	const S = facts.stack;
	const gloss = define ? EQUITY_GLOSS : null;

	if (verdict.spot.endsWith('-button')) {
		const c = facts.callChance[k];
		const e = facts.equityWhenCalled[k];
		const jam = bb(values.jam);
		const fold = bb(values.fold);
		const whenCalled =
			c < 0.005
				? 'the big blind almost never calls'
				: `the big blind calls ${pct(c)} of the time, and then ${hand} has ${pct(e)} equity`;
		if (isMixed(verdict)) {
			return {
				text: `The reference mixes with ${hand}: it jams ${pct(frequencies.jam)} of the time and folds ${pct(frequencies.fold)}, because jamming (${jam}) and folding (${fold}) are worth almost the same. Either is fine: ${whenCalled}.`,
				gloss
			};
		}
		if (action !== best && band === 'acceptable') {
			return {
				text: `Jamming and folding ${hand} are worth almost the same (${jam} against ${fold}), so either is fine: ${whenCalled}.`,
				gloss
			};
		}
		if (best === 'jam') {
			const reason = `the big blind folds ${pct(1 - c)} of the time, which wins you its 1 bb blind, and when it calls ${hand} still has ${pct(e)} equity`;
			return action === 'jam'
				? {
						text: `Jamming ${hand} is the play: ${reason}. Jamming is worth ${jam} against ${fold} for folding.`,
						gloss
					}
				: {
						text: `Folding ${hand} loses your small blind (${fold}), but jamming was worth ${jam}: ${reason}.`,
						gloss
					};
		}
		return action === 'fold'
			? {
					text: `Folding ${hand} is the play: ${whenCalled}. Jamming is worth ${jam}, less than the ${fold} that folding keeps.`,
					gloss
				}
			: {
					text: `Jamming ${hand} costs more than folding: ${whenCalled}, so jamming is worth ${jam}. Folding gives up only your small blind (${fold}).`,
					gloss
				};
	}

	const e = facts.equityAgainstJam[k];
	const need = (S - 1) / (2 * S);
	const [have, needs] = pctPair(e, need);
	const calling = bb(values.call);
	const folding = bb(values.fold);
	const odds = `calling ${S - 1} bb more to win a ${2 * S} bb pot needs ${needs} equity`;
	if (isMixed(verdict)) {
		return {
			text: `The reference mixes with ${hand}: it calls ${pct(frequencies.call)} of the time and folds ${pct(frequencies.fold)}, because ${hand} has ${have} equity against the hands that jam, right around the ${needs} a call needs. Calling (${calling}) and folding (${folding}) are worth almost the same, so either is fine.`,
			gloss
		};
	}
	if (action !== best && band === 'acceptable') {
		return {
			text: `Calling and folding ${hand} are worth almost the same (${calling} against ${folding}), so either is fine: ${odds}, and ${hand} has ${have} against the hands that jam.`,
			gloss
		};
	}
	if (best === 'call') {
		return action === 'call'
			? {
					text: `Calling with ${hand} is the play: ${odds}, and ${hand} has ${have} against the hands that jam here. Calling is worth ${calling} against ${folding} for folding.`,
					gloss
				}
			: {
					text: `Folding ${hand} loses your 1 bb blind (${folding}), but calling was worth ${calling}: ${odds}, and ${hand} has ${have} against the hands that jam here.`,
					gloss
				};
	}
	return action === 'fold'
		? {
				text: `Folding ${hand} is the play: ${odds}, and ${hand} has only ${have} against the hands that jam here. Calling is worth ${calling}, less than the ${folding} that folding keeps.`,
				gloss
			}
		: {
				text: `Calling with ${hand} costs more than folding: ${odds}, but ${hand} has only ${have} against the hands that jam here, so calling is worth ${calling}. Folding gives up only your 1 bb blind (${folding}).`,
				gloss
			};
}
