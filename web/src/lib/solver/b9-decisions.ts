// B-9's fixed decisions (BUILD.md, Gate B): each with the verdict derived by
// hand, outside the code under test, and the bound or value of its loss.
// grading-b9.spec.ts grades every one from both seats; a change in any
// verdict or loss fails the gate.
//
// Jam-or-fold bounds use e = 0.77501, AA’s lowest all-in equity against any
// class (65s), read from the published exact table (fixtures/irving-exact.txt;
// the test recomputes it from that file, not from FeltPrep's table). Against
// any calling range a jam with AA is worth at least min(+1, 2S e - S): +1 when
// the big blind folds, and at least 2S e - S when it calls. For S ≥ 2 that is
// at least 1, so folding AA on the button loses at least 1 - (-0.5) = 1.5, the
// whole 1.5 pot: a mistake. Facing a jam, calling with AA is worth at least
// 2S e - S and folding -1, so folding loses at least 2S e - S + 1.
//
// River decisions use the polarized river game of B-3 with pot 1, bet 1,
// three nut hands, three air hands and two bluff-catchers, whose equilibrium
// (closed form) calls half the time and bets half the air:
//   nuts:   bet 1/2 x 1.5 + 1/2 x 0.5 = 1.0, check 0.5   -> checking loses 0.5
//   air:    bet 1/2 x -1.5 + 1/2 x 0.5 = -0.5, check -0.5 -> no loss either way
//   caller: facing a bet the range is 2/3 nuts and 1/3 air:
//           call 2/3 x -1.5 + 1/3 x 1.5 = -0.5, fold -0.5 -> no loss either way

import type { Band, NotGradedReason } from '../spots/types.ts';

export interface JamOrFoldCase {
	readonly game: 'jam-or-fold';
	readonly name: string;
	readonly stack: number;
	readonly seat: 'button' | 'big-blind';
	readonly hand: string;
	readonly action: 'fold' | 'jam' | 'call';
	readonly band: Band;
	/** The loss is at least this, in big blinds; the formula is in its name. */
	readonly lossAtLeast: (e: number) => number;
	readonly lossAtMost: number;
}

export interface RiverCase {
	readonly game: 'river';
	readonly name: string;
	readonly seat: 'bettor' | 'caller';
	readonly hand: string;
	readonly action: string;
	readonly band: Band;
	readonly loss: number;
}

export interface OutsideCase {
	readonly game: 'jam-or-fold-hand';
	readonly name: string;
	/** Stacks in chips at blinds of 50 and 100, with the button's seat. */
	readonly stacks: readonly number[];
	readonly button: number;
	readonly ante?: number;
	/** Engine actions before the graded one, as testing.ts scripts ("S0:c"). */
	readonly before: string;
	readonly action: string;
	readonly reason: NotGradedReason;
}

export const JAM_OR_FOLD_CASES: readonly JamOrFoldCase[] = [
	...[2, 10, 15].flatMap((stack): JamOrFoldCase[] => [
		{
			game: 'jam-or-fold',
			name: `${stack} bb button folds AA: loses at least 1.5`,
			stack,
			seat: 'button',
			hand: 'AA',
			action: 'fold',
			band: 'mistake',
			lossAtLeast: () => 1.5,
			lossAtMost: Infinity
		},
		{
			game: 'jam-or-fold',
			name: `${stack} bb button jams AA: the best action`,
			stack,
			seat: 'button',
			hand: 'AA',
			action: 'jam',
			band: 'acceptable',
			lossAtLeast: () => 0,
			lossAtMost: 0
		},
		{
			game: 'jam-or-fold',
			name: `${stack} bb big blind folds AA to a jam: loses at least 2Se - S + 1`,
			stack,
			seat: 'big-blind',
			hand: 'AA',
			action: 'fold',
			band: 'mistake',
			lossAtLeast: (e) => 2 * stack * e - stack + 1,
			lossAtMost: Infinity
		},
		{
			game: 'jam-or-fold',
			name: `${stack} bb big blind calls a jam with AA: the best action`,
			stack,
			seat: 'big-blind',
			hand: 'AA',
			action: 'call',
			band: 'acceptable',
			lossAtLeast: () => 0,
			lossAtMost: 0
		}
	]),
	{
		// The published chart (HoldemResources, docs/benchmarks.md B-5) jams 72o
		// only at 1.6 big blinds or less, so folding it at 15 is the reference play.
		// Re-derived under D-20 (P3.8): the bound is now D-20's acceptable loss,
		// 0.5% of the 1.5 big blind pot, 0.0075 (it was 1%, 0.015). The verdict
		// is unchanged. So are the others: every other loss above is either 0 or
		// at least the whole pot, far from both boundaries under either bands.
		game: 'jam-or-fold',
		name: '15 bb button folds 72o: the published chart folds it',
		stack: 15,
		seat: 'button',
		hand: '72o',
		action: 'fold',
		band: 'acceptable',
		lossAtLeast: () => 0,
		lossAtMost: 0.0075
	}
];

