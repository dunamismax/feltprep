// WCAG 2.2 contrast for the theme's colour tokens (P3.1). The pairs below are
// every foreground the interface draws on each background it draws it on; the
// theme test measures each in both themes from src/app.css, and the /style
// page shows the same numbers measured in the browser.

/** A foreground token drawn on a background token, and the ratio it needs. */
export interface ContrastPair {
	readonly fg: string;
	readonly bg: string;
	/** 4.5 for text (WCAG 1.4.3), 3 for graphics and control edges (1.4.11). */
	readonly min: 4.5 | 3;
}

const text = (fg: string, ...bgs: string[]): ContrastPair[] =>
	bgs.map((bg) => ({ fg, bg, min: 4.5 }));
const graphic = (fg: string, ...bgs: string[]): ContrastPair[] =>
	bgs.map((bg) => ({ fg, bg, min: 3 }));

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
	...text('ink', 'surface', 'raised', 'sunken', 'neutral-soft', 'act-soft', 'fold'),
	...text('muted', 'surface', 'raised', 'sunken'),
	...text('accent', 'surface', 'raised'),
	...text('on-accent', 'accent', 'accent-strong', 'act'),
	...text('on-felt', 'felt', 'felt-edge'),
	...text('suit-club', 'card'),
	...text('suit-diamond', 'card'),
	...text('suit-heart', 'card'),
	...text('suit-spade', 'card'),
	...text('good', 'surface', 'raised', 'good-soft'),
	...text('warn', 'surface', 'raised', 'warn-soft'),
	...text('bad', 'surface', 'raised', 'bad-soft'),
	...graphic('line-strong', 'surface', 'raised'),
	// On the felt the focus ring is drawn in on-felt (app.css), whose 4.5:1
	// against the felt is measured above as text.
	...graphic('focus', 'surface', 'raised'),
	...graphic('card-back-mark', 'card-back'),
	...graphic('act', 'fold', 'surface', 'raised')
];

/** Parse "#rgb" or "#rrggbb" into 0–255 channels. */
export function parseHex(hex: string): [number, number, number] {
	const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) throw new RangeError(`not a hex colour: ${hex}`);
	const h =
		m[1].length === 3
			? m[1]
					.split('')
					.map((c) => c + c)
					.join('')
			: m[1];
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Relative luminance (WCAG 2.2 definition). */
export function luminance([r, g, b]: readonly [number, number, number]): number {
	const lin = (v: number) => {
		const c = v / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
	const la = luminance(parseHex(a));
	const lb = luminance(parseHex(b));
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The `--color-*` tokens declared in a block of CSS, by name without the prefix. */
export function colorTokens(css: string): Map<string, string> {
	const found = new Map<string, string>();
	for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) {
		found.set(m[1], m[2]);
	}
	return found;
}
