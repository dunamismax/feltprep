import { describe, expect, it } from 'vitest';
import { gradeDecision } from '../solver/grading.ts';
import { JAM_OR_FOLD_STACKS } from '../solver/jam-or-fold.ts';
import { jamOrFoldAt, loadJamOrFold } from './solutions.ts';

describe('the bundled jam-or-fold solution', () => {
	it('passes the reader’s checks and may grade', async () => {
		const loaded = await loadJamOrFold();
		expect(loaded.grades).toBe(true);
		expect(loaded.manifest.games).toHaveLength(JAM_OR_FOLD_STACKS.length);
	});

	it.each(JAM_OR_FOLD_STACKS)(
		'sliced at %i bb, grades exactly as the whole does',
		async (stack) => {
			const whole = await loadJamOrFold();
			const slice = await jamOrFoldAt(stack);
			expect(slice.manifest.games.map((g) => g.id)).toEqual([`jof-${stack}bb`]);
			expect(slice.manifest.spots.map((s) => s.id)).toEqual([
				`jof-${stack}bb-button`,
				`jof-${stack}bb-big-blind`
			]);
			expect(slice.solution.decisions).toHaveLength(2);
			expect(slice.manifest.exploitability).toHaveLength(1);
			for (const spot of slice.manifest.spots) {
				const table = slice.solution.decisions.find((d) => d.spot === spot.id);
				expect(table?.hands).toHaveLength(169);
				for (const hand of table?.hands ?? []) {
					for (const action of spot.actions) {
						expect(gradeDecision(slice, spot.id, hand, action)).toEqual(
							gradeDecision(whole, spot.id, hand, action)
						);
					}
				}
			}
		}
	);

	it('refuses a depth outside the solved game', async () => {
		await expect(jamOrFoldAt(16)).rejects.toThrow(RangeError);
		await expect(jamOrFoldAt(9.5)).rejects.toThrow(RangeError);
	});
});
