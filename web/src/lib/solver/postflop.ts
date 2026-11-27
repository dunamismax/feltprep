// Heads-up post-flop spots as games (P5.1, docs/solver.md). A spot states the
// board, the pot, the stacks, both ranges and the bet sizes; the builder plays
// those sizes through the engine, so every action and amount in the tree is
// one the engine offers, deals each turn and river card by chance, and deals
// each player the combinations of their range that the board leaves possible,
// with exact card removal between them.
//
// Player 0 is out of position (the big blind) and acts first on every street;
// player 1 is the button. Payoffs are player 0's, in chips, counted from the
// start of the spot minus half the pot already in it, which keeps the game
// zero-sum:
//   a showdown won (lost, tied)     +(pot/2 + c) (−(pot/2 + c), 0)
//   a fold after putting in c       −(pot/2 + c), and the reverse for the other player
// where c is what each player put in since the start of the spot.

import { cardStr } from '../engine/cards.ts';
import {
	Action,
	apply,
	handConfig,
	legalActions,
	potTotal,
	startHand,
	type HandState
} from '../engine/state.ts';
import {
	decision,
	terminal,
	type CardDeal,
	type Chance,
	type Game,
	type GameNode,
	type ShowdownTable
} from './game.ts';
import { showdownTable } from './removal.ts';

/** A two-card combination and how often the range holds it (0 to 1). */
export interface WeightedCombo {
	readonly cards: readonly [number, number];
	readonly weight: number;
}

export interface Spot {
	/** The board at the start of the spot: three, four or five cards. */
	readonly board: readonly number[];
	/** Chips in the pot at the start of the spot. */
	readonly pot: number;
	/** Chips each player has behind at the start of the spot (effective stack). */
	readonly stack: number;
	/** The big blind in chips, for the engine's minimum bet. */
	readonly bigBlind: number;
	/** Player 0's (out of position) and player 1's ranges. */
	readonly ranges: readonly [readonly WeightedCombo[], readonly WeightedCombo[]];
	/** Bet sizes as fractions of the pot, on every street; all-in is always offered too. */
	readonly betSizes: readonly number[];
	/** Raise sizes as fractions of the pot after calling; all-in is always offered too. */
	readonly raiseSizes: readonly number[];
	/** The most bets and raises on each street, the first bet included. */
	readonly maxBets: number;
}

/** A spot that starts on the river. */
export type RiverSpot = Spot;

/** The combinations of a range that the board leaves possible, with their weights. */
export function liveCombos(range: readonly WeightedCombo[], board: readonly number[]) {
	const dead = new Set(board);
	return range.filter((c) => c.weight > 0 && !dead.has(c.cards[0]) && !dead.has(c.cards[1]));
}

/**
 * A heads-up hand on the engine at the start of `spot`: blinds of half and one
 * big blind, both players with `stack` behind and `pot` in the middle, the
 * board dealt. `runout` is the spot's board followed by any turn and river
 * cards to put in the deck; later cards are placeholders, and the hole cards
 * always are, since the betting does not depend on them.
 */
export function spotStart(spot: Spot, runout: readonly number[] = spot.board): HandState {
	const bb = spot.bigBlind;
	const perPlayer = spot.pot / 2;
	if (!Number.isInteger(perPlayer) || perPlayer < bb) {
		throw new RangeError('the pot must be an even number of chips, at least two big blinds');
	}
	const street = spot.board.length - 2;
	if (street < 1 || street > 3) throw new RangeError('a spot starts on the flop, turn or river');
	// The deck puts the board where the engine deals it to two players: the
	// flop at 5 to 7, the turn at 9 and the river at 11 (burns between).
	const rest = Array.from({ length: 52 }, (_, c) => c).filter((c) => !runout.includes(c));
	const at = new Map<number, number>();
	[5, 6, 7, 9, 11].forEach((i, k) => {
		if (k < runout.length) at.set(i, runout[k]);
	});
	const deck: number[] = [];
	for (let i = 0; i < 52; i++) deck.push(at.get(i) ?? (rest.shift() as number));
	const chips = perPlayer + spot.stack;
	// Seat 0 is the big blind and seat 1 the button, which acts first before
	// the flop: it raises to half the pot, the big blind calls, and both check
	// every street before the spot's.
	let state = startHand(handConfig(bb / 2, bb), [chips, chips], 1, { deck });
	state = apply(state, perPlayer === bb ? Action.call() : Action.raiseTo(perPlayer));
	state = apply(state, perPlayer === bb ? Action.check() : Action.call());
	for (let i = 0; i < 2 * (street - 1); i++) state = apply(state, Action.check());
	if (state.street !== street || state.toAct !== 0) {
		throw new Error('the spot did not start as stated');
	}
	return state;
}

