// FeltPrep's own hand-worked fixtures (P1.5), beside the 33 imported from
// RiverMind in rules.json. Two groups:
//
// - heads-up short-stack hands at 2 to 15 big blinds, the stacks FeltPrep's
//   jam-or-fold game is played at, with both button positions, each seat
//   winning, a tie and a call for less than the jam; and one hand below that
//   range;
// - hands for the rules in docs/rules.md that no imported fixture names, so
//   every rule FeltPrep keeps has a fixture (Gate A's rules trace).
//
// Every expected number below is worked out in the comment above it from the
// numbered rules, never copied from the engine. Blinds are 50 and 100 unless
// a fixture says otherwise. Seats are S0 to S8.
//
// A script is the format of testing.ts (`S0:r1000 S1:f`), plus assertion
// tokens: `S1:?f,c900` checks that S1 is to act and that the legal actions
// are exactly fold and a call of 900 chips, without acting. In a menu, f is
// fold, k check, c<n> a call adding n chips, b<min>-<max> a bet and
// r<min>-<max> a raise, as street totals (rule 7.7).

import { initialButton, nextButton, seatsDealtIn } from './seating.ts';
import {
	apply,
	handConfig,
	legalActions,
	startHand,
	type HandState,
	type LegalActions
} from './state.ts';
import { deal, parseAction } from './testing.ts';

export interface HandFixture {
	readonly name: string;
	/** The numbered rules of docs/rules.md this hand demonstrates. */
	readonly rules: readonly string[];
	readonly blinds?: readonly [number, number];
	readonly stacks: readonly (number | null)[];
	/**
	 * The button: a seat; `{ previous }` to move it from the previous hand's
	 * button by rule 5.2; or `{ draw }` to draw it by rule 5.1 from a generator
	 * whose every draw is `draw`.
	 */
	readonly button: number | { readonly previous: number } | { readonly draw: number };
	/**
	 * Cards: arranged hole cards (by seat) and board, with every other card
	 * filled in from the rest of the deck; or `'generator'` to shuffle with a
	 * generator whose every draw is 0 (rule 1.1).
	 */
	readonly deal:
		{ readonly holes: Readonly<Record<number, string>>; readonly board: string } | 'generator';
	readonly script: string;
	readonly expect: {
		readonly button?: number;
		readonly smallBlind?: number;
		readonly bigBlind?: number;
		/** The first cards of the deck, in order (rules 1.1 to 1.4). */
		readonly deckTop?: string;
		readonly holes?: Readonly<Record<number, string>>;
		/** The board as dealt by the end of the hand (rule 6.5 deals no more). */
		readonly board?: string;
		readonly final: readonly (number | null)[];
		/** Each pot's amount and its winners, clockwise from left of the button. */
		readonly pots: readonly (readonly [number, readonly number[]])[];
		readonly uncalled: readonly [number, number] | null;
		readonly shown: readonly number[];
		readonly mucked: readonly number[];
		readonly tabled: boolean;
	};
}

