// The long engine fuzz (Gate A): random legal play at each seat count, every
// invariant checked after every action and actions just outside the legal set
// rejected (src/lib/engine/fuzz.ts). It counts what the run reached, so a
// passing run is known to have exercised showdowns, side pots and all-ins.
// Exits non-zero on the first failure, naming the seed and hand to replay.
//
//   node scripts/engine-fuzz.ts [--hands 100000] [--seats 2-9] [--seed 0]
//
// Hands at a seat count come from seededRandom(seed * 100 + seats), so any
// seat count can be rerun alone with the same results.

import { parseArgs } from 'node:util';
import { playRandomHand } from '../src/lib/engine/fuzz.ts';
import { seededRandom } from '../src/lib/engine/random.ts';

// `pnpm run engine:fuzz -- --hands 10` passes the `--` through; drop it.
const argv = process.argv.slice(2);
const { values } = parseArgs({
	args: argv[0] === '--' ? argv.slice(1) : argv,
	options: {
		hands: { type: 'string', default: '100000' },
		seats: { type: 'string', default: '2-9' },
		seed: { type: 'string', default: '0' }
	}
});

function seatCounts(text: string): number[] {
	const range = /^(\d)-(\d)$/.exec(text);
	const list = range
		? Array.from(
				{ length: Number(range[2]) - Number(range[1]) + 1 },
				(_, i) => Number(range[1]) + i
			)
		: text.split(',').map(Number);
	if (list.length === 0 || list.some((n) => !Number.isInteger(n) || n < 2 || n > 9)) {
		throw new Error('--seats is a range such as 2-9 or a list such as 2,6,9, from 2 to 9');
	}
	return list;
}

const hands = Number(values.hands);
const seed = Number(values.seed);
if (!Number.isInteger(hands) || hands < 1) throw new Error('--hands is a positive whole number');
if (!Number.isInteger(seed) || seed < 0) throw new Error('--seed is a whole number from 0');

interface Counts {
	seats: number;
	hands: number;
	actions: number;
	showdowns: number;
	tabled: number;
	foldedOut: number;
	allIns: number;
	sidePots: number;
	maxPots: number;
	splitPots: number;
	oddChips: number;
	uncalled: number;
	seconds: number;
}

const report: Counts[] = [];
const started = performance.now();
for (const seats of seatCounts(values.seats)) {
	const runSeed = seed * 100 + seats;
	const rng = seededRandom(runSeed);
	const counts: Counts = {
		seats,
		hands: 0,
		actions: 0,
		showdowns: 0,
		tabled: 0,
		foldedOut: 0,
		allIns: 0,
		sidePots: 0,
		maxPots: 0,
		splitPots: 0,
		oddChips: 0,
		uncalled: 0,
		seconds: 0
	};
	const t0 = performance.now();
	for (let i = 0; i < hands; i++) {
		let state;
		try {
			state = playRandomHand(seats, rng);
		} catch (error) {
			console.error(
				`engine fuzz FAILED at ${seats} seats, hand ${i} of seededRandom(${runSeed}): ${String(error)}`
			);
			process.exit(1);
		}
		const result = state.result!;
		counts.hands++;
		counts.actions += state.actions.length;
		if (result.showdown) counts.showdowns++;
		else counts.foldedOut++;
		if (result.tabled) counts.tabled++;
		if (state.actions.some((a) => a.allIn) || state.posts.some((p) => p.allIn)) counts.allIns++;
		if (result.pots.length > 1) counts.sidePots++;
		counts.maxPots = Math.max(counts.maxPots, result.pots.length);
		for (const pot of result.pots) {
			if (pot.winners.length > 1) {
				counts.splitPots++;
				if (pot.amount % pot.winners.length) counts.oddChips++;
			}
		}
		if (result.uncalled) counts.uncalled++;
	}
	counts.seconds = Math.round((performance.now() - t0) / 100) / 10;
	report.push(counts);
	console.error(
		`${seats} seats: ${hands} hands, ${counts.showdowns} showdowns, ${counts.sidePots} with side pots, ${counts.allIns} with an all-in (${counts.seconds} s)`
	);
}
console.log(
	JSON.stringify(
		{
			fuzz: 'ok',
			seed,
			handsPerSeatCount: hands,
			seconds: Math.round((performance.now() - started) / 100) / 10,
			report
		},
		null,
		2
	)
);
