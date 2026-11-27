// The reader refuses every solution whose hashes, format, identity or tables
// are wrong, and loads a correct one (P2.1). Each refusal starts from the same
// valid fixture and changes one thing.

import { describe, expect, it } from 'vitest';
import { sha256Hex, utf8 } from './hash.ts';
import { loadSolution, SolutionRefused, type RefusalReason } from './reader.ts';
import type { GateRecord, Manifest, Registry, SolutionFile } from './types.ts';

const FULL_GATE: GateRecord = {
	statedGame: true,
	noAbstraction: true,
	exploitability: true,
	verifiedVerifier: true,
	independentAgreement: true,
	invariants: true,
	reproducible: true,
	bothPositions: true,
	perHandValues: true
};

function solutionFile(): SolutionFile {
	return {
		format: 1,
		kind: 'solution',
		solution: 'toy',
		decisions: [
			{
				spot: 'toy-button',
				actions: ['fold', 'jam'],
				hands: ['AA', '72o'],
				reach: [1, 1],
				frequencies: [
					[0, 1],
					[0.75, 0.25]
				],
				values: [
					[-0.5, 3.2],
					[-0.5, -0.5]
				],
				margins: [0, 0.001]
			}
		]
	};
}

function manifest(solution: string, solutionHash: string): Manifest {
	return {
		format: 1,
		kind: 'manifest',
		id: 'toy',
		title: 'A toy game for the reader’s tests',
		games: [
			{
				id: 'toy-game',
				title: 'Toy',
				format: 'heads-up no-limit hold’em',
				blinds: { small: 0.5, big: 1 },
				ante: 0,
				rake: 0,
				effectiveStack: 5,
				board: '',
				pot: 1.5,
				ranges: {
					button: { kind: 'all', source: 'every hand' },
					'big-blind': { kind: 'all', source: 'every hand' }
				},
				betting: ['button: jam or fold'],
				caveat: 'A test fixture.'
			}
		],
		spots: [
			{
				id: 'toy-button',
				game: 'toy-game',
				actor: 'button',
				history: [],
				pot: 1.5,
				actions: ['fold', 'jam']
			}
		],
		solutionFile: 'solution.json',
		files: [{ path: 'solution.json', sha256: solutionHash, bytes: utf8(solution).length }],
		inputs: [],
		build: { command: 'none', commit: '0000000', settings: {}, seed: null },
		exploitability: [{ game: 'toy-game', value: 0, unit: 'big blinds per hand', threshold: 0.001 }],
		grading: {
			acceptableFrequency: 0.05,
			acceptableLoss: 0.01,
			inaccuracyLoss: 0.05,
			minReach: 0.01
		}
	};
}

interface Fixture {
	registry: Registry;
	files: Map<string, Uint8Array>;
}

/** A valid registry and files, after `edit` changes the parts before hashing. */
async function fixture(
	edit: {
		solution?: (s: SolutionFile) => unknown;
		manifest?: (m: Manifest) => unknown;
	} = {}
): Promise<Fixture> {
	const solution = JSON.stringify(edit.solution ? edit.solution(solutionFile()) : solutionFile());
	const base = manifest(solution, await sha256Hex(utf8(solution)));
	const manifestText = JSON.stringify(edit.manifest ? edit.manifest(base) : base);
	const registry: Registry = {
		format: 1,
		kind: 'registry',
		solutions: [
			{
				id: 'toy',
				manifest: 'toy/manifest.json',
				sha256: await sha256Hex(utf8(manifestText)),
				status: 'graded',
				gate: FULL_GATE,
				benchmarks: []
			}
		]
	};
	const files = new Map([
		['toy/manifest.json', utf8(manifestText)],
		['toy/solution.json', utf8(solution)]
	]);
	return { registry, files };
}

function reader(files: Map<string, Uint8Array>) {
	return (path: string) => {
		const bytes = files.get(path);
		return bytes ? Promise.resolve(bytes) : Promise.reject(new Error(`no ${path}`));
	};
}

async function refusal(f: Fixture, id = 'toy'): Promise<RefusalReason> {
	try {
		await loadSolution(f.registry, id, reader(f.files));
	} catch (error) {
		expect(error).toBeInstanceOf(SolutionRefused);
		return (error as SolutionRefused).reason;
	}
	throw new Error('the solution was not refused');
}

