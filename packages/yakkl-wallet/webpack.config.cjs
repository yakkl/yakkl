/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { config } = require('dotenv');
const fs = require('fs');

// Load .env file with explicit path
const result = config({ path: path.resolve(__dirname, '.env') });

// Debug: Log if .env was loaded successfully
if (result.error) {
	console.error('[webpack.config] Error loading .env file:', result.error);
} else {
	console.log('[webpack.config] Successfully loaded .env file');
	// Log a few keys to verify they're loaded (without exposing full values)
	const keysToCheck = ['VITE_ALCHEMY_API_KEY_PROD_1', 'ALCHEMY_API_KEY_PROD_1'];
	keysToCheck.forEach(key => {
		if (process.env[key]) {
			console.log(`[webpack.config] ✓ Found ${key}: ${process.env[key].substring(0, 8)}...`);
		} else {
			console.log(`[webpack.config] ✗ Missing ${key}`);
		}
	});
}

function getEnvKeys() {
	const env = process.env;
	const stringifiedEnv = {};
	const viteEnv = {};

	// Critical API keys that must be available
	const criticalKeys = [
		'VITE_ALCHEMY_API_KEY_ETHEREUM',
		'VITE_ALCHEMY_API_KEY_PROD_1',
		'VITE_ALCHEMY_API_KEY_PROD_2',
		'ALCHEMY_API_KEY_PROD_1',
		'ALCHEMY_API_KEY_PROD_2',
		'ALCHEMY_API_KEY_DEV',
		'VITE_INFURA_API_KEY_PROD',
		'INFURA_API_KEY_PROD',
		'INFURA_API_KEY_DEV'
	];

	// First, add all critical keys specifically
	criticalKeys.forEach(key => {
		if (env[key]) {
			stringifiedEnv[`process.env.${key}`] = JSON.stringify(env[key]);
			viteEnv[`import.meta.env.${key}`] = JSON.stringify(env[key]);
		}
	});

	// Then add all other env variables
	for (const key of Object.keys(env)) {
		// Ensure only non-null and non-undefined values are processed
		if (env[key] !== undefined && env[key] !== null && env[key] !== '') {
			stringifiedEnv[`process.env.${key}`] = JSON.stringify(env[key]);

			// Also expose VITE_ prefixed variables in import.meta.env format
			if (key.startsWith('VITE_')) {
				viteEnv[`import.meta.env.${key}`] = JSON.stringify(env[key]);
			}
		}
	}

	// Debug: Log how many env vars we're injecting
	console.log(`[webpack.config] Injecting ${Object.keys(stringifiedEnv).length} process.env vars`);
	console.log(`[webpack.config] Injecting ${Object.keys(viteEnv).length} import.meta.env vars`);

	return { ...stringifiedEnv, ...viteEnv };
}

