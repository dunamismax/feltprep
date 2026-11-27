// The solution reader (docs/grading.md, "Loading a solution"). It refuses any
// solution whose manifest or files do not match the hashes recorded for them,
// whose format it does not know, or whose tables are not well formed, so a
// changed or damaged file can never reach a study view or a grade (A-5).
//
// Files are read through a caller-supplied function, so the same reader runs
// over `fetch` in the browser and over the file system in Node.

import { sha256Hex } from './hash.ts';
import {
	GATE_ITEMS,
	type DecisionTable,
	type Manifest,
	type Registry,
	type RegistryEntry,
	type SolutionFile,
	type Spot
} from './types.ts';

export const SOLUTION_FORMAT = 1;

/** Why the reader refused a solution. */
export type RefusalReason =
	| 'unknown-solution'
	| 'unsupported-format'
	| 'manifest-hash'
	| 'file-hash'
	| 'file-missing'
	| 'id-mismatch'
	| 'registry-inconsistent'
	| 'malformed';

export class SolutionRefused extends Error {
	override name = 'SolutionRefused';
	readonly reason: RefusalReason;
	constructor(reason: RefusalReason, message: string) {
		super(message);
		this.reason = reason;
	}
}

/** Reads a file by its path relative to `solutions/`. Rejects when the file is missing. */
export type ReadFile = (path: string) => Promise<Uint8Array>;

/** A solution that passed every check, with whether it may grade decisions. */
export interface LoadedSolution {
	readonly entry: RegistryEntry;
	readonly manifest: Manifest;
	readonly solution: SolutionFile;
	/** True only for a registry entry marked graded with all nine gate items met. */
	readonly grades: boolean;
}

const refuse = (reason: RefusalReason, message: string): never => {
	throw new SolutionRefused(reason, message);
};

function parse(bytes: Uint8Array, what: string): unknown {
	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
	} catch {
		return refuse('malformed', `${what} is not valid JSON`);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkFormat(value: Record<string, unknown>, kind: string, what: string): void {
	if (value.format !== SOLUTION_FORMAT) {
		refuse(
			'unsupported-format',
			`${what} has format ${String(value.format)}, not ${SOLUTION_FORMAT}`
		);
	}
	if (value.kind !== kind) refuse('malformed', `${what} is not a ${kind}`);
}

/** A relative path with no `..`, no leading slash and no backslash. */
function safePath(path: unknown, what: string): string {
	if (
		typeof path !== 'string' ||
		path === '' ||
		path.startsWith('/') ||
		path.includes('\\') ||
		path.split('/').some((part) => part === '..' || part === '' || part === '.')
	) {
		return refuse('malformed', `${what} has an unsafe path ${JSON.stringify(path)}`);
	}
	return path;
}

function dirname(path: string): string {
	const slash = path.lastIndexOf('/');
	return slash < 0 ? '' : path.slice(0, slash + 1);
}

/** Check that a parsed registry has the expected shape. */
export function checkRegistry(value: unknown): Registry {
	if (!isRecord(value)) return refuse('malformed', 'the registry is not an object');
	checkFormat(value, 'registry', 'the registry');
	if (!Array.isArray(value.solutions))
		return refuse('malformed', 'the registry lists no solutions');
	const ids = new Set<string>();
	for (const entry of value.solutions as unknown[]) {
		if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.sha256 !== 'string') {
			return refuse('malformed', 'a registry entry lacks its id or hash');
		}
		if (ids.has(entry.id)) refuse('malformed', `the registry lists ${entry.id} twice`);
		ids.add(entry.id);
		safePath(entry.manifest, `registry entry ${entry.id}`);
		if (entry.status !== 'graded' && entry.status !== 'unverified') {
			refuse('malformed', `registry entry ${entry.id} has an unknown status`);
		}
		const gate = entry.gate;
		if (!isRecord(gate) || !GATE_ITEMS.every((item) => typeof gate[item] === 'boolean')) {
			refuse('malformed', `registry entry ${entry.id} lacks its gate record`);
		}
		if (!Array.isArray(entry.benchmarks))
			refuse('malformed', `registry entry ${entry.id} lacks its benchmarks`);
	}
	return value as unknown as Registry;
}

function finite(x: unknown): x is number {
	return typeof x === 'number' && Number.isFinite(x);
}

function checkManifest(value: unknown, entry: RegistryEntry): Manifest {
	if (!isRecord(value)) return refuse('malformed', 'the manifest is not an object');
	checkFormat(value, 'manifest', 'the manifest');
	if (value.id !== entry.id) {
		refuse('id-mismatch', `the manifest is for ${String(value.id)}, not ${entry.id}`);
	}
	if (!Array.isArray(value.files) || !Array.isArray(value.spots) || !Array.isArray(value.games)) {
		refuse('malformed', 'the manifest lacks its files, spots or games');
	}
	const games = new Set((value.games as { id?: unknown }[]).map((g) => g.id));
	for (const spot of value.spots as Spot[]) {
		if (!games.has(spot.game)) refuse('malformed', `spot ${spot.id} names an unknown game`);
	}
	const files = value.files as unknown[];
	for (const file of files) {
		if (!isRecord(file) || typeof file.sha256 !== 'string' || !Number.isInteger(file.bytes)) {
			refuse('malformed', 'a manifest file record lacks its hash or size');
		} else {
			safePath(file.path, 'a manifest file record');
		}
	}
	if (!files.some((f) => isRecord(f) && f.path === value.solutionFile)) {
		refuse('malformed', 'the solution file is not among the manifest files');
	}
	const grading = value.grading;
	if (
		!isRecord(grading) ||
		!['acceptableFrequency', 'acceptableLoss', 'inaccuracyLoss', 'minReach'].every((k) =>
			finite(grading[k])
		)
	) {
		refuse('malformed', 'the manifest lacks its grading settings');
	}
	return value as unknown as Manifest;
}

