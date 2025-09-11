import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        store: resolve(__dirname, 'src/store/index.ts'),
        computed: resolve(__dirname, 'src/computed/index.ts'),
        effect: resolve(__dirname, 'src/effect/index.ts'),
        operators: resolve(__dirname, 'src/operators/index.ts'),
        utils: resolve(__dirname, 'src/utils/index.ts'),
      },
      name: 'YakklReactive',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const extension = format === 'es' ? 'mjs' : 'js';
        return entryName === 'index' ? `index.${extension}` : `${entryName}.${extension}`;
      },
    },
    rollupOptions: {
      external: [],
      output: {
        preserveModules: false,
        exports: 'named',
        globals: {},
      },
    },
    target: 'es2022',
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '*.config.ts'],
    },
  },
});