module.exports = {
	entry: {
		background: './src/contexts/background/extensions/chrome/background.ts',
		content: './src/contexts/background/extensions/chrome/content.ts',
		inpage: './src/contexts/background/extensions/chrome/inpage.ts',
		sandbox: './src/contexts/background/extensions/chrome/sandbox.ts'
	},
	target: 'webworker',
	mode: process.env.NODE_ENV || 'development',
	devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'static/ext'),
		publicPath: '/',
		// Disable chunk loading completely
		// chunkLoadingGlobal: 'webpackChunkYakkl',
		// chunkLoading: false,
		// Prevent webpack from using importScripts in module service workers
		// globalObject: 'self',
		// Ensure no dynamic imports
		// chunkFormat: false,
		// wasmLoading: false,
		// workerChunkLoading: false,
		// workerWasmLoading: false
	},
	optimization: {
		// Disable ALL code splitting and chunking
		splitChunks: false,
		runtimeChunk: false,
		// Prevent async chunks
		// usedExports: false,
		// sideEffects: false,
		// Ensure no chunks are created
		// chunkIds: 'named',
		// moduleIds: 'named',
		minimize: process.env.NODE_ENV === 'production',
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					mangle: {
						reserved: ['browser']
					},
					compress: false,
					keep_classnames: true,
					keep_fnames: true,
					output: {
						beautify: false,
						indent_level: 2
					}
				}
			})
		]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: [
					path.resolve(__dirname, 'node_modules'),
					path.resolve(__dirname, '../../node_modules'),
					path.resolve(__dirname, '../uniswap-alpha-router-service/node_modules'),
					path.resolve(__dirname, '**v1**') // Exclude v1 files - remove this once we are done with v1
				],
				use: [
					{
						loader: 'ts-loader',
						options: {
							configFile: path.resolve(__dirname, 'tsconfig.json'),
							compilerOptions: {
								module: 'esnext'
							}
						}
					}
				]
			}
		]
	},
	resolve: {
		modules: [
			path.resolve(__dirname, 'src'),
			'node_modules'
			// path.resolve(__dirname, '../../node_modules') // Add this to resolve from root node_modules
		],
		extensions: ['.tsx', '.ts', '.js', '.json'],
		plugins: [
			new TsconfigPathsPlugin({
				configFile: path.resolve(__dirname, './tsconfig.json'),
				extensions: ['.ts', '.tsx', '.js', '.json']
			})
		],
		alias: {
			'process/browser': require.resolve('process/browser'),
			'webextension-polyfill': require.resolve('webextension-polyfill'),
			'$lib': path.resolve(__dirname, './src/lib'),
			'$base': path.resolve(__dirname, './src'),
			'$static': path.resolve(__dirname, './src/static'),
			'$components': path.resolve(__dirname, './src/lib/components'),
			'$routes': path.resolve(__dirname, './src/routes'),
			'$managers': path.resolve(__dirname, './src/lib/managers'),
			'$contexts': path.resolve(__dirname, './src/contexts')
		},
		fallback: {
			crypto: require.resolve('crypto-browserify'),
			stream: require.resolve('stream-browserify'),
			vm: require.resolve('vm-browserify'),
			process: require.resolve('process/browser'),
			events: require.resolve('events/'),
			url: require.resolve('url/'),
			buffer: require.resolve('buffer/'),
			fs: false // fs is not available in browser, set to false
		}
	},
	ignoreWarnings: [
		// Ignore dynamic import warnings from DiscoveryProtocol (these are expected for plugin loading)
		{
			module: /DiscoveryProtocol/,
			message: /Critical dependency: the request of a dependency is an expression/
		}
	],
	plugins: [
		// Add error guards at the beginning of content.js and inpage.js bundles
		new webpack.BannerPlugin({
			banner: `(function(){
				if(typeof window!=='undefined'){
					window.addEventListener('error',function(e){
						var msg=String(e.error&&e.error.message||e.message||'');
						if(msg.includes('Extension context invalidated')||
						   msg.includes('Receiving end does not exist')||
						   msg.includes('Cannot access a chrome://')){
							e.preventDefault();
							console.warn('[YAKKL] Extension error silently handled:',msg);
						}
					});
					window.addEventListener('unhandledrejection',function(e){
						var reason=e.reason instanceof Error?e.reason.message:String(e.reason||'');
						if(reason.includes('Extension context invalidated')||
						   reason.includes('Receiving end does not exist')||
						   reason.includes('Cannot access a chrome://')){
							e.preventDefault();
							console.warn('[YAKKL] Unhandled rejection silently handled:',reason);
						}
					});
				}
			})();`,
			raw: true,
			entryOnly: false,
			include: ['content.js', 'inpage.js']
		}),
		new webpack.DefinePlugin({
			...getEnvKeys(),
			DEV_MODE: JSON.stringify(process.env.NODE_ENV !== 'production'),
			__DEV__: process.env.NODE_ENV !== 'production',
			__PROD__: process.env.NODE_ENV === 'production',
			__LOG_LEVEL__: process.env.NODE_ENV === 'production' ? '"WARN"' : '"DEBUG"',
			// Define import.meta.env for compatibility
			'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
			'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
			'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV || 'development'),
			'import.meta.env.VITE_LOG_LEVEL': JSON.stringify(process.env.VITE_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')),
			// Also expose non-VITE prefixed API keys in import.meta.env format for KeyManager compatibility
			'import.meta.env.ALCHEMY_API_KEY_PROD_1': JSON.stringify(process.env.ALCHEMY_API_KEY_PROD_1),
			'import.meta.env.ALCHEMY_API_KEY_PROD_2': JSON.stringify(process.env.ALCHEMY_API_KEY_PROD_2),
			'import.meta.env.ALCHEMY_API_KEY_DEV': JSON.stringify(process.env.ALCHEMY_API_KEY_DEV),
			'import.meta.env.BLOCKNATIVE_API_KEY': JSON.stringify(process.env.BLOCKNATIVE_API_KEY),
			'import.meta.env.INFURA_API_KEY': JSON.stringify(process.env.INFURA_API_KEY),
			'import.meta.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
			'import.meta.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.ANTHROPIC_API_KEY)
		}),
		new webpack.ProvidePlugin({
			process: 'process/browser',
			Buffer: ['buffer', 'Buffer']
		}),
		new CopyPlugin({
			patterns: [
				{
					from: path.resolve(
						__dirname,
						'node_modules/webextension-polyfill/dist/browser-polyfill.js'
					),
					to: path.resolve(__dirname, 'static/ext/browser-polyfill.js')
				}
			]
		})
	]
};