/** The start of a river spot. */
export const riverStart = (spot: Spot): HandState => spotStart(spot);

/** The actions the tree offers in `state`: the engine's, at the spot's sizes, without repeats. */
export function treeActions(spot: Spot, state: HandState): { name: string; action: Action }[] {
	const legal = legalActions(state);
	const out: { name: string; action: Action }[] = [];
	if (legal.canFold) out.push({ name: 'fold', action: Action.fold() });
	if (legal.canCheck) out.push({ name: 'check', action: Action.check() });
	else if (legal.call > 0) out.push({ name: 'call', action: Action.call() });
	const bets = state.actions.filter(
		(a) => a.street === state.street && (a.kind === 'bet' || a.kind === 'raise')
	).length;
	if (legal.raiseKind === null || bets >= spot.maxBets) return out;
	const pot = potTotal(state);
	const facing = Math.max(...state.streetBets);
	const mine = state.streetBets[state.toAct ?? 0];
	const sizes = legal.raiseKind === 'bet' ? spot.betSizes : spot.raiseSizes;
	const amounts = new Set<number>();
	for (const f of sizes) {
		// A raise of f times the pot after calling: call, then add f × (pot + call).
		const toCall = facing - mine;
		const to = facing + Math.round(f * (pot + toCall));
		amounts.add(Math.min(legal.maxTo, Math.max(legal.minTo, to)));
	}
	amounts.add(legal.maxTo);
	for (const to of [...amounts].sort((a, b) => a - b)) {
		const kind = legal.raiseKind;
		const allIn = to === legal.maxTo;
		out.push({ name: `${allIn ? 'allin' : kind}${to}`, action: Action.of(kind, to) });
	}
	return out;
}

export interface BuiltSpot {
	readonly game: Game;
	/**
	 * The engine state at every decision node, by its id, with the board as
	 * dealt on that branch (only when `keepStates` was set).
	 */
	readonly states: ReadonlyMap<string, HandState>;
	readonly combos: readonly [readonly WeightedCombo[], readonly WeightedCombo[]];
}

export interface BuildOptions {
	/** Keep the engine state of every decision (default true; large trees may skip it). */
	readonly keepStates?: boolean;
}

