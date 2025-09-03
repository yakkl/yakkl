import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        manifest: resolve(__dirname, 'src/manifest/index.ts'),
        messaging: resolve(__dirname, 'src/messaging/index.ts')
      },
      name: 'YAKKLBrowserExtension',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@yakkl/core', 'webextension-polyfill'],
      output: {
        globals: {
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