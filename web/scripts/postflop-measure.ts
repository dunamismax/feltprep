// P5.1's measurement of a reference river solve (docs/solver.md): build the
// stated spot through the engine, solve it with CFR+, and record the time and
// peak memory to reach 1% and 0.5% of the pot in exploitability, checking
// every --every iterations. Run it on a quiet machine:
//
//   node scripts/postflop-measure.ts [--iterations 2000] [--every 25]

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { cards } from '../src/lib/engine/cards.ts';
import { CLASSES, NUM_CLASSES } from '../src/lib/solver/classes.ts';
import { exploitability, solve } from '../src/lib/solver/cfr.ts';
import { decisions } from '../src/lib/solver/game.ts';
import { buildRiver, type RiverSpot, type WeightedCombo } from '../src/lib/solver/postflop.ts';
import { PreflopTable, type PreflopTableFile } from '../src/lib/solver/preflop-table.ts';

const argv = process.argv.slice(2);
const { values: args } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: {
		iterations: { type: 'string', default: '2000' },
		every: { type: 'string', default: '25' }
	}
});

// Reference ranges for measuring only (not a library spot): classes ranked by
// their all-in equity against a random hand, from the exact pre-flop table.
const table = new PreflopTable(
	JSON.parse(
		readFileSync(new URL('../../solutions/equity/preflop-classes.json', import.meta.url), 'utf8')
	) as PreflopTableFile
);
const strength = CLASSES.map((c) => {
	let won = 0;
	let dealt = 0;
	for (let j = 0; j < NUM_CLASSES; j++) {
		const w = table.pairCount(c.index, j);
		won += w * table.equity(c.index, j);
		dealt += w;
	}
	return { c, equity: won / dealt };
}).sort((a, b) => b.equity - a.equity);

/** The classes from the strongest, skipping the top `from` share of combinations, up to `to`. */
function band(from: number, to: number): WeightedCombo[] {
	const out: WeightedCombo[] = [];
	let seen = 0;
	for (const { c } of strength) {
		const share = seen / 1326;
		seen += c.combos.length;
		if (share < from || share >= to) continue;
		for (const [a, b] of c.combos) out.push({ cards: [a, b], weight: 1 });
	}
	return out;
}

export const REFERENCE_RIVER: RiverSpot = {
	board: cards('Ks 9d 5c 2h 7s'),
	pot: 500,
	stack: 9750,
	bigBlind: 100,
	// The big blind defends the 6% to 70% band; the button opened the top 45%.
	ranges: [band(0.06, 0.7), band(0, 0.45)],
	betSizes: [0.33, 0.75],
	raiseSizes: [1],
	maxBets: 3
};

const peak = { rss: 0 };
const sample = () => (peak.rss = Math.max(peak.rss, process.memoryUsage().rss));
const t0 = performance.now();
const built = buildRiver(REFERENCE_RIVER);
sample();
const { game } = built;
const nodes = decisions(game);
let terminals = 0;
const count = (n: typeof game.root): void => {
	if (n.kind === 'terminal') terminals++;
	else n.children.forEach(count);
};
count(game.root);
console.log(
	`river spot: ${game.types[0]} and ${game.types[1]} combinations, ${nodes.length} decisions, ${terminals} terminals; built in ${((performance.now() - t0) / 1000).toFixed(2)} s`
);

const pot = REFERENCE_RIVER.pot;
const every = Number(args.every);
const marks: Record<string, string> = {};
const started = performance.now();
let checking = 0;
solve(game, { iterations: Number(args.iterations) }, (it, average) => {
	if (it % every !== 0) return;
	sample();
	const c = performance.now();
	const e = exploitability(game, average()).exploitability;
	checking += performance.now() - c;
	const pct = (100 * e) / pot;
	const secs = (performance.now() - started - checking) / 1000;
	console.log(
		`${String(it).padStart(5)} it  ${secs.toFixed(1).padStart(6)} s solving  exploitability ${pct.toFixed(3)}% of the pot`
	);
	for (const t of [1, 0.5, 0.25]) {
		if (pct <= t && !marks[t]) marks[t] = `${it} iterations, ${secs.toFixed(1)} s`;
	}
});
sample();
console.log(`peak RSS ${(peak.rss / 2 ** 20).toFixed(0)} MB`);
for (const t of [1, 0.5, 0.25]) console.log(`${t}% of the pot: ${marks[t] ?? 'not reached'}`);