export const HAND_FIXTURES: readonly HandFixture[] = [
	// ── Heads-up, 2 to 15 big blinds ───────────────────────────────────────

	// S0 is the button and posts the small blind, 50; S1 posts the big blind,
	// 100 (rule 4.1). S0 acts first (4.2): fold, call 50 more (7.2), or raise
	// to at least 200, one big blind over the big blind (7.4), and at most all
	// 1,000 chips (7.5). S0 raises all-in to 1,000. S1 has 900 behind, exactly
	// the call, so cannot raise (7.8): fold or call 900. S1 folds and S0 wins
	// at once with no board dealt (6.5) and nothing shown (12.4). S0 put in
	// 1,000 and S1 100, so 900 nobody called goes back to S0 (9.1), and the pot
	// is 100 + 100 = 200. S0: 1,000 − 1,000 + 900 + 200 = 1,100. S1: 900.
	{
		name: '10 bb: the button jams and the big blind folds',
		rules: ['4.1', '4.2', '6.5', '7.1', '7.2', '7.4', '7.5', '7.7', '7.8', '9.1', '12.4'],
		stacks: [1000, 1000],
		button: 0,
		deal: { holes: {}, board: '' },
		script: 'S0:?f,c50,r200-1000 S0:r1000 S1:?f,c900 S1:f',
		expect: {
			smallBlind: 0,
			bigBlind: 1,
			board: '',
			final: [1100, 900],
			pots: [[200, [0]]],
			uncalled: [0, 900],
			shown: [],
			mucked: [],
			tabled: false
		}
	},

	// S0 (button) jams 1,000 and S1 calls 900 more; both are all-in, so the
	// board is dealt with no more betting (6.4) and both hands are tabled,
	// clockwise from the player left of the button: S1, then S0 (12.1). S0's
	// pair of queens beats S1's jack high on 2c 5d 8s Kh 4c (no straight, no
	// flush). S0 wins the pot of 2,000 (11.1). Final: 2,000 and 0.
	{
		name: '10 bb: jam and call, the button wins',
		rules: ['4.2', '6.4', '10.1', '11.1', '12.1'],
		stacks: [1000, 1000],
		button: 0,
		deal: { holes: { 0: 'Qs Qh', 1: 'Jd Tc' }, board: '2c 5d 8s Kh 4c' },
		script: 'S0:r1000 S1:?f,c900 S1:c',
		expect: {
			final: [2000, 0],
			pots: [[2000, [0]]],
			uncalled: null,
			shown: [1, 0],
			mucked: [],
			tabled: true
		}
	},

	// As above, but S1, the big blind, wins: a pair of eights against ace high
	// on 2s 4h Td Js 3c (S0's A-4-3-2 has no five for a straight). Final: 0 and
	// 2,000.
	{
		name: '10 bb: jam and call, the big blind wins',
		rules: ['4.2', '6.4', '10.1', '11.1', '12.1'],
		stacks: [1000, 1000],
		button: 0,
		deal: { holes: { 0: 'Ac 7d', 1: '8h 8c' }, board: '2s 4h Td Js 3c' },
		script: 'S0:r1000 S1:?f,c900 S1:c',
		expect: {
			final: [0, 2000],
			pots: [[2000, [1]]],
			uncalled: null,
			shown: [1, 0],
			mucked: [],
			tabled: true
		}
	},

	// The other button position: S1 is the button and small blind, S0 the big
	// blind (4.1). S1 jams 1,500 and S0 calls 1,400 more. On Ks Qs Jh Td 9c
	// each player's ace makes the same ace-high straight (10.1), so the pot of
	// 3,000 splits equally (11.1). Two equal contributions make an even pot, so
	// there is no odd chip: 1,500 each, winners listed from the seat left of
	// the button, S0 then S1. Hands are tabled S0 then S1 (12.1).
	{
		name: '15 bb: a tied showdown splits the pot',
		rules: ['4.1', '6.4', '10.1', '11.1', '12.1'],
		stacks: [1500, 1500],
		button: 1,
		deal: { holes: { 0: 'Ac 2d', 1: 'Ah 3d' }, board: 'Ks Qs Jh Td 9c' },
		script: 'S1:r1500 S0:?f,c1400 S0:c',
		expect: {
			smallBlind: 1,
			bigBlind: 0,
			final: [1500, 1500],
			pots: [[3000, [0, 1]]],
			uncalled: null,
			shown: [0, 1],
			mucked: [],
			tabled: true
		}
	},

	// S1 (button, 1,500) jams; S0 (big blind, 600) can only call all-in for
	// 500 more, less than the 1,400 owed (7.2), and cannot raise (7.8). S0 put
	// in 600 and S1 1,500, so S1's 900 that nobody called goes back (9.1). The
	// pot is 600 + 600 = 1,200, and S0's nines beat ace-king high on
	// 2c 7h 4s Jc 3h. S0: 1,200. S1: 1,500 − 1,500 + 900 = 900.
	{
		name: '6 bb calls a 15 bb jam all-in for less and the excess goes back',
		rules: ['6.4', '7.2', '7.8', '9.1', '12.1'],
		stacks: [600, 1500],
		button: 1,
		deal: { holes: { 0: '9h 9s', 1: 'Ad Kd' }, board: '2c 7h 4s Jc 3h' },
		script: 'S1:?f,c50,r200-1500 S1:r1500 S0:?f,c500 S0:c',
		expect: {
			final: [1200, 900],
			pots: [[1200, [0]]],
			uncalled: [1, 900],
			shown: [0, 1],
			mucked: [],
			tabled: true
		}
	},

	// S1 (button) calls 50 to complete the small blind. S0, the big blind,
	// has the option (3.4): check, or raise to at least 200 and at most 1,200.
	// S0 raises all-in to 1,200. S1 has 1,100 behind, exactly the call, and
	// cannot raise (7.8). S1 folds; nothing is shown (12.4) and no board is
	// dealt (6.5). S0 put in 1,200 and S1 100: 1,100 goes back to S0 (9.1) and
	// S0 wins the 200 pot. S0: 1,200 − 1,200 + 1,100 + 200 = 1,300. S1: 1,100.
	{
		name: '12 bb: the button limps, the big blind jams and the button folds',
		rules: ['3.4', '4.2', '6.5', '7.8', '9.1', '12.4'],
		stacks: [1200, 1200],
		button: 1,
		deal: { holes: {}, board: '' },
		script: 'S1:?f,c50,r200-1200 S1:c S0:?k,r200-1200 S0:r1200 S1:?f,c1100 S1:f',
		expect: {
			board: '',
			final: [1300, 1100],
			pots: [[200, [0]]],
			uncalled: [0, 1100],
			shown: [],
			mucked: [],
			tabled: false
		}
	},

	// Pre-flop: S0 (button) calls 50, S1 checks its option. On the flop the
	// big blind acts first (4.2, 6.2): check, or bet at least one big blind
	// (7.3) up to its 1,400 behind. S1 checks; S0 bets the minimum 100. S1 may
	// raise to at least 200 (100 + the 100 increment, 7.4) and check-raises
	// all-in to 1,400. S0 has 1,300 behind, exactly the call, so may only call
	// or fold (7.8), and folds. Only the flop was dealt (6.5). S1 put in
	// 100 + 1,400 = 1,500 and S0 100 + 100 = 200, so 1,300 goes back to S1
	// (9.1) and S1 wins 400. S0: 1,500 − 200 = 1,300. S1: 1,500 − 200 + 400 =
	// 1,700. The round's end each street follows 6.3.
	{
		name: '15 bb: limp, then a check-raise all-in over the minimum bet on the flop',
		rules: ['4.2', '6.1', '6.2', '6.3', '6.5', '7.3', '7.4', '7.8', '9.1', '12.4'],
		stacks: [1500, 1500],
		button: 0,
		deal: { holes: {}, board: 'Kd 8s 3c 6h 2d' },
		script:
			'S0:?f,c50,r200-1500 S0:c S1:?k,r200-1500 S1:k ' +
			'S1:?k,b100-1400 S1:k S0:?k,b100-1400 S0:b100 S1:?f,c100,r200-1400 S1:r1400 ' +
			'S0:?f,c1300 S0:f',
		expect: {
			board: 'Kd 8s 3c',
			final: [1300, 1700],
			pots: [[400, [1]]],
			uncalled: [1, 1300],
			shown: [],
			mucked: [],
			tabled: false
		}
	},

	// Two big blinds each. S1 (button) posts 50 and has 150 behind: the
	// minimum raise, to 200, is also all its chips (7.4, 7.5), so the raise
	// range is 200 to 200 (7.7). S1 raises all-in; S0 (big blind, 100 behind)
	// calls 100. Sixes beat fives on Ah Kc 9d 2s 3h (S0's A-2-3-5 has no four).
	// S1 wins 400; tabled from left of the button, S0 then S1 (12.1).
	{
		name: '2 bb: the minimum raise is all-in',
		rules: ['6.4', '7.4', '7.5', '7.7', '12.1'],
		stacks: [200, 200],
		button: 1,
		deal: { holes: { 0: '5h 5d', 1: '6c 6s' }, board: 'Ah Kc 9d 2s 3h' },
		script: 'S1:?f,c50,r200-200 S1:r200 S0:?f,c100 S0:c',
		expect: {
			final: [0, 400],
			pots: [[400, [1]]],
			uncalled: null,
			shown: [0, 1],
			mucked: [],
			tabled: true
		}
	},

	// S0 (button) jams 800 and S1 calls. On 3s 4d 5h 9c Qs, S0's ace plays low
	// for the straight 5-4-3-2-A (10.1), which beats S1's kings. S0 wins 1,600.
	// Tabled S1 then S0 (12.1).
	{
		name: '8 bb: the ace plays low in a five-high straight',
		rules: ['10.1', '10.2', '12.1'],
		stacks: [800, 800],
		button: 0,
		deal: { holes: { 0: 'Ah 2c', 1: 'Kd Kc' }, board: '3s 4d 5h 9c Qs' },
		script: 'S0:r800 S1:c',
		expect: {
			final: [1600, 0],
			pots: [[1600, [0]]],
			uncalled: null,
			shown: [1, 0],
			mucked: [],
			tabled: true
		}
	},

	// Below the range: S0 (button) has 40, less than the small blind, and is
	// all-in on the post (3.3); S1 posts 100. Nobody can act: S1 has matched
	// the bet and S0 has no chips (6.4), so the board is dealt and both hands
	// are tabled, S1 first as the player left of the button (12.1). S1's 60
	// that S0 could not match goes back (9.1), leaving a pot of 40 + 40 = 80.
	// S0's three sevens on 7s 7h 3c Jd 5c win it. S0: 80. S1: 1,000 − 100 + 60
	// = 960.
	{
		name: 'below 1 bb: a button short of the small blind is all-in on the post',
		rules: ['3.3', '4.1', '6.4', '9.1', '12.1'],
		stacks: [40, 1000],
		button: 0,
		deal: { holes: { 0: '7c 2d', 1: 'Kh 9s' }, board: '7s 7h 3c Jd 5c' },
		script: '',
		expect: {
			final: [80, 960],
			pots: [[80, [0]]],
			uncalled: [1, 60],
			shown: [1, 0],
			mucked: [],
			tabled: true
		}
	},

	// ── Rules no imported fixture names ────────────────────────────────────

	// The caller's generator shuffles (1.1). `shuffle` swaps from the end
	// (Fisher-Yates): for i from 51 down to 1 it swaps cards i and below(i+1).
	// With every draw 0, each step swaps card i into position 0 and the card
	// there into position i, which leaves position 0 holding 1 and position k
	// holding k + 1 for k up to 50, with 0 last. Cards are rank × 4 + suit
	// (c d h s), so the deck starts 2d 2h 2s 3c 3d 3h 3s 4c 4d 4h 4s 5c.
	// S1 is the button, so S0 is player 0 and gets the first card (1.2, 4.3):
	// S0 holds d[0] and d[2] (1.4 with n = 2), 2d 2s; S1 holds d[1] and d[3],
	// 2h 3c. d[4] is burned, the flop is d[5..7] = 3h 3s 4c; d[8] is burned,
	// the turn is d[9] = 4h; d[10] is burned, the river is d[11] = 5c (1.3).
	// S1 calls, S0 checks, and both check every street, S0 first after the
	// flop (4.2). S1's 3c makes threes full of fours (10.1, 10.2), beating
	// S0's two pair. The river was checked, so S0, left of the button, shows
	// first; S1 beats it and shows (12.2, 12.3). S1 wins the 200 pot: 900 and
	// 1,100.
	{
		name: 'dealt from the caller’s generator, cards land by deck position',
		rules: ['1.1', '1.2', '1.3', '1.4', '4.3', '10.1', '10.2', '12.2', '12.3'],
		stacks: [1000, 1000],
		button: 1,
		deal: 'generator',
		script: 'S1:c S0:k S0:k S1:k S0:k S1:k S0:k S1:k',
		expect: {
			deckTop: '2d 2h 2s 3c 3d 3h 3s 4c 4d 4h 4s 5c',
			holes: { 0: '2d 2s', 1: '2h 3c' },
			board: '3h 3s 4c 4h 5c',
			final: [900, 1100],
			pots: [[200, [1]]],
			uncalled: null,
			shown: [0, 1],
			mucked: [],
			tabled: false
		}
	},

	// A nine-seat table with players in S1, S4 and S7 only, all dealt in
	// (2.1). The previous button was S7; the button moves to the first player
	// dealt in clockwise from it, skipping empty S8 and S0, so S1 (5.2). The
	// small blind is S4 and the big blind S7 (3.1). Pre-flop S1 acts first,
	// left of the big blind (6.2): it calls 100, S4 completes, and S7 checks
	// its option, which ends the round (6.3). After the flop S4 acts first, as
	// the first player left of the button (6.2): S4 checks, S7 bets 300, S1
	// folds and S4 calls. Turn and river are checked, S4 first. The four
	// rounds are 6.1's. At showdown S4, first left of the button, shows its
	// queens; S7's jacks cannot win and are mucked (12.2, 12.3); S1 folded and
	// shows nothing (12.4). Pot: 100 + 400 + 400 = 900. S1: 900. S4: 1,000 −
	// 400 + 900 = 1,500. S7: 600.
	{
		name: 'three players at nine seats: the button moves and the blinds follow',
		rules: ['2.1', '3.1', '5.2', '6.1', '6.2', '6.3', '12.2', '12.3', '12.4'],
		stacks: [null, 1000, null, null, 1000, null, null, 1000, null],
		button: { previous: 7 },
		deal: { holes: { 4: 'Qd Qc', 7: 'Jh Js' }, board: '2h 6c 9s Kd 4h' },
		script:
			'S1:?f,c100,r200-1000 S1:c S4:c S7:?k,r200-1000 S7:k ' +
			'S4:k S7:b300 S1:f S4:c S4:k S7:k S4:k S7:k',
		expect: {
			button: 1,
			smallBlind: 4,
			bigBlind: 7,
			final: [null, 900, null, null, 1500, null, null, 600, null],
			pots: [[900, [4]]],
			uncalled: null,
			shown: [4],
			mucked: [7],
			tabled: false
		}
	},

	// Rule 5's “to heads-up” example: players remain in S1 and S3 of six
	// seats, and the previous button was S1. The button moves to S3 (5.2),
	// and with two players dealt in the heads-up rules apply (2.1, 5.3): S3
	// posts the small blind and S1 the big blind (4.1). S3 folds. S1 put in
	// 100 and S3 50, so 50 goes back to S1 (9.1), which wins the 100 pot at
	// once (6.5) without showing (12.4). S1: 1,050. S3: 950.
	{
		name: 'from three players to two: the button moves and heads-up rules apply',
		rules: ['2.1', '4.1', '5.2', '5.3', '6.5', '9.1', '12.4'],
		stacks: [null, 1000, null, 1000, null, null],
		button: { previous: 1 },
		deal: { holes: {}, board: '' },
		script: 'S3:?f,c50,r200-1000 S3:f',
		expect: {
			button: 3,
			smallBlind: 3,
			bigBlind: 1,
			final: [null, 1050, null, 950, null, null],
			pots: [[100, [1]]],
			uncalled: [1, 50],
			shown: [],
			mucked: [],
			tabled: false
		}
	},

	// The first hand's button is drawn from the table's generator (5.1):
	// `initialButton` sorts the players dealt in, S0, S2 and S5, and takes the
	// one at the drawn index, 1: S2. Clockwise from S2 the small blind is S5
	// and the big blind S0 (3.1). S2 acts first, left of the big blind (6.2),
	// and folds; S5 folds. S0 put in 100 and S5 50, so 50 goes back to S0
	// (9.1), which wins 100 (6.5). S0: 1,050. S2: 1,000. S5: 950.
	{
		name: 'the first button is drawn from the table’s generator',
		rules: ['3.1', '5.1', '6.2', '6.5', '9.1'],
		stacks: [1000, null, 1000, null, null, 1000],
		button: { draw: 1 },
		deal: { holes: {}, board: '' },
		script: 'S2:f S5:f',
		expect: {
			button: 2,
			smallBlind: 5,
			bigBlind: 0,
			final: [1050, null, 1000, null, null, 950],
			pots: [[100, [0]]],
			uncalled: [0, 50],
			shown: [],
			mucked: [],
			tabled: false
		}
	},

	// S0 is the button, S1 the small blind and S2 (250 chips) the big blind.
	// Everyone calls pre-flop and S2 checks: 100 each. On the flop S1 bets
	// 100. S2 has 150 behind: a full raise would be to 200, so its only raise
	// is all-in to 150 (7.7), an incomplete raise of 50 that leaves the
	// minimum increment at 100 (7.6). S0 has not acted on the flop, so it may
	// raise (8.3), to at least 150 + 100 = 250 and at most its 4,900; it
	// calls 150. Back at S1, the bet rose only 50 over the 100 it acted on,
	// less than a full raise, so S1 may only call or fold (8.1); it calls 50.
	// Each street's round ends when everyone still able to act has matched
	// (6.3). S0 and S1 check the turn and river, S1 first. Everyone put in
	// 250, so there is one pot of 750. S1, first left of the button, shows a
	// pair of aces; S2's sevens and then S0's queens cannot beat it and are
	// mucked (12.2, 12.3). S0: 4,750. S1: 5,000 − 250 + 750 = 5,500. S2: 0.
	{
		name: 'an all-in for less is an incomplete raise; a player yet to act may still raise',
		rules: ['6.3', '7.6', '7.7', '8.1', '8.3', '12.2', '12.3'],
		stacks: [5000, 5000, 250],
		button: 0,
		deal: { holes: { 0: 'Qc Qd', 1: 'Ah Kh', 2: '7s 7c' }, board: 'Ad 9c 4s 2h Jd' },
		script:
			'S0:c S1:c S2:k ' +
			'S1:?k,b100-4900 S1:b100 S2:?f,c100,r150-150 S2:r150 S0:?f,c150,r250-4900 S0:c ' +
			'S1:?f,c50 S1:c S1:k S0:k S1:k S0:k',
		expect: {
			final: [4750, 5500, 0],
			pots: [[750, [1]]],
			uncalled: null,
			shown: [1],
			mucked: [2, 0],
			tabled: false
		}
	}
];

