// Run the solver benchmarks of Gate B that need no prebuilt artifact and
// print a report for docs/benchmarks.md (P2.3):
//
//   B-1  CFR+ on Kuhn poker: value within 0.001 of -1/18, exploitability ≤ 0.001
//   B-2  the best-response evaluator against hand-derived values, to 1e-9
//   B-3  the polarized river game against its closed form, within 0.5 points
//
//   node scripts/solver-bench.ts [--iterations 2000]
//
// The same checks run in the full gate (src/lib/solver/cfr.spec.ts); this
// command reports the measured numbers and timings. Exits 1 if any fails.

import { parseArgs } from 'node:util';
import { kuhnPoker, polarizedRiver } from '../src/lib/solver/benchmark-games.ts';
import { bestResponse, exploitability, gameValue, solve } from '../src/lib/solver/cfr.ts';
import { strategyFrom } from '../src/lib/solver/game.ts';

const argv = process.argv.slice(2);
const { values } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: { iterations: { type: 'string', default: '2000' } }
});
const iterations = Number(values.iterations);
let failed = false;
const report = (id: string, pass: boolean, text: string) => {
	if (!pass) failed = true;
	console.log(`${id} ${pass ? 'pass' : 'FAIL'}  ${text}`);
};

{
	const game = kuhnPoker();
	const started = performance.now();
	const { average } = solve(game, { iterations });
	const ms = performance.now() - started;
	const e = exploitability(game, average);
	report(
		'B-1',
		Math.abs(e.value + 1 / 18) <= 0.001 && e.exploitability <= 0.001,
		`Kuhn, ${iterations} CFR+ iterations in ${ms.toFixed(0)} ms: value ${e.value.toFixed(6)} ` +
			`(−1/18 = ${(-1 / 18).toFixed(6)}), exploitability ${e.exploitability.toExponential(2)} antes`
	);
}

{
	const kuhn = kuhnPoker();
	const passive = strategyFrom(kuhn, (node) => (node.id.includes('facing') ? [0, 1] : [1, 0]));
	const pk = exploitability(kuhn, passive);
	const river = polarizedRiver({ pot: 2, bet: 1, nuts: 1, air: 1, catchers: 1 });
	const fixed = strategyFrom(river, (node, t) =>
		node.id === 'bettor' ? (t === 0 ? [0, 1] : [0.75, 0.25]) : [0.5, 0.5]
	);
	const errors = [
		pk.value - 0,
		pk.bestResponse[0] - 1 / 3,
		pk.bestResponse[1] - 1 / 3,
		gameValue(river, fixed) - 0.3125,
		bestResponse(river, fixed, 0).value - 0.5,
		bestResponse(river, fixed, 1).value - -0.25
	].map(Math.abs);
	const worst = Math.max(...errors);
	report(
		'B-2',
		worst <= 1e-9,
		`6 hand-derived values (Kuhn check-and-call profile, three-hand river game): largest error ${worst.toExponential(2)}`
	);
}

for (const [pot, bet] of [
	[1, 0.5],
	[1, 1],
	[1, 2],
	[3, 1]
]) {
	const spec = { pot, bet, nuts: 3, air: 3, catchers: 2 };
	const game = polarizedRiver(spec);
	const { average } = solve(game, { iterations: 4_000 });
	const bettor = average.get('bettor') as Float64Array;
	const caller = average.get('caller') as Float64Array;
	let bets = 0;
	let bluffs = 0;
	for (let t = 0; t < 6; t++) {
		bets += bettor[t * 2 + 1];
		if (t >= spec.nuts) bluffs += bettor[t * 2 + 1];
	}
	const share = bluffs / bets;
	const call = (caller[1] + caller[3]) / 2;
	const wantShare = bet / (pot + 2 * bet);
	const wantCall = pot / (pot + bet);
	const e = exploitability(game, average);
	report(
		'B-3',
		Math.abs(share - wantShare) < 0.005 && Math.abs(call - wantCall) < 0.005,
		`pot ${pot}, bet ${bet}: bluffs ${(100 * share).toFixed(2)}% of bets (closed form ${(100 * wantShare).toFixed(2)}%), ` +
			`calls ${(100 * call).toFixed(2)}% (${(100 * wantCall).toFixed(2)}%), exploitability ${(e.exploitability / pot).toExponential(2)} of the pot`
	);
}

process.exit(failed ? 1 : 0);
