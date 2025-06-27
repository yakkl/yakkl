/**
 * Vite config for building with YAKKL Core integration
 */

import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  
  define: {
    // Enable core integration
    __YAKKL_CORE_ENABLED__: true,
    __VAULTLETS_ENABLED__: true,
    __TIER_PRO_OR_HIGHER__: true,
    __TIER_PRIVATE__: true
  },
  
  // Optimized dependencies for core
  optimizeDeps: {
    include: [
      '@yakkl/core',
      '@yakkl/sdk'
    ]
  },
  
  build: {
    // Generate source maps for debugging
    sourcemap: true,
    
    // Optimize for modern browsers
    target: 'es2020',
    
    rollupOptions: {
      // External dependencies that should not be bundled
      external: [
        // Keep these external for dynamic loading
      ],
      
      output: {
        // Ensure proper chunking
        manualChunks: {
          'yakkl-core': ['@yakkl/core'],
          'yakkl-sdk': ['@yakkl/sdk'],
          'vaultlets': [
            '/src/lib/components/vaultlets/VaultletRenderer.svelte',
            '/src/lib/components/vaultlets/VaultletDashboard.svelte'
          ]
        }
      }
    }
  },
  
  // Resolve aliases for core integration
  resolve: {
    alias: {
      '@yakkl/core': process.env.NODE_ENV === 'development' 
        ? '../yakkl-core/src/index.ts'
        : '@yakkl/core',
      '@yakkl/sdk': process.env.NODE_ENV === 'development'
        ? '../yakkl-sdk/src/index.ts' 
        : '@yakkl/sdk'
    }
  },
  
  // Server configuration for development
  server: {
    port: 5173,
    host: true,
    fs: {
      // Allow serving files from sibling packages
      allow: ['..']
    }
  }
});