const SUM_TOLERANCE = 1e-9;

function checkTable(table: DecisionTable, spots: Map<string, Spot>): void {
	const spot = spots.get(table.spot);
	if (!spot) return refuse('malformed', `a decision names unknown spot ${String(table.spot)}`);
	const where = `spot ${spot.id}`;
	if (
		!Array.isArray(table.actions) ||
		table.actions.length !== spot.actions.length ||
		table.actions.some((a, i) => a !== spot.actions[i])
	) {
		refuse('malformed', `${where} lists other actions than its spot`);
	}
	const n = Array.isArray(table.hands) ? table.hands.length : -1;
	if (n < 1 || new Set(table.hands).size !== n)
		refuse('malformed', `${where} has no or repeated hands`);
	for (const key of ['reach', 'frequencies', 'values', 'margins'] as const) {
		if (!Array.isArray(table[key]) || table[key].length !== n) {
			refuse('malformed', `${where}: ${key} does not match its hands`);
		}
	}
	const k = spot.actions.length;
	for (let h = 0; h < n; h++) {
		const hand = table.hands[h];
		const reach = table.reach[h];
		if (!finite(reach) || reach < 0 || reach > 1)
			refuse('malformed', `${where} ${hand}: reach out of range`);
		const margin = table.margins[h];
		if (!finite(margin) || margin < 0) refuse('malformed', `${where} ${hand}: margin out of range`);
		const freqs = table.frequencies[h];
		const values = table.values[h];
		if (
			!Array.isArray(freqs) ||
			freqs.length !== k ||
			!Array.isArray(values) ||
			values.length !== k
		) {
			refuse('malformed', `${where} ${hand}: one entry per action is needed`);
		}
		let sum = 0;
		for (let a = 0; a < k; a++) {
			if (!finite(freqs[a]) || freqs[a] < 0 || freqs[a] > 1 || !finite(values[a])) {
				refuse('malformed', `${where} ${hand}: a frequency or value is not a number in range`);
			}
			sum += freqs[a];
		}
		if (Math.abs(sum - 1) > SUM_TOLERANCE)
			refuse('malformed', `${where} ${hand}: frequencies sum to ${sum}`);
	}
}

function checkSolution(value: unknown, manifest: Manifest): SolutionFile {
	if (!isRecord(value)) return refuse('malformed', 'the solution file is not an object');
	checkFormat(value, 'solution', 'the solution file');
	if (value.solution !== manifest.id) {
		refuse('id-mismatch', `the solution file is for ${String(value.solution)}, not ${manifest.id}`);
	}
	if (!Array.isArray(value.decisions))
		return refuse('malformed', 'the solution file has no decisions');
	const spots = new Map(manifest.spots.map((s) => [s.id, s]));
	const seen = new Set<string>();
	for (const table of value.decisions as DecisionTable[]) {
		if (!isRecord(table)) refuse('malformed', 'a decision is not an object');
		checkTable(table, spots);
		if (seen.has(table.spot)) refuse('malformed', `spot ${table.spot} has two decision tables`);
		seen.add(table.spot);
	}
	return value as unknown as SolutionFile;
}

async function readChecked(read: ReadFile, path: string, sha256: string, reason: RefusalReason) {
	let bytes: Uint8Array;
	try {
		bytes = await read(path);
	} catch {
		return refuse('file-missing', `${path} cannot be read`);
	}
	const actual = await sha256Hex(bytes);
	if (actual !== sha256)
		refuse(reason, `${path} has SHA-256 ${actual}, not the recorded ${sha256}`);
	return bytes;
}

/**
 * Load solution `id` from `registry`, checking the manifest's hash against the
 * registry, every file's hash and size against the manifest, both formats and
 * the tables' structure. Throws `SolutionRefused` on the first failure.
 */
export async function loadSolution(
	registry: Registry,
	id: string,
	read: ReadFile
): Promise<LoadedSolution> {
	const checked = checkRegistry(registry);
	const entry = checked.solutions.find((s) => s.id === id);
	if (!entry) return refuse('unknown-solution', `no solution ${id} is registered`);
	const gateMet = GATE_ITEMS.every((item) => entry.gate[item]);
	if (entry.status === 'graded' && !gateMet) {
		refuse('registry-inconsistent', `${id} is marked graded but misses a grading-gate item`);
	}

	const manifestPath = safePath(entry.manifest, `registry entry ${id}`);
	const manifestBytes = await readChecked(read, manifestPath, entry.sha256, 'manifest-hash');
	const manifest = checkManifest(parse(manifestBytes, 'the manifest'), entry);

	const base = dirname(manifestPath);
	let solutionBytes: Uint8Array | null = null;
	for (const file of manifest.files) {
		const bytes = await readChecked(read, base + file.path, file.sha256, 'file-hash');
		if (bytes.length !== file.bytes) {
			refuse('file-hash', `${file.path} has ${bytes.length} bytes, not the recorded ${file.bytes}`);
		}
		if (file.path === manifest.solutionFile) solutionBytes = bytes;
	}
	const solution = checkSolution(parse(solutionBytes as Uint8Array, 'the solution file'), manifest);
	return { entry, manifest, solution, grades: entry.status === 'graded' && gateMet };
}
