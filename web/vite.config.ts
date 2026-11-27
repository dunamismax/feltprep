// Started from the sv 1.7.0 scaffold (MIT; licenses/sv-cli.txt).
import { execFileSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

// The commit this build comes from, reported by /healthz as `revision`:
// FELTPREP_REVISION when the deploy sets it, otherwise the checkout's HEAD,
// marked `-dirty` when the tree has uncommitted changes.
function revision(): string {
	if (process.env.FELTPREP_REVISION) return process.env.FELTPREP_REVISION;
	try {
		const git = (...args: string[]) =>
			execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
		return git('rev-parse', 'HEAD') + (git('status', '--porcelain') ? '-dirty' : '');
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			version: { name: revision() },
			// A strict Content Security Policy from the first deploy (AGENTS.md
			// section 13): nothing inline except SvelteKit's own start-up script,
			// which gets a nonce on rendered pages and a hash on prerendered ones.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self'],
					// SvelteKit's route announcer (kit/src/runtime/components/root.svelte)
					// carries one fixed visually-hidden style attribute. Allow exactly
					// that value by its hash rather than every inline style; the e2e
					// CSP test fails if a SvelteKit update changes it.
					'style-src-attr': [
						'unsafe-hashes',
						'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='
					],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.browser.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.browser.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
