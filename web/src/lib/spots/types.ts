// The spot, solution and grading contract (docs/grading.md). Every type here
// is plain data that round-trips through JSON, so the same files are read by
// the browser, by Vitest and by the build scripts under Node.
//
// Units: chips are big blinds throughout this contract. Values are expected
// results for the player named, in big blinds, measured against that
// player's stack before the hand began (so posting a blind is a cost).

/** The two seats of a heads-up hand. The button posts the small blind. */
export type Seat = 'button' | 'big-blind';
export const SEATS: readonly Seat[] = ['button', 'big-blind'];

/** A range of starting hands with the source it came from (grading-gate item 1). */
export interface RangeStatement {
	/** `all` is every two-card hand; `classes` lists hand classes with weights. */
	readonly kind: 'all' | 'classes';
	/** For `classes`: class name ("AKs", "77", "T9o") to weight from 0 to 1. */
	readonly weights?: Readonly<Record<string, number>>;
	/** Where the range comes from, in words a player can read. */
	readonly source: string;
}

/**
 * A stated game: everything a solution assumes (grading-gate item 1). A
 * solution is the equilibrium of this game, not of poker in general.
 */
export interface GameStatement {
	readonly id: string;
	readonly title: string;
	/** Always heads-up no-limit hold'em cash play in the first release. */
	readonly format: 'heads-up no-limit hold’em';
	readonly blinds: { readonly small: number; readonly big: number };
	readonly ante: number;
	readonly rake: number;
	/** Effective stack in big blinds, before the blinds are posted. */
	readonly effectiveStack: number;
	/** Board cards at the start of the game, as text ("As Kd 7c"); empty pre-flop. */
	readonly board: string;
	/** Pot in big blinds when the game starts. */
	readonly pot: number;
	readonly ranges: Readonly<Record<Seat, RangeStatement>>;
	/** The actions each street allows, in words, such as "button: jam or fold". */
	readonly betting: readonly string[];
	/** Limits of the simplification, shown with the study view and the lesson. */
	readonly caveat: string;
}

/** One decision point inside a stated game. */
export interface Spot {
	readonly id: string;
	readonly game: string;
	readonly actor: Seat;
	/** The actions before this decision, such as ["button:jam"]. */
	readonly history: readonly string[];
	/** Pot in big blinds at the decision, before the actor acts. */
	readonly pot: number;
	/** Action identifiers the reference chooses between, such as ["fold", "jam"]. */
	readonly actions: readonly string[];
}

/** A solution artifact (format 1): per-hand frequencies and values for each spot. */
export interface SolutionFile {
	readonly format: 1;
	readonly kind: 'solution';
	/** The solution's identifier, equal to its manifest's `id`. */
	readonly solution: string;
	readonly decisions: readonly DecisionTable[];
}

/**
 * The reference at one spot. Arrays run parallel to `hands`, and inner arrays
 * parallel to `actions`.
 */
export interface DecisionTable {
	readonly spot: string;
	readonly actions: readonly string[];
	/** Hand keys: class names ("AKs") pre-flop, two-card combos ("AsKd") later. */
	readonly hands: readonly string[];
	/**
	 * How much of each hand the actor's range holds at this decision, from 0 to
	 * 1, relative to the hand's chance of being dealt. A hand below the
	 * manifest's `grading.minReach` is not graded.
	 */
	readonly reach: readonly number[];
	/** The reference's frequency of each action; each row sums to one. */
	readonly frequencies: readonly (readonly number[])[];
	/**
	 * The actor's value of each action with that hand, in big blinds, when both
	 * players follow the reference afterwards. Computed exactly from the
	 * finished strategies, never taken from a solver's running averages.
	 */
	readonly values: readonly (readonly number[])[];
	/** Per hand, how far its loss can move between solves, in big blinds (B-12). */
	readonly margins: readonly number[];
}

/** The verdict bands of D-20 and the minimum reach, recorded with each solution. */
export interface GradingSettings {
	/** An action the reference takes at least this often with the hand is acceptable. */
	readonly acceptableFrequency: number;
	/** A loss up to this fraction of the pot is acceptable. */
	readonly acceptableLoss: number;
	/** A loss up to this fraction of the pot is an inaccuracy; above it, a mistake. */
	readonly inaccuracyLoss: number;
	/** Hands the range holds less than this at a decision are not graded. */
	readonly minReach: number;
}

