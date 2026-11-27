// Review of finished practice hands at one depth (P3.6). Prerendered with that
// depth's slice of the solution, its explanation facts and its lessons; the
// hands themselves are read from the practice session in the browser.
import { error } from '@sveltejs/kit';
import { lessonLinkFor } from '#lib/server/lessons.ts';
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
		solution: await jamOrFoldAt(stack),
		facts: await jamOrFoldFactsAt(stack),
		lessons: {
			button: await lessonLinkFor(`jof-${stack}bb-button`),
			'big-blind': await lessonLinkFor(`jof-${stack}bb-big-blind`)
		}
	};
};
