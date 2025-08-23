# YAKKL SDK

A comprehensive TypeScript SDK for blockchain operations with advanced provider management, automatic failover, and secure key handling.

## Features

- **Multi-Provider Support**: Alchemy, Infura, QuickNode, and generic RPC endpoints
- **Intelligent Routing**: Automatic failover with weighted selection
- **Enhanced Key Management**: Multiple API keys per provider with rotation
- **Transaction Fetching**: Comprehensive transaction history from multiple explorers
- **Price Data**: Real-time and historical cryptocurrency prices
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Secure by Default**: No hardcoded API keys, environment-based configuration

## Quick Start

```typescript
import { YakklSDK } from './sdk';

// Simple initialization
const sdk = new YakklSDK();
await sdk.initialize({
  chainId: 1, // Ethereum mainnet
  features: ['providers', 'explorers', 'prices']
});

// Get current provider
const provider = sdk.getProvider();
if (provider) {
  const blockNumber = await provider.getBlockNumber();
  console.log('Latest block:', blockNumber);
}

// Get transaction history
const txHistory = await sdk.getTransactionHistory('0x...');
console.log('Transaction count:', txHistory.transactions.length);
```

## Factory Methods

```typescript
// Quick setup for specific chains
const ethSDK = await YakklSDK.createForEthereum();
const polygonSDK = await YakklSDK.createForPolygon();
const baseSDK = await YakklSDK.createForBase();

// Custom configuration
const customSDK = await YakklSDK.createCustom({
  chainId: 42161, // Arbitrum
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  features: ['providers']
});
```

## Environment Variables

The SDK automatically detects and uses API keys from environment variables:

```env
# Alchemy keys (multiple for rotation)
ALCHEMY_API_KEY_PROD_1=your_production_key_1
ALCHEMY_API_KEY_PROD_2=your_production_key_2
ALCHEMY_API_KEY_DEV=your_development_key

# Other providers
INFURA_API_KEY=your_infura_key
QUICKNODE_API_KEY=your_quicknode_key
BLOCKNATIVE_API_KEY=your_blocknative_key
```

## Advanced Usage

### Direct Provider Access

```typescript
import { AlchemyProvider, EnhancedKeyManager } from './sdk';

const keyManager = EnhancedKeyManager.getInstance();
await keyManager.initialize();

const provider = new AlchemyProvider(1, keyManager);
await provider.connect(1);

// Use Alchemy-specific features
const nfts = await provider.getNFTsForOwner('0x...', {
  withMetadata: true
});
```

### Custom RPC Providers

```typescript
import { GenericRPCProvider } from './sdk';

// BlockPI with API key
const blockPIProvider = GenericRPCProvider.createBlockPIProvider(
  1, // chainId
  'your_api_key'
);

// LlamaRPC (no API key required)
const llamaProvider = GenericRPCProvider.createLlamaRPCProvider(1);

// Custom endpoint
const customProvider = GenericRPCProvider.createCustomProvider(
  'https://your-rpc-endpoint.com',
  1,
  'ethereum',
  {
    name: 'MyCustomRPC',
    headers: { 'X-API-Key': 'your-key' }
  }
);
```

### Explorer Operations

```typescript
import { explorerRoutingManager } from './sdk';

// Get transaction history with automatic failover
const history = await explorerRoutingManager.getTransactionHistory(
  '0x...',
  {
    limit: 100,
    txType: 'all'
  }
);

// Get token transfers
const transfers = await explorerRoutingManager.getTokenTransfers(
  '0x...',
  {
    tokenType: 'erc20',
    limit: 50
  }
);

// Get internal transactions
const internals = await explorerRoutingManager.getInternalTransactions(
  '0x...',
  {
    startBlock: 18000000,
    limit: 25
  }
);
```

### Key Management

```typescript
import { EnhancedKeyManager } from './sdk';

const keyManager = EnhancedKeyManager.getInstance();
await keyManager.initialize();

// Check available providers
const providers = await keyManager.getProviders();
console.log('Available providers:', providers);

// Get key statistics
const stats = await keyManager.getKeyStats('alchemy');
console.log('Alchemy key stats:', stats);

// Manual key rotation
await keyManager.rotateKey('alchemy');
```

