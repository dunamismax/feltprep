// B-4: the committed pre-flop class table is exact. It must agree exactly
// with (1) the published exact table of Geoffrey Irving and Eugene d'Eon,
// computed by their own exhaustive enumerator (fixtures/irving-exact.txt,
// from https://github.com/girving/poker, docs/provenance.md), on all 14,365
// class pairs, and (2) the direct enumerator in equity.ts, a separately
// written method, on a sample of class pairs; and it must be symmetric.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES, NUM_CLASSES, classByName, type HandClass } from './classes.ts';
import { handVsHand } from './equity.ts';
import {
	PREFLOP_BOARDS,
	PreflopTable,
	canonicalBoards,
	type PreflopTableFile
} from './preflop-table.ts';

const solutions = new URL('../../../../solutions/equity/', import.meta.url);
const tableText = readFileSync(new URL('preflop-classes.json', solutions));
const table = new PreflopTable(JSON.parse(tableText.toString()) as PreflopTableFile);

describe('the committed table', () => {
	it('matches the hash and size in its manifest', () => {
		const manifest = JSON.parse(readFileSync(new URL('manifest.json', solutions), 'utf8')) as {
			files: { path: string; sha256: string; bytes: number }[];
		};
		expect(manifest.files).toEqual([
			{
				path: 'preflop-classes.json',
				sha256: createHash('sha256').update(tableText).digest('hex'),
				bytes: tableText.length
			}
		]);
	});

	it('counts every disjoint pair of combinations once', () => {
		let pairs = 0;
		for (let i = 0; i < NUM_CLASSES; i++) {
			for (let j = 0; j < NUM_CLASSES; j++) pairs += table.pairCount(i, j);
		}
		expect(pairs).toBe(1326 * 1225);
		expect(table.pairCount(classByName('AA').index, classByName('AA').index)).toBe(6);
		expect(table.pairCount(classByName('AKs').index, classByName('AKo').index)).toBe(4 * 6);
	});

	it('is symmetric: the two sides’ equities sum to one', () => {
		for (let i = 0; i < NUM_CLASSES; i++) {
			for (let j = 0; j < NUM_CLASSES; j++) {
				const a = table.outcomes(i, j);
				const b = table.outcomes(j, i);
				expect(a.win).toBe(b.loss);
				expect(a.tie).toBe(b.tie);
				expect(a.tie).toBeGreaterThanOrEqual(0);
				expect(table.equity(i, j) + table.equity(j, i)).toBeCloseTo(1, 12);
			}
		}
	});
});

interface Published {
	a: string;
	b: string;
	alice: [bigint, bigint];
	bob: [bigint, bigint];
	tie: [bigint, bigint];
	decimals: [string, string, string];
}

function readPublished(): Published[] {
	const lines = readFileSync(new URL('fixtures/irving-exact.txt', import.meta.url), 'utf8').split(
		'\n'
	);
	const found: Published[] = [];
	const fraction = (line: string, label: string): [[bigint, bigint], string] => {
		const m = new RegExp(`^\\s+${label}:\\s+(\\d+)/(\\d+) = ([\\d.e-]+)$`).exec(line);
		if (!m) throw new Error(`unreadable line: ${line}`);
		return [[BigInt(m[1]), BigInt(m[2])], m[3]];
	};
	for (let i = 0; i + 3 < lines.length; i += 4) {
		const head = /^(\w+) vs\. (\w+):$/.exec(lines[i]);
		if (!head) throw new Error(`unreadable line: ${lines[i]}`);
		const [alice, da] = fraction(lines[i + 1], 'Alice');
		const [bob, db] = fraction(lines[i + 2], 'Bob');
		const [tie, dt] = fraction(lines[i + 3], 'Tie');
		found.push({ a: head[1], b: head[2], alice, bob, tie, decimals: [da, db, dt] });
	}
	return found;
}

