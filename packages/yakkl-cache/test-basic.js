// Basic test to verify the package works
import { createCache, CachePresets } from './dist/index.mjs';

console.log('Testing @yakkl/cache package...');

// Test 1: Create cache with default config
const cache = createCache();
console.log('✓ Created cache with default config');

// Test 2: Access cache presets
console.log('✓ Cache presets available:', Object.keys(CachePresets));

// Test 3: Create cache with preset
const walletCache = createCache(CachePresets.browserExtension);
console.log('✓ Created cache with browser extension preset');

console.log('\n✅ All basic tests passed!');
console.log('The @yakkl/cache package is ready for integration.');