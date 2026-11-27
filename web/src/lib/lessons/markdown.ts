// The Markdown lessons are written in (P3.2): a small, strict subset read
// into plain data that a Svelte component renders, so lesson text never
// reaches the page as HTML and a strict Content Security Policy holds.
// Anything outside the subset (raw HTML, images, tables, a level-one
// heading, a link to another scheme) is refused with its line number, so a
// lesson that would render wrongly fails the build instead.
//
// Blocks: paragraphs separated by blank lines; "## " and "### " headings;
// "- " bullet lists; "1. " numbered lists; "> " notes. Inline: **strong**,
// *emphasis*, `code` and [text](link), where a link is a site path ("/drill/…")
// or an https address.

export type Inline =
	| { readonly kind: 'text'; readonly text: string }
	| { readonly kind: 'strong'; readonly children: readonly Inline[] }
	| { readonly kind: 'em'; readonly children: readonly Inline[] }
	| { readonly kind: 'code'; readonly text: string }
	| { readonly kind: 'link'; readonly href: string; readonly children: readonly Inline[] };

export type Block =
	| { readonly kind: 'heading'; readonly level: 2 | 3; readonly children: readonly Inline[] }
	| { readonly kind: 'paragraph'; readonly children: readonly Inline[] }
	| { readonly kind: 'note'; readonly children: readonly Inline[] }
	| {
			readonly kind: 'list';
			readonly ordered: boolean;
			readonly items: readonly (readonly Inline[])[];
	  };

export class MarkdownRefused extends Error {
	constructor(
		readonly line: number,
		message: string
	) {
		super(`line ${line}: ${message}`);
		this.name = 'MarkdownRefused';
	}
}

/** Read the inline markup of one block's text. */
export function parseInline(text: string, line = 1): Inline[] {
	const out: Inline[] = [];
	let plain = '';
	const flush = () => {
		if (plain) out.push({ kind: 'text', text: plain });
		plain = '';
	};
	let i = 0;
	while (i < text.length) {
		const rest = text.slice(i);
		if (rest.startsWith('<')) throw new MarkdownRefused(line, 'raw HTML is not allowed');
		if (rest.startsWith('![')) throw new MarkdownRefused(line, 'images are not allowed');
		if (rest.startsWith('**')) {
			const end = text.indexOf('**', i + 2);
			if (end < 0) throw new MarkdownRefused(line, 'unclosed **');
			flush();
			out.push({ kind: 'strong', children: parseInline(text.slice(i + 2, end), line) });
			i = end + 2;
			continue;
		}
		if (rest.startsWith('*')) {
			const end = text.indexOf('*', i + 1);
			if (end < 0) throw new MarkdownRefused(line, 'unclosed *');
			flush();
			out.push({ kind: 'em', children: parseInline(text.slice(i + 1, end), line) });
			i = end + 1;
			continue;
		}
		if (rest.startsWith('`')) {
			const end = text.indexOf('`', i + 1);
			if (end < 0) throw new MarkdownRefused(line, 'unclosed `');
			flush();
			out.push({ kind: 'code', text: text.slice(i + 1, end) });
			i = end + 1;
			continue;
		}
		if (rest.startsWith('[')) {
			const m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
			if (!m) throw new MarkdownRefused(line, 'a [ must start a [text](link)');
			const href = m[2];
			if (!/^\/[\w\-/.#?=&]*$/.test(href) && !/^https:\/\/[^\s]+$/.test(href)) {
				throw new MarkdownRefused(line, `links go to a site path or an https address, not ${href}`);
			}
			flush();
			out.push({ kind: 'link', href, children: parseInline(m[1], line) });
			i += m[0].length;
			continue;
		}
		plain += text[i];
		i++;
	}
	flush();
	return out;
}

/** Read a lesson body into blocks. */
export function parseMarkdown(source: string, firstLine = 1): Block[] {
	const lines = source.replace(/\r\n/g, '\n').split('\n');
	const blocks: Block[] = [];
	let i = 0;
	const at = (k: number) => firstLine + k;
	const isBreak = (l: string) =>
		l.trim() === '' || /^#{1,6} /.test(l) || /^- /.test(l) || /^\d+\. /.test(l) || /^> ?/.test(l);
	while (i < lines.length) {
		const line = lines[i];
		if (line.trim() === '') {
			i++;
			continue;
		}
		const heading = /^(#{1,6}) (.+)$/.exec(line);
		if (heading) {
			const level = heading[1].length;
			if (level !== 2 && level !== 3) {
				throw new MarkdownRefused(at(i), 'headings are ## or ###; the title is the lesson’s');
			}
			blocks.push({ kind: 'heading', level, children: parseInline(heading[2].trim(), at(i)) });
			i++;
			continue;
		}
		if (/^(- |\d+\. )/.test(line)) {
			const ordered = /^\d+\. /.test(line);
			const marker = ordered ? /^\d+\. / : /^- /;
			const items: Inline[][] = [];
			while (i < lines.length && marker.test(lines[i])) {
				let text = lines[i].replace(marker, '');
				const start = i;
				i++;
				// An item continues on indented lines.
				while (i < lines.length && /^ {2,}\S/.test(lines[i])) text += ' ' + lines[i++].trim();
				items.push(parseInline(text.trim(), at(start)));
			}
			blocks.push({ kind: 'list', ordered, items });
			continue;
		}
		if (/^> ?/.test(line)) {
			const start = i;
			const parts: string[] = [];
			while (i < lines.length && /^> ?/.test(lines[i])) parts.push(lines[i++].replace(/^> ?/, ''));
			blocks.push({ kind: 'note', children: parseInline(parts.join(' ').trim(), at(start)) });
			continue;
		}
		if (/^\s*\|/.test(line)) throw new MarkdownRefused(at(i), 'tables are not allowed');
		if (/^ {4}|^\t|^```/.test(line))
			throw new MarkdownRefused(at(i), 'code blocks are not allowed');
		const start = i;
		const parts: string[] = [];
		while (i < lines.length && !isBreak(lines[i])) parts.push(lines[i++].trim());
		blocks.push({ kind: 'paragraph', children: parseInline(parts.join(' '), at(start)) });
	}
	return blocks;
}

/** The plain text of some inline markup, for counting and searching. */
export function plainText(children: readonly Inline[]): string {
	return children
		.map((c) => (c.kind === 'text' || c.kind === 'code' ? c.text : plainText(c.children)))
		.join('');
}
