// P5.2's benchmarks on the reference river spots (river-spots.ts):
//
//   B-6   each spot solved until its exploitability, measured by FeltPrep's
//         best-response evaluator on the stored strategy, is at most 0.5% of
//         the pot, checked every 25 iterations
//   B-11  at every decision, a sample of the actor's hands in range: each
//         action's value from actionValues against the pairwise calculation of
//         river-direct.ts, within 0.1% of the pot
//   B-12  the same solve carried on to twice the iterations: no verdict moves
//         between acceptable and mistake, band changes listed, and each hand's
//         margin stored in its solution
//
// plus the invariants of grading-gate item 6. Each spot's solution goes to
// artifacts/river-reference/<id>.json (ignored by Git, A-5) and its SHA-256 to
// solutions/river-reference/manifest.json, which is committed.
//
//   node scripts/river-bench.ts              solve, check, write
//   node scripts/river-bench.ts --check      solve, check, and compare the bytes with the manifest
//   node scripts/river-bench.ts --only river-03
//
// The solver draws no random numbers, so there is no seed; a solve stopped at
// N iterations is the same, bit for bit, as one run for N. About a minute on
// one core.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { potTotal, type HandState } from '../src/lib/engine/state.ts';
import { actionValues, exploitability, solve } from '../src/lib/solver/cfr.ts';
import { decisions, type Strategy } from '../src/lib/solver/game.ts';
import { bandOf, DEFAULT_GRADING, losses } from '../src/lib/solver/grading.ts';
import { round10 } from '../src/lib/solver/jam-or-fold.ts';
import { buildRiver } from '../src/lib/solver/postflop.ts';
import { DirectRiver } from '../src/lib/solver/river-direct.ts';
import { RIVER_SPOTS, riverSpot, type ReferenceRiverSpot } from '../src/lib/solver/river-spots.ts';
import type { DecisionTable, SolutionFile } from '../src/lib/spots/types.ts';

const argv = process.argv.slice(2);
const { values: args } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: {
		check: { type: 'boolean', default: false },
		only: { type: 'string' },
		target: { type: 'string', default: '0.005' },
		list: { type: 'boolean', default: false }
	}
});

/** B-6's threshold, as a fraction of the pot at the start of the spot. */
const TARGET = Number(args.target);
/** B-11's tolerance, as a fraction of the pot. */
const TOLERANCE = 0.001;
/** A hand that cannot lose may fold at most this often (gate item 6). */
const NUT_FOLD = 0.001;
const EVERY = 25;
const MAX_ITERATIONS = 1_000_000;
const BB = 100;
const grading = DEFAULT_GRADING;

const root = new URL('../../', import.meta.url);
const outDir = new URL('artifacts/river-reference/', root);
const manifestUrl = new URL('solutions/river-reference/manifest.json', root);
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim();

/** A strategy rounded as it is stored, so every check measures what is kept. */
function rounded(strategy: Strategy): Strategy {
	const out: Strategy = new Map();
	for (const [id, row] of strategy) out.set(id, Float64Array.from(row, round10));
	return out;
}

interface SpotResult {
	readonly id: string;
	/** Iterations to B-6's target, and of the stored solve. */
	readonly reached: number;
	readonly iterations: number;
	readonly marginIterations: number;
	/** Each doubling after B-6's target, and its acceptable↔mistake changes. */
	readonly doublings: readonly { readonly iterations: number; readonly jumps: number }[];
	/** B-6: exploitability when the target was first met, as a fraction of the pot. */
	readonly atTarget: number;
	/** Fractions of the pot at the start of the spot. */
	readonly exploitability: number;
	readonly marginExploitability: number;
	readonly decisions: number;
	readonly combos: readonly [number, number];
	readonly b11: { readonly checked: number; readonly worst: number };
	readonly b12: {
		readonly changed: readonly string[];
		readonly jumps: readonly string[];
		/** Hands in range in the stored solve that the longer one no longer holds there. */
		readonly leaving: readonly string[];
	};
	readonly largestMargin: number;
	readonly nutFolds: { readonly checked: number; readonly worst: number };
	readonly zeroSum: number;
	/** The largest distance of a stored frequency row's sum from one. */
	readonly rowSums: number;
	readonly file: { readonly path: string; readonly sha256: string; readonly bytes: number };
	readonly seconds: number;
}