/** Build the game of a post-flop spot. */
export function buildSpot(spot: Spot, options: BuildOptions = {}): BuiltSpot {
	const keep = options.keepStates ?? true;
	const nb = spot.board.length;
	if (nb < 3 || nb > 5 || new Set(spot.board).size !== nb) {
		throw new RangeError('a spot has three to five different board cards');
	}
	const startStreet = nb - 2;
	const start = spotStart(spot);
	const combos = [
		liveCombos(spot.ranges[0], spot.board),
		liveCombos(spot.ranges[1], spot.board)
	] as const;
	const [c0, c1] = combos;
	const n0 = c0.length;
	const n1 = c1.length;

	// Exact card removal: two combinations that share a card are never dealt together.
	const prior = new Float64Array(n0 * n1);
	let total = 0;
	for (let i = 0; i < n0; i++) {
		const [a, b] = c0[i].cards;
		for (let j = 0; j < n1; j++) {
			const [x, y] = c1[j].cards;
			if (a === x || a === y || b === x || b === y) continue;
			const w = c0[i].weight * c1[j].weight;
			prior[i * n1 + j] = w;
			total += w;
		}
	}
	if (!(total > 0)) throw new RangeError('the ranges cannot be dealt together on this board');
	for (let i = 0; i < prior.length; i++) prior[i] /= total;
	const deal: CardDeal = {
		cards: [
			Uint8Array.from(c0.flatMap((c) => c.cards)),
			Uint8Array.from(c1.flatMap((c) => c.cards))
		],
		weights: [Float64Array.from(c0, (c) => c.weight), Float64Array.from(c1, (c) => c.weight)],
		norm: total
	};

	// One table of who beats whom per complete board, shared by its showdowns.
	const tables = new Map<string, ShowdownTable>();
	const tableFor = (runout: readonly number[]) => {
		const key = [...runout].sort((a, b) => a - b).join(',');
		let t = tables.get(key);
		if (!t) {
			t = showdownTable(deal, runout);
			tables.set(key, t);
		}
		return t;
	};
	const unseen = (runout: readonly number[]) =>
		Array.from({ length: 52 }, (_, c) => c).filter((c) => !runout.includes(c));
	// For a pair of hands, the next card is one of the 52 − board − 4 they do not see.
	const chance = (
		id: string,
		runout: readonly number[],
		child: (c: number, next: number[]) => GameNode
	): Chance => {
		const cards = unseen(runout);
		return {
			kind: 'chance',
			id,
			cards,
			children: cards.map((c) => child(c, [...runout, c])),
			weight: 1 / (52 - runout.length - 4)
		};
	};
	// All in before the river: deal the rest, then show down.
	const runOut = (runout: readonly number[], scale: number, path: string): GameNode =>
		runout.length === 5
			? { kind: 'showdown', table: tableFor(runout), scale }
			: chance(`${path}/deal`, runout, (c, next) => runOut(next, scale, `${path}/${cardStr(c)}`));

	const states = new Map<string, HandState>();
	const half = spot.pot / 2;
	const build = (
		state: HandState,
		runout: readonly number[],
		history: readonly Action[],
		path: string
	): GameNode => {
		if (state.result !== null) {
			if (state.folded[0] || state.folded[1]) {
				const loser = state.folded[0] ? 0 : 1;
				const lost = half + putIn(state, loser, startStreet);
				return terminal(loser === 0 ? -lost : lost);
			}
			const c = putIn(state, 0, startStreet);
			if (c !== putIn(state, 1, startStreet)) throw new Error('a showdown with unequal bets');
			return runOut(runout, half + c, path);
		}
		if (state.board.length > runout.length) {
			// The street closed: deal its card by chance, and replay the betting
			// on an engine whose deck holds that card.
			return chance(`${path}/deal`, runout, (c, next) => {
				let s = spotStart(spot, next);
				for (const a of history) s = apply(s, a);
				return build(s, next, history, `${path}/${cardStr(c)}`);
			});
		}
		const id = path || 'root';
		if (keep) states.set(id, state);
		const player = state.toAct as 0 | 1;
		const branches = treeActions(spot, state).map(
			({ name, action }) =>
				[
					name,
					build(apply(state, action), runout, [...history, action], `${path}/${name}`)
				] as const
		);
		return decision(id, player, branches);
	};
	const root = build(start, spot.board, [], '');
	const names = (c: readonly WeightedCombo[]) =>
		c.map((x) => cardStr(x.cards[0]) + cardStr(x.cards[1]));
	return {
		game: { types: [n0, n1], typeNames: [names(c0), names(c1)], prior, root, deal },
		states,
		combos
	};
}

/** Build the game of a river spot. */
export function buildRiver(spot: RiverSpot): BuiltSpot {
	if (spot.board.length !== 5) throw new RangeError('a river spot has five board cards');
	return buildSpot(spot);
}

/**
 * What `seat` put into the pot from `street` on and left there, from the
 * engine's record.
 */
function putIn(state: HandState, seat: number, street: number): number {
	const mine = state.actions.filter((a) => a.street >= street && a.seat === seat);
	const added = mine.reduce((sum, a) => sum + a.added, 0);
	// An uncalled bet comes back (rule 9.1): a player never loses more than the other matched.
	const other = state.actions
		.filter((a) => a.street >= street && a.seat !== seat)
		.reduce((sum, a) => sum + a.added, 0);
	return state.folded[seat] ? added : Math.min(added, other);
}
