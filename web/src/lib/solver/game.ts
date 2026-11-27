// Two-player zero-sum games with private hands dealt once at the start and a
// public tree after it (P2.3, P5.1). This covers every game FeltPrep solves:
// Kuhn poker, the jam-or-fold game, and post-flop spots between two ranges.
// Player 0 and player 1 each receive one of their own "types" (a card, a hand
// or a hand class) from a joint distribution, which is how card removal
// enters; after that every action and every chance card is public. An
// information set is therefore a public node together with the acting
// player's own type, and the game has perfect recall.
//
// Post-flop games also describe their deal as two-card combinations with
// weights (`CardDeal`). That lets the solver compute fold and showdown values
// in time linear in the number of combinations, and lets a chance node deal a
// board card: a combination holding the card cannot be at any node below it.
//
// Payoffs are always player 0's; player 1 receives the negative.

export type Player = 0 | 1;

export interface Terminal {
	readonly kind: 'terminal';
	/**
	 * Player 0's payoff: one number for every pair of types, or a matrix in
	 * row-major order, payoff[t0 * types1 + t1].
	 */
	readonly payoff: number | Float64Array;
	/**
	 * A factor the payoff is multiplied by, so showdowns of different sizes can
	 * share one matrix of who wins (+1), ties (0) and loses (−1). Default 1.
	 */
	readonly scale?: number;
}

export interface Decision {
	readonly kind: 'decision';
	/** Unique within the game; strategies and values are keyed by it. */
	readonly id: string;
	readonly player: Player;
	readonly actions: readonly string[];
	readonly children: readonly GameNode[];
}

/**
 * A showdown on a complete board: the stronger hand wins `scale` chips from
 * the other, a tie moves nothing. Needs the game's `deal`.
 */
export interface Showdown {
	readonly kind: 'showdown';
	readonly table: ShowdownTable;
	/** Chips player 0 wins with the stronger hand and loses with the weaker. */
	readonly scale: number;
}

/** Who beats whom on one five-card board, shared by every showdown on it. */
export interface ShowdownTable {
	/** The board's five cards. */
	readonly board: readonly number[];
	/**
	 * rank[p][t]: the evaluator's rank of type t's best hand on the board
	 * (lower is stronger), or −1 when the type holds a board card.
	 */
	readonly rank: readonly [Int32Array, Int32Array];
	/** Each player's types that the board leaves possible, weakest first. */
	readonly order: readonly [Int32Array, Int32Array];
}

/**
 * A public card dealt by chance. Each child deals one card; for a pair of
 * hands, every card neither holds is equally likely, with chance `weight`
 * (one over the number of unseen cards). A type holding a child's card cannot
 * reach that child. Needs the game's `deal`.
 */
export interface Chance {
	readonly kind: 'chance';
	readonly id: string;
	readonly cards: readonly number[];
	readonly children: readonly GameNode[];
	readonly weight: number;
}

export type GameNode = Terminal | Decision | Showdown | Chance;

/**
 * A deal of two-card combinations: the prior of a pair is
 * weights[0][t0] × weights[1][t1] / norm when the two share no card, and zero
 * when they do.
 */
export interface CardDeal {
	/** Each type's two cards: cards[p][2t] and cards[p][2t + 1]. */
	readonly cards: readonly [Uint8Array, Uint8Array];
	readonly weights: readonly [Float64Array, Float64Array];
	readonly norm: number;
}

export interface Game {
	/** Number of types for each player. */
	readonly types: readonly [number, number];
	/** Names of the types, for reports and artifacts. */
	readonly typeNames: readonly [readonly string[], readonly string[]];
	/** Joint chance of each pair of types, prior[t0 * types1 + t1]; sums to one. */
	readonly prior: Float64Array;
	readonly root: GameNode;
	/** Present for games between card ranges; `prior` then follows from it. */
	readonly deal?: CardDeal;
}

/** A behaviour strategy: for each decision node, a row per type of its actor. */
export type Strategy = Map<string, Float64Array>;

export function terminal(payoff: number | Float64Array, scale = 1): Terminal {
	return scale === 1 ? { kind: 'terminal', payoff } : { kind: 'terminal', payoff, scale };
}

export function decision(
	id: string,
	player: Player,
	branches: readonly (readonly [string, GameNode])[]
): Decision {
	return {
		kind: 'decision',
		id,
		player,
		actions: branches.map(([a]) => a),
		children: branches.map(([, n]) => n)
	};
}

