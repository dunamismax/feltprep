// One game's share of a loaded solution (P3.3). A solution that passed the
// reader's checks may hold many games, such as jam-or-fold at every depth from
// 2 to 15 big blinds; a page needs only one. The slice keeps the registry
// entry, the manifest's record of how the solution was built and checked, and
// exactly that game's statement, spots, exploitability and decision tables, so
// `gradeDecision` gives the same verdict on the slice as on the whole.

import type { LoadedSolution } from './reader.ts';

export function sliceSolution(loaded: LoadedSolution, gameId: string): LoadedSolution {
	const { manifest, solution } = loaded;
	const game = manifest.games.find((g) => g.id === gameId);
	if (!game) throw new RangeError(`${manifest.id} has no game ${gameId}`);
	const spots = manifest.spots.filter((s) => s.game === gameId);
	const ids = new Set(spots.map((s) => s.id));
	return {
		entry: loaded.entry,
		manifest: {
			...manifest,
			games: [game],
			spots,
			exploitability: manifest.exploitability.filter((e) => e.game === gameId)
		},
		solution: { ...solution, decisions: solution.decisions.filter((d) => ids.has(d.spot)) },
		grades: loaded.grades
	};
}
