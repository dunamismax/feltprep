import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS, colorTokens, contrast } from './contrast.ts';

const src = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(src, 'app.css'), 'utf8');

function block(start: RegExp): string {
	const m = start.exec(css);
	if (!m) throw new Error(`no block matching ${start}`);
	let depth = 0;
	for (let i = m.index; i < css.length; i++) {
		if (css[i] === '{') depth++;
		if (css[i] === '}' && --depth === 0) return css.slice(m.index, i + 1);
	}
	throw new Error('unclosed block');
}

const light = colorTokens(block(/@theme\s*\{/));
const dark = colorTokens(block(/@media \(prefers-color-scheme: dark\)\s*\{/));

describe('theme tokens', () => {
	it('declare the same colours in both themes', () => {
		expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
		expect(light.size).toBeGreaterThan(20);
	});

	for (const [name, tokens] of [
		['light', light],
		['dark', dark]
	] as const) {
		it(`meet WCAG AA contrast in the ${name} theme`, () => {
			const failures: string[] = [];
			for (const pair of CONTRAST_PAIRS) {
				const fg = tokens.get(pair.fg);
				const bg = tokens.get(pair.bg);
				if (!fg || !bg) {
					failures.push(`${pair.fg} on ${pair.bg}: token missing`);
					continue;
				}
				const ratio = contrast(fg, bg);
				if (ratio < pair.min) {
					failures.push(`${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)} < ${pair.min}`);
				}
			}
			expect(failures).toEqual([]);
		});
	}

	it('compute contrast as WCAG defines it', () => {
		expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 6);
		expect(contrast('#ffffff', '#ffffff')).toBe(1);
		// #767676 on white is the well-known smallest grey that passes 4.5:1.
		expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
	});
});

function files(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) files(path, out);
		else if (name.endsWith('.svelte')) out.push(path);
	}
	return out;
}

describe('components', () => {
	it('use theme tokens, never raw colours (AGENTS.md section 6)', () => {
		const raw = /#[0-9a-f]{3,8}\b(?![-\w])|\brgba?\(|\bhsla?\(|\boklch\(/i;
		const offenders = files(src).filter((path) =>
			// Strip `id="#..."`-free contexts: hrefs to fragments are not colours.
			raw.test(readFileSync(path, 'utf8').replace(/href="#[\w-]*"/g, ''))
		);
		expect(offenders).toEqual([]);
	});
});

describe('contrast pairs', () => {
	it('are listed once each, since the style page keys its table by them', () => {
		const keys = CONTRAST_PAIRS.map((p) => `${p.fg}/${p.bg}`);
		expect(new Set(keys).size).toBe(keys.length);
	});
});
