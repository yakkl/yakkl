/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const { config } = require('dotenv');
const fs = require('fs');

config();

function getEnvKeys() {
  const env = process.env;
  const stringifiedEnv = {};

  for (const key of Object.keys(env)) {
    // Ensure only non-null and non-undefined values are processed
    if (env[key] !== undefined) {
      stringifiedEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  return stringifiedEnv;
}

module.exports = {
  entry: {
    background: ['./src/lib/extensions/chrome/background.ts'],
    content: ['./src/lib/extensions/chrome/content.ts'],
    inpage: ['./src/lib/extensions/chrome/inpage.ts'],
    sandbox: ['./src/lib/extensions/chrome/sandbox.ts'],
  },
  target: 'webworker',
  mode: process.env.NODE_ENV || 'development',
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'static/ext'),
    publicPath: '/',
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {
            reserved: ['browser'],
          },
          compress: false,
          keep_classnames: true,
          keep_fnames: true,
          output: {
            beautify: false,
            indent_level: 2,
          },
        },
      }),
    ],
    // splitChunks: {
    //   chunks: 'all', // Splits common dependencies into separate files
    // },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [
          path.resolve(__dirname, 'node_modules'),
          path.resolve(__dirname, '../../node_modules'),
          path.resolve(__dirname, '../uniswap-alpha-router-service/node_modules')
        ],
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
              compilerOptions: {
                module: 'esnext',
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'src'),
      'node_modules',
      // path.resolve(__dirname, '../../node_modules') // Add this to resolve from root node_modules
    ],
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      'process/browser': require.resolve('process/browser'),
      'webextension-polyfill': require.resolve('webextension-polyfill'),
      '$lib': path.resolve(__dirname, 'src/lib'),
      '$lib/common': path.resolve(__dirname, 'src/lib/common'),
      '$plugins': path.resolve(__dirname, 'src/lib/plugins'),
      '$lib/plugins': path.resolve(__dirname, 'src/lib/plugins'),
    },
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      vm: require.resolve( 'vm-browserify' ),
      process: require.resolve( 'process/browser' ),
      events: require.resolve( 'events/' ),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      ...getEnvKeys(),
      'DEV_MODE': JSON.stringify(process.env.NODE_ENV !== 'production'),
      '__DEV__': process.env.NODE_ENV !== 'production',
      '__PROD__': process.env.NODE_ENV === 'production',
      '__LOG_LEVEL__': process.env.NODE_ENV === 'production' ? '"WARN"' : '"DEBUG"'
    }),
    new webpack.ProvidePlugin({
      browser: ['webextension-polyfill', 'default'],
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.js'),
          to: path.resolve(__dirname, 'static/ext/browser-polyfill.js')
        },
      ],
    }),
  ]
};
