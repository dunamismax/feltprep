// CFR+ and an exact best-response evaluator for the games of game.ts (P2.3).
//
// Values are counterfactual: at a decision, the value vector of a player is
// indexed by that player's own type and already weighs in the chance of the
// deal and the other player's probability of reaching the node, but not the
// player's own. That makes a best response a single backward pass (take the
// best action for each type at each of the responder's nodes) and makes the
// exploitability exact: no sampling, no estimate.
//
// The solver is deterministic: the same game and settings give the same
// strategy bit for bit, since it draws no random numbers and always sums in
// the same order.

import {
	decisions,
	type Decision,
	type Game,
	type GameNode,
	type Player,
	type Strategy,
	type Terminal
} from './game.ts';

type Pair = [Float64Array, Float64Array];

function terminalValues(game: Game, node: Terminal, r0: Float64Array, r1: Float64Array): Pair {
	const [n0, n1] = game.types;
	const prior = game.prior;
	const v0 = new Float64Array(n0);
	const v1 = new Float64Array(n1);
	const payoff = node.payoff;
	if (typeof payoff === 'number') {
		for (let t0 = 0; t0 < n0; t0++) {
			const row = t0 * n1;
			let sum = 0;
			const own = r0[t0];
			for (let t1 = 0; t1 < n1; t1++) {
				const m = prior[row + t1];
				sum += m * r1[t1];
				v1[t1] -= m * own * payoff;
			}
			v0[t0] = sum * payoff;
		}
	} else {
		for (let t0 = 0; t0 < n0; t0++) {
			const row = t0 * n1;
			let sum = 0;
			const own = r0[t0];
			for (let t1 = 0; t1 < n1; t1++) {
				const x = prior[row + t1] * payoff[row + t1];
				sum += x * r1[t1];
				v1[t1] -= x * own;
			}
			v0[t0] = sum;
		}
	}
	return [v0, v1];
}

/** Each type's action frequencies from its positive regrets (uniform when none). */
function regretMatch(regrets: Float64Array, types: number, k: number, out: Float64Array): void {
	for (let t = 0; t < types; t++) {
		let sum = 0;
		for (let a = 0; a < k; a++) sum += Math.max(0, regrets[t * k + a]);
		for (let a = 0; a < k; a++) {
			out[t * k + a] = sum > 0 ? Math.max(0, regrets[t * k + a]) / sum : 1 / k;
		}
	}
}

function childReach(reach: Float64Array, sigma: Float64Array, k: number, a: number): Float64Array {
	const out = new Float64Array(reach.length);
	for (let t = 0; t < reach.length; t++) out[t] = reach[t] * sigma[t * k + a];
	return out;
}

/**
 * Player values of `strategy` from `node` down, given both players' reach
 * probabilities. `visit` sees each decision with its children's values.
 */
function traverse(
	game: Game,
	node: GameNode,
	strategy: Strategy,
	r0: Float64Array,
	r1: Float64Array,
	visit?: (node: Decision, children: Pair[], r0: Float64Array, r1: Float64Array) => void
): Pair {
	if (node.kind === 'terminal') return terminalValues(game, node, r0, r1);
	const q = node.player;
	const k = node.actions.length;
	const sigma = strategy.get(node.id) as Float64Array;
	const own = q === 0 ? r0 : r1;
	const children: Pair[] = node.children.map((child, a) => {
		const next = childReach(own, sigma, k, a);
		return q === 0
			? traverse(game, child, strategy, next, r1, visit)
			: traverse(game, child, strategy, r0, next, visit);
	});
	visit?.(node, children, r0, r1);
	const v0 = new Float64Array(game.types[0]);
	const v1 = new Float64Array(game.types[1]);
	const mine = q === 0 ? v0 : v1;
	const theirs = q === 0 ? v1 : v0;
	for (let a = 0; a < k; a++) {
		const [c0, c1] = children[a];
		const cm = q === 0 ? c0 : c1;
		const ct = q === 0 ? c1 : c0;
		for (let t = 0; t < mine.length; t++) mine[t] += sigma[t * k + a] * cm[t];
		for (let t = 0; t < theirs.length; t++) theirs[t] += ct[t];
	}
	return [v0, v1];
}

