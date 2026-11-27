// B-11's second calculation for river spots (P5.2): each action's value for
// one hand at one decision, worked out pair by pair from the finished
// strategies, written separately from the solver's evaluator (cfr.ts) and its
// linear-time terminals (removal.ts). It shares only the tree's shape and the
// engine:
//
// - the opponent's hands are every combination of their range that shares no
//   card with the hand or the board, each weighted by its range weight and by
//   the opponent's own probability of the actions on the path to the decision;
// - each pair of hands is followed through the subtree with both players'
//   strategies, with no vectors over types;
// - a showdown is decided by the engine's evaluator on the seven cards of each
//   hand, and every payoff comes from the engine's chip counts at the end of
//   the hand: a player who folds loses everything they put in, and at a
//   showdown the winner takes what the loser matched.
//
// It is slow (a sum over pairs at every leaf) and meant for samples.

import { evaluate } from '../engine/evaluator.ts';
import { apply, type HandState } from '../engine/state.ts';
import type { Decision, GameNode, Strategy } from './game.ts';
import { treeActions, type BuiltSpot, type Spot } from './postflop.ts';

interface Step {
	readonly node: Decision;
	readonly action: number;
}

/** The decisions and actions from the root down to node `id`. */
export function pathTo(root: GameNode, id: string): Step[] {
	const walk = (node: GameNode, path: Step[]): Step[] | null => {
		if (node.kind !== 'decision') return null;
		if (node.id === id) return path;
		for (let a = 0; a < node.children.length; a++) {
			const found = walk(node.children[a], [...path, { node, action: a }]);
			if (found) return found;
		}
		return null;
	};
	const path = walk(root, []);
	if (!path) throw new RangeError(`no decision ${id}`);
	return path;
}

/** The decision with this id. */
export function nodeById(root: GameNode, id: string): Decision {
	const path = pathTo(root, id);
	let node = root;
	for (const s of path) node = s.node.children[s.action];
	return node as Decision;
}

/**
 * Each of `player`'s combinations' own probability of taking the actions on
 * the path to decision `id` (1 for a combination with no decision on it).
 */
export function ownReach(
	built: BuiltSpot,
	strategy: Strategy,
	id: string,
	player: 0 | 1
): Float64Array {
	const n = built.combos[player].length;
	const reach = new Float64Array(n).fill(1);
	for (const { node, action } of pathTo(built.game.root, id)) {
		if (node.player !== player) continue;
		const sigma = strategy.get(node.id) as Float64Array;
		const k = node.actions.length;
		for (let t = 0; t < n; t++) reach[t] *= sigma[t * k + action];
	}
	return reach;
}

/** Each combination's showdown rank on the board, from the engine (lower is stronger). */
export function ranksOn(spot: Spot, combos: readonly { cards: readonly [number, number] }[]) {
	return combos.map((c) => evaluate([...spot.board, c.cards[0], c.cards[1]]));
}

type Leaf =
	| { readonly kind: 'fold'; readonly folder: 0 | 1; readonly lost: number }
	| { readonly kind: 'showdown'; readonly matched: number };

/** The end of a hand, read from the engine's chips. */
function leafOf(state: HandState): Leaf {
	const [t0, t1] = state.contributions;
	if (state.folded[0]) return { kind: 'fold', folder: 0, lost: t0 };
	if (state.folded[1]) return { kind: 'fold', folder: 1, lost: t1 };
	return { kind: 'showdown', matched: Math.min(t0, t1) };
}

/**
 * The pairwise calculation for one river spot. The engine is played through
 * the tree once, to read every leaf's chips, and each combination's rank is
 * evaluated once; after that each value is a sum over pairs of hands.
 */
export class DirectRiver {
	private readonly built: BuiltSpot;
	private readonly leaves = new Map<GameNode, Leaf>();
	private readonly ranks: readonly [number[], number[]];

	constructor(built: BuiltSpot, spot: Spot) {
		this.built = built;
		this.ranks = [ranksOn(spot, built.combos[0]), ranksOn(spot, built.combos[1])];
		const walk = (n: GameNode, s: HandState) => {
			if (n.kind === 'chance') throw new Error('river spots deal no cards');
			if (n.kind !== 'decision') {
				if (s.result === null) throw new Error('the tree ends where the engine does not');
				this.leaves.set(n, leafOf(s));
				return;
			}
			const actions = treeActions(spot, s);
			if (actions.map((x) => x.name).join() !== n.actions.join()) {
				throw new Error('the tree and the engine disagree');
			}
			n.children.forEach((child, a) => walk(child, apply(s, actions[a].action)));
		};
		const root = built.states.get('root');
		if (!root) throw new Error('the spot was built without its states');
		walk(built.game.root, root);
	}

	/**
	 * The value to the actor, holding combination `t`, of each action at
	 * decision `id`, given that the decision is reached with it and both
	 * players follow `strategy` afterwards; null when no opposing hand can be
	 * there.
	 */
	values(strategy: Strategy, id: string, t: number): number[] | null {
		const node = nodeById(this.built.game.root, id);
		const q = node.player;
		const o = (1 - q) as 0 | 1;
		const mine = this.built.combos[q][t].cards;
		const reach = ownReach(this.built, strategy, id, o);
		const rank = this.ranks[q][t];
		const ranks = this.ranks[o];

		// The opponents who can be here, and how likely each is.
		const opponents: { index: number; weight: number }[] = [];
		let total = 0;
		this.built.combos[o].forEach((c, j) => {
			const [x, y] = c.cards;
			if (x === mine[0] || x === mine[1] || y === mine[0] || y === mine[1]) return;
			const w = c.weight * reach[j];
			if (w > 0) {
				opponents.push({ index: j, weight: w });
				total += w;
			}
		});
		if (!(total > 0)) return null;

		// The value to q of one pair of hands from n down.
		const pairValue = (n: GameNode, j: number): number => {
			if (n.kind !== 'decision') {
				const leaf = this.leaves.get(n) as Leaf;
				if (leaf.kind === 'fold') return leaf.folder === q ? -leaf.lost : leaf.lost;
				const r = ranks[j];
				return rank < r ? leaf.matched : rank > r ? -leaf.matched : 0;
			}
			const sigma = strategy.get(n.id) as Float64Array;
			const k = n.actions.length;
			const type = n.player === q ? t : j;
			let v = 0;
			for (let a = 0; a < k; a++) {
				const p = sigma[type * k + a];
				if (p !== 0) v += p * pairValue(n.children[a], j);
			}
			return v;
		};
		return node.children.map((child) => {
			let v = 0;
			for (const { index, weight } of opponents) v += weight * pairValue(child, index);
			return v / total;
		});
	}

	/**
	 * Whether combination `t` of the actor at decision `id` cannot lose a
	 * showdown there: it beats or ties every opposing hand that can be there.
	 */
	cannotLose(strategy: Strategy, id: string, t: number): boolean {
		const node = nodeById(this.built.game.root, id);
		const q = node.player;
		const o = (1 - q) as 0 | 1;
		const mine = this.built.combos[q][t].cards;
		const reach = ownReach(this.built, strategy, id, o);
		const rank = this.ranks[q][t];
		return this.built.combos[o].every((c, j) => {
			const [x, y] = c.cards;
			if (x === mine[0] || x === mine[1] || y === mine[0] || y === mine[1]) return true;
			return !(c.weight * reach[j] > 0) || rank <= this.ranks[o][j];
		});
	}
}
