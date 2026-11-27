// The registered solutions, read at build time (P3.3). Vite bundles the
// registry and the jam-or-fold files from `solutions/` into the server build,
// and every page that uses them is prerendered, so the reader's hash checks
// run during `pnpm run build`: a changed or damaged solution fails the build
// instead of reaching a study view or a grade (A-5).

import { loadSolution, type LoadedSolution } from '../spots/reader.ts';
import { sha256Hex } from '../spots/hash.ts';
import { sliceSolution } from '../spots/slice.ts';
import type { Registry } from '../spots/types.ts';
import { factsFromTables, type JamOrFoldFacts } from '../solver/explain.ts';
import { JAM_OR_FOLD_STACKS } from '../solver/jam-or-fold.ts';
import { PreflopTable, type PreflopTableFile } from '../solver/preflop-table.ts';

const raw = import.meta.glob<string>(
	[
		'../../../../solutions/registry.json',
		'../../../../solutions/jam-or-fold/*.json',
		'../../../../solutions/equity/preflop-classes.json'
	],
	{ query: '?raw', import: 'default', eager: true }
);

const PREFIX = '../../../../solutions/';
const files = new Map(
	Object.entries(raw).map(([path, text]) => [
		path.slice(PREFIX.length),
		new TextEncoder().encode(text)
	])
);

function read(path: string): Promise<Uint8Array> {
	const bytes = files.get(path);
	return bytes ? Promise.resolve(bytes) : Promise.reject(new Error(`no solution file ${path}`));
}

export const JAM_OR_FOLD_ID = 'jam-or-fold-hu';

let jamOrFold: Promise<LoadedSolution> | null = null;

/** The whole jam-or-fold solution, checked against the registry once per process. */
export function loadJamOrFold(): Promise<LoadedSolution> {
	jamOrFold ??= read('registry.json').then((bytes) =>
		loadSolution(JSON.parse(new TextDecoder().decode(bytes)) as Registry, JAM_OR_FOLD_ID, read)
	);
	return jamOrFold;
}

/** The jam-or-fold game at `stack` big blinds, ready for a page or a grade. */
export async function jamOrFoldAt(stack: number): Promise<LoadedSolution> {
	if (!JAM_OR_FOLD_STACKS.includes(stack)) {
		throw new RangeError(`no jam-or-fold solution at ${stack} big blinds`);
	}
	return sliceSolution(await loadJamOrFold(), `jof-${stack}bb`);
}

let equity: Promise<PreflopTable> | null = null;

/**
 * The pre-flop equity table the jam-or-fold solution was built from, refused
 * unless its bytes match the SHA-256 the solution's manifest records for it.
 */
function loadEquity(): Promise<PreflopTable> {
	equity ??= (async () => {
		const { manifest } = await loadJamOrFold();
		const input = manifest.inputs.find((i) => i.id === 'preflop-class-equity');
		if (!input) throw new Error('the jam-or-fold manifest names no equity table');
		const bytes = await read(input.path);
		if ((await sha256Hex(bytes)) !== input.sha256) {
			throw new Error(`${input.path} does not match the hash the jam-or-fold manifest records`);
		}
		return new PreflopTable(JSON.parse(new TextDecoder().decode(bytes)) as PreflopTableFile);
	})();
	return equity;
}

/** The numbers explanations draw on at `stack` big blinds (explain.ts), from the checked table. */
export async function jamOrFoldFactsAt(stack: number): Promise<JamOrFoldFacts> {
	const [table, slice] = await Promise.all([loadEquity(), jamOrFoldAt(stack)]);
	return factsFromTables(table, stack, slice.solution.decisions);
}
