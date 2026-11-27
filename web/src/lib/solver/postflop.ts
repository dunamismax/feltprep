// Heads-up post-flop spots as games (P5.1, docs/solver.md). A spot states the
// board, the pot, the stacks, both ranges and the bet sizes; the builder plays
// those sizes through the engine, so every action and amount in the tree is
// one the engine offers, and deals each player the combinations of their
// range that the board leaves possible, with exact card removal between them.
//
// Player 0 is out of position (the big blind) and acts first; player 1 is the
// button. Payoffs are player 0's, in chips, counted from the start of the
// street minus half the pot already in it, which keeps the game zero-sum:
//   a showdown won (lost, tied)     +(pot/2 + c) (−(pot/2 + c), 0)
//   a fold after putting in c here  −(pot/2 + c), and the reverse for the other player
// where c is what each player put in on this street.

import { cardStr } from '../engine/cards.ts';
import { evaluate } from '../engine/evaluator.ts';
import {
	Action,
	apply,
	handConfig,
	legalActions,
	potTotal,
	startHand,
	type HandState
} from '../engine/state.ts';
import { decision, terminal, type Game, type GameNode } from './game.ts';

/** A two-card combination and how often the range holds it (0 to 1). */
export interface WeightedCombo {
	readonly cards: readonly [number, number];
	readonly weight: number;
}

export interface RiverSpot {
	/** Five board cards. */
	readonly board: readonly number[];
	/** Chips in the pot at the start of the river. */
	readonly pot: number;
	/** Chips each player has behind at the start of the river (effective stack). */
	readonly stack: number;
	/** The big blind in chips, for the engine's minimum bet. */
	readonly bigBlind: number;
	/** Player 0's (out of position) and player 1's ranges. */
	readonly ranges: readonly [readonly WeightedCombo[], readonly WeightedCombo[]];
	/** Bet sizes as fractions of the pot; all-in is always offered too. */
	readonly betSizes: readonly number[];
	/** Raise sizes as fractions of the pot after calling; all-in is always offered too. */
	readonly raiseSizes: readonly number[];
	/** The most bets and raises on the street, the first bet included. */
	readonly maxBets: number;
}

/** The combinations of a range that the board leaves possible, with their weights. */
export function liveCombos(range: readonly WeightedCombo[], board: readonly number[]) {
	const dead = new Set(board);
	return range.filter((c) => c.weight > 0 && !dead.has(c.cards[0]) && !dead.has(c.cards[1]));
}

/**
 * A heads-up hand on the engine at the start of the river of `spot`: blinds
 * of half and one big blind, both players with `stack` behind and `pot` in the
 * middle, the board dealt. The hole cards are placeholders; the betting does
 * not depend on them.
 */
export function riverStart(spot: RiverSpot): HandState {
	const bb = spot.bigBlind;
	const perPlayer = spot.pot / 2;
	if (!Number.isInteger(perPlayer) || perPlayer < bb) {
		throw new RangeError('the pot must be an even number of chips, at least two big blinds');
	}
	// The deck puts the board where the engine deals it to two players: the
	// flop at 5 to 7, the turn at 9 and the river at 11 (burns between).
	const rest = Array.from({ length: 52 }, (_, c) => c).filter((c) => !spot.board.includes(c));
	const deck: number[] = [];
	const at = new Map([
		[5, spot.board[0]],
		[6, spot.board[1]],
		[7, spot.board[2]],
		[9, spot.board[3]],
		[11, spot.board[4]]
	]);
	for (let i = 0; i < 52; i++) deck.push(at.get(i) ?? (rest.shift() as number));
	const chips = perPlayer + spot.stack;
	// Seat 0 is the big blind and seat 1 the button, which acts first before
	// the flop: it raises to half the pot, the big blind calls, and both check
	// the flop and the turn.
	let state = startHand(handConfig(bb / 2, bb), [chips, chips], 1, { deck });
	state = apply(state, perPlayer === bb ? Action.call() : Action.raiseTo(perPlayer));
	state = apply(state, perPlayer === bb ? Action.check() : Action.call());
	for (let i = 0; i < 4; i++) state = apply(state, Action.check());
	if (state.street !== 3 || state.toAct !== 0) throw new Error('the river did not start as stated');
	return state;
}

/** The actions the tree offers in `state`: the engine's, at the spot's sizes, without repeats. */
export function treeActions(spot: RiverSpot, state: HandState): { name: string; action: Action }[] {
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
	/** The engine state at every decision node, by its id. */
	readonly states: ReadonlyMap<string, HandState>;
	readonly combos: readonly [readonly WeightedCombo[], readonly WeightedCombo[]];
}

/** Build the river game of `spot`. */
export function buildRiver(spot: RiverSpot): BuiltSpot {
	if (spot.board.length !== 5 || new Set(spot.board).size !== 5) {
		throw new RangeError('a river spot has five different board cards');
	}
	const start = riverStart(spot);
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

	// Who wins each showdown: +1, 0 or −1 for player 0 (lower rank is better).
	const rank = (c: WeightedCombo) => evaluate([...c.cards, ...spot.board]);
	const r0 = c0.map(rank);
	const r1 = c1.map(rank);
	const wins = new Float64Array(n0 * n1);
	for (let i = 0; i < n0; i++) {
		for (let j = 0; j < n1; j++) wins[i * n1 + j] = Math.sign(r1[j] - r0[i]);
	}

	const states = new Map<string, HandState>();
	const half = spot.pot / 2;
	const build = (state: HandState, path: string): GameNode => {
		if (state.result !== null) {
			if (state.folded[0] || state.folded[1]) {
				const loser = state.folded[0] ? 0 : 1;
				const lost = half + putIn(state, loser);
				return terminal(loser === 0 ? -lost : lost);
			}
			const c = putIn(state, 0);
			if (c !== putIn(state, 1)) throw new Error('a showdown with unequal bets');
			return terminal(wins, half + c);
		}
		const id = path || 'root';
		states.set(id, state);
		const player = state.toAct as 0 | 1;
		const branches = treeActions(spot, state).map(
			({ name, action }) => [name, build(apply(state, action), `${path}/${name}`)] as const
		);
		return decision(id, player, branches);
	};
	const root = build(start, '');
	const names = (c: readonly WeightedCombo[]) =>
		c.map((x) => cardStr(x.cards[0]) + cardStr(x.cards[1]));
	return {
		game: { types: [n0, n1], typeNames: [names(c0), names(c1)], prior, root },
		states,
		combos
	};
}

/** What `seat` put into the pot on the river and left there, from the engine's record. */
function putIn(state: HandState, seat: number): number {
	const added = state.actions
		.filter((a) => a.street === 3 && a.seat === seat)
		.reduce((sum, a) => sum + a.added, 0);
	// An uncalled bet comes back (rule 9.1): a player never loses more than the other matched.
	const other = state.actions
		.filter((a) => a.street === 3 && a.seat !== seat)
		.reduce((sum, a) => sum + a.added, 0);
	return state.folded[seat] ? added : Math.min(added, other);
}
