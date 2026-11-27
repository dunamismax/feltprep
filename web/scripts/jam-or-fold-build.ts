// Build the jam-or-fold solution (P2.4) from the pre-flop class table:
//
//   solutions/jam-or-fold/solution.json   frequencies, exact values and margins per depth
//   solutions/jam-or-fold/manifest.json   the stated games, spots, hashes and build record
//   solutions/registry.json               the entry's manifest hash (its gate record is kept)
//
//   node scripts/jam-or-fold-build.ts            build and write
//   node scripts/jam-or-fold-build.ts --check    build and compare with the committed solution
//
// Each depth from 2 to 15 big blinds is solved twice: with --iterations for
// the stored reference and with twice as many for B-12, whose differences
// become each hand's margin. The solver draws no random numbers, so there is
// no seed. A run takes about a minute on one core.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { CLASSES, NUM_CLASSES } from '../src/lib/solver/classes.ts';
import { bandOf, DEFAULT_GRADING, losses } from '../src/lib/solver/grading.ts';
import {
	JAM_OR_FOLD_STACKS,
	round10,
	solveJamOrFold,
	type DepthSolution
} from '../src/lib/solver/jam-or-fold.ts';
import { PreflopTable, type PreflopTableFile } from '../src/lib/solver/preflop-table.ts';
import type {
	DecisionTable,
	GameStatement,
	GateRecord,
	Manifest,
	Registry,
	SolutionFile,
	Spot
} from '../src/lib/spots/types.ts';

const argv = process.argv.slice(2);
const { values: args } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: {
		check: { type: 'boolean', default: false },
		iterations: { type: 'string', default: '10000' }
	}
});
const iterations = Number(args.iterations);
const ID = 'jam-or-fold-hu';
const THRESHOLD = 0.001;
const root = new URL('../../solutions/', import.meta.url);
const dir = new URL('jam-or-fold/', root);
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim();

const tableBytes = readFileSync(new URL('equity/preflop-classes.json', root));
const tableHash = sha(tableBytes);
const recorded = (
	JSON.parse(readFileSync(new URL('equity/manifest.json', root), 'utf8')) as {
		files: { sha256: string }[];
	}
).files[0].sha256;
if (recorded !== tableHash) throw new Error('the equity table does not match its manifest');
const table = new PreflopTable(JSON.parse(tableBytes.toString()) as PreflopTableFile);

export const CAVEAT =
	'This is the equilibrium of a simplified game in which the button may only move all-in or fold ' +
	'and the big blind may only call or fold. Real players can also limp or make a smaller raise. ' +
	'Those options matter more the deeper the stacks, so the chart is a sound guide at the shortest ' +
	'stacks and a looser one towards 15 big blinds; how much they are worth is not measured here.';

function game(stack: number): GameStatement {
	return {
		id: `jof-${stack}bb`,
		title: `Jam or fold, heads-up, ${stack} big blinds`,
		format: 'heads-up no-limit hold’em',
		blinds: { small: 0.5, big: 1 },
		ante: 0,
		rake: 0,
		effectiveStack: stack,
		board: '',
		pot: 1.5,
		ranges: {
			button: { kind: 'all', source: 'every two-card hand, as dealt' },
			'big-blind': { kind: 'all', source: 'every two-card hand, as dealt' }
		},
		betting: [
			`before the flop, the button moves all-in for ${stack} big blinds or folds`,
			'facing the all-in, the big blind calls or folds',
			'a called hand is dealt to the river with no more betting'
		],
		caveat: CAVEAT
	};
}

function spots(stack: number): [Spot, Spot] {
	return [
		{
			id: `jof-${stack}bb-button`,
			game: `jof-${stack}bb`,
			actor: 'button',
			history: [],
			pot: 1.5,
			actions: ['fold', 'jam']
		},
		{
			id: `jof-${stack}bb-big-blind`,
			game: `jof-${stack}bb`,
			actor: 'big-blind',
			history: ['button:jam'],
			pot: stack + 1,
			actions: ['fold', 'call']
		}
	];
}

