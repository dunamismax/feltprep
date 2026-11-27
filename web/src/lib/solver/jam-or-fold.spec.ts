// The committed jam-or-fold solution (P2.4): it loads through the reader, its
// stored values agree with a separate calculation (B-11), its strategies are
// within the exploitability threshold (B-5), its invariants hold, and it
// agrees with published chart values cited below.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadSolution } from '../spots/reader.ts';
import type { DecisionTable, Manifest, Registry, SolutionFile } from '../spots/types.ts';
import { classByName, NUM_CLASSES } from './classes.ts';
import { exploitability } from './cfr.ts';
import {
	BIG_BLIND_NODE,
	BUTTON_NODE,
	classPrior,
	directValues,
	JAM_OR_FOLD_STACKS,
	jamOrFoldGame
} from './jam-or-fold.ts';
import { PreflopTable, type PreflopTableFile } from './preflop-table.ts';

const root = new URL('../../../../solutions/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const registry = JSON.parse(read('registry.json').toString()) as Registry;
const manifest = JSON.parse(read('jam-or-fold/manifest.json').toString()) as Manifest;
const solution = JSON.parse(read('jam-or-fold/solution.json').toString()) as SolutionFile;
const table = new PreflopTable(
	JSON.parse(read('equity/preflop-classes.json').toString()) as PreflopTableFile
);

function decisionTable(stack: number, seat: 'button' | 'big-blind'): DecisionTable {
	const found = solution.decisions.find((d) => d.spot === `jof-${stack}bb-${seat}`);
	if (!found) throw new Error(`no table for ${stack} bb ${seat}`);
	return found;
}

/** Second-action frequency per class (jam for the button, call for the big blind). */
const frequencies = (t: DecisionTable) => t.frequencies.map((row) => row[1]);

describe('the committed jam-or-fold solution', () => {
	it('passes every check of the reader', async () => {
		const loaded = await loadSolution(registry, 'jam-or-fold-hu', (p) =>
			Promise.resolve(new Uint8Array(read(p)))
		);
		expect(loaded.solution.decisions).toHaveLength(2 * JAM_OR_FOLD_STACKS.length);
	});

	it('states every depth from 2 to 15 big blinds, both seats', () => {
		expect(manifest.games.map((g) => g.effectiveStack)).toEqual(JAM_OR_FOLD_STACKS);
		for (const g of manifest.games) {
			expect(g).toMatchObject({
				blinds: { small: 0.5, big: 1 },
				ante: 0,
				rake: 0,
				pot: 1.5,
				board: ''
			});
		}
		expect(manifest.spots).toHaveLength(28);
		expect(manifest.inputs[0].sha256).toBe(
			(JSON.parse(read('equity/manifest.json').toString()) as Manifest).files[0].sha256
		);
	});

	it.each(JAM_OR_FOLD_STACKS)(
		'B-11 at %i bb: every stored value equals the direct calculation to 1e-9',
		(stack) => {
			const button = decisionTable(stack, 'button');
			const big = decisionTable(stack, 'big-blind');
			const direct = directValues(table, stack, frequencies(button), frequencies(big));
			for (let i = 0; i < NUM_CLASSES; i++) {
				for (let a = 0; a < 2; a++) {
					expect(Math.abs(button.values[i][a] - direct.button[i][a])).toBeLessThan(1e-9);
					expect(Math.abs(big.values[i][a] - direct.bigBlind[i][a])).toBeLessThan(1e-9);
				}
			}
		}
	);

	it.each(JAM_OR_FOLD_STACKS)(
		'B-5 at %i bb: the stored strategy is within 0.001 bb a hand of equilibrium',
		(stack) => {
			const game = jamOrFoldGame(table, stack);
			const row = (f: number[]) =>
				Float64Array.from({ length: 2 * NUM_CLASSES }, (_, x) =>
					x % 2 ? f[x >> 1] : 1 - f[x >> 1]
				);
			const strategy = new Map([
				[BUTTON_NODE, row(frequencies(decisionTable(stack, 'button')))],
				[BIG_BLIND_NODE, row(frequencies(decisionTable(stack, 'big-blind')))]
			]);
			const e = exploitability(game, strategy);
			const recorded = manifest.exploitability.find((x) => x.game === `jof-${stack}bb`);
			expect(e.exploitability).toBeLessThan(0.001);
			expect(e.exploitability).toBeCloseTo(recorded?.value ?? NaN, 12);
		}
	);

	it.each(JAM_OR_FOLD_STACKS)('invariants hold at %i bb', (stack) => {
		const button = decisionTable(stack, 'button');
		const big = decisionTable(stack, 'big-blind');
		for (const t of [button, big]) {
			for (const row of t.frequencies) expect(Math.abs(row[0] + row[1] - 1)).toBeLessThan(1e-9);
			expect(t.reach.every((r) => r === 1)).toBe(true);
			expect(t.margins.every((m) => m >= 0 && m < 0.01)).toBe(true);
		}
		// Folding the button is worth -0.5 and folding the big blind -1, always.
		expect(button.values.every((v) => v[0] === -0.5)).toBe(true);
		expect(big.values.every((v) => v[0] === -1)).toBe(true);
		// Zero sum: the button's expected result plus the big blind's is zero.
		const prior = classPrior(table);
		let buttonEV = 0;
		let bigEV = 0;
		for (let i = 0; i < NUM_CLASSES; i++) {
			let pi = 0;
			for (let j = 0; j < NUM_CLASSES; j++) pi += prior[i * NUM_CLASSES + j];
			buttonEV +=
				pi * (button.frequencies[i][0] * -0.5 + button.frequencies[i][1] * button.values[i][1]);
		}
		for (let j = 0; j < NUM_CLASSES; j++) {
			let folded = 0;
			let jammed = 0;
			for (let i = 0; i < NUM_CLASSES; i++) {
				const p = prior[i * NUM_CLASSES + j];
				folded += p * button.frequencies[i][0];
				jammed += p * button.frequencies[i][1];
			}
			const facing = big.frequencies[j][0] * -1 + big.frequencies[j][1] * big.values[j][1];
			bigEV += folded * 0.5 + (jammed > 0 ? jammed * facing : 0);
		}
		expect(Math.abs(buttonEV + bigEV)).toBeLessThan(1e-9);
	});

	it('agrees with values printed in a published chart', () => {
		// HoldemResources, "HeadsUp Push/Fold Nash Equilibrium", no ante
		// (https://www.holdemresources.net/hune, read 2026-11-26): a value X means
		// the hand plays at every effective stack of X big blinds or less. Its own
		// examples are T3s 7.7 (jam) and Q2o 5.6 (call); also K2s 19.3 and 72o 1.6
		// (jam), K2o 8.1 (call). The full comparison is in docs/benchmarks.md, B-5.
		const plays = (seat: 'button' | 'big-blind', hand: string, stack: number) =>
			decisionTable(stack, seat).frequencies[classByName(hand).index][1];
		for (const stack of JAM_OR_FOLD_STACKS) {
			const cases: ['button' | 'big-blind', string, number][] = [
				['button', 'T3s', 7.7],
				['big-blind', 'Q2o', 5.6],
				['button', 'K2s', 19.3],
				['button', '72o', 1.6],
				['big-blind', 'K2o', 8.1]
			];
			for (const [seat, hand, limit] of cases) {
				if (stack <= limit) expect(plays(seat, hand, stack)).toBeGreaterThan(0.99);
				else expect(plays(seat, hand, stack)).toBeLessThan(0.01);
			}
		}
	});
});
