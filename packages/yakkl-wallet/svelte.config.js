import adapter from 'sveltekit-adapter-chrome-extension';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

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
			fallback: '404.html',
			precompress: false,
			strict: false
		}),

		alias: {
			// Workspace alias
			'@yakkl/uniswap-alpha-router-service': '../uniswap-alpha-router-service/src',
			// Project aliases (moved from tsconfig paths)
			$base: path.resolve('./src'),
			$static: path.resolve('./src/static'),
			$lib: path.resolve('./src/lib'),
			$components: path.resolve('./src/lib/components'),
			$routes: path.resolve('./src/routes'),
			$managers: path.resolve('./src/lib/managers'),
			$contexts: path.resolve('./src/contexts')
		},

		serviceWorker: {
			register: false
		},

		prerender: {
			handleMissingId: 'ignore',
			entries: ['*'],
			crawl: true,
			handleHttpError: (error) => {
				const { path, status } = error;

				if (status === 500 && path.includes('extension')) {
					// Ignore 500 errors during prerendering (usually due to crypto dependencies)
					return;
				}
				if (status === 404 && path.includes('/accounts/manage/')) {
					// Ignore legacy routes and dynamic routes that no longer exist
					return;
				}
				// Silently ignore other prerender errors as this is a browser extension
				// that requires authentication and cannot be statically rendered
			}
		},

		appDir: 'app'
	}
};

export default config;
