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
	type Chance,
	type Decision,
	type Game,
	type GameNode,
	type Player,
	type Showdown,
	type Strategy,
	type Terminal
} from './game.ts';
import { foldInto, removalOf, showdownInto, type Removal } from './removal.ts';

type Pair = [Float64Array, Float64Array];
/** Which types can still be at a node below chance cards; null when all can. */
type Alive = readonly [Uint8Array, Uint8Array] | null;

/** A game together with its card-removal lookups, when it has a card deal. */
interface Ctx {
	readonly game: Game;
	readonly rm: Removal | null;
}

const ctxOf = (game: Game): Ctx => ({ game, rm: game.deal ? removalOf(game.deal) : null });

function terminalValues(
	ctx: Ctx,
	node: Terminal | Showdown,
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive
): Pair {
	const { game, rm } = ctx;
	const [n0, n1] = game.types;
	const v0 = new Float64Array(n0);
	const v1 = new Float64Array(n1);
	if (node.kind === 'showdown') {
		if (!rm) throw new Error('a showdown needs a card deal');
		showdownInto(rm, node.table, 0, node.scale, r1, v0);
		showdownInto(rm, node.table, 1, node.scale, r0, v1);
		return [v0, v1];
	}
	const payoff = node.payoff;
	if (rm && typeof payoff === 'number') {
		foldInto(rm, 0, payoff, r1, alive && alive[0], v0);
		foldInto(rm, 1, -payoff, r0, alive && alive[1], v1);
		return [v0, v1];
	}
	const prior = game.prior;
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
		const scale = node.scale ?? 1;
		for (let t0 = 0; t0 < n0; t0++) {
			const row = t0 * n1;
			let sum = 0;
			const own = r0[t0] * scale;
			for (let t1 = 0; t1 < n1; t1++) {
				const x = prior[row + t1] * payoff[row + t1];
				sum += x * r1[t1];
				v1[t1] -= x * own;
			}
			v0[t0] = sum * scale;
		}
	}
	return [v0, v1];
}

/** The reach and alive masks below chance card `c`: its holders can no longer be there. */
function dealt(
	ctx: Ctx,
	c: number,
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive,
	arena?: Arena
): { r0: Float64Array; r1: Float64Array; alive: Alive } {
	const rm = ctx.rm as Removal;
	const [n0, n1] = ctx.game.types;
	const a0 = alive ? Uint8Array.from(alive[0]) : new Uint8Array(n0).fill(1);
	const a1 = alive ? Uint8Array.from(alive[1]) : new Uint8Array(n1).fill(1);
	const q0 = arena ? arena.take(n0) : new Float64Array(n0);
	const q1 = arena ? arena.take(n1) : new Float64Array(n1);
	q0.set(r0);
	q1.set(r1);
	for (const t of rm.holders[0][c]) {
		a0[t] = 0;
		q0[t] = 0;
	}
	for (const t of rm.holders[1][c]) {
		a1[t] = 0;
		q1[t] = 0;
	}
	return { r0: q0, r1: q1, alive: [a0, a1] };
}