function run(ref: ReferenceRiverSpot): { result: SpotResult; text: string } {
	const spot = riverSpot(ref);
	const built = buildRiver(spot);
	const { game } = built;
	const pot = spot.pot;
	const started = performance.now();
	let checking = 0;
	// Each in-range hand's band for each action, for comparing two solves.
	const bands = (strategy: Strategy): Map<string, (string | null)[]> => {
		const e = exploitability(game, strategy).exploitability;
		const out = new Map<string, (string | null)[]>();
		for (const [id, nv] of actionValues(game, strategy)) {
			const state = built.states.get(id) as HandState;
			const k = nv.node.actions.length;
			const sigma = strategy.get(id) as Float64Array;
			const row: (string | null)[] = [];
			for (let t = 0; t < game.types[nv.node.player]; t++) {
				const inRange = nv.mass[t] > 0 && nv.reach[t] >= grading.minReach;
				const l = inRange ? losses(Array.from(nv.values.subarray(t * k, t * k + k))) : [];
				for (let a = 0; a < k; a++) {
					row.push(inRange ? bandOf(l[a], potTotal(state), sigma[t * k + a], 0, e, grading) : null);
				}
			}
			out.set(id, row);
		}
		return out;
	};
	const jumpsBetween = (a: Map<string, (string | null)[]>, b: Map<string, (string | null)[]>) => {
		let n = 0;
		for (const [id, row] of a) {
			const other = b.get(id) as (string | null)[];
			row.forEach((x, i) => {
				const y = other[i];
				if (x && y && x !== y && x !== 'inaccuracy' && y !== 'inaccuracy') n++;
			});
		}
		return n;
	};
	// B-6: solve until the stored strategy is within the target. B-12: carry on,
	// doubling, until a doubling moves no verdict between acceptable and
	// mistake; the solve before that doubling is the one stored.
	let reached = 0;
	let atTarget = 0;
	let next = 0;
	const doublings: { iterations: number; jumps: number }[] = [];
	let previous: {
		iterations: number;
		strategy: Strategy;
		bands: Map<string, (string | null)[]>;
	} | null = null;
	const kept: { main?: Strategy; longer?: Strategy; iterations?: number } = {};
	solve(game, { iterations: MAX_ITERATIONS }, (it, average) => {
		if (!reached && it % EVERY === 0) {
			const c = performance.now();
			const avg = rounded(average());
			const e = exploitability(game, avg).exploitability;
			checking += performance.now() - c;
			if (e <= TARGET * pot) {
				reached = it;
				atTarget = e / pot;
				next = 2 * it;
				const c2 = performance.now();
				previous = { iterations: it, strategy: avg, bands: bands(avg) };
				checking += performance.now() - c2;
			}
			return;
		}
		if (!reached || it !== next || !previous) return;
		const c = performance.now();
		const avg = rounded(average());
		const b = bands(avg);
		const jumps = jumpsBetween(previous.bands, b);
		checking += performance.now() - c;
		doublings.push({ iterations: it, jumps });
		if (jumps === 0) {
			kept.main = previous.strategy;
			kept.longer = avg;
			kept.iterations = previous.iterations;
			return true;
		}
		previous = { iterations: it, strategy: avg, bands: b };
		next = 2 * it;
	});
	const { main: strategy, longer: second, iterations: stored } = kept;
	if (!strategy || !second || !stored) {
		throw new Error(`${ref.id}: verdicts did not settle within ${MAX_ITERATIONS} iterations`);
	}
	const seconds = (performance.now() - started - checking) / 1000;
	const e1 = exploitability(game, strategy).exploitability;
	const e2 = exploitability(game, second).exploitability;

	const values = actionValues(game, strategy);
	const values2 = actionValues(game, second);
	const direct = new DirectRiver(built, spot);
	const tables: DecisionTable[] = [];
	const changed: string[] = [];
	const jumps: string[] = [];
	const leaving: string[] = [];
	let largestMargin = 0;
	let b11Checked = 0;
	let b11Worst = 0;
	let nutChecked = 0;
	let nutWorst = 0;
	let rowSums = 0;
	for (const node of decisions(game)) {
		const nv = values.get(node.id);
		const nv2 = values2.get(node.id);
		const state = built.states.get(node.id);
		if (!nv || !nv2 || !state) throw new Error(`${ref.id}: no values at ${node.id}`);
		const q = node.player;
		const k = node.actions.length;
		const at = potTotal(state);
		const sigma = strategy.get(node.id) as Float64Array;
		const sigma2 = second.get(node.id) as Float64Array;
		const hands: string[] = [];
		const reach: number[] = [];
		const frequencies: number[][] = [];
		const vals: number[][] = [];
		const margins: number[] = [];
		const inRange: number[] = [];
		for (let t = 0; t < game.types[q]; t++) {
			if (!(nv.mass[t] > 0)) continue;
			const row = Array.from({ length: k }, (_, a) => nv.values[t * k + a]);
			const row2 = Array.from({ length: k }, (_, a) => nv2.values[t * k + a]);
			const freq = Array.from({ length: k }, (_, a) => sigma[t * k + a]);
			const freq2 = Array.from({ length: k }, (_, a) => sigma2[t * k + a]);
			const l1 = losses(row);
			const l2 = losses(row2);
			const margin = Math.max(...l1.map((l, a) => Math.abs(l - l2[a])));
			hands.push(game.typeNames[q][t]);
			reach.push(round10(nv.reach[t]));
			frequencies.push(freq);
			rowSums = Math.max(rowSums, Math.abs(freq.reduce((x, y) => x + y, 0) - 1));
			vals.push(row.map((v) => round10(v / BB)));
			margins.push(round10(margin / BB));
			if (nv.reach[t] < grading.minReach) continue;
			inRange.push(t);
			largestMargin = Math.max(largestMargin, margin);
			// B-12: the bands of the two solves, with no margin, as jof:build does.
			// A hand the longer solve no longer holds there is not graded by it,
			// which is not a move between acceptable and mistake; it is counted.
			if (!(nv2.mass[t] > 0) || nv2.reach[t] < grading.minReach) {
				leaving.push(`${ref.id} ${node.id} ${game.typeNames[q][t]}`);
			} else {
				for (let a = 0; a < k; a++) {
					const b1 = bandOf(l1[a], at, freq[a], 0, e1, grading);
					const b2 = bandOf(l2[a], at, freq2[a], 0, e2, grading);
					if (b1 === b2) continue;
					const label = `${ref.id} ${node.id} ${game.typeNames[q][t]} ${node.actions[a]}: ${b1} → ${b2}`;
					changed.push(label);
					if (b1 !== 'inaccuracy' && b2 !== 'inaccuracy') jumps.push(label);
				}
			}
			// Gate item 6: a hand that cannot lose does not fold.
			const fold = node.actions.indexOf('fold');
			if (fold >= 0 && direct.cannotLose(strategy, node.id, t)) {
				nutChecked++;
				nutWorst = Math.max(nutWorst, freq[fold]);
			}
		}
		tables.push({
			spot: `${ref.id}:${node.id}`,
			actions: node.actions,
			hands,
			reach,
			frequencies,
			values: vals,
			margins
		});
		// B-11 on a sample of the hands in range: the least and most often held, and some between.
		const held = [...inRange].sort(
			(a, b) =>
				built.combos[q][a].weight * nv.reach[a] - built.combos[q][b].weight * nv.reach[b] || a - b
		);
		const sample = new Set<number>([...held.slice(0, 4), ...held.slice(-4)]);
		for (const f of [0.2, 0.4, 0.6, 0.8]) {
			if (held.length) sample.add(held[Math.floor(f * (held.length - 1))]);
		}
		for (const t of sample) {
			const d = direct.values(strategy, node.id, t);
			if (!d) throw new Error(`${ref.id}: no opposing hand at ${node.id} for a hand in range`);
			d.forEach((v, a) => {
				b11Worst = Math.max(b11Worst, Math.abs(v - nv.values[t * k + a]) / pot);
			});
			b11Checked++;
		}
	}

	// Zero sum: player 0's value at the root plus player 1's at its first decisions.
	const rootNode = game.root;
	if (rootNode.kind !== 'decision' || rootNode.player !== 0) throw new Error('player 0 acts first');
	const ev = (id: string) => {
		const nv = values.get(id);
		const sigma = strategy.get(id) as Float64Array;
		if (!nv) throw new Error(`no values at ${id}`);
		const k = nv.node.actions.length;
		let sum = 0;
		for (let t = 0; t < nv.mass.length; t++) {
			if (!(nv.mass[t] > 0)) continue;
			for (let a = 0; a < k; a++) sum += nv.mass[t] * sigma[t * k + a] * nv.values[t * k + a];
		}
		return sum;
	};
	let ev1 = 0;
	for (const child of rootNode.children) {
		if (child.kind !== 'decision') throw new Error('player 1 acts after the first action');
		ev1 += ev(child.id);
	}
	const zeroSum = Math.abs(ev(rootNode.id) + ev1) / pot;

	const file: SolutionFile = {
		format: 1,
		kind: 'solution',
		solution: ref.id,
		decisions: tables
	};
	const text = JSON.stringify(file) + '\n';
	const result: SpotResult = {
		id: ref.id,
		reached,
		iterations: stored,
		marginIterations: 2 * stored,
		doublings,
		atTarget,
		exploitability: e1 / pot,
		marginExploitability: e2 / pot,
		decisions: tables.length,
		combos: [game.types[0], game.types[1]],
		b11: { checked: b11Checked, worst: b11Worst },
		b12: { changed, jumps, leaving },
		largestMargin: largestMargin / pot,
		nutFolds: { checked: nutChecked, worst: nutWorst },
		zeroSum,
		file: { path: `${ref.id}.json`, sha256: sha(text), bytes: Buffer.byteLength(text) },
		seconds,
		rowSums
	};
	return { result, text };
}