interface Comparison {
	margins: [number[], number[]];
	changed: string[];
	acceptableToMistake: string[];
}

/** B-12: compare a solve with its longer re-solve, hand by hand. */
function compare(a: DepthSolution, b: DepthSolution): Comparison {
	const out: Comparison = { margins: [[], []], changed: [], acceptableToMistake: [] };
	const seats = [
		{ values: 'buttonValues', freq: 'jam', pot: 1.5, actions: ['fold', 'jam'], name: 'button' },
		{
			values: 'bigBlindValues',
			freq: 'call',
			pot: a.stack + 1,
			actions: ['fold', 'call'],
			name: 'big blind'
		}
	] as const;
	seats.forEach((seat, s) => {
		for (let i = 0; i < NUM_CLASSES; i++) {
			const va = [a[seat.values][i * 2], a[seat.values][i * 2 + 1]];
			const vb = [b[seat.values][i * 2], b[seat.values][i * 2 + 1]];
			const la = losses(va);
			const lb = losses(vb);
			out.margins[s].push(round10(Math.max(Math.abs(la[0] - lb[0]), Math.abs(la[1] - lb[1]))));
			for (let k = 0; k < 2; k++) {
				const fa = k === 1 ? a[seat.freq][i] : 1 - a[seat.freq][i];
				const fb = k === 1 ? b[seat.freq][i] : 1 - b[seat.freq][i];
				const ba = bandOf(la[k], seat.pot, fa, 0, a.exploitability.exploitability);
				const bb = bandOf(lb[k], seat.pot, fb, 0, b.exploitability.exploitability);
				if (ba !== bb) {
					const label = `${a.stack}bb ${seat.name} ${CLASSES[i].name} ${seat.actions[k]}: ${ba} → ${bb}`;
					out.changed.push(label);
					if (
						(ba === 'acceptable' && bb === 'mistake') ||
						(ba === 'mistake' && bb === 'acceptable')
					) {
						out.acceptableToMistake.push(label);
					}
				}
			}
		}
	});
	return out;
}

function tables(d: DepthSolution, c: Comparison): [DecisionTable, DecisionTable] {
	const [buttonSpot, bigSpot] = spots(d.stack);
	const names = CLASSES.map((x) => x.name);
	const make = (
		spot: Spot,
		freq: Float64Array,
		values: Float64Array,
		margins: number[]
	): DecisionTable => ({
		spot: spot.id,
		actions: spot.actions,
		hands: names,
		reach: names.map(() => 1),
		frequencies: names.map((_, i) => [round10(1 - freq[i]), freq[i]]),
		values: names.map((_, i) => [round10(values[i * 2]), round10(values[i * 2 + 1])]),
		margins
	});
	return [
		make(buttonSpot, d.jam, d.buttonValues, c.margins[0]),
		make(bigSpot, d.call, d.bigBlindValues, c.margins[1])
	];
}

