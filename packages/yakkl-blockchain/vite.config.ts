import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        chains: resolve(__dirname, 'src/chains/index.ts'),
        tokens: resolve(__dirname, 'src/tokens/index.ts'),
        protocols: resolve(__dirname, 'src/protocols/index.ts')
      },
      name: 'YAKKLBlockchain',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@yakkl/core', 'viem'],
      output: {
        globals: {
          '@yakkl/core': 'YAKKLCore',
          'viem': 'viem'
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