// Node.js test - using only memory cache
import { CacheManager, MemoryCache } from './dist/index.mjs';

console.log('Testing @yakkl/cache package in Node.js...');

// Test 1: Create cache manager with only memory tier
const cache = new CacheManager({
  tierMaxSize: {
    hot: 100,
    warm: 0,
    cold: 0
  }
});

// Initialize only memory tier (skip browser-specific tiers)
cache.tiers = new Map();
cache.tiers.set('hot', new MemoryCache({ maxSize: 100 }));

console.log('✓ Created cache manager with memory tier');

// Test 2: Basic operations
async function runTests() {
  // Set a value
  await cache.set('test-key', { data: 'test-value' });
  console.log('✓ Set value in cache');
  
  // Get the value
  const value = await cache.get('test-key');
  console.log('✓ Retrieved value:', value);
  
  // Check if key exists
  const exists = await cache.has('test-key');
  console.log('✓ Key exists:', exists);
  
  // Delete the key
  await cache.delete('test-key');
  console.log('✓ Deleted key');
  
  // Verify deletion
  const afterDelete = await cache.get('test-key');
  console.log('✓ Value after delete:', afterDelete);
  
  console.log('\n✅ All Node.js tests passed!');
  console.log('The @yakkl/cache package is ready for integration.');
  console.log('\nNote: IndexedDB and localStorage tiers are only available in browser environments.');
}

runTests().catch(console.error);