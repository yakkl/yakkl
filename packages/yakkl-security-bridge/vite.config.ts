import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'bridges/store-bridge': resolve(__dirname, 'src/bridges/store-bridge.ts'),
        'bridges/auth-bridge': resolve(__dirname, 'src/bridges/auth-bridge.ts'),
        'bridges/security-bridge': resolve(__dirname, 'src/bridges/security-bridge.ts'),
        'services/wallet-integration.service': resolve(
          __dirname,
          'src/services/wallet-integration.service.ts'
        ),
        'services/security-sync.service': resolve(
          __dirname,
          'src/services/security-sync.service.ts'
        )
      },
      name: 'YakklSecurityBridge',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'mjs' : 'cjs';
        return `${entryName}.${ext}`;
      }
    },
    rollupOptions: {
      external: [
        '@yakkl/auth',
        '@yakkl/reactive',
        '@yakkl/security',
        '@yakkl/security-ui'
      ],
      output: {
        preserveModules: false,
        exports: 'named'
      }
    },
    sourcemap: true,
    target: 'es2020',
    minify: false,
    emptyOutDir: true
  }
});
