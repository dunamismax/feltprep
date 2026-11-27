// A lesson (P3.2): a Markdown file in content/lessons/ with a short header,
// read and checked here. The header names the lesson, sums it up and lists
// the spots it teaches; a spot no registered solution states, an unknown or
// missing field, or a body outside the Markdown subset is refused, so the
// build that prerenders the lessons fails instead of publishing it.
//
//   ---
//   id: jam-or-fold-10bb
//   title: Jam or fold: heads-up at 10 big blinds
//   summary: One sentence for the lesson list.
//   spots: jof-10bb-button, jof-10bb-big-blind
//   order: 1
//   ---
//   Body in the Markdown subset of markdown.ts.

import { parseMarkdown, type Block } from './markdown.ts';

export interface Lesson {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	/** Spot IDs from the solution registry, such as "jof-10bb-button". */
	readonly spots: readonly string[];
	/** Position in the recommended order, from 1. */
	readonly order: number;
	readonly body: readonly Block[];
}

/** The lesson text's license (D-12), stated on every lesson page. */
export const LESSON_LICENSE = {
	id: 'CC-BY-SA-4.0',
	name: 'Creative Commons Attribution-ShareAlike 4.0 International',
	url: 'https://creativecommons.org/licenses/by-sa/4.0/'
} as const;

export class LessonRefused extends Error {
	constructor(file: string, message: string) {
		super(`${file}: ${message}`);
		this.name = 'LessonRefused';
	}
}

const FIELDS = ['id', 'title', 'summary', 'spots', 'order'] as const;

/**
 * Read lesson `file` from its `source`, checking every spot it names against
 * `knownSpots`, the spot IDs of the registered solutions.
 */
export function parseLesson(file: string, source: string, knownSpots: ReadonlySet<string>): Lesson {
	const text = source.replace(/\r\n/g, '\n');
	const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
	if (!m) throw new LessonRefused(file, 'a lesson starts with a --- header');
	const header = new Map<string, string>();
	for (const line of m[1].split('\n')) {
		const f = /^([a-z]+): (.+)$/.exec(line);
		if (!f) throw new LessonRefused(file, `cannot read the header line "${line}"`);
		if (!(FIELDS as readonly string[]).includes(f[1])) {
			throw new LessonRefused(file, `unknown header field "${f[1]}"`);
		}
		if (header.has(f[1])) throw new LessonRefused(file, `"${f[1]}" is given twice`);
		header.set(f[1], f[2].trim());
	}
	for (const field of FIELDS) {
		if (!header.get(field)) throw new LessonRefused(file, `the header has no ${field}`);
	}
	const id = header.get('id') as string;
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
		throw new LessonRefused(file, `the id "${id}" is not lower-case words joined by hyphens`);
	}
	if (file.replace(/^.*\//, '') !== `${id}.md`) {
		throw new LessonRefused(file, `the file of lesson "${id}" is named ${id}.md`);
	}
	const spots = (header.get('spots') as string).split(',').map((s) => s.trim());
	for (const spot of spots) {
		if (!knownSpots.has(spot)) {
			throw new LessonRefused(file, `no registered solution has the spot "${spot}"`);
		}
	}
	const order = Number(header.get('order'));
	if (!Number.isInteger(order) || order < 1) {
		throw new LessonRefused(file, 'the order is a whole number from 1');
	}
	const headerLines = m[0].split('\n').length - 1;
	let body: Block[];
	try {
		body = parseMarkdown(text.slice(m[0].length), headerLines + 1);
	} catch (e) {
		throw new LessonRefused(file, (e as Error).message);
	}
	if (body.length === 0) throw new LessonRefused(file, 'the lesson has no text');
	return {
		id,
		title: header.get('title') as string,
		summary: header.get('summary') as string,
		spots,
		order,
		body
	};
}

/** Every lesson, checked, in their recommended order; IDs and orders must be unique. */
export function parseLessons(
	files: Readonly<Record<string, string>>,
	knownSpots: ReadonlySet<string>
): Lesson[] {
	const lessons = Object.entries(files).map(([file, text]) => parseLesson(file, text, knownSpots));
	const ids = new Set<string>();
	const orders = new Set<number>();
	for (const l of lessons) {
		if (ids.has(l.id)) throw new LessonRefused(l.id, 'two lessons have this id');
		if (orders.has(l.order)) throw new LessonRefused(l.id, `two lessons have order ${l.order}`);
		ids.add(l.id);
		orders.add(l.order);
	}
	return lessons.sort((a, b) => a.order - b.order);
}

/** The first lesson, in order, that teaches `spot`. */
export function lessonForSpot(lessons: readonly Lesson[], spot: string): Lesson | null {
	return lessons.find((l) => l.spots.includes(spot)) ?? null;
}
