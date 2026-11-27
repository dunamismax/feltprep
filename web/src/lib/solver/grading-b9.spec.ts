// B-9: grades do not drift (BUILD.md, Gate B). Every decision in
// b9-decisions.ts is graded through the real path, from both seats, and its
// verdict and loss must match the hand derivation. Jam-or-fold decisions are
// played as full hands on the engine with the button in seat 0 and in seat
// 1, located in the game by locateJamOrFold and graded against the
// registered solution as loaded by the reader.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classByName } from './classes.ts';
import { handConfig } from '../engine/state.ts';
import { deal, parseAction, play } from '../engine/testing.ts';
import { loadSolution, type LoadedSolution } from '../spots/reader.ts';
import type { DecisionTable, Manifest, Registry } from '../spots/types.ts';
import { JAM_OR_FOLD_CASES, OUTSIDE_CASES, RIVER_CASES } from './b9-decisions.ts';
import { polarizedRiver } from './benchmark-games.ts';
import { actionValues, exploitability, solve } from './cfr.ts';
import { DEFAULT_GRADING, gradeDecision } from './grading.ts';
import { locateJamOrFold } from './jam-or-fold-hand.ts';

const root = new URL('../../../../solutions/', import.meta.url);
const registry = JSON.parse(readFileSync(new URL('registry.json', root), 'utf8')) as Registry;
const jof = await loadSolution(registry, 'jam-or-fold-hu', (p) =>
	Promise.resolve(new Uint8Array(readFileSync(new URL(p, root))))
);

/** AA's lowest equity against any class, from the published exact table alone. */
function aceFloor(): number {
	const text = readFileSync(new URL('fixtures/irving-exact.txt', import.meta.url), 'utf8');
	let lowest = 1;
	const re =
		/^(\w+) vs\. (\w+):\n\s+Alice: (\d+)\/(\d+).*\n\s+Bob:\s+(\d+)\/\d+.*\n\s+Tie:\s+(\d+)\/\d+/gm;
	for (const m of text.matchAll(re)) {
		if (m[1] !== 'AA' && m[2] !== 'AA') continue;
		if (m[1] === 'AA' && m[2] === 'AA') continue;
		const [alice, den, bob, tie] = [m[3], m[4], m[5], m[6]].map(Number);
		const e = ((m[1] === 'AA' ? alice : bob) + tie / 2) / den;
		lowest = Math.min(lowest, e);
	}
	return lowest;
}
const e = aceFloor();

/** Two cards of a class, as text, chosen to avoid `avoid`. */
function cardsOf(hand: string, avoid = ''): string {
	const c = classByName(hand);
	const ranks = '23456789TJQKA';
	for (const [x, y] of c.combos) {
		const text = ranks[x >> 2] + 'cdhs'[x & 3] + ranks[y >> 2] + 'cdhs'[y & 3];
		if (!avoid.includes(text.slice(0, 2)) && !avoid.includes(text.slice(2))) return text;
	}
	throw new Error(`no ${hand} avoiding ${avoid}`);
}

describe('B-9: jam-or-fold decisions in full hands, from both seats', () => {
	it('grades with a registered solution that passed the grading gate', () => {
		expect(jof.grades).toBe(true);
		expect(e).toBeGreaterThan(0.76);
		expect(e).toBeLessThan(0.78);
	});

	for (const c of JAM_OR_FOLD_CASES) {
		for (const button of [0, 1]) {
			it(`${c.name}, button in seat ${button}`, () => {
				const big = 1 - button;
				const actor = c.seat === 'button' ? button : big;
				const holes = { [actor]: cardsOf(c.hand), [1 - actor]: cardsOf('32o', cardsOf(c.hand)) };
				const stacks = [c.stack * 100, c.stack * 100];
				let state = deal(stacks, button, holes);
				if (c.seat === 'big-blind') state = play(state, `S${button}:a`);
				const token = c.action === 'fold' ? 'f' : c.action === 'call' ? 'c' : 'a';
				const where = locateJamOrFold(state, parseAction(state, token));
				expect(where).toEqual({
					inside: true,
					spot: `jof-${c.stack}bb-${c.seat}`,
					action: c.action,
					hand: c.hand,
					stack: c.stack
				});
				if (!where.inside) return;
				const verdict = gradeDecision(jof, where.spot, where.hand, where.action);
				expect(verdict.graded).toBe(true);
				if (!verdict.graded) return;
				expect(verdict.band).toBe(c.band);
				expect(verdict.loss).toBeGreaterThanOrEqual(c.lossAtLeast(e) - 1e-9);
				expect(verdict.loss).toBeLessThanOrEqual(c.lossAtMost + 1e-9);
			});
		}
	}

	for (const c of OUTSIDE_CASES) {
		it(`${c.name} is not graded (${c.reason})`, () => {
			const config = handConfig(50, 100, c.ante ?? 0);
			let state = deal(c.stacks, c.button, {}, '', config);
			if (c.before) state = play(state, c.before);
			const where = locateJamOrFold(state, parseAction(state, c.action));
			expect(where.inside).toBe(false);
			if (!where.inside) {
				expect(where.reason).toBe(c.reason);
				expect(where.detail.length).toBeGreaterThan(10);
			}
		});
	}

	it('a decision after the flop is outside the game', () => {
		let state = deal([1_000, 1_000], 0, {});
		state = play(state, 'S0:c S1:k');
		const where = locateJamOrFold(state, parseAction(state, 'k'));
		expect(where).toMatchObject({ inside: false, reason: 'outside-game' });
	});

	it('a jam for more than the effective stack is still a jam', () => {
		// The button covers: 1,500 chips against 1,000 makes a 10 bb game.
		let state = deal([1_500, 1_000], 0, { 0: 'AsAh' });
		const where = locateJamOrFold(state, parseAction(state, 'a'));
		expect(where).toMatchObject({ inside: true, spot: 'jof-10bb-button', action: 'jam' });
		state = play(state, 'S0:a');
		expect(locateJamOrFold(state, parseAction(state, 'c'))).toMatchObject({
			inside: true,
			spot: 'jof-10bb-big-blind',
			action: 'call'
		});
	});
});