const spots = args.only ? RIVER_SPOTS.filter((s) => s.id === args.only) : RIVER_SPOTS;
if (!spots.length) throw new RangeError(`no spot ${args.only}`);
const pct = (x: number, digits = 3) => `${(100 * x).toFixed(digits)}%`;
let failed = false;
const results: SpotResult[] = [];
mkdirSync(outDir, { recursive: true });
for (const ref of spots) {
	const { result: r, text } = run(ref);
	const problems: string[] = [];
	if (r.atTarget > TARGET || r.exploitability > TARGET) problems.push('B-6');
	if (r.b11.worst > TOLERANCE) problems.push('B-11');
	if (r.b12.jumps.length) problems.push('B-12');
	if (r.nutFolds.worst >= NUT_FOLD || r.zeroSum > 1e-9 || r.rowSums > 1e-9) {
		problems.push('invariants');
	}
	if (problems.length) failed = true;
	console.log(
		`${r.id}  ${r.combos[0]}×${r.combos[1]} combos, ${r.decisions} decisions: ` +
			`B-6 ${pct(r.atTarget)} at ${r.reached} it; stored ${r.iterations} it ` +
			`[${r.doublings.map((d) => `${d.iterations}:${d.jumps}`).join(' ')}] in ${r.seconds.toFixed(1)} s, ` +
			`exploitability ${pct(r.exploitability)} ` +
			`(${pct(r.marginExploitability)} at ${r.marginIterations}); B-11 ${r.b11.checked} hands, ` +
			`worst ${r.b11.worst.toExponential(1)} of the pot; B-12 ${r.b12.changed.length} band changes, ` +
			`${r.b12.jumps.length} acceptable↔mistake, ${r.b12.leaving.length} leave the range, largest margin ${pct(r.largestMargin)}; ` +
			`nut folds ≤ ${pct(r.nutFolds.worst, 4)} over ${r.nutFolds.checked}; ` +
			`${(r.file.bytes / 1e6).toFixed(1)} MB` +
			(problems.length ? `  FAIL ${problems.join(', ')}` : '')
	);
	if (args.list) for (const line of r.b12.changed) console.log(`    ${line}`);
	else for (const line of r.b12.jumps.slice(0, 5)) console.log(`    ${line}`);
	writeFileSync(new URL(r.file.path, outDir), text);
	results.push(r);
}
const total = results.reduce((s, r) => s + r.seconds, 0);
console.log(
	`${results.length} spots in ${total.toFixed(1)} s of solving; ` +
		`worst exploitability ${pct(Math.max(...results.map((r) => r.exploitability)))}, ` +
		`B-11 ${results.reduce((s, r) => s + r.b11.checked, 0)} hands, worst ` +
		`${Math.max(...results.map((r) => r.b11.worst)).toExponential(1)} of the pot; ` +
		`B-12 ${results.reduce((s, r) => s + r.b12.changed.length, 0)} band changes, ` +
		`${results.reduce((s, r) => s + r.b12.jumps.length, 0)} acceptable↔mistake`
);
if (failed) {
	console.error('a benchmark failed');
	process.exit(1);
}

