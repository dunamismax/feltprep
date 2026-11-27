// One lesson (P3.2), prerendered from content/lessons/ with its spots checked.
import { error } from '@sveltejs/kit';
import { loadLessons } from '#lib/server/lessons.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = async () =>
	(await loadLessons()).map((l) => ({ lesson: l.id }));

export const load: PageServerLoad = async ({ params }) => {
	const lessons = await loadLessons();
	const lesson = lessons.find((l) => l.id === params.lesson);
	if (!lesson) error(404, 'No such lesson');
	const next = lessons.find((l) => l.order > lesson.order) ?? null;
	return { lesson, next: next ? { id: next.id, title: next.title } : null };
};
