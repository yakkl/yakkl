import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        runes: true
      }
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YAKKLUi',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['svelte', '@yakkl/core'],
      output: {
        globals: {
          svelte: 'Svelte',
          '@yakkl/core': 'YAKKLCore'
        }
      }
    },
    sourcemap: true,
    minify: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});