/** A file belonging to a solution, with its SHA-256. */
export interface FileRecord {
	/** Path relative to the manifest's directory. */
	readonly path: string;
	readonly sha256: string;
	readonly bytes: number;
}

/** Exploitability measured by FeltPrep's own best-response evaluator (gate item 3). */
export interface ExploitabilityRecord {
	readonly game: string;
	/** Half the sum of both best responders' gains: the average a best responder wins per hand. */
	readonly value: number;
	readonly unit: 'big blinds per hand';
	readonly threshold: number;
}

/** A solution's manifest (format 1): what was solved, how, and every file's hash. */
export interface Manifest {
	readonly format: 1;
	readonly kind: 'manifest';
	readonly id: string;
	readonly title: string;
	readonly games: readonly GameStatement[];
	readonly spots: readonly Spot[];
	/** The solution file, which must be listed in `files`. */
	readonly solutionFile: string;
	readonly files: readonly FileRecord[];
	/** Inputs the build read, such as the equity table, with their hashes. */
	readonly inputs: readonly {
		readonly id: string;
		readonly path: string;
		readonly sha256: string;
	}[];
	readonly build: {
		readonly command: string;
		/** The commit whose code built the solution. */
		readonly commit: string;
		readonly settings: Readonly<Record<string, number | string | boolean>>;
		/** The seed, or null for a solver that draws no random numbers. */
		readonly seed: number | null;
	};
	readonly exploitability: readonly ExploitabilityRecord[];
	readonly grading: GradingSettings;
}

/** The nine items of the grading gate (BUILD.md), each checked for this solution. */
export interface GateRecord {
	readonly statedGame: boolean;
	readonly noAbstraction: boolean;
	readonly exploitability: boolean;
	readonly verifiedVerifier: boolean;
	readonly independentAgreement: boolean;
	readonly invariants: boolean;
	readonly reproducible: boolean;
	readonly bothPositions: boolean;
	readonly perHandValues: boolean;
}

export const GATE_ITEMS: readonly (keyof GateRecord)[] = [
	'statedGame',
	'noAbstraction',
	'exploitability',
	'verifiedVerifier',
	'independentAgreement',
	'invariants',
	'reproducible',
	'bothPositions',
	'perHandValues'
];

/** One solution in the registry. Only a `graded` solution may grade a decision. */
export interface RegistryEntry {
	readonly id: string;
	/** Path of the manifest relative to `solutions/`. */
	readonly manifest: string;
	readonly sha256: string;
	readonly status: 'graded' | 'unverified';
	readonly gate: GateRecord;
	/** The benchmark rows (B-n) its gate items rest on. */
	readonly benchmarks: readonly string[];
}

/** The solution registry, `solutions/registry.json` (format 1). */
export interface Registry {
	readonly format: 1;
	readonly kind: 'registry';
	readonly solutions: readonly RegistryEntry[];
}

/** A verdict's band (D-20). */
export type Band = 'acceptable' | 'inaccuracy' | 'mistake';

/** Why a decision is not graded. */
export type NotGradedReason =
	/** No registered solution covers the decision. */
	| 'no-reference'
	/** A solution covers it but has not passed the grading gate. */
	| 'unverified-reference'
	/** The decision is outside the stated game: other stacks, positions or prior actions. */
	| 'outside-game'
	/** The action taken is not one the stated game allows, such as a limp in jam-or-fold. */
	| 'action-outside-game'
	/** The actor's range holds this hand less than the minimum reach here. */
	| 'outside-range';

/** The result of grading one decision. */
export type Verdict =
	| {
			readonly graded: true;
			readonly solution: string;
			readonly spot: string;
			readonly hand: string;
			readonly action: string;
			/** The reference's frequencies and values for this hand, by action. */
			readonly frequencies: Readonly<Record<string, number>>;
			readonly values: Readonly<Record<string, number>>;
			/** The action with the highest value. */
			readonly best: string;
			/** Value of the best action minus value of the action taken, in big blinds (≥ 0). */
			readonly loss: number;
			/** The loss as a fraction of the pot at the decision. */
			readonly lossOfPot: number;
			readonly margin: number;
			readonly band: Band;
	  }
	| {
			readonly graded: false;
			readonly reason: NotGradedReason;
			/** One sentence a player can read. */
			readonly detail: string;
	  };
