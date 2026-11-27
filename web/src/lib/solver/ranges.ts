// Ranges in the usual notation (P5.2): a list of hand classes and runs of
// them, each with an optional weight, turned into weighted two-card
// combinations for a post-flop spot. A range written this way can be shown to
// a player as an assumption (D-18) and handed to an independent solver (P5.3).
//
//   TT        one pair class: six combinations
//   TT+       tens up to aces
//   TT-77     sevens up to tens (either order)
//   AKs, AKo  a suited or offsuit class; AK is both
//   A2s+      the same high card with every kicker from the deuce up: A2s to AKs
//   A5s-A2s   a run of kickers under one high card (either order)
//   AsKd      one combination
//   QJs:0.5   any of the above held half as often
//
// Tokens are separated by commas. A combination named twice is an error, so
// overlapping tokens are caught rather than silently merged.

import { RANKS, card, cardStr } from '../engine/cards.ts';
import { classByName } from './classes.ts';
import type { WeightedCombo } from './postflop.ts';

const rankOf = (ch: string): number => {
	const r = RANKS.indexOf(ch);
	if (r < 0) throw new RangeError(`not a rank: ${JSON.stringify(ch)}`);
	return r;
};

/** The class names one token without its weight stands for. */
function classNames(token: string): string[] {
	const pair = /^([2-9TJQKA])\1(\+)?$/.exec(token);
	if (pair) {
		const r = rankOf(pair[1]);
		const top = pair[2] ? 12 : r;
		return Array.from({ length: top - r + 1 }, (_, i) => RANKS[r + i].repeat(2));
	}
	const pairs = /^([2-9TJQKA])\1-([2-9TJQKA])\2$/.exec(token);
	if (pairs) {
		const a = rankOf(pairs[1]);
		const b = rankOf(pairs[2]);
		const [lo, hi] = a < b ? [a, b] : [b, a];
		return Array.from({ length: hi - lo + 1 }, (_, i) => RANKS[lo + i].repeat(2));
	}
	const run = /^([2-9TJQKA])([2-9TJQKA])([so]?)(?:(\+)|-\1([2-9TJQKA])\3)?$/.exec(token);
	if (run) {
		const [, h, l, kind, plus, end] = run;
		const high = rankOf(h);
		const low = rankOf(l);
		if (low >= high) throw new RangeError(`the higher rank comes first: ${token}`);
		let from = low;
		let to = low;
		if (plus) to = high - 1;
		if (end !== undefined) {
			const other = rankOf(end);
			if (other >= high) throw new RangeError(`the higher rank comes first: ${token}`);
			from = Math.min(low, other);
			to = Math.max(low, other);
		}
		const kinds = kind ? [kind] : ['s', 'o'];
		const out: string[] = [];
		for (let k = from; k <= to; k++) for (const s of kinds) out.push(h + RANKS[k] + s);
		return out;
	}
	throw new RangeError(`not range notation: ${JSON.stringify(token)}`);
}

/** Parse a range in notation into its weighted combinations, in the order written. */
export function parseRange(text: string): WeightedCombo[] {
	const out: WeightedCombo[] = [];
	const seen = new Set<string>();
	const add = (a: number, b: number, weight: number, token: string) => {
		const [hi, lo] = a > b ? [a, b] : [b, a];
		const key = `${hi},${lo}`;
		if (seen.has(key)) {
			throw new RangeError(`${cardStr(hi)}${cardStr(lo)} is named twice (at ${token})`);
		}
		seen.add(key);
		if (weight > 0) out.push({ cards: [hi, lo], weight });
	};
	for (const raw of text.split(',')) {
		const part = raw.trim();
		if (part === '') continue;
		const [token, w, extra] = part.split(':');
		if (extra !== undefined) throw new RangeError(`one weight per token: ${part}`);
		const weight = w === undefined ? 1 : Number(w);
		if (!(weight >= 0 && weight <= 1) || (w !== undefined && w.trim() === '')) {
			throw new RangeError(`a weight is a number from 0 to 1: ${part}`);
		}
		const combo = /^([2-9TJQKA][cdhs])([2-9TJQKA][cdhs])$/.exec(token);
		if (combo) {
			const a = card(combo[1]);
			const b = card(combo[2]);
			if (a === b) throw new RangeError(`two different cards are needed: ${part}`);
			add(a, b, weight, part);
			continue;
		}
		for (const name of classNames(token)) {
			for (const [a, b] of classByName(name).combos) add(a, b, weight, part);
		}
	}
	return out;
}

/** The number of combinations a range holds, counting each by its weight. */
export function comboCount(range: readonly WeightedCombo[]): number {
	return range.reduce((s, c) => s + c.weight, 0);
}
