import { defineConfig, devices } from '@playwright/test';

// Browser tests drive the production build served by adapter-node (`node
// build`), never the dev server. The port is FeltPrep's own, so a server left
// running by another project is never mistaken for this one.
const port = 4391;
const origin = `http://127.0.0.1:${port}`;

const desktop = { viewport: { width: 1440, height: 900 } };
const phone = { viewport: { width: 375, height: 812 }, hasTouch: true };

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: { baseURL: origin, trace: 'retain-on-failure' },
	webServer: {
		command: 'pnpm run build && node build',
		url: `${origin}/healthz`,
		// ORIGIN as in production: without it adapter-node assumes https.
		env: { HOST: '127.0.0.1', PORT: String(port), ORIGIN: origin },
		reuseExistingServer: false,
		timeout: 120_000
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...desktop } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'], ...desktop } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'], ...desktop } },
		{ name: 'chromium-phone', use: { ...devices['Desktop Chrome'], ...phone } },
		{ name: 'firefox-phone', use: { ...devices['Desktop Firefox'], ...phone } },
		{ name: 'webkit-phone', use: { ...devices['Desktop Safari'], ...phone } }
	]
});
