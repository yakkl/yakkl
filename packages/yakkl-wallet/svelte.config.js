import adapter from 'sveltekit-adapter-chrome-extension';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess({ script: true }),

	onwarn: (warning, handler) => {
		if (warning.code.startsWith('a11y-')) {
			return;
		}
		handler(warning);
	},

	kit: {
		adapter: adapter({
			// Default options
			pages: 'build',
			assets: 'build',
			fallback: null,
			precompress: false,
			strict: false
		}),

		alias: {
			'@yakkl/uniswap-alpha-router-service': '../uniswap-alpha-router-service/src'
		},

		serviceWorker: {
			register: false
		},

		prerender: {
			handleMissingId: 'ignore',
			entries: ['*'],
			handleHttpError: ({ status, path, referrer, referenceType }) => {
				console.warn(`Prerendering error: ${status} on ${path}`);
				if (status === 500 && path === '/accounts') {
					// Ignore the error or log it
					return;
				}
				if (status === 404 && (path.includes('/preview2') || path.includes('/v2') || path.includes('/accounts/manage/'))) {
					// Ignore legacy routes and dynamic routes that no longer exist
					return;
				}
				// Just log the error instead of throwing for missing dynamic routes
				console.warn(`Prerender warning: ${status} on ${path}`);
			}
		},

		appDir: 'app'
	}
};

export default config;
