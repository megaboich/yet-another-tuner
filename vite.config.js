/** @import { Plugin, UserConfig } from 'vite' */

/** @typedef {Record<string, { code: string, type: 'chunk' } | { source: string | Uint8Array, type: 'asset' }>} BuildBundle */

const PWA_ASSETS = [
	'apple-touch-icon.png',
	'icon.svg',
	'icon-192.png',
	'icon-512.png',
	'index.html',
	'manifest.webmanifest',
];

/** @param {BuildBundle} bundle */
function getBundleVersion(bundle) {
	let hash = 0;
	for (const fileName of Object.keys(bundle).sort()) {
		const output = bundle[fileName];
		const source = output.type === 'chunk' ? output.code : output.source;
		const content = `${fileName}:${String(source)}`;
		for (let index = 0; index < content.length; index++) {
			hash = Math.imul(31, hash) + content.charCodeAt(index) | 0;
		}
	}
	return (hash >>> 0).toString(36);
}

/** @returns {Plugin} */
function createPwaPrecachePlugin() {
	return {
		name: 'pwa-precache-manifest',
		generateBundle(_options, bundle) {
			// Hashed Vite output names are known only during the production build.
			const assets = [...Object.keys(bundle), ...PWA_ASSETS]
				.filter(fileName => fileName !== 'precache-manifest.js')
				.sort();
			const manifest = `self.__PRECACHE = ${JSON.stringify({ assets, version: getBundleVersion(bundle) })};\n`;
			this.emitFile({ fileName: 'precache-manifest.js', source: manifest, type: 'asset' });
		},
	};
}

/** @type {UserConfig} */
const config = {
	base: './',
	build: {
		sourcemap: false,
	},
	plugins: [createPwaPrecachePlugin()],
	worker: {
		format: 'es',
	},
};

export default config;