describe('B-4: agreement with the published exact table', () => {
	const published = readPublished();

	it('covers every unordered class pair once', () => {
		expect(published).toHaveLength((NUM_CLASSES * (NUM_CLASSES + 1)) / 2);
		const keys = new Set(published.map((p) => [p.a, p.b].sort().join(' ')));
		expect(keys.size).toBe(published.length);
	});

	it('agrees exactly on wins, losses and ties for all 14,365 pairs', () => {
		const same = (count: number, total: number, [num, den]: [bigint, bigint]) =>
			BigInt(count) * den === num * BigInt(total);
		const differing: string[] = [];
		for (const p of published) {
			const t = table.outcomes(classByName(p.a).index, classByName(p.b).index);
			if (
				!same(t.win, t.total, p.alice) ||
				!same(t.loss, t.total, p.bob) ||
				!same(t.tie, t.total, p.tie)
			) {
				differing.push(`${p.a} vs ${p.b}`);
			}
		}
		expect(differing).toEqual([]);
	});

	it('reproduces a printed value to its printed precision', () => {
		// "AA vs. KK: Alice: 16790448/20547648 = 0.817147" (irving-exact.txt line 42246).
		const t = table.outcomes(classByName('AA').index, classByName('KK').index);
		expect((t.win / t.total).toPrecision(6)).toBe('0.817147');
		const p = published.find((x) => x.a === 'AA' && x.b === 'KK');
		expect(p?.decimals).toEqual(['0.817147', '0.178226', '0.0046271']);
	});
});

/** Every disjoint combination pair of two classes, grouped by suit relabelling. */
function suitClasses(
	a: HandClass,
	b: HandClass
): { a: [number, number]; b: [number, number]; n: number }[] {
	const perms: number[][] = [];
	const walk = (p: number[]) => {
		if (p.length === 4) perms.push(p);
		else for (let s = 0; s < 4; s++) if (!p.includes(s)) walk([...p, s]);
	};
	walk([]);
	const groups = new Map<string, { a: [number, number]; b: [number, number]; n: number }>();
	for (const x of a.combos) {
		for (const y of b.combos) {
			if (x.some((c) => y.includes(c))) continue;
			const keys = perms.map((p) => {
				const map = (c: number) => (c & ~3) | p[c & 3];
				const ha = [map(x[0]), map(x[1])].sort((m, n) => m - n);
				const hb = [map(y[0]), map(y[1])].sort((m, n) => m - n);
				return `${ha.join(',')}|${hb.join(',')}`;
			});
			const key = keys.sort()[0];
			const group = groups.get(key);
			if (group) group.n++;
			else groups.set(key, { a: [x[0], x[1]], b: [y[0], y[1]], n: 1 });
		}
	}
	return [...groups.values()];
}

describe('B-4: agreement with the direct enumerator', () => {
	it.each([
		['AA', 'KK'],
		['AKs', 'QQ'],
		['AKo', 'AKs'],
		['72o', 'AA'],
		['T9s', '22'],
		['KQo', 'JTo']
	])('%s against %s, every combination pair enumerated', (x, y) => {
		const a = classByName(x);
		const b = classByName(y);
		let win = 0;
		let loss = 0;
		let total = 0;
		for (const g of suitClasses(a, b)) {
			const t = handVsHand(g.a, g.b);
			win += g.n * t.win;
			loss += g.n * t.loss;
			total += g.n * t.total;
		}
		expect(total).toBe(table.pairCount(a.index, b.index) * PREFLOP_BOARDS);
		expect(table.outcomes(a.index, b.index)).toMatchObject({ win, loss, total });
	});
});

describe('canonical boards', () => {
	it('finds the 1,755 distinct flops, weighted to all 22,100', () => {
		const flops = canonicalBoards(3);
		expect(flops.weights.length).toBe(1_755);
		expect(flops.weights.reduce((s, w) => s + w, 0)).toBe(22_100);
	});

	it('lists each class pair once by name', () => {
		expect(CLASSES.map((c) => c.name)).toEqual(
			(JSON.parse(tableText.toString()) as PreflopTableFile).classes
		);
	});
});
