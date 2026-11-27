// P5.1's measurements of reference post-flop solves (docs/solver.md): build a
// stated spot through the engine, solve it with CFR+, and record the time and
// peak memory to reach 1%, 0.5% and 0.25% of the pot in exploitability,
// checking every --every iterations. Run it on a quiet machine:
//
//   node scripts/postflop-measure.ts [--street river|turn|flop] [--iterations 2000] [--every 25]
//
// --count builds the tree and reports its size and the solver's memory
// without solving, for trees too large to solve here (the flop). --bets,
// --raises (comma-separated fractions of the pot, may be empty) and
// --max-bets replace the reference sizes, to size smaller trees.

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { cards } from '../src/lib/engine/cards.ts';
import { CLASSES, NUM_CLASSES } from '../src/lib/solver/classes.ts';
import { exploitability, solve } from '../src/lib/solver/cfr.ts';
import { decisions, type GameNode } from '../src/lib/solver/game.ts';
import { buildSpot, type Spot, type WeightedCombo } from '../src/lib/solver/postflop.ts';
import { PreflopTable, type PreflopTableFile } from '../src/lib/solver/preflop-table.ts';

const argv = process.argv.slice(2);
const { values: args } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: {
		street: { type: 'string', default: 'river' },
		iterations: { type: 'string', default: '2000' },
		every: { type: 'string', default: '25' },
		count: { type: 'boolean', default: false },
		bets: { type: 'string', default: '0.33,0.75' },
		raises: { type: 'string', default: '1' },
		'max-bets': { type: 'string', default: '3' }
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

function fractions(list: string): number[] {
	return list === '' ? [] : list.split(',').map(Number);
}

/** The reference spots: one board, one pair of ranges and one set of sizes, from each street. */
const BOARDS: Record<string, string> = {
	river: 'Ks 9d 5c 2h 7s',
	turn: 'Ks 9d 5c 2h',
	flop: 'Ks 9d 5c'
};
const street = args.street;
if (!(street in BOARDS)) throw new RangeError('--street is river, turn or flop');
const SPOT: Spot = {
	board: cards(BOARDS[street]),
	pot: 500,
	stack: 9750,
	bigBlind: 100,
	// The big blind defends the 6% to 70% band; the button opened the top 45%.
	ranges: [band(0.06, 0.7), band(0, 0.45)],
	betSizes: fractions(args.bets),
	raiseSizes: fractions(args.raises),
	maxBets: Number(args['max-bets'])
};

const peak = { rss: 0 };
const sample = () => (peak.rss = Math.max(peak.rss, process.memoryUsage().rss));
const mb = (bytes: number) => `${(bytes / 2 ** 20).toFixed(0)} MB`;
const t0 = performance.now();
const { game } = buildSpot(SPOT, { keepStates: false });
const built = (performance.now() - t0) / 1000;
sample();
const nodes = decisions(game);
const counts = { terminal: 0, showdown: 0, chance: 0 };
const tables = new Set<unknown>();
const count = (n: GameNode): void => {
	if (n.kind === 'decision') {
		n.children.forEach(count);
		return;
	}
	counts[n.kind]++;
	if (n.kind === 'showdown') tables.add(n.table);
	if (n.kind === 'chance') n.children.forEach(count);
};
count(game.root);
// The solver keeps a regret, a running sum and a current frequency per type and action.
const cells = nodes.reduce((s, n) => s + game.types[n.player] * n.actions.length, 0);
console.log(
	`${street} spot ${BOARDS[street]}, bets ${args.bets || 'none'}, raises ${args.raises || 'none'}, ` +
		`at most ${SPOT.maxBets} a street: ${game.types[0]} and ${game.types[1]} combinations; ` +
		`${nodes.length} decisions, ${counts.chance} chance nodes, ${counts.showdown} showdowns ` +
		`on ${tables.size} boards, ${counts.terminal} folds; built in ${built.toFixed(1)} s, RSS ${mb(peak.rss)}`
);
console.log(`solver state: ${cells} type-action cells, ${mb(cells * 3 * 8)} as 64-bit floats`);
if (args.count) process.exit(0);

const pot = SPOT.pot;
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
		`${String(it).padStart(5)} it  ${secs.toFixed(1).padStart(7)} s solving  exploitability ${pct.toFixed(3)}% of the pot`
	);
	for (const t of [1, 0.5, 0.25]) {
		if (pct <= t && !marks[t]) marks[t] = `${it} iterations, ${secs.toFixed(1)} s`;
	}
});
sample();
console.log(`peak RSS ${mb(peak.rss)}; checking took ${(checking / 1000).toFixed(1)} s`);
for (const t of [1, 0.5, 0.25]) console.log(`${t}% of the pot: ${marks[t] ?? 'not reached'}`);
