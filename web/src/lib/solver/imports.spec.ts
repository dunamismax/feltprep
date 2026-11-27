// Solver and contract files stay plain (AGENTS.md section 6): relative `.ts`
// imports inside src/lib only, no Node module, so each runs in the browser,
// in Vitest and under node for the build scripts. Test files may use Node.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dirs = ['../solver/', '../spots/'].map((d) => new URL(d, import.meta.url));
const files = dirs.flatMap((dir) =>
	readdirSync(dir)
		.filter((f) => f.endsWith('.ts') && !f.includes('.spec.'))
		.map((f) => new URL(f, dir))
);

describe('solver and contract imports', () => {
	it('finds the files', () => {
		expect(files.length).toBeGreaterThan(3);
	});

	it.each(files.map((f) => [f.pathname.split('/').slice(-2).join('/'), f] as const))(
		'%s imports only plain files',
		(_, file) => {
			const text = readFileSync(file, 'utf8');
			const sources = [
				...text.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm)
			].map((m) => m[1]);
			for (const source of sources) {
				expect(source).toMatch(/^\.\.?\/(?:(?:engine|solver|spots)\/)?[\w.-]+\.(ts|json)$/);
			}
			expect(text).not.toMatch(/\bnode:/);
			expect(text).not.toMatch(/\brequire\(/);
		}
	);
});
