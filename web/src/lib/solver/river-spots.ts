// The reference river spots of P5.2 (docs/solver.md, "Reference river
// spots"): the spots B-6, B-11 and B-12 are measured on, and from which B-7
// picks at least ten for the independent cross-check (P5.3). They are
// benchmarks of the solver, not lesson spots: the ranges are written for
// FeltPrep (D-18) to be plausible for the line each spot names, and are shown
// with every result as assumptions.
//
// Player 0 is the big blind, out of position; player 1 is the button. Amounts
// are in chips, with the big blind 100 chips.

import { cards } from '../engine/cards.ts';
import type { Spot } from './postflop.ts';
import { parseRange } from './ranges.ts';

/** The line before the river, which the ranges stand for. */
export interface RiverLine {
	readonly id: string;
	readonly title: string;
	/** Chips in the pot at the start of the river, and behind each player. */
	readonly pot: number;
	readonly stack: number;
	/** The big blind's range, then the button's, in range notation (ranges.ts). */
	readonly ranges: readonly [string, string];
	/** Why the ranges look as they do. */
	readonly reasoning: string;
}

export interface RiverSizes {
	readonly id: string;
	readonly betSizes: readonly number[];
	readonly raiseSizes: readonly number[];
	readonly maxBets: number;
}

export interface ReferenceRiverSpot {
	readonly id: string;
	readonly board: string;
	readonly texture: string;
	readonly line: RiverLine;
	readonly sizes: RiverSizes;
}

const SINGLE_RAISED: RiverLine = {
	id: 'srp',
	title: 'Single-raised pot, 100 big blinds',
	pot: 500,
	stack: 9750,
	ranges: [
		'22-99, A9s-A2s, KTs-K2s, QTs-Q6s, JTs-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s-75s, 65s-64s, ' +
			'54s-53s, ATo-A2o, KJo-K8o, QJo-Q9o, JTo-J9o, T9o, 98o',
		'22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A7o+, A5o, KTo+, QTo+, JTo'
	],
	reasoning:
		'The button opened to 2.5 big blinds with about 45% of hands and the big blind called with ' +
		'the hands it does not re-raise: no pair above nines and no ace-jack or better. Both ranges ' +
		'are carried to the river whole, as if every earlier street was checked.'
};

const THREE_BET: RiverLine = {
	id: '3bp',
	title: 'Re-raised pot, 100 big blinds',
	pot: 2200,
	stack: 8900,
	ranges: [
		'99+, AJs+, KQs, AQo+, A5s-A4s, KTs, T9s, 87s, 76s',
		'QQ-22, AQs-ATs, KJs-KTs, QJs-QTs, JTs, T9s, 98s, 87s, AQo-AJo, KQo'
	],
	reasoning:
		'The big blind re-raised to 11 big blinds with strong hands and a few suited bluffs; the ' +
		'button called with pairs below kings and suited broadway hands, having raised again with ' +
		'aces and kings. The low stack-to-pot ratio (about 4) puts all-in within one bet.'
};

const SHORT: RiverLine = {
	id: 'short',
	title: 'Single-raised pot, 25 big blinds',
	pot: 500,
	stack: 2250,
	ranges: [
		'22-99, AJs-A2s, KQs-K7s, QJs-Q8s, JTs-J8s, T9s-T8s, 98s, 87s, 76s, AJo-A7o, KQo-KTo, ' +
			'QJo-QTo, JTo',
		'22+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, A8o+, KJo+, QJo'
	],
	reasoning:
		'At 25 big blinds the button opens a little tighter and the big blind calls with hands ' +
		'that play well for one more bet; the strongest hands of both went all-in before the flop.'
};

const WIDE: RiverLine = {
	id: 'wide',
	title: 'Min-raised pot, wide ranges, 100 big blinds',
	pot: 400,
	stack: 9800,
	ranges: [
		'22+, A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 85s+, 74s+, 63s+, 53s+, 43s, A2o+, K5o+, Q8o+, ' +
			'J8o+, T8o+, 98o, 87o, 76o:0.5',
		'22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o'
	],
	reasoning:
		'The button min-raised a wide range and the big blind called with most of its hands, ' +
		'getting a good price: the widest pair of ranges, close to every playable hand.'
};