/** The B-3 game solved in memory as a solution with two spots, for grading. */
function riverSolution(): LoadedSolution {
	const game = polarizedRiver({ pot: 1, bet: 1, nuts: 3, air: 3, catchers: 2 });
	const { average } = solve(game, { iterations: 4_000 });
	const values = actionValues(game, average);
	const spots = [
		{
			id: 'river-bettor',
			game: 'river',
			actor: 'button' as const,
			history: [],
			pot: 1,
			actions: ['check', 'bet']
		},
		{
			id: 'river-caller',
			game: 'river',
			actor: 'big-blind' as const,
			history: ['button:bet'],
			pot: 2,
			actions: ['fold', 'call']
		}
	];
	const table = (node: string, spot: string, player: 0 | 1): DecisionTable => {
		const v = values.get(node);
		const s = average.get(node);
		if (!v || !s) throw new Error(`no ${node}`);
		const names = game.typeNames[player];
		return {
			spot,
			actions: v.node.actions,
			hands: names,
			reach: Array.from(v.reach),
			frequencies: names.map((_, t) => [s[t * 2], s[t * 2 + 1]]),
			values: names.map((_, t) => [v.values[t * 2], v.values[t * 2 + 1]]),
			margins: names.map(() => 0)
		};
	};
	const manifest = {
		id: 'b3-river',
		spots,
		exploitability: [
			{
				game: 'river',
				value: exploitability(game, average).exploitability,
				unit: 'big blinds per hand',
				threshold: 0.005
			}
		],
		grading: DEFAULT_GRADING
	} as unknown as Manifest;
	return {
		entry: registry.solutions[0],
		manifest,
		solution: {
			format: 1,
			kind: 'solution',
			solution: 'b3-river',
			decisions: [table('bettor', 'river-bettor', 0), table('caller', 'river-caller', 1)]
		},
		grades: true
	};
}

describe('B-9: river decisions from both seats', () => {
	const river = riverSolution();
	it.each(RIVER_CASES)('$seat, $name: $band, loss $loss', (c) => {
		const verdict = gradeDecision(river, `river-${c.seat}`, c.hand, c.action);
		expect(verdict.graded).toBe(true);
		if (!verdict.graded) return;
		expect(verdict.band).toBe(c.band);
		expect(Math.abs(verdict.loss - c.loss)).toBeLessThan(0.005);
	});
});

describe('decisions the reference cannot grade', () => {
	it('names the reason for each', () => {
		expect(gradeDecision(null, 'jof-10bb-button', 'AA', 'jam')).toMatchObject({
			graded: false,
			reason: 'no-reference'
		});
		expect(gradeDecision(jof, 'jof-20bb-button', 'AA', 'jam')).toMatchObject({
			graded: false,
			reason: 'no-reference'
		});
		expect(gradeDecision({ ...jof, grades: false }, 'jof-10bb-button', 'AA', 'jam')).toMatchObject({
			graded: false,
			reason: 'unverified-reference'
		});
		expect(gradeDecision(jof, 'jof-10bb-button', 'AA', 'limp')).toMatchObject({
			graded: false,
			reason: 'action-outside-game'
		});
		expect(gradeDecision(jof, 'jof-10bb-button', 'A1o', 'jam')).toMatchObject({
			graded: false,
			reason: 'outside-range'
		});
	});

	it('does not grade a hand the range holds less than the minimum reach', () => {
		const table = jof.solution.decisions[0];
		const thin = {
			...jof,
			solution: {
				...jof.solution,
				decisions: [{ ...table, reach: table.reach.map((r, i) => (i === 0 ? 0.009 : r)) }]
			}
		};
		expect(gradeDecision(thin, table.spot, table.hands[0], 'jam')).toMatchObject({
			graded: false,
			reason: 'outside-range'
		});
		expect(gradeDecision(thin, table.spot, table.hands[1], 'jam').graded).toBe(true);
	});
});