interface RiverManifest {
	readonly format: 1;
	readonly kind: 'river-reference';
	readonly title: string;
	readonly build: {
		readonly command: string;
		readonly commit: string;
		readonly settings: Readonly<Record<string, number | string>>;
		readonly seed: null;
	};
	readonly grading: typeof grading;
	readonly spots: readonly {
		readonly id: string;
		readonly board: string;
		readonly texture: string;
		readonly line: string;
		readonly pot: number;
		readonly stack: number;
		readonly ranges: { readonly 'big-blind': string; readonly button: string };
		readonly sizes: {
			readonly bets: readonly number[];
			readonly raises: readonly number[];
			readonly maxBets: number;
		};
		readonly reached: number;
		readonly targetExploitability: number;
		readonly iterations: number;
		readonly marginIterations: number;
		readonly exploitability: number;
		readonly unit: 'fraction of the pot';
		readonly file: SpotResult['file'];
	}[];
}

const statement = (ref: ReferenceRiverSpot, r: SpotResult): RiverManifest['spots'][number] => ({
	id: ref.id,
	board: ref.board,
	texture: ref.texture,
	line: ref.line.title,
	pot: ref.line.pot / BB,
	stack: ref.line.stack / BB,
	ranges: { 'big-blind': ref.line.ranges[0], button: ref.line.ranges[1] },
	sizes: {
		bets: ref.sizes.betSizes,
		raises: ref.sizes.raiseSizes,
		maxBets: ref.sizes.maxBets
	},
	reached: r.reached,
	targetExploitability: Number(r.atTarget.toPrecision(6)),
	iterations: r.iterations,
	marginIterations: r.marginIterations,
	exploitability: Number(r.exploitability.toPrecision(6)),
	unit: 'fraction of the pot',
	file: r.file
});

