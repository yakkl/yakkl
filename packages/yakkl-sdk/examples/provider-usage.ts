/**
 * YAKKL SDK Provider System - Usage Examples
 *
 * Demonstrates why YAKKL SDK is superior to Ethers/Viem:
 * 1. Provider flexibility
 * 2. Automatic failover
 * 3. Load balancing
 * 4. Built-in caching
 * 5. Rate limiting
 * 6. Smaller bundle size
 */

import {
  ProviderManager,
  AlchemyProvider,
  InfuraProvider,
  EtherscanProvider,
  LoadBalancerStrategy
} from '@yakkl/sdk/providers';

// Example 1: Simple usage with automatic failover
async function basicUsage() {
  // Initialize providers
  const providers = [
    new AlchemyProvider({
      apiKey: 'your-alchemy-key',
      network: 'eth-mainnet',
      priority: 1
    }),
    new InfuraProvider({
      apiKey: 'your-infura-key',
      network: 'mainnet',
      priority: 2
    }),
    new EtherscanProvider({
      apiKey: 'your-etherscan-key',
      chainId: 1,
      priority: 3
    })
  ];

  // Create manager with automatic failover
  const manager = new ProviderManager({
    providers,
    strategy: LoadBalancerStrategy.PRIORITY,
    fallback: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000
    },
    cache: {
      enabled: true,
      ttl: 60000
    }
  });

  // Make requests - automatically uses best available provider
  const balance = await manager.getBalance('0x...');
  const block = await manager.getBlockNumber();
  const tx = await manager.getTransaction('0x...');

  console.log({ balance, block, tx });
}

// Example 2: Load balancing across multiple providers
async function loadBalancingExample() {
  const providers = [
    new AlchemyProvider({
      apiKey: 'key1',
      weight: 3,  // Gets 3x more requests
      rateLimit: { requests: 30, window: 1000 }
    }),
    new InfuraProvider({
      apiKey: 'key2',
      weight: 2,  // Gets 2x more requests
      rateLimit: { requests: 20, window: 1000 }
    }),
    new QuickNodeProvider({
      url: 'https://your-node.quiknode.pro',
      weight: 1,  // Gets 1x requests
      rateLimit: { requests: 50, window: 1000 }
    })
  ];

  const manager = new ProviderManager({
    providers,
    strategy: LoadBalancerStrategy.WEIGHTED_ROUND_ROBIN,
    monitoring: {
      enabled: true,
      healthCheckInterval: 30000
    }
  });

  // Requests are distributed based on weights
  // Alchemy: 50%, Infura: 33%, QuickNode: 17%
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(manager.getBlockNumber());
  }
  await Promise.all(promises);

  // View statistics
  const stats = manager.getStats();
  console.log('Provider statistics:', stats);
}

// Example 3: Cost optimization
async function costOptimizedExample() {
  const manager = new ProviderManager({
    providers: [
      new AlchemyProvider({ apiKey: 'key1', costPerRequest: 0.00012 }),
      new InfuraProvider({ apiKey: 'key2', costPerRequest: 0.00010 }),
      new EtherscanProvider({ apiKey: 'key3', costPerRequest: 0 }) // Free tier
    ],
    strategy: LoadBalancerStrategy.COST_OPTIMIZED
  });

  // Always routes to cheapest provider (Etherscan in this case)
  const tx = await manager.getTransaction('0x...');
}

// Example 4: Advanced features - Batch requests
async function batchExample() {
  const manager = new ProviderManager({
    providers: [new AlchemyProvider({ apiKey: 'key' })],
    cache: { enabled: true }
  });

  // Batch multiple requests for efficiency
  const results = await manager.batch([
    { method: 'eth_getBalance', params: ['0xaddr1', 'latest'] },
    { method: 'eth_getBalance', params: ['0xaddr2', 'latest'] },
    { method: 'eth_getTransactionCount', params: ['0xaddr1', 'latest'] },
    { method: 'eth_getBlockByNumber', params: ['latest', false] }
  ]);

  console.log('Batch results:', results);
}

// Example 5: Comparison with Ethers.js
async function comparisonWithEthers() {
  // ❌ Ethers.js - Single provider, no failover
  // import { ethers } from 'ethers';
  // const provider = new ethers.providers.AlchemyProvider('mainnet', 'api-key');
  // const balance = await provider.getBalance('0x...'); // Fails if Alchemy is down

  // ✅ YAKKL SDK - Multiple providers with automatic failover
  const manager = new ProviderManager({
    providers: [
      new AlchemyProvider({ apiKey: 'key1', priority: 1 }),
      new InfuraProvider({ apiKey: 'key2', priority: 2 }),
      // Falls back to Infura if Alchemy fails
    ],
    fallback: { enabled: true }
  });

  const balance = await manager.getBalance('0x...'); // Never fails if any provider is up
}

// Example 6: Browser Extension Integration (Native Support)
async function browserExtensionExample() {
  // YAKKL SDK has first-class browser extension support
  const manager = new ProviderManager({
    providers: [
      new BrowserExtensionProvider(), // Uses browser.runtime APIs
      new AlchemyProvider({ apiKey: 'backup-key' }) // Fallback
    ]
  });

  // Works seamlessly in browser extensions
  const accounts = await manager.request({ method: 'eth_accounts' });
}

// Example 7: Performance monitoring
async function monitoringExample() {
  const manager = new ProviderManager({
    providers: [/* ... */],
    monitoring: { enabled: true }
  });

  // After some usage...
  const stats = manager.getStats();

  stats.forEach((providerStats, name) => {
    console.log(`${name}:
      - Requests: ${providerStats.requestCount}
      - Errors: ${providerStats.errorCount}
      - Avg Response Time: ${providerStats.averageResponseTime}ms
      - Healthy: ${providerStats.isHealthy}
    `);
  });
}

// Example 8: Dynamic provider management
async function dynamicProviderExample() {
  const manager = new ProviderManager({
    providers: [new AlchemyProvider({ apiKey: 'initial-key' })]
  });

  // Add providers dynamically
  manager.addProvider(new InfuraProvider({ apiKey: 'new-key' }));

  // Remove underperforming providers
  const stats = manager.getStats();
  stats.forEach((providerStats, name) => {
    if (providerStats.errorCount > 100) {
      manager.removeProvider(name);
    }
  });
}

// Export for use in other files
export {
  basicUsage,
  loadBalancingExample,
  costOptimizedExample,
  batchExample,
  comparisonWithEthers,
  browserExtensionExample,
  monitoringExample,
  dynamicProviderExample
};