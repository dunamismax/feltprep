// The short-stack practice table at one depth (P3.5). Prerendered at each
// depth from 10 to 15 big blinds with that depth's slice of the jam-or-fold
// solution, whose hashes the build checks; hands are played in the browser.
import { error } from '@sveltejs/kit';
import { jamOrFoldAt, jamOrFoldFactsAt } from '#lib/server/solutions.ts';
import { PRACTICE_STACKS } from '#lib/practice/table.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	PRACTICE_STACKS.map((stack) => ({ stack: String(stack) }));

export const load: PageServerLoad = async ({ params }) => {
	const stack = Number(params.stack);
	if (!/^\d+$/.test(params.stack) || !PRACTICE_STACKS.includes(stack)) {
		error(404, 'The short-stack table plays 10 to 15 big blinds');
	}
	return {
		stack,
		stacks: PRACTICE_STACKS,
		solution: await jamOrFoldAt(stack),
		facts: await jamOrFoldFactsAt(stack)
	};
};
