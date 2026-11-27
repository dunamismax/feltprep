// The lessons in content/lessons/ (P3.2), bundled into the server build and
// checked against the registered solutions' spots. Every lesson page is
// prerendered, so a lesson that names an unknown spot or strays outside the
// Markdown subset fails `pnpm run build`.

import { parseLessons, lessonForSpot, type Lesson } from '../lessons/lessons.ts';
import { loadJamOrFold } from './solutions.ts';

const raw = import.meta.glob<string>('../../../../content/lessons/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});
const files = Object.fromEntries(
	Object.entries(raw).map(([path, text]) => [path.replace(/^(\.\.\/)+/, ''), text])
);

let lessons: Promise<Lesson[]> | null = null;

/** Every lesson, checked, in the recommended order. */
export function loadLessons(): Promise<Lesson[]> {
	lessons ??= loadJamOrFold().then((jof) =>
		parseLessons(files, new Set(jof.manifest.spots.map((s) => s.id)))
	);
	return lessons;
}

/** The lesson that teaches `spot`, as a link's worth of data, or null. */
export async function lessonLinkFor(spot: string): Promise<{ id: string; title: string } | null> {
	const l = lessonForSpot(await loadLessons(), spot);
	return l ? { id: l.id, title: l.title } : null;
}
