/** @import { UserConfig } from 'vite' */

/** @type {UserConfig} */
const config = {
	base: './',
	build: {
		sourcemap: false,
	},
	worker: {
		format: 'es',
	},
};

export default config;
