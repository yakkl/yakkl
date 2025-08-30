import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        mods: resolve(__dirname, 'src/mods/index.ts'),
        embedded: resolve(__dirname, 'src/embedded/index.ts')
      },
      name: 'YakklCore',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['ethers', 'eventemitter3'],
      output: {
        globals: {
          'ethers': 'ethers',
          'eventemitter3': 'EventEmitter3'
        },
        // Preserve export names for better compatibility
        preserveModules: false,
        exports: 'named'
      }
    },
    // Disable minification to preserve export names
    minify: false,
    sourcemap: true,
    target: 'es2020'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});