/** Every decision node, parents before children. */
export function decisions(game: Game): Decision[] {
	const out: Decision[] = [];
	const walk = (node: GameNode) => {
		if (node.kind === 'terminal' || node.kind === 'showdown') return;
		if (node.kind === 'decision') out.push(node);
		node.children.forEach(walk);
	};
	walk(game.root);
	return out;
}

/** Check a game's shape: distinct ids, matching sizes, a prior that sums to one. */
export function validateGame(game: Game): void {
	const [n0, n1] = game.types;
	if (game.prior.length !== n0 * n1) throw new RangeError('the prior has the wrong size');
	if (game.typeNames[0].length !== n0 || game.typeNames[1].length !== n1) {
		throw new RangeError('type names do not match the type counts');
	}
	let sum = 0;
	for (const p of game.prior) {
		if (!(p >= 0)) throw new RangeError('the prior has a negative entry');
		sum += p;
	}
	if (Math.abs(sum - 1) > 1e-12) throw new RangeError(`the prior sums to ${sum}`);
	const deal = game.deal;
	if (deal) {
		for (const p of [0, 1] as const) {
			const n = game.types[p];
			if (deal.cards[p].length !== 2 * n || deal.weights[p].length !== n) {
				throw new RangeError('the deal does not match the type counts');
			}
		}
		for (let t0 = 0; t0 < n0; t0++) {
			for (let t1 = 0; t1 < n1; t1++) {
				const a = deal.cards[0][2 * t0];
				const b = deal.cards[0][2 * t0 + 1];
				const x = deal.cards[1][2 * t1];
				const y = deal.cards[1][2 * t1 + 1];
				const shared = a === x || a === y || b === x || b === y;
				const expected = shared ? 0 : (deal.weights[0][t0] * deal.weights[1][t1]) / deal.norm;
				if (Math.abs(game.prior[t0 * n1 + t1] - expected) > 1e-15) {
					throw new RangeError('the prior does not follow from the deal');
				}
			}
		}
	}
	const ids = new Set<string>();
	const walk = (node: GameNode) => {
		if (node.kind === 'terminal') {
			if (typeof node.payoff !== 'number' && node.payoff.length !== n0 * n1) {
				throw new RangeError('a payoff matrix has the wrong size');
			}
			return;
		}
		if (node.kind === 'showdown') {
			if (!deal) throw new RangeError('a showdown needs the game to describe its deal');
			if (node.table.rank[0].length !== n0 || node.table.rank[1].length !== n1) {
				throw new RangeError('a showdown table has the wrong size');
			}
			return;
		}
		if (node.kind === 'chance') {
			if (!deal) throw new RangeError('a chance node needs the game to describe its deal');
			if (node.cards.length < 1 || node.cards.length !== node.children.length) {
				throw new RangeError(`chance node ${node.id} needs one child per card`);
			}
			if (ids.has(node.id)) throw new RangeError(`node id ${node.id} is used twice`);
			ids.add(node.id);
			node.children.forEach(walk);
			return;
		}
		if (ids.has(node.id)) throw new RangeError(`decision id ${node.id} is used twice`);
		ids.add(node.id);
		if (node.actions.length < 1 || node.actions.length !== node.children.length) {
			throw new RangeError(`decision ${node.id} needs one child per action`);
		}
		node.children.forEach(walk);
	};
	walk(game.root);
}

/** The strategy that plays every action equally often. */
export function uniformStrategy(game: Game): Strategy {
	const s: Strategy = new Map();
	for (const node of decisions(game)) {
		const k = node.actions.length;
		s.set(node.id, new Float64Array(game.types[node.player] * k).fill(1 / k));
	}
	return s;
}

/**
 * A strategy for one player from a function giving each type's action
 * frequencies at each of that player's nodes. Nodes of the other player get
 * uniform rows, which the caller replaces or ignores.
 */
export function strategyFrom(
	game: Game,
	rows: (node: Decision, type: number) => readonly number[]
): Strategy {
	const s = uniformStrategy(game);
	for (const node of decisions(game)) {
		const k = node.actions.length;
		const table = s.get(node.id) as Float64Array;
		for (let t = 0; t < game.types[node.player]; t++) {
			const row = rows(node, t);
			if (row.length !== k) throw new RangeError(`${node.id}: one frequency per action is needed`);
			for (let a = 0; a < k; a++) table[t * k + a] = row[a];
		}
	}
	return s;
}

/** Combine player 0's rows from `s0` with player 1's rows from `s1`. */
export function combine(game: Game, s0: Strategy, s1: Strategy): Strategy {
	const s: Strategy = new Map();
	for (const node of decisions(game)) {
		const from = node.player === 0 ? s0 : s1;
		s.set(node.id, Float64Array.from(from.get(node.id) as Float64Array));
	}
	return s;
}
