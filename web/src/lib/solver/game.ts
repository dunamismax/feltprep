// Two-player zero-sum games with private hands dealt once at the start and a
// public betting tree after it (P2.3). This covers every game the first
// release solves: Kuhn poker, river games between two ranges, and the
// jam-or-fold game. Player 0 and player 1 each receive one of their own
// "types" (a card, a hand or a hand class) from a joint distribution, which
// is how card removal enters; after that every action is public. An
// information set is therefore a decision node together with the acting
// player's own type, and the game has perfect recall.
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
}

export interface Decision {
	readonly kind: 'decision';
	/** Unique within the game; strategies and values are keyed by it. */
	readonly id: string;
	readonly player: Player;
	readonly actions: readonly string[];
	readonly children: readonly GameNode[];
}

export type GameNode = Terminal | Decision;

export interface Game {
	/** Number of types for each player. */
	readonly types: readonly [number, number];
	/** Names of the types, for reports and artifacts. */
	readonly typeNames: readonly [readonly string[], readonly string[]];
	/** Joint chance of each pair of types, prior[t0 * types1 + t1]; sums to one. */
	readonly prior: Float64Array;
	readonly root: GameNode;
}

/** A behaviour strategy: for each decision node, a row per type of its actor. */
export type Strategy = Map<string, Float64Array>;

export function terminal(payoff: number | Float64Array): Terminal {
	return { kind: 'terminal', payoff };
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
		if (node.kind === 'terminal') return;
		out.push(node);
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
	const ids = new Set<string>();
	const walk = (node: GameNode) => {
		if (node.kind === 'terminal') {
			if (typeof node.payoff !== 'number' && node.payoff.length !== n0 * n1) {
				throw new RangeError('a payoff matrix has the wrong size');
			}
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