/** The legal actions in the menu form of assertion tokens. */
export function menu(legal: LegalActions): string {
	const parts: string[] = [];
	if (legal.canFold) parts.push('f');
	if (legal.canCheck) parts.push('k');
	if (legal.call > 0) parts.push(`c${legal.call}`);
	if (legal.raiseKind !== null) {
		parts.push(`${legal.raiseKind === 'bet' ? 'b' : 'r'}${legal.minTo}-${legal.maxTo}`);
	}
	return parts.join(',');
}

/** The button a fixture plays with, by rule 5.1, 5.2 or as given. */
export function fixtureButton(fixture: HandFixture): number {
	const { button, stacks } = fixture;
	if (typeof button === 'number') return button;
	const dealtIn = seatsDealtIn(stacks);
	if ('previous' in button) return nextButton(button.previous, dealtIn, stacks.length);
	return initialButton(dealtIn, {
		below(bound) {
			if (button.draw >= bound) throw new RangeError('the draw is out of range');
			return button.draw;
		}
	});
}

/**
 * Every state of a fixture, from the deal to the end of its script, checking
 * the seat to act before each token and the legal actions at each `?` token.
 */
export function fixtureStates(fixture: HandFixture): HandState[] {
	const [small, big] = fixture.blinds ?? [50, 100];
	const config = handConfig(small, big);
	const button = fixtureButton(fixture);
	let state =
		fixture.deal === 'generator'
			? startHand(config, fixture.stacks, button, { rng: { below: () => 0 } })
			: deal(fixture.stacks, button, fixture.deal.holes, fixture.deal.board, config);
	const states = [state];
	for (const token of fixture.script.split(/\s+/).filter(Boolean)) {
		const [seatText, actionText] = token.split(':');
		const seat = Number(seatText.replace(/^S/, ''));
		if (state.toAct !== seat) {
			throw new Error(`${fixture.name}: expected S${seat} to act at ${token}, not ${state.toAct}`);
		}
		if (actionText.startsWith('?')) {
			const found = menu(legalActions(state));
			if (found !== actionText.slice(1)) {
				throw new Error(`${fixture.name}: at ${token} the legal actions are ${found}`);
			}
			continue;
		}
		state = apply(state, parseAction(state, actionText));
		states.push(state);
	}
	return states;
}