const ones = (n: number) => new Float64Array(n).fill(1);

export interface SolveSettings {
	/** Iterations of alternating CFR+ (one update of each player per iteration). */
	readonly iterations: number;
}

export interface SolveResult {
	/** The average strategy, weighted linearly by iteration as CFR+ prescribes. */
	readonly average: Strategy;
	readonly iterations: number;
}

/**
 * Solve `game` with CFR+: regret matching on clipped regrets, alternating
 * updates, and an average strategy weighted by iteration number.
 * `onIteration` is called after each iteration with its number and the
 * current average, for convergence reports.
 */
export function solve(
	game: Game,
	settings: SolveSettings,
	onIteration?: (iteration: number, average: () => Strategy) => void
): SolveResult {
	const nodes = decisions(game);
	const regrets = new Map<string, Float64Array>();
	const sums = new Map<string, Float64Array>();
	for (const node of nodes) {
		const size = game.types[node.player] * node.actions.length;
		regrets.set(node.id, new Float64Array(size));
		sums.set(node.id, new Float64Array(size));
	}
	const current: Strategy = new Map();
	for (const node of nodes) {
		current.set(node.id, new Float64Array(game.types[node.player] * node.actions.length));
	}
	const refresh = (player: Player) => {
		for (const node of nodes) {
			if (node.player !== player) continue;
			regretMatch(
				regrets.get(node.id) as Float64Array,
				game.types[player],
				node.actions.length,
				current.get(node.id) as Float64Array
			);
		}
	};
	refresh(0);
	refresh(1);
	const average = () => averageOf(game, sums);

	for (let it = 1; it <= settings.iterations; it++) {
		for (const p of [0, 1] as const) {
			traverse(
				game,
				game.root,
				current,
				ones(game.types[0]),
				ones(game.types[1]),
				(node, children, r0, r1) => {
					if (node.player !== p) return;
					const k = node.actions.length;
					const sigma = current.get(node.id) as Float64Array;
					const regret = regrets.get(node.id) as Float64Array;
					const sum = sums.get(node.id) as Float64Array;
					const reach = p === 0 ? r0 : r1;
					const n = game.types[p];
					for (let t = 0; t < n; t++) {
						let value = 0;
						for (let a = 0; a < k; a++) value += sigma[t * k + a] * children[a][p][t];
						for (let a = 0; a < k; a++) {
							const i = t * k + a;
							regret[i] = Math.max(0, regret[i] + children[a][p][t] - value);
							sum[i] += it * reach[t] * sigma[i];
						}
					}
				}
			);
			refresh(p);
		}
		onIteration?.(it, average);
	}
	return { average: average(), iterations: settings.iterations };
}

function averageOf(game: Game, sums: Map<string, Float64Array>): Strategy {
	const out: Strategy = new Map();
	for (const node of decisions(game)) {
		const k = node.actions.length;
		const n = game.types[node.player];
		const sum = sums.get(node.id) as Float64Array;
		const avg = new Float64Array(n * k);
		for (let t = 0; t < n; t++) {
			let total = 0;
			for (let a = 0; a < k; a++) total += sum[t * k + a];
			for (let a = 0; a < k; a++) avg[t * k + a] = total > 0 ? sum[t * k + a] / total : 1 / k;
		}
		out.set(node.id, avg);
	}
	return out;
}

/** Player 0's expected payoff when both players follow `strategy`. */
export function gameValue(game: Game, strategy: Strategy): number {
	const [v0] = traverse(game, game.root, strategy, ones(game.types[0]), ones(game.types[1]));
	return v0.reduce((s, x) => s + x, 0);
}

/**
 * The best `responder` can do against the other player's part of `strategy`:
 * its expected payoff (player 1's is the negative of player 0's terms) and
 * the pure strategy that achieves it.
 */
