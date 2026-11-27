// B-13: the explanation of a grade is true (BUILD.md, Gate B). For every hand
// class at every depth, from both seats and for every action, each number the
// explanation prints must equal a calculation written here, separately from
// explain.ts: the opponent's frequencies are weighted by enumerating the
// actual two-card combinations that do not share a card, instead of the
// table's pair counts, and each action's value is rebuilt from those chances
// and the equity table. Then the wording is checked against the verdict.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES, NUM_CLASSES, classIndex } from './classes.ts';
import { EQUITY_GLOSS, explain, factsFromTables, isMixed } from './explain.ts';
import { gradeDecision } from './grading.ts';
import { JAM_OR_FOLD_STACKS } from './jam-or-fold.ts';
import { PreflopTable, type PreflopTableFile } from './preflop-table.ts';
import { loadSolution } from '../spots/reader.ts';
import type { DecisionTable, Registry } from '../spots/types.ts';

const root = new URL('../../../../solutions/', import.meta.url);
const registry = JSON.parse(readFileSync(new URL('registry.json', root), 'utf8')) as Registry;
const jof = await loadSolution(registry, 'jam-or-fold-hu', (p) =>
	Promise.resolve(new Uint8Array(readFileSync(new URL(p, root))))
);
const table = new PreflopTable(
	JSON.parse(readFileSync(new URL('equity/preflop-classes.json', root), 'utf8')) as PreflopTableFile
);

/** Every two-card combination's class, by its two cards. */
const ALL: { a: number; b: number; k: number }[] = [];
for (let a = 0; a < 52; a++)
	for (let b = a + 1; b < 52; b++) ALL.push({ a, b, k: classIndex(a, b) });

/** Frequencies of `action` per class index, read from a decision table. */
function freqs(d: DecisionTable, action: string): number[] {
	const a = d.actions.indexOf(action);
	const out = new Array<number>(NUM_CLASSES).fill(0);
	d.hands.forEach((h, i) => (out[CLASSES.findIndex((c) => c.name === h)] = d.frequencies[i][a]));
	return out;
}

/** The second calculation: chances and equities by combination, not by pair count. */
function separately(stack: number) {
	const button = jof.solution.decisions.find((d) => d.spot === `jof-${stack}bb-button`)!;
	const big = jof.solution.decisions.find((d) => d.spot === `jof-${stack}bb-big-blind`)!;
	const jam = freqs(button, 'jam');
	const call = freqs(big, 'call');
	const out = CLASSES.map((c) => {
		let deals = 0;
		let calls = 0;
		let calledEquity = 0;
		let jams = 0;
		let jamEquity = 0;
		for (const [x, y] of c.combos) {
			for (const o of ALL) {
				if (o.a === x || o.a === y || o.b === x || o.b === y) continue;
				const eq = table.equity(c.index, o.k);
				deals += 1;
				calls += call[o.k];
				calledEquity += call[o.k] * eq;
				jams += jam[o.k];
				jamEquity += jam[o.k] * eq;
			}
		}
		const callChance = calls / deals;
		const equityWhenCalled = calls > 0 ? calledEquity / calls : 0;
		const equityAgainstJam = jams > 0 ? jamEquity / jams : 0;
		return {
			callChance,
			equityWhenCalled,
			equityAgainstJam,
			jamValue: (1 - callChance) * 1 + callChance * (2 * stack * equityWhenCalled - stack),
			callValue: 2 * stack * equityAgainstJam - stack
		};
	});
	return { out, button, big };
}

/** Each number printed in `text`, with the precision it was printed to. */
function numbers(text: string, hand: string): { value: number; unit: number }[] {
	const found: { value: number; unit: number }[] = [];
	// The hand's name may be digits ("55", "72o"): drop it, but not a percentage such as "55%".
	const cleaned = text.replace(new RegExp(`\\b${hand}\\b(?!%)`, 'g'), ' ');
	for (const m of cleaned.matchAll(/([+−-]?)(\d+(?:\.\d+)?)(%?)/g)) {
		const digits = m[2].split('.')[1]?.length ?? 0;
		const sign = m[1] === '−' || m[1] === '-' ? -1 : 1;
		const scale = m[3] === '%' ? 100 : 1;
		found.push({ value: (sign * Number(m[2])) / scale, unit: 10 ** -digits / scale });
	}
	return found;
}