const REFERENCE: RiverSizes = { id: 'z1', betSizes: [0.33, 0.75], raiseSizes: [1], maxBets: 3 };
const HALF: RiverSizes = { id: 'z2', betSizes: [0.5], raiseSizes: [], maxBets: 2 };
const OVERBET: RiverSizes = { id: 'z3', betSizes: [0.75, 1.5], raiseSizes: [0.75], maxBets: 2 };
const TWO_THIRDS: RiverSizes = { id: 'z4', betSizes: [0.66], raiseSizes: [1], maxBets: 3 };

const spot = (
	n: number,
	board: string,
	texture: string,
	line: RiverLine,
	sizes: RiverSizes
): ReferenceRiverSpot => ({
	id: `river-${String(n).padStart(2, '0')}`,
	board,
	texture,
	line,
	sizes
});

/** The reference river spots, in a fixed order. */
export const RIVER_SPOTS: readonly ReferenceRiverSpot[] = [
	spot(1, 'Ks 9d 5c 2h 7s', 'dry, king high (P5.1’s reference)', SINGLE_RAISED, REFERENCE),
	spot(2, 'Qc Qd 8s 4h 2c', 'paired queens, dry', SINGLE_RAISED, HALF),
	spot(3, 'Ah Th 6h 3c Jd', 'three hearts: a flush possible', SINGLE_RAISED, OVERBET),
	spot(4, '9c 8d 7s 6h 2c', 'four to a straight', SINGLE_RAISED, TWO_THIRDS),
	spot(5, '6s 5d 4c 9h Kd', 'low and connected, a king on the river', SINGLE_RAISED, REFERENCE),
	spot(6, 'Jc Jd 7c 7h 3s', 'two pairs on the board', SINGLE_RAISED, HALF),
	spot(7, 'Ac 8d 4s Kh 2d', 'ace and king high, dry', SINGLE_RAISED, OVERBET),
	spot(
		8,
		'Kd Qs Jc Th 3d',
		'broadway: any ace or nine makes a straight',
		SINGLE_RAISED,
		TWO_THIRDS
	),
	spot(9, '2h 7h 9h Jh 4c', 'four hearts', THREE_BET, TWO_THIRDS),
	spot(10, 'Tc 9c 3d 3s Ah', 'paired threes, an ace on the river', THREE_BET, HALF),
	spot(11, '8s 8d 8c 5h 2s', 'three eights on the board', THREE_BET, REFERENCE),
	spot(12, 'As Ks Qd Jd 5c', 'four broadway cards', THREE_BET, OVERBET),
	spot(13, '5h 4h 3d 2c Ks', 'four to a wheel', THREE_BET, HALF),
	spot(14, 'Td 7c 4s 2d 2h', 'dry and low, paired on the river', SHORT, HALF),
	spot(15, 'Qh Jh 9c 8d 3s', 'connected and high', SHORT, REFERENCE),
	spot(16, '7d 6d 2c As Td', 'two diamonds, an ace on the turn', SHORT, TWO_THIRDS),
	spot(17, 'Kc Kh 5s 5d Ks', 'a full house on the board', SHORT, OVERBET),
	spot(18, 'Ah 9s 5d 5c 5h', 'three fives on the board', WIDE, REFERENCE),
	spot(19, 'Js Ts 4h 3h 8c', 'connected, two pairs of suits', WIDE, OVERBET),
	spot(20, '4d 4s Kc 8h 8d', 'two low pairs on the board', WIDE, HALF)
];

/** The spot as the post-flop builder takes it. */
export function riverSpot(ref: ReferenceRiverSpot): Spot {
	return {
		board: cards(ref.board),
		pot: ref.line.pot,
		stack: ref.line.stack,
		bigBlind: 100,
		ranges: [parseRange(ref.line.ranges[0]), parseRange(ref.line.ranges[1])],
		betSizes: ref.sizes.betSizes,
		raiseSizes: ref.sizes.raiseSizes,
		maxBets: ref.sizes.maxBets
	};
}
