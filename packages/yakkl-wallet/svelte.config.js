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
			fallback: '404.html',
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
			crawl: true,
			 handleHttpError: (error) => {
        // Destructure all available properties from the error object
        const { path, referrer, message, status } = error;

        console.log('Prerender error details:', {
          path: path || 'unknown',
          referrer: referrer || 'unknown',
          message: message || 'no message',
          status: status || 'no status'
        });

        // Set stack trace limit for better debugging
        const originalLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = 100;

        console.trace('Full stack trace for prerender error');

        // Restore original limit
        Error.stackTraceLimit = originalLimit;

				if (status === 500 && path.includes('extension')) {
					// Ignore 500 errors during prerendering (usually due to crypto dependencies)
          // console.trace('browser_ext----------->');
					console.warn(`Ignoring prerender error on ${path} - likely due to crypto dependencies`);
					return;
				}
				if (status === 404 && path.includes('/accounts/manage/')) {
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
