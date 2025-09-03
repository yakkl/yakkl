import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true, // Generate TypeScript declarations
  splitting: true, // Code splitting for better tree-shaking
  sourcemap: true,
  clean: true, // Clean output directory before build
  target: 'es2020',
  external: [
    '@yakkl/core',
    'idb', 
    'lru-cache', 
    'p-queue', 
    'xxhashjs',
    'buffer',
    'process'
  ],
  // Handle Node.js globals properly for browser environment
  esbuildOptions(options) {
    options.platform = 'neutral'; // Build for both Node and browser
    options.define = {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'global': 'globalThis'
    };
  },
  // Replace Buffer usage with a check for browser environment
  banner: {
    js: `
// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}
`.trim()
  }
});
