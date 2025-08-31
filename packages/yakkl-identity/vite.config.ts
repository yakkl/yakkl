import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YakklIdentity',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['jose', 'tweetnacl', '@simplewebauthn/server', '@simplewebauthn/browser', 'crypto', 'fs', 'path'],
      output: {
        globals: {
          jose: 'jose',
          tweetnacl: 'nacl',
          crypto: 'crypto'
        }
      }
    },
    target: 'es2020',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});