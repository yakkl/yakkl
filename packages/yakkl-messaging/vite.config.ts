import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YakklMessaging',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.js'
    },
    rollupOptions: {
      external: ['@yakkl/core'],
      output: {
        globals: {
          '@yakkl/core': 'YakklCore'
        }
      }
    },
    sourcemap: true,
    minify: false
  }
});