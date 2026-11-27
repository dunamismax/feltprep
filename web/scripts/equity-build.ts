// Build the exact pre-flop class equity table (P2.2) and its manifest:
//
//   solutions/equity/preflop-classes.json   the table (format 1)
//   solutions/equity/manifest.json          its SHA-256, size and how it was built
//
//   node scripts/equity-build.ts           build and write both files
//   node scripts/equity-build.ts --check   build and compare with the committed table
//
// The table is a pure function of the code: no seed, no settings. A second
// build must give the same bytes, which `--check` verifies. The build takes
// one core for about a minute; run it with `nice -n 19`.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
	accumulateWins,
	canonicalBoards,
	comboPairCounts,
	serializeTable
} from '../src/lib/solver/preflop-table.ts';

const argv = process.argv.slice(2);
const { values } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: { check: { type: 'boolean', default: false } }
});

const dir = new URL('../../solutions/equity/', import.meta.url);
const tablePath = new URL('preflop-classes.json', dir);
const manifestPath = new URL('manifest.json', dir);

function git(...args: string[]): string {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const started = performance.now();
const boards = canonicalBoards(5);
const wins = new Float64Array(169 * 169);
const step = 5_000;
for (let from = 0; from < boards.weights.length; from += step) {
	accumulateWins(boards, from, Math.min(from + step, boards.weights.length), wins);
	process.stderr.write(
		`\r${Math.min(from + step, boards.weights.length)} of ${boards.weights.length} boards`
	);
}
process.stderr.write('\n');
const text = JSON.stringify(serializeTable(wins, comboPairCounts())) + '\n';
const seconds = (performance.now() - started) / 1000;
const sha256 = createHash('sha256').update(text).digest('hex');
const rssMB = process.resourceUsage().maxRSS / 1024;

console.log(`built in ${seconds.toFixed(1)} s, peak memory ${rssMB.toFixed(0)} MB`);
console.log(`${Buffer.byteLength(text)} bytes, SHA-256 ${sha256}`);

if (values.check) {
	const committed = createHash('sha256').update(readFileSync(tablePath)).digest('hex');
	const recorded = (
		JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: { sha256: string }[] }
	).files[0].sha256;
	if (committed !== sha256 || recorded !== sha256) {
		console.error(`differs: committed ${committed}, manifest ${recorded}`);
		process.exit(1);
	}
	console.log('identical to the committed table and its manifest');
} else {
	mkdirSync(dir, { recursive: true });
	writeFileSync(tablePath, text);
	const manifest = {
		format: 1,
		kind: 'table-manifest',
		id: 'preflop-class-equity',
		title: 'Exact pre-flop all-in equity of every hand class against every hand class',
		files: [{ path: 'preflop-classes.json', sha256, bytes: Buffer.byteLength(text) }],
		build: {
			command: 'pnpm run equity:build',
			// A tree with uncommitted changes to tracked files is marked, so the
			// record never names a commit that does not hold the code that ran.
			commit:
				git('rev-parse', 'HEAD') +
				(git('status', '--porcelain', '--untracked-files=no') ? '-dirty' : ''),
			settings: {},
			seed: null
		},
		method:
			'Every five-card board up to suit relabelling (134,459 of 2,598,960), weighted by its class size; ' +
			'on each, all 1,081 live hands ranked and swept worst to best (web/src/lib/solver/preflop-table.ts).',
		checks: 'web/src/lib/solver/preflop-table.spec.ts (B-4)'
	};
	writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');
	console.log(`wrote ${tablePath.pathname} and its manifest`);
}
