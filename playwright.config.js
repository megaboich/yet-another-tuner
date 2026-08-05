/** @import { PlaywrightTestConfig } from '@playwright/test' */

import { defineConfig, devices } from '@playwright/test';

/** @type {PlaywrightTestConfig} */
const config = defineConfig({
	testDir: './tests',
	testMatch: '**/*.spec.js',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173/yet-another-tuner/',
		permissions: ['microphone'],
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: {
					args: [
						'--use-fake-device-for-media-stream',
						'--use-fake-ui-for-media-stream',
					],
				},
			},
		},
	],
	webServer: {
		command: 'pnpm exec vite build --base=/yet-another-tuner/ && pnpm exec vite preview --base=/yet-another-tuner/ --host 127.0.0.1',
		url: 'http://127.0.0.1:4173/yet-another-tuner/',
		reuseExistingServer: !process.env.CI,
	},
});

export default config;