### BigNumber Operations

```typescript
import { BigNumber, EthereumBigNumber } from './sdk';

// Basic BigNumber operations
const amount = BigNumber.from('1000000000000000000'); // 1 ETH in wei
const doubled = amount.mul(2);

// Ethereum-specific operations
const ethAmount = EthereumBigNumber.fromEther('1.5');
const weiValue = ethAmount.toWei();
const formatted = EthereumBigNumber.toFormattedFiat(
  weiValue.value,
  3000, // $3000 per ETH
  'USD'
); // "$4,500.00"
```

### Chain Detection

```typescript
import { detectAndResolveChain } from './sdk';

// Detect chain for an address
const result = await detectAndResolveChain(
  '0x742d35Cc4d3C5B55bEbDb8F0cA6a9F5fA74DdC3B',
  {
    quickMode: false,
    useCache: true
  }
);

if (result) {
  console.log('Recommended chain:', result.recommendedChain);
  console.log('All possible chains:', result.allPossibleChains);
  console.log('Confidence scores:', result.probableChains);
}
```

## Architecture

### Provider Hierarchy

```
BlockchainServiceManager
├── EnhancedKeyManager (API key management)
├── Provider Routing (Alchemy, Infura, RPC)
├── Explorer Routing (Transaction fetching)
└── Price Routing (Price data)
```

### Key Features

1. **Intelligent Failover**: If one provider fails, automatically switches to another
2. **Load Balancing**: Weighted random selection distributes requests
3. **Key Rotation**: Multiple API keys per provider with automatic rotation
4. **Rate Limiting**: Built-in rate limiting and quota tracking
5. **Caching**: Response caching for improved performance
6. **Health Monitoring**: Continuous health checks and metrics

## Error Handling

The SDK provides comprehensive error handling with automatic retries:

```typescript
try {
  const provider = sdk.getProvider();
  const balance = await provider.getBalance('0x...');
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Rate limited - SDK will automatically retry with different key
    console.log('Rate limited, retrying...');
  } else if (error.message.includes('unauthorized')) {
    // API key issue - check your configuration
    console.error('API key problem:', error.message);
  } else {
    // Other error
    console.error('Blockchain error:', error.message);
  }
}
```

## Performance

- **Lazy Loading**: Providers are only initialized when needed
- **Connection Pooling**: Reuses connections when possible
- **Request Batching**: Batches multiple requests when supported
- **Caching**: Intelligent caching of responses
- **Compression**: Automatic response compression

## Security

- **No Hardcoded Keys**: All API keys from environment variables
- **Key Rotation**: Automatic rotation of failed keys
- **Secure Storage**: Keys encrypted in memory when possible
- **Audit Logging**: Comprehensive logging for security audits
- **Rate Limiting**: Prevents API abuse and quota exhaustion

## Supported Chains

| Chain | Chain ID | Providers | Explorer | Prices |
|-------|----------|-----------|----------|--------|
| Ethereum | 1 | ✅ | ✅ | ✅ |
| Goerli | 5 | ✅ | ✅ | ❌ |
| Sepolia | 11155111 | ✅ | ✅ | ❌ |
| Polygon | 137 | ✅ | ✅ | ✅ |
| Mumbai | 80001 | ✅ | ✅ | ❌ |
| Arbitrum | 42161 | ✅ | ✅ | ✅ |
| Arbitrum Goerli | 421613 | ✅ | ✅ | ❌ |
| Optimism | 10 | ✅ | ✅ | ✅ |
| Optimism Goerli | 420 | ✅ | ✅ | ❌ |
| Base | 8453 | ✅ | ✅ | ✅ |
| Base Goerli | 84531 | ✅ | ✅ | ❌ |
| BSC | 56 | ✅ | ❌ | ✅ |
| BSC Testnet | 97 | ✅ | ❌ | ❌ |

## License

MIT License - see LICENSE file for details.