export const RIVER_CASES: readonly RiverCase[] = [
	{
		game: 'river',
		name: 'nuts check',
		seat: 'bettor',
		hand: 'nuts-1',
		action: 'check',
		band: 'mistake',
		loss: 0.5
	},
	{
		game: 'river',
		name: 'nuts bet',
		seat: 'bettor',
		hand: 'nuts-2',
		action: 'bet',
		band: 'acceptable',
		loss: 0
	},
	{
		game: 'river',
		name: 'air bet',
		seat: 'bettor',
		hand: 'air-1',
		action: 'bet',
		band: 'acceptable',
		loss: 0
	},
	{
		game: 'river',
		name: 'air check',
		seat: 'bettor',
		hand: 'air-3',
		action: 'check',
		band: 'acceptable',
		loss: 0
	},
	{
		game: 'river',
		name: 'caller calls',
		seat: 'caller',
		hand: 'catcher-1',
		action: 'call',
		band: 'acceptable',
		loss: 0
	},
	{
		game: 'river',
		name: 'caller folds',
		seat: 'caller',
		hand: 'catcher-2',
		action: 'fold',
		band: 'acceptable',
		loss: 0
	}
];

export const OUTSIDE_CASES: readonly OutsideCase[] = [
	{
		game: 'jam-or-fold-hand',
		name: 'the button limps',
		stacks: [1_000, 1_000],
		button: 0,
		before: '',
		action: 'c',
		reason: 'action-outside-game'
	},
	{
		game: 'jam-or-fold-hand',
		name: 'the button raises to 3 big blinds',
		stacks: [1_000, 1_000],
		button: 1,
		before: '',
		action: 'r300',
		reason: 'action-outside-game'
	},
	{
		game: 'jam-or-fold-hand',
		name: 'the big blind checks after a limp',
		stacks: [1_000, 1_000],
		button: 0,
		before: 'S0:c',
		action: 'k',
		reason: 'outside-game'
	},
	{
		game: 'jam-or-fold-hand',
		name: 'the big blind faces a small raise',
		stacks: [1_000, 1_000],
		button: 1,
		before: 'S1:r300',
		action: 'c',
		reason: 'outside-game'
	},
	{
		game: 'jam-or-fold-hand',
		name: 'stacks of 20 big blinds',
		stacks: [2_000, 2_000],
		button: 0,
		before: '',
		action: 'f',
		reason: 'outside-game'
	},
	{
		game: 'jam-or-fold-hand',
		name: 'stacks of 10.5 big blinds',
		stacks: [1_050, 1_200],
		button: 1,
		before: '',
		action: 'a',
		reason: 'outside-game'
	},
	{
		game: 'jam-or-fold-hand',
		name: 'three players',
		stacks: [1_000, 1_000, 1_000],
		button: 0,
		before: '',
		action: 'f',
		reason: 'outside-game'
	},
	{
		game: 'jam-or-fold-hand',
		name: 'an ante',
		stacks: [1_000, 1_000],
		button: 0,
		ante: 10,
		before: '',
		action: 'f',
		reason: 'outside-game'
	}
];
