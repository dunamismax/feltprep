// B-5's comparison with an independently published jam-or-fold chart (P2.4).
//
//   node scripts/jam-or-fold-compare.ts --chart <file>
//
// The chart is not in the repository: no license allows copying it (see
// docs/benchmarks.md, B-5). <file> is a plain-text copy made by hand from the
// published page: two 13 x 13 grids headed `pusher` and `caller`, rows and
// columns from ace to deuce with suited hands above the diagonal, each cell
// the largest effective stack at which the hand plays (`20+` for every stack
// up to 20, `G<class>` for a hand with gaps), and a `gaps` section listing
// each gapped hand's intervals as `63s 0-2.3 5.1-7.1`. Lines starting with
// `#` are ignored.
//
// For every depth from 2 to 15 big blinds and every class that FeltPrep's
// solution does not mix (it plays the action at least 99% or at most 1% of
// the time), the chart's action must agree. Every difference is printed.

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { CLASSES } from '../src/lib/solver/classes.ts';
import { JAM_OR_FOLD_STACKS } from '../src/lib/solver/jam-or-fold.ts';
import type { SolutionFile } from '../src/lib/spots/types.ts';

const argv = process.argv.slice(2);
const { values } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: { chart: { type: 'string' } }
});
if (!values.chart) throw new Error('--chart <file> is required');

const lines = readFileSync(values.chart, 'utf8')
	.split('\n')
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith('#'));
const section = (name: string) => {
	const at = lines.indexOf(name);
	if (at < 0) throw new Error(`the chart has no ${name} section`);
	return at + 1;
};
type Plays = (stack: number) => boolean;
const gaps = new Map<string, Plays>();
for (let i = section('gaps'); i < lines.length && /^\w+s? \d/.test(lines[i]); i++) {
	const [name, ...ranges] = lines[i].split(/\s+/);
	const intervals = ranges.map((r) => r.split('-').map(Number));
	gaps.set(name, (s) => intervals.some(([lo, hi]) => s >= lo && s <= hi));
}
function grid(name: string): Plays[] {
	const start = section(name);
	const cells: Plays[] = [];
	for (let row = 0; row < 13; row++) {
		const tokens = lines[start + row].split(/\s+/);
		if (tokens.length !== 13) throw new Error(`${name} row ${row + 1} has ${tokens.length} cells`);
		for (const token of tokens) {
			if (token === '20+') cells.push(() => true);
			else if (token.startsWith('G')) {
				const plays = gaps.get(token.slice(1));
				if (!plays) throw new Error(`no gaps listed for ${token}`);
				cells.push(plays);
			} else {
				const limit = Number(token);
				if (!Number.isFinite(limit)) throw new Error(`unreadable cell ${token}`);
				cells.push((s) => s <= limit);
			}
		}
	}
	return cells;
}
const pusher = grid('pusher');
const caller = grid('caller');

const solution = JSON.parse(
	readFileSync(new URL('../../solutions/jam-or-fold/solution.json', import.meta.url), 'utf8')
) as SolutionFile;

let compared = 0;
let mixed = 0;
const differences: string[] = [];
for (const stack of JAM_OR_FOLD_STACKS) {
	for (const [seat, chart, action] of [
		['button', pusher, 'jam'],
		['big-blind', caller, 'call']
	] as const) {
		const table = solution.decisions.find((d) => d.spot === `jof-${stack}bb-${seat}`);
		if (!table) throw new Error(`no table for ${stack} bb ${seat}`);
		for (const c of CLASSES) {
			const f = table.frequencies[table.hands.indexOf(c.name)][1];
			if (f > 0.01 && f < 0.99) {
				mixed++;
				continue;
			}
			compared++;
			const ours = f >= 0.99;
			const theirs = chart[c.index](stack);
			if (ours !== theirs) {
				differences.push(
					`${String(stack).padStart(2)} bb ${seat.padEnd(9)} ${c.name.padEnd(3)}: FeltPrep ${action}s ` +
						`${(100 * f).toFixed(2)}%, the chart ${theirs ? action + 's' : 'folds'}`
				);
			}
		}
	}
}
console.log(
	`compared ${compared} pure decisions (${mixed} mixed ones left out): ${differences.length} differ`
);
for (const d of differences) console.log(`  ${d}`);
