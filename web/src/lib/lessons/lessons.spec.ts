// P3.2: lessons are read from a strict Markdown subset with a checked header,
// and a lesson that names a spot no registered solution has is refused, which
// fails the build that prerenders it.

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LessonRefused, lessonForSpot, parseLesson, parseLessons } from './lessons.ts';
import { MarkdownRefused, parseInline, parseMarkdown, plainText } from './markdown.ts';
import { loadJamOrFold } from '../server/solutions.ts';

const known = new Set((await loadJamOrFold()).manifest.spots.map((s) => s.id));
const header = (extra = '', spots = 'jof-10bb-button') =>
	`---\nid: test-lesson\ntitle: A title\nsummary: A summary.\nspots: ${spots}\norder: 3\n${extra}---\n`;

describe('the Markdown subset', () => {
	it('reads headings, paragraphs, lists, notes and inline markup', () => {
		const blocks = parseMarkdown(
			'## Head\n\nOne line\nand the next.\n\n- **a** item\n- an *b* item\n  continued\n\n1. first\n2. [second](/drill/jam-or-fold/10?seat=button)\n\n> A `note`.\n\n### Small\n'
		);
		expect(blocks.map((b) => b.kind)).toEqual([
			'heading',
			'paragraph',
			'list',
			'list',
			'note',
			'heading'
		]);
		expect(blocks[1]).toEqual({
			kind: 'paragraph',
			children: [{ kind: 'text', text: 'One line and the next.' }]
		});
		const bullets = blocks[2];
		expect(bullets.kind === 'list' && !bullets.ordered && plainText(bullets.items[1])).toBe(
			'an b item continued'
		);
		const numbered = blocks[3];
		expect(numbered.kind === 'list' && numbered.ordered && numbered.items[1][0]).toEqual({
			kind: 'link',
			href: '/drill/jam-or-fold/10?seat=button',
			children: [{ kind: 'text', text: 'second' }]
		});
	});

	it('refuses what it does not render, with the line', () => {
		for (const [text, message] of [
			['# Title', /headings are ##/],
			['A <b>bold</b> word', /raw HTML/],
			['![card](/a.png)', /images/],
			['| a | b |', /tables/],
			['```\ncode\n```', /code blocks/],
			['A [link](javascript:alert(1))', /site path or an https/],
			['A [link](http://example.com)', /site path or an https/],
			['An **unclosed word', /unclosed/]
		] as const) {
			expect(() => parseMarkdown(text)).toThrow(message);
		}
		expect(() => parseMarkdown('ok\n\n# no', 10)).toThrow(
			new MarkdownRefused(12, 'headings are ## or ###; the title is the lesson’s')
		);
		expect(parseInline('plain')).toEqual([{ kind: 'text', text: 'plain' }]);
	});
});

describe('a lesson', () => {
	it('reads its header and body', () => {
		const l = parseLesson('lessons/test-lesson.md', header() + '## A\n\nText.\n', known);
		expect(l).toMatchObject({
			id: 'test-lesson',
			title: 'A title',
			summary: 'A summary.',
			spots: ['jof-10bb-button'],
			order: 3
		});
		expect(l.body).toHaveLength(2);
	});

	it('refuses an unknown spot, so the build fails', () => {
		expect(() =>
			parseLesson('test-lesson.md', header('', 'jof-10bb-button, jof-40bb-button') + 'Text.', known)
		).toThrow(/no registered solution has the spot "jof-40bb-button"/);
	});

	it('refuses a header it cannot trust', () => {
		for (const [source, message] of [
			['Text only.', /starts with a --- header/],
			[header('colour: red\n') + 'Text.', /unknown header field/],
			[header().replace('order: 3\n', '') + 'Text.', /has no order/],
			[header().replace('order: 3', 'order: 0') + 'Text.', /whole number from 1/],
			[header().replace('id: test-lesson', 'id: Test_Lesson') + 'Text.', /lower-case words/],
			[header(), /no text/],
			[header() + 'A <i>tag</i>.', /test-lesson.md: line 8: raw HTML/]
		] as const) {
			expect(() => parseLesson('test-lesson.md', source, known)).toThrow(message);
		}
		expect(() => parseLesson('other.md', header() + 'Text.', known)).toThrow(
			/is named test-lesson.md/
		);
		expect(() => parseLesson('test-lesson.md', header() + 'Text.', known)).not.toThrow(
			LessonRefused
		);
	});

	it('refuses two lessons with one id or one order', () => {
		const a = header() + 'A.';
		expect(() => parseLessons({ 'x/test-lesson.md': a, 'y/test-lesson.md': a }, known)).toThrow(
			/two lessons/
		);
	});
});

describe('the lessons in content/lessons/', () => {
	const dir = new URL('../../../../content/lessons/', import.meta.url);
	const files = Object.fromEntries(
		readdirSync(dir).map((f) => [`content/lessons/${f}`, readFileSync(new URL(f, dir), 'utf8')])
	);
	const lessons = parseLessons(files, known);

	it('all read, and the first is jam or fold at 10 big blinds', () => {
		expect(lessons.length).toBeGreaterThanOrEqual(1);
		expect(lessons[0]).toMatchObject({ id: 'jam-or-fold-10bb', order: 1 });
		expect(lessonForSpot(lessons, 'jof-10bb-big-blind')?.id).toBe('jam-or-fold-10bb');
		expect(lessonForSpot(lessons, 'jof-3bb-button')).toBeNull();
	});

	it('state the game’s limits and link to the study view and the drill', () => {
		const l = lessons[0];
		const text = l.body
			.map((b) => (b.kind === 'list' ? b.items.map(plainText).join(' ') : plainText(b.children)))
			.join(' ');
		expect(text).toContain('only jam or fold');
		expect(text).toMatch(/limp or make a smaller raise/);
		const links = JSON.stringify(l.body);
		expect(links).toContain('/study/jam-or-fold/10#button');
		expect(links).toContain('/drill/jam-or-fold/10?seat=button');
		expect(links).toContain('benchmarks.md#b-5');
	});
});
