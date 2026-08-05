import { defineConfig } from 'vitest/config';

const config = defineConfig({
	test: {
		include: ['tests/**/*.test.js'],
	},
});

export default config;