export function bestResponse(
	game: Game,
	strategy: Strategy,
	responder: Player
): { value: number; strategy: Strategy } {
	const response: Strategy = new Map();
	const walk = (node: GameNode, opponent: Float64Array): Float64Array => {
		if (node.kind === 'terminal') {
			const r = ones(game.types[responder]);
			const pair =
				responder === 0
					? terminalValues(game, node, r, opponent)
					: terminalValues(game, node, opponent, r);
			return pair[responder];
		}
		const k = node.actions.length;
		const n = game.types[responder];
		if (node.player !== responder) {
			const sigma = strategy.get(node.id) as Float64Array;
			const v = new Float64Array(n);
			node.children.forEach((child, a) => {
				const c = walk(child, childReach(opponent, sigma, k, a));
				for (let t = 0; t < n; t++) v[t] += c[t];
			});
			return v;
		}
		const children = node.children.map((child) => walk(child, opponent));
		const v = new Float64Array(n).fill(-Infinity);
		const choice = new Float64Array(n * k);
		for (let t = 0; t < n; t++) {
			let best = 0;
			for (let a = 0; a < k; a++) {
				if (children[a][t] > v[t]) {
					v[t] = children[a][t];
					best = a;
				}
			}
			choice[t * k + best] = 1;
		}
		response.set(node.id, choice);
		return v;
	};
	const v = walk(game.root, ones(game.types[1 - responder]));
	return { value: v.reduce((s, x) => s + x, 0), strategy: response };
}

export interface Exploitability {
	/** Player 0's payoff under the strategy. */
	readonly value: number;
	/** Each player's best-response payoff against the other's strategy. */
	readonly bestResponse: readonly [number, number];
	/** The sum of both best-response payoffs: zero exactly at an equilibrium. */
	readonly nashConv: number;
	/** Half of `nashConv`: a best responder's average gain per hand, playing each seat once. */
	readonly exploitability: number;
}

export function exploitability(game: Game, strategy: Strategy): Exploitability {
	const b0 = bestResponse(game, strategy, 0).value;
	const b1 = bestResponse(game, strategy, 1).value;
	return {
		value: gameValue(game, strategy),
		bestResponse: [b0, b1],
		nashConv: b0 + b1,
		exploitability: (b0 + b1) / 2
	};
}

/** At one decision: the actor's reach and each action's value, per type. */
export interface NodeValues {
	readonly node: Decision;
	/** The actor's own probability of reaching the node with each type. */
	readonly reach: Float64Array;
	/**
	 * The chance of the deal times the other player's reach, per actor type:
	 * how likely the actor is to be at this node with the type, its own
	 * choices aside. Zero when the node cannot be reached with the type.
	 */
	readonly mass: Float64Array;
	/**
	 * values[t * k + a]: the actor's expected payoff, given type t and that the
	 * node is reached, of taking action a and then following the strategy.
	 * NaN where `mass` is zero.
	 */
	readonly values: Float64Array;
}

/**
 * Exact per-type action values at every decision for a finished strategy.
 * These, not a solver's running averages, are what a grade uses.
 */
export function actionValues(game: Game, strategy: Strategy): Map<string, NodeValues> {
	const out = new Map<string, NodeValues>();
	const [n0, n1] = game.types;
	traverse(game, game.root, strategy, ones(n0), ones(n1), (node, children, r0, r1) => {
		const q = node.player;
		const k = node.actions.length;
		const n = game.types[q];
		const mass = new Float64Array(n);
		for (let t0 = 0; t0 < n0; t0++) {
			for (let t1 = 0; t1 < n1; t1++) {
				const m = game.prior[t0 * n1 + t1];
				if (q === 0) mass[t0] += m * r1[t1];
				else mass[t1] += m * r0[t0];
			}
		}
		const values = new Float64Array(n * k);
		for (let t = 0; t < n; t++) {
			for (let a = 0; a < k; a++) {
				values[t * k + a] = mass[t] > 0 ? children[a][q][t] / mass[t] : NaN;
			}
		}
		out.set(node.id, { node, reach: Float64Array.from(q === 0 ? r0 : r1), mass, values });
	});
	return out;
}