describe('B-13: every explanation of a jam-or-fold grade states true numbers', () => {
	let checked = 0;
	for (const stack of JAM_OR_FOLD_STACKS) {
		it(`at ${stack} big blinds, from both seats, for every class and action`, () => {
			const { out, button, big } = separately(stack);
			const facts = factsFromTables(table, stack, [button, big]);
			for (const seat of ['button', 'big-blind'] as const) {
				const actions = seat === 'button' ? ['fold', 'jam'] : ['fold', 'call'];
				for (const c of CLASSES) {
					const x = out[c.index];
					// The quantities this seat's explanation may state, from the second calculation.
					const allowed =
						seat === 'button'
							? [x.callChance, 1 - x.callChance, x.equityWhenCalled, x.jamValue, -0.5, 1]
							: [
									x.equityAgainstJam,
									(stack - 1) / (2 * stack),
									x.callValue,
									-1,
									stack - 1,
									2 * stack,
									1
								];
					for (const action of actions) {
						const verdict = gradeDecision(jof, `jof-${stack}bb-${seat}`, c.name, action);
						expect(verdict.graded).toBe(true);
						if (!verdict.graded) continue;
						const shares = Object.values(verdict.frequencies);
						const { text, gloss } = explain(verdict, facts);
						expect(gloss).toBeNull();
						expect(text.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2);
						const stated = numbers(text, c.name);
						expect(stated.length).toBeGreaterThan(0);
						for (const n of stated) {
							const ok = [...allowed, ...shares].some(
								(q) => Math.abs(q - n.value) <= n.unit / 2 + 1e-9
							);
							if (!ok)
								throw new Error(
									`${stack} bb ${seat} ${c.name} ${action}: "${text}" states ${n.value}`
								);
						}
						// The facts that make the case are always stated: for the button how often
						// it is called (or folded to) and its equity then, for the big blind its
						// equity against the jams and the equity a call needs; and the value of
						// jamming or calling.
						const says = (q: number) =>
							stated.some((n) => Math.abs(n.value - q) <= n.unit / 2 + 1e-9);
						if (seat === 'button') {
							expect(says(x.callChance) || says(1 - x.callChance)).toBe(true);
							if (x.callChance >= 0.005) expect(says(x.equityWhenCalled)).toBe(true);
						} else {
							expect(says(x.equityAgainstJam)).toBe(true);
							expect(says((stack - 1) / (2 * stack))).toBe(true);
						}
						const mixed = isMixed(verdict);
						expect(says(seat === 'button' ? x.jamValue : x.callValue)).toBe(true);
						// The wording agrees with the verdict.
						if (verdict.band === 'mistake') {
							expect(text).not.toMatch(/the play|either is fine|almost the same/);
						}
						if (verdict.band !== 'acceptable') expect(text).not.toMatch(/either is fine/);
						if (mixed) {
							expect(verdict.band).toBe('acceptable');
							expect(text).toMatch(/mixes/);
							expect(text).not.toMatch(/mistake|costs more|loses your/);
						}
						if (verdict.action === verdict.best && !mixed) expect(text).toMatch(/the play/);
						checked++;
					}
				}
			}
		});
	}

	it('covered every class at every depth from both seats', () => {
		expect(checked).toBe(JAM_OR_FOLD_STACKS.length * 2 * 2 * NUM_CLASSES);
	});
});

describe('explain', () => {
	const facts = factsFromTables(table, 10, jof.solution.decisions);

	it('defines equity when asked, the first time it appears', () => {
		const verdict = gradeDecision(jof, 'jof-10bb-button', 'AA', 'jam');
		expect(explain(verdict, facts, true).gloss).toBe(EQUITY_GLOSS);
	});

	it('says why a decision is not graded', () => {
		const verdict = gradeDecision(jof, 'jof-10bb-button', 'AA', 'limp');
		expect(explain(verdict, null).text).toMatch(
			/allows only fold or jam here, so limp is not graded/
		);
	});

	it('refuses facts for another depth', () => {
		const verdict = gradeDecision(jof, 'jof-12bb-button', 'AA', 'jam');
		expect(() => explain(verdict, facts)).toThrow(RangeError);
	});
});
