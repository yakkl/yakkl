import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';
import replace from '@rollup/plugin-replace';
import fs from 'fs';
import { isoImport } from 'vite-plugin-iso-import';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import mockBrowserPolyfill from './vite-plugin-mock-browser-polyfill';
import { getYakklAliases } from './vite.alias.config';

const htmlContent = fs.readFileSync(path.resolve('static/snippet-terms.html'), 'utf-8');

// Ensure NODE_ENV is set
if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
	console.log('NODE_ENV not set, defaulting to development in Vite config');
}
console.log('Vite building with NODE_ENV:', process.env.NODE_ENV);

export default defineConfig(({ mode }) => {
	const isDev = mode === 'development';
	const isProd = mode === 'production';

	return {
		plugins: [
			replace({
				___HTML_SNIPPET___: htmlContent,
				preventAssignment: true
			}),
			mockBrowserPolyfill(),
			sveltekit(),
			isoImport(),
			nodePolyfills({
				protocolImports: true,
				include: ['buffer', 'process', 'util', 'stream', 'events', 'path', 'crypto'],
				exclude: ['fs', 'net'],
				globals: {
					Buffer: true,
					process: true
				}
			}),
			viteStaticCopy({
				targets: [
					{
						src: '_locales',
						dest: ''
					}
				]
			})
		],
		resolve: {
			dedupe: ['dexie'],
			alias: {
				process: 'process/browser',
				$base: path.resolve('./src'),
				$static: path.resolve('./src/static'),
				$lib: path.resolve('./src/lib'),
				$components: path.resolve('./src/lib/components'),
				$routes: path.resolve('./src/routes'),
				$managers: path.resolve('./src/lib/managers'),
				$plugins: path.resolve('./src/lib/plugins'),
				// ...(process.env.YAKKL_PRO === 'true' && { $pro: path.resolve('./src/pro') }),
				// ...(process.env.YAKKL_PRIVATE === 'true' && { $private: path.resolve('./src/private') }),
				//// 'webextension-polyfill': path.resolve( __dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.js' ),
				'webextension-polyfill': path.resolve(__dirname, 'src/lib/polyfill-mock.js'), // Use mock for SSR safety
				stream: 'stream-browserify',
				net: 'net-browserify',
				fs: path.resolve(__dirname, 'empty.js'),
				path: 'path-browserify',
				crypto: 'crypto-browserify',
				ethersv6: path.resolve('node_modules/ethers-v6'),
				ethers: path.resolve('node_modules/ethers'),
				'@yakkl/uniswap-alpha-router-service': '../uniswap-alpha-router-service/src',
				events: 'events',
				...getYakklAliases()
			}
		},
		define: {
			__DEV__: isDev,
			__PROD__: isProd,
			__LOG_LEVEL__: isProd ? '"WARN"' : '"DEBUG"',
			ENVIRONMENT: JSON.stringify(mode), // Add this for generic environment checking
			'process.env': {
				DEV_MODE: JSON.stringify(process.env.NODE_ENV !== 'production'), // This is used to determine if we are in development mode to flush out non-production code
				NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
			},
			__version__: JSON.stringify(process.env.npm_package_version),
			'process.env.DEV_MODE': process.env.DEV_MODE || false
		},
		optimizeDeps: {
			include: ['dexie'],
			exclude: [
				'webextension-polyfill',
				'ethers',
				'**/*.tmp/**/*', // Exclude .tmp directories - the .tmp items here do not seem to be working as expected. I will keep it and handle it another way.
				'**/*.tmp' // Exclude .tmp files
			],
			entries: [
				'!**/*.tmp/**/*', // Exclude .tmp directories
				'!**/*.tmp' // Exclude .tmp files
			],
			esbuildOptions: {
				define: {
					global: 'globalThis'
				}
			}
		},
		ssr: {
			noExternal: ['@walletconnect/web3wallet', '@walletconnect/core'],
			external: ['webextension-polyfill']
		},
		build: {
			sourcemap: true,
			minify: 'terser',
			terserOptions: {
				compress: false,
				mangle: false,
				keep_classnames: true,
				keep_fnames: true,
				format: {
					beautify: false //true,
				}
			},
			commonjsOptions: {
				transformMixedEsModules: true,
				include: [/node_modules/]
			},
			rollupOptions: {
				external: ['webextension-polyfill'],
				plugins: [
					// Prevent webextension-polyfill from being loaded during build
					{
						name: 'block-webextension-polyfill',
						resolveId(id) {
							if (id === 'webextension-polyfill' || id.includes('webextension-polyfill')) {
								return false; // Don't resolve this import
							}
							return null;
						}
					},
					{
						name: 'ignore-node-stuff',
						resolveId(source) {
							if (source === 'net' || source.includes('provider-ipcsocket')) {
								return { id: 'net', external: true, moduleSideEffects: false };
							}
							if (source === 'fs' || source === 'fs/promises') {
								return { id: source, external: true, moduleSideEffects: false };
							}
							return null;
						},
						load(id) {
							if (id === 'net') {
								return 'export const connect = () => { throw new Error("net.connect not available in browser") };';
							}
							if (id === 'fs' || id === 'fs/promises') {
								return 'export default {}; export const readFileSync = () => ""; export const existsSync = () => false; export const promises = {};';
							}
							return null;
						}
					}
				]
			}
		},
		esbuild: {
			// Remove debug and info logs in production
			drop: isProd ? ['debugger'] : [],
			// Mark certain functions as pure for tree-shaking
			pure: isProd ? ['log.debug', 'log.info', 'log.debugStack', 'log.infoStack'] : []
		}
	};
});
