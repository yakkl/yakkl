import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YakklSDK',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@yakkl/core', 'ethers', 'eventemitter3'],
      output: {
        globals: {
          '@yakkl/core': 'YakklCore',
          'ethers': 'ethers',
          'eventemitter3': 'EventEmitter'
        }
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false // Keep readable for debugging
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});