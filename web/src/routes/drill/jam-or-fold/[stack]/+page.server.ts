// The drill for the jam-or-fold game at one depth (P3.4). Prerendered at
// every solved depth, so the solution's hash checks run in the build; the
// drill itself, its deals and its grades, run in the browser (A-3).
import { error } from '@sveltejs/kit';
import { jamOrFoldAt, jamOrFoldFactsAt } from '#lib/server/solutions.ts';
import { JAM_OR_FOLD_STACKS } from '#lib/solver/jam-or-fold.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	JAM_OR_FOLD_STACKS.map((stack) => ({ stack: String(stack) }));

export const load: PageServerLoad = async ({ params }) => {
	const stack = Number(params.stack);
	if (!/^\d+$/.test(params.stack) || !JAM_OR_FOLD_STACKS.includes(stack)) {
		error(404, 'No jam-or-fold solution at that depth');
	}
	return {
		stack,
		stacks: JAM_OR_FOLD_STACKS,
		solution: await jamOrFoldAt(stack),
		facts: await jamOrFoldFactsAt(stack)
	};
};