describe('loadSolution', () => {
	it('loads a solution whose hashes, format and tables are right', async () => {
		const f = await fixture();
		const loaded = await loadSolution(f.registry, 'toy', reader(f.files));
		expect(loaded.grades).toBe(true);
		expect(loaded.solution.decisions[0].hands).toEqual(['AA', '72o']);
	});

	it('loads an unverified solution but does not let it grade', async () => {
		const f = await fixture();
		const entry = { ...f.registry.solutions[0], status: 'unverified' as const };
		f.registry = {
			...f.registry,
			solutions: [{ ...entry, gate: { ...FULL_GATE, reproducible: false } }]
		};
		const loaded = await loadSolution(f.registry, 'toy', reader(f.files));
		expect(loaded.grades).toBe(false);
	});

	it('refuses an id the registry does not list', async () => {
		expect(await refusal(await fixture(), 'other')).toBe('unknown-solution');
	});

	it('refuses a graded entry that misses a gate item', async () => {
		const f = await fixture();
		const entry = f.registry.solutions[0];
		f.registry = {
			...f.registry,
			solutions: [{ ...entry, gate: { ...FULL_GATE, perHandValues: false } }]
		};
		expect(await refusal(f)).toBe('registry-inconsistent');
	});

	it('refuses a manifest whose hash differs from the registry', async () => {
		const f = await fixture();
		const text = new TextDecoder().decode(f.files.get('toy/manifest.json'));
		f.files.set('toy/manifest.json', utf8(text.replace('A toy game', 'A changed game')));
		expect(await refusal(f)).toBe('manifest-hash');
	});

	it('refuses a solution file whose hash differs from the manifest', async () => {
		const f = await fixture();
		const text = new TextDecoder().decode(f.files.get('toy/solution.json'));
		f.files.set('toy/solution.json', utf8(text.replace('3.2', '3.3')));
		expect(await refusal(f)).toBe('file-hash');
	});

	it('refuses a file of the recorded hash but another size', async () => {
		expect(
			await refusal(
				await fixture({
					manifest: (m) => ({ ...m, files: [{ ...m.files[0], bytes: m.files[0].bytes + 1 }] })
				})
			)
		).toBe('file-hash');
	});

	it('refuses a missing file', async () => {
		const f = await fixture();
		f.files.delete('toy/solution.json');
		expect(await refusal(f)).toBe('file-missing');
	});

	it('refuses an unknown manifest format', async () => {
		expect(await refusal(await fixture({ manifest: (m) => ({ ...m, format: 2 }) }))).toBe(
			'unsupported-format'
		);
	});

	it('refuses an unknown solution format', async () => {
		expect(await refusal(await fixture({ solution: (s) => ({ ...s, format: 2 }) }))).toBe(
			'unsupported-format'
		);
	});

	it('refuses an unknown registry format', async () => {
		const f = await fixture();
		f.registry = { ...f.registry, format: 2 as 1 };
		expect(await refusal(f)).toBe('unsupported-format');
	});

	it('refuses a manifest or solution file for another solution', async () => {
		expect(await refusal(await fixture({ manifest: (m) => ({ ...m, id: 'other' }) }))).toBe(
			'id-mismatch'
		);
		expect(await refusal(await fixture({ solution: (s) => ({ ...s, solution: 'other' }) }))).toBe(
			'id-mismatch'
		);
	});

	it('refuses a path that leaves the solutions directory', async () => {
		expect(
			await refusal(
				await fixture({
					manifest: (m) => ({ ...m, files: [{ ...m.files[0], path: '../secret.json' }] })
				})
			)
		).toBe('malformed');
	});

	it('refuses frequencies that do not sum to one', async () => {
		const bad = (s: SolutionFile) => {
			const t = s.decisions[0];
			return {
				...s,
				decisions: [
					{
						...t,
						frequencies: [
							[0, 1],
							[0.7, 0.25]
						]
					}
				]
			};
		};
		expect(await refusal(await fixture({ solution: bad }))).toBe('malformed');
	});

	it('refuses tables that do not match their hands or spot', async () => {
		const short = (s: SolutionFile) => ({ ...s, decisions: [{ ...s.decisions[0], margins: [0] }] });
		const actions = (s: SolutionFile) => ({
			...s,
			decisions: [{ ...s.decisions[0], actions: ['jam', 'fold'] }]
		});
		const spot = (s: SolutionFile) => ({
			...s,
			decisions: [{ ...s.decisions[0], spot: 'nowhere' }]
		});
		const reach = (s: SolutionFile) => ({
			...s,
			decisions: [{ ...s.decisions[0], reach: [1, 1.5] }]
		});
		const value = (s: SolutionFile) => ({
			...s,
			decisions: [
				{
					...s.decisions[0],
					values: [
						[-0.5, null],
						[-0.5, -0.5]
					]
				}
			]
		});
		for (const edit of [short, actions, spot, reach, value]) {
			expect(await refusal(await fixture({ solution: edit }))).toBe('malformed');
		}
	});

	it('refuses bytes that are not JSON', async () => {
		const f = await fixture();
		const garbage = utf8('{not json');
		f.files.set('toy/manifest.json', garbage);
		f.registry = {
			...f.registry,
			solutions: [{ ...f.registry.solutions[0], sha256: await sha256Hex(garbage) }]
		};
		expect(await refusal(f)).toBe('malformed');
	});
});