/** Each type's chance of being at a node, own choices aside: the deal times the other's reach. */
function massOf(
	ctx: Ctx,
	q: Player,
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive
): Float64Array {
	const { game, rm } = ctx;
	const [n0, n1] = game.types;
	const mass = new Float64Array(game.types[q]);
	if (rm) {
		foldInto(rm, q, 1, q === 0 ? r1 : r0, alive && alive[q], mass);
		return mass;
	}
	for (let t0 = 0; t0 < n0; t0++) {
		for (let t1 = 0; t1 < n1; t1++) {
			const m = game.prior[t0 * n1 + t1];
			if (q === 0) mass[t0] += m * r1[t1];
			else mass[t1] += m * r0[t0];
		}
	}
	return mass;
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

type Visit = (
	node: Decision,
	children: Pair[],
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive
) => void;

/**
 * Player values of `strategy` from `node` down, given both players' reach
 * probabilities. `visit` sees each decision with its children's values.
 * Below a chance node values are not multiplied by the card's chance, so a
 * decision's values are relative to that public branch; the chance node
 * applies the weight when it sums its children.
 */
function traverse(
	ctx: Ctx,
	node: GameNode,
	strategy: Strategy,
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive,
	visit?: Visit
): Pair {
	if (node.kind === 'terminal' || node.kind === 'showdown') {
		return terminalValues(ctx, node, r0, r1, alive);
	}
	const [n0, n1] = ctx.game.types;
	if (node.kind === 'chance') return chanceValues(ctx, node, strategy, r0, r1, alive, visit);
	const q = node.player;
	const k = node.actions.length;
	const sigma = strategy.get(node.id) as Float64Array;
	const own = q === 0 ? r0 : r1;
	const children: Pair[] = node.children.map((child, a) => {
		const next = childReach(own, sigma, k, a);
		return q === 0
			? traverse(ctx, child, strategy, next, r1, alive, visit)
			: traverse(ctx, child, strategy, r0, next, alive, visit);
	});
	visit?.(node, children, r0, r1, alive);
	const v0 = new Float64Array(n0);
	const v1 = new Float64Array(n1);
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

function chanceValues(
	ctx: Ctx,
	node: Chance,
	strategy: Strategy,
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive,
	visit?: Visit
): Pair {
	const [n0, n1] = ctx.game.types;
	const v0 = new Float64Array(n0);
	const v1 = new Float64Array(n1);
	const w = node.weight;
	node.cards.forEach((c, i) => {
		const below = dealt(ctx, c, r0, r1, alive);
		const [c0, c1] = traverse(
			ctx,
			node.children[i],
			strategy,
			below.r0,
			below.r1,
			below.alive,
			visit
		);
		for (let t = 0; t < n0; t++) v0[t] += w * c0[t];
		for (let t = 0; t < n1; t++) v1[t] += w * c1[t];
	});
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
 * current average, for convergence reports; returning true stops the solve
 * there, so the result is the same as a solve with that many iterations.
 */
export function solve(
	game: Game,
	settings: SolveSettings,
	onIteration?: (iteration: number, average: () => Strategy) => boolean | void
): SolveResult {
	const ctx = ctxOf(game);
	const arena = new Arena();
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

	let done = 0;
	for (let it = 1; it <= settings.iterations; it++) {
		for (const p of [0, 1] as const) {
			const update: Update = (node, children, reach, out) => {
				const k = node.actions.length;
				const sigma = current.get(node.id) as Float64Array;
				const regret = regrets.get(node.id) as Float64Array;
				const sum = sums.get(node.id) as Float64Array;
				const n = game.types[p];
				for (let t = 0; t < n; t++) {
					let v = 0;
					for (let a = 0; a < k; a++) v += sigma[t * k + a] * children[a][t];
					out[t] = v;
					for (let a = 0; a < k; a++) {
						const i = t * k + a;
						regret[i] = Math.max(0, regret[i] + children[a][t] - v);
						sum[i] += it * reach[t] * sigma[i];
					}
				}
			};
			const out = new Float64Array(game.types[p]);
			const r0 = ones(game.types[0]);
			const r1 = ones(game.types[1]);
			valuesFor(ctx, arena, p, game.root, current, r0, r1, null, update, out);
			refresh(p);
		}
		done = it;
		if (onIteration?.(it, average) === true) break;
	}
	return { average: average(), iterations: done };
}

/**
 * At one of the updating player's decisions: update it, and write its value
 * per type into `out`.
 */
type Update = (
	node: Decision,
	children: Float64Array[],
	reach: Float64Array,
	out: Float64Array
) => void;

/**
 * Scratch arrays handed out and taken back in stack order, so a solve does
 * not allocate fresh arrays at every node of every iteration.
 */
class Arena {
	private chunks: Float64Array[] = [];
	private chunk = 0;
	private top = 0;
	private static readonly SIZE = 1 << 20;

	mark(): number {
		return this.chunk * Arena.SIZE * 4 + this.top;
	}

	release(mark: number): void {
		this.chunk = Math.floor(mark / (Arena.SIZE * 4));
		this.top = mark - this.chunk * Arena.SIZE * 4;
	}

	/** n zeros. */
	take(n: number): Float64Array {
		if (n > Arena.SIZE) return new Float64Array(n);
		if (this.chunk >= this.chunks.length) this.chunks.push(new Float64Array(Arena.SIZE));
		if (this.top + n > Arena.SIZE) {
			this.chunk++;
			this.top = 0;
			if (this.chunk >= this.chunks.length) this.chunks.push(new Float64Array(Arena.SIZE));
		}
		const out = this.chunks[this.chunk].subarray(this.top, this.top + n);
		this.top += n;
		out.fill(0);
		return out;
	}
}

/**
 * Player p's values only, from `node` down, written into `out` (all zeros on
 * entry): what one half of a CFR+ iteration needs. The sums run in the same
 * order as `traverse`, so the two give the same numbers bit for bit.
 */
function valuesFor(
	ctx: Ctx,
	arena: Arena,
	p: Player,
	node: GameNode,
	strategy: Strategy,
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive,
	update: Update,
	out: Float64Array
): void {
	const n = ctx.game.types[p];
	if (node.kind === 'terminal' || node.kind === 'showdown') {
		terminalValuesFor(ctx, p, node, r0, r1, alive, out);
		return;
	}
	const mark = arena.mark();
	if (node.kind === 'chance') {
		const child = arena.take(n);
		const inner = arena.mark();
		node.cards.forEach((c, i) => {
			arena.release(inner);
			const below = dealt(ctx, c, r0, r1, alive, arena);
			child.fill(0);
			valuesFor(
				ctx,
				arena,
				p,
				node.children[i],
				strategy,
				below.r0,
				below.r1,
				below.alive,
				update,
				child
			);
			for (let t = 0; t < n; t++) out[t] += node.weight * child[t];
		});
		arena.release(mark);
		return;
	}
	const q = node.player;
	const k = node.actions.length;
	const sigma = strategy.get(node.id) as Float64Array;
	const own = q === 0 ? r0 : r1;
	const children: Float64Array[] = [];
	for (let a = 0; a < k; a++) {
		const next = arena.take(own.length);
		for (let t = 0; t < own.length; t++) next[t] = own[t] * sigma[t * k + a];
		const c = arena.take(n);
		if (q === 0) valuesFor(ctx, arena, p, node.children[a], strategy, next, r1, alive, update, c);
		else valuesFor(ctx, arena, p, node.children[a], strategy, r0, next, alive, update, c);
		children.push(c);
	}
	if (q === p) update(node, children, own, out);
	else {
		for (let a = 0; a < k; a++) {
			const c = children[a];
			for (let t = 0; t < n; t++) out[t] += c[t];
		}
	}
	arena.release(mark);
}

/** One player's half of `terminalValues`, summed in the same order. */
function terminalValuesFor(
	ctx: Ctx,
	p: Player,
	node: Terminal | Showdown,
	r0: Float64Array,
	r1: Float64Array,
	alive: Alive,
	out: Float64Array
): void {
	const { game, rm } = ctx;
	const [n0, n1] = game.types;
	if (node.kind === 'showdown') {
		if (!rm) throw new Error('a showdown needs a card deal');
		showdownInto(rm, node.table, p, node.scale, p === 0 ? r1 : r0, out);
		return;
	}
	const payoff = node.payoff;
	if (rm && typeof payoff === 'number') {
		foldInto(rm, p, p === 0 ? payoff : -payoff, p === 0 ? r1 : r0, alive && alive[p], out);
		return;
	}
	const prior = game.prior;
	const scale = typeof payoff === 'number' ? 1 : (node.scale ?? 1);
	for (let t0 = 0; t0 < n0; t0++) {
		const row = t0 * n1;
		if (p === 0) {
			let sum = 0;
			if (typeof payoff === 'number') {
				for (let t1 = 0; t1 < n1; t1++) sum += prior[row + t1] * r1[t1];
				out[t0] = sum * payoff;
			} else {
				for (let t1 = 0; t1 < n1; t1++) sum += prior[row + t1] * payoff[row + t1] * r1[t1];
				out[t0] = sum * scale;
			}
		} else if (typeof payoff === 'number') {
			const own = r0[t0];
			for (let t1 = 0; t1 < n1; t1++) out[t1] -= prior[row + t1] * own * payoff;
		} else {
			const own = r0[t0] * scale;
			for (let t1 = 0; t1 < n1; t1++) out[t1] -= prior[row + t1] * payoff[row + t1] * own;
		}
	}
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
	const [v0] = traverse(
		ctxOf(game),
		game.root,
		strategy,
		ones(game.types[0]),
		ones(game.types[1]),
		null
	);
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
	const ctx = ctxOf(game);
	const response: Strategy = new Map();
	const n = game.types[responder];
	const mine = ones(n);
	const walk = (node: GameNode, opponent: Float64Array, alive: Alive): Float64Array => {
		if (node.kind === 'terminal' || node.kind === 'showdown') {
			const pair =
				responder === 0
					? terminalValues(ctx, node, mine, opponent, alive)
					: terminalValues(ctx, node, opponent, mine, alive);
			return pair[responder];
		}
		if (node.kind === 'chance') {
			const v = new Float64Array(n);
			node.cards.forEach((c, i) => {
				const below =
					responder === 0
						? dealt(ctx, c, mine, opponent, alive)
						: dealt(ctx, c, opponent, mine, alive);
				const c0 = walk(node.children[i], responder === 0 ? below.r1 : below.r0, below.alive);
				for (let t = 0; t < n; t++) v[t] += node.weight * c0[t];
			});
			return v;
		}
		const k = node.actions.length;
		if (node.player !== responder) {
			const sigma = strategy.get(node.id) as Float64Array;
			const v = new Float64Array(n);
			node.children.forEach((child, a) => {
				const c = walk(child, childReach(opponent, sigma, k, a), alive);
				for (let t = 0; t < n; t++) v[t] += c[t];
			});
			return v;
		}
		const children = node.children.map((child) => walk(child, opponent, alive));
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
	const v = walk(game.root, ones(game.types[1 - responder]), null);
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
	 * Below chance cards it leaves out the chance of the cards dealt, which is
	 * the same for every pair of types that can be there.
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
	const ctx = ctxOf(game);
	const [n0, n1] = game.types;
	traverse(ctx, game.root, strategy, ones(n0), ones(n1), null, (node, children, r0, r1, alive) => {
		const q = node.player;
		const k = node.actions.length;
		const n = game.types[q];
		const mass = massOf(ctx, q, r0, r1, alive);
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