if (args.check) {
	const committed = JSON.parse(readFileSync(manifestUrl, 'utf8')) as RiverManifest;
	const differs = results.filter(
		(r) => committed.spots.find((s) => s.id === r.id)?.file.sha256 !== r.file.sha256
	);
	if (differs.length) {
		console.error(`differs from the manifest: ${differs.map((r) => r.id).join(', ')}`);
		process.exit(1);
	}
	console.log('every solution is identical to its manifest');
	process.exit(0);
}
if (args.only) {
	console.log('wrote the solution; the manifest is written only by a run over every spot');
	process.exit(0);
}
const manifest: RiverManifest = {
	format: 1,
	kind: 'river-reference',
	title: 'Reference river spots for B-6, B-11 and B-12 (P5.2)',
	build: {
		command: 'pnpm run river:bench',
		commit:
			git('rev-parse', 'HEAD') +
			(git('status', '--porcelain', '--untracked-files=no') ? '-dirty' : ''),
		settings: {
			solver: 'CFR+ (alternating, linear averaging)',
			stop: `exploitability at most ${TARGET} of the pot, checked every ${EVERY} iterations`,
			stored:
				'carried on, doubling, until a doubling moves no verdict between acceptable and mistake',
			margins: 'the stored solve carried on to twice its iterations',
			precision: 1e-10
		},
		seed: null
	},
	grading,
	spots: results.map((r) =>
		statement(RIVER_SPOTS.find((s) => s.id === r.id) as ReferenceRiverSpot, r)
	)
};
mkdirSync(new URL('./', manifestUrl), { recursive: true });
writeFileSync(manifestUrl, JSON.stringify(manifest, null, '\t') + '\n');
console.log('wrote the solutions and the manifest');
