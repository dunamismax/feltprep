// The engine stays browser-safe (AGENTS.md section 6): no engine file imports
// a Node module or anything outside the engine directory. Test files may.

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('./', import.meta.url);
const engineFiles = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.includes('.spec.'));

describe('engine imports', () => {
	it('finds the engine files', () => {
		expect(engineFiles).toEqual(expect.arrayContaining(['state.ts', 'random.ts', 'index.ts']));
	});

	it.each(engineFiles)('%s imports only engine files', (file) => {
		const text = readFileSync(new URL(file, dir), 'utf8');
		const sources = [
			...text.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm)
		].map((m) => m[1]);
		for (const source of sources) expect(source).toMatch(/^\.\/[\w.-]+\.(ts|json)$/);
		expect(text).not.toMatch(/\bnode:/);
		expect(text).not.toMatch(/\brequire\(/);
	});
});
