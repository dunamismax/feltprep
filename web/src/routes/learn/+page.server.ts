// The list of lessons (P3.2), prerendered.
import { loadLessons } from '#lib/server/lessons.ts';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = async () => ({
	lessons: (await loadLessons()).map(({ id, title, summary, order }) => ({
		id,
		title,
		summary,
		order
	}))
});
