import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })] as any,
  test: {
    include: ['lib/tests/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['lib/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'lib/tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 60, // Lowered for initial implementation
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    }
  },
  resolve: {
    alias: {
      '$lib': resolve(__dirname, '../../../lib'),
      '$app': resolve(__dirname, '../../../app'),
      '$stores': resolve(__dirname, 'lib/stores'),
      '$services': resolve(__dirname, 'lib/services'),
      '$features': resolve(__dirname, 'lib/features'),
      '$components': resolve(__dirname, 'lib/components'),
      '$utils': resolve(__dirname, 'lib/utils'),
      '$types': resolve(__dirname, 'lib/types')
    }
  },
  define: {
    global: 'globalThis'
  },
  // Handle module mocking
  optimizeDeps: {
    include: ['@testing-library/svelte']
  }
});