const started = performance.now();
const decisions: DecisionTable[] = [];
const exploitabilities: Manifest['exploitability'][number][] = [];
const allChanged: string[] = [];
const allJumps: string[] = [];
let worstMargin = 0;
for (const stack of JAM_OR_FOLD_STACKS) {
	const main = solveJamOrFold(table, stack, iterations);
	const longer = solveJamOrFold(table, stack, 2 * iterations);
	const c = compare(main, longer);
	decisions.push(...tables(main, c));
	exploitabilities.push({
		game: `jof-${stack}bb`,
		value: Number(main.exploitability.exploitability.toPrecision(6)),
		unit: 'big blinds per hand',
		threshold: THRESHOLD
	});
	allChanged.push(...c.changed);
	allJumps.push(...c.acceptableToMistake);
	const margin = Math.max(...c.margins[0], ...c.margins[1]);
	worstMargin = Math.max(worstMargin, margin);
	const mixed = [...main.jam, ...main.call].filter((f) => f > 1e-6 && f < 1 - 1e-6).length;
	console.log(
		`${String(stack).padStart(2)} bb: exploitability ${main.exploitability.exploitability.toExponential(3)} bb/hand ` +
			`(longer solve ${longer.exploitability.exploitability.toExponential(3)}), button value ` +
			`${main.exploitability.value.toFixed(6)}, mixed classes ${mixed}, largest margin ${margin.toExponential(2)}`
	);
}
const solution: SolutionFile = { format: 1, kind: 'solution', solution: ID, decisions };
const text = JSON.stringify(solution) + '\n';
const solutionHash = sha(text);
console.log(
	`solved in ${((performance.now() - started) / 1000).toFixed(1)} s; ${Buffer.byteLength(text)} bytes, SHA-256 ${solutionHash}`
);
console.log(
	`B-12: ${allChanged.length} band changes, ${allJumps.length} between acceptable and mistake; largest margin ${worstMargin.toExponential(2)} bb`
);
for (const line of allChanged) console.log(`  ${line}`);
const over = exploitabilities.filter((e) => e.value > THRESHOLD);
if (over.length || allJumps.length) {
	console.error('a depth is over the exploitability threshold or a verdict jumped bands');
	process.exit(1);
}

if (args.check) {
	const committed = sha(readFileSync(new URL('solution.json', dir)));
	if (committed !== solutionHash) {
		console.error(`differs from the committed solution (${committed})`);
		process.exit(1);
	}
	console.log('identical to the committed solution');
	process.exit(0);
}

const manifest: Manifest = {
	format: 1,
	kind: 'manifest',
	id: ID,
	title: 'Jam or fold, heads-up, 2 to 15 big blinds',
	games: JAM_OR_FOLD_STACKS.map(game),
	spots: JAM_OR_FOLD_STACKS.flatMap(spots),
	solutionFile: 'solution.json',
	files: [{ path: 'solution.json', sha256: solutionHash, bytes: Buffer.byteLength(text) }],
	inputs: [{ id: 'preflop-class-equity', path: 'equity/preflop-classes.json', sha256: tableHash }],
	build: {
		command: 'pnpm run jof:build',
		commit:
			git('rev-parse', 'HEAD') +
			(git('status', '--porcelain', '--untracked-files=no') ? '-dirty' : ''),
		settings: {
			solver: 'CFR+ (alternating, linear averaging)',
			iterations,
			marginIterations: 2 * iterations,
			precision: 1e-10
		},
		seed: null
	},
	exploitability: exploitabilities,
	grading: DEFAULT_GRADING
};
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('solution.json', dir), text);
const manifestText = JSON.stringify(manifest, null, '\t') + '\n';
writeFileSync(new URL('manifest.json', dir), manifestText);

const registryUrl = new URL('registry.json', root);
const registry: Registry = existsSync(registryUrl)
	? (JSON.parse(readFileSync(registryUrl, 'utf8')) as Registry)
	: { format: 1, kind: 'registry', solutions: [] };
const none: GateRecord = {
	statedGame: false,
	noAbstraction: false,
	exploitability: false,
	verifiedVerifier: false,
	independentAgreement: false,
	invariants: false,
	reproducible: false,
	bothPositions: false,
	perHandValues: false
};
const previous = registry.solutions.find((s) => s.id === ID);
const entry = {
	id: ID,
	manifest: 'jam-or-fold/manifest.json',
	sha256: sha(manifestText),
	status: previous?.status ?? ('unverified' as const),
	gate: previous?.gate ?? none,
	benchmarks: previous?.benchmarks ?? []
};
const next: Registry = {
	...registry,
	solutions: [...registry.solutions.filter((s) => s.id !== ID), entry]
};
writeFileSync(registryUrl, JSON.stringify(next, null, '\t') + '\n');
console.log('wrote the solution, its manifest and the registry entry');
