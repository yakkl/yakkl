import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YakklCache',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rollupOptions: {
      external: ['@yakkl/core', 'idb', 'lru-cache', 'p-queue', 'xxhashjs'],
      output: {
        globals: {
          '@yakkl/core': 'YakklCore',
          'buffer': 'Buffer'
        }
      }
    },
    target: 'es2020',
    sourcemap: true,
    minify: false
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'global': 'globalThis'
  }
});