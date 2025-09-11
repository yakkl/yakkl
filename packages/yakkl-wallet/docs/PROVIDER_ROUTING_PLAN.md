# Provider Routing Migration Plan

## Overview
The provider routing system in YAKKL is sophisticated with intelligent routing, weighted selection, failover, and performance tracking. This should be extracted to `@yakkl/routing` for reuse across the ecosystem.

## Current Implementation Analysis

### Core Components in yakkl-wallet

#### 1. ProviderRoutingManager (`/lib/managers/ProviderRoutingManager.ts`)
**Features:**
- Weighted random provider selection (Alchemy: 7, Infura: 5)
- Auto-suspend after 3 failures
- Override mechanisms (count-based and time-based)
- Performance metrics tracking
- Cost-aware routing (free vs paid tiers)
- Quota management for free tiers
- Circuit breaker pattern

**Key Methods:**
- `getProvider()` - Intelligent provider selection
- `selectProviderByWeight()` - Weighted random selection
- `handleProviderError()` - Error tracking and auto-suspend
- `recordProviderSuccess()` - Performance metrics
- `overrideProvider()` - Force specific provider usage

#### 2. PriceManager (`/lib/managers/PriceManager.ts`)
**Features:**
- Multiple price provider support (Coinbase, Coingecko)
- Weighted selection (Coinbase: 8, Coingecko: 5)
- Automatic retry with exponential backoff
- Provider health tracking

#### 3. Provider Factory (`/lib/managers/ProviderFactory.ts`)
**Purpose:**
- Creates provider instances based on type
- Manages provider initialization
- Handles API key management

### Architecture for @yakkl/routing

```
@yakkl/routing/
├── src/
│   ├── core/
│   │   ├── Router.ts                 # Main routing engine
│   │   ├── ProviderRegistry.ts       # Provider registration
│   │   └── SelectionStrategies.ts    # Selection algorithms
│   ├── providers/
│   │   ├── base/
│   │   │   ├── Provider.ts           # Base provider interface
│   │   │   └── ProviderConfig.ts     # Configuration types
│   │   ├── network/
│   │   │   ├── NetworkProvider.ts    # RPC providers
│   │   │   └── NetworkRouter.ts      # Network-specific routing
│   │   ├── price/
│   │   │   ├── PriceProvider.ts      # Price data providers
│   │   │   └── PriceRouter.ts        # Price-specific routing
│   │   └── data/
│   │       ├── DataProvider.ts       # General data providers
│   │       └── DataRouter.ts         # Data-specific routing
│   ├── strategies/
│   │   ├── WeightedRandom.ts         # Current implementation
│   │   ├── RoundRobin.ts             # Sequential selection
│   │   ├── LowestCost.ts             # Cost optimization
│   │   ├── FastestResponse.ts        # Speed optimization
│   │   └── HealthBased.ts            # Health score based
│   ├── monitoring/
│   │   ├── HealthChecker.ts          # Provider health monitoring
│   │   ├── MetricsCollector.ts       # Performance metrics
│   │   └── QuotaTracker.ts           # Usage quota tracking
│   ├── failover/
│   │   ├── CircuitBreaker.ts         # Circuit breaker pattern
│   │   ├── RetryPolicy.ts            # Retry strategies
│   │   └── Fallback.ts               # Fallback mechanisms
│   └── index.ts                       # Public API exports
```

## Migration Plan

### Phase 1: Core Infrastructure (Week 1)
1. **Create base interfaces**
   - Provider interface
   - Router interface
   - Configuration types

2. **Implement selection strategies**
   - Extract weighted random from current implementation
   - Add additional strategies

3. **Build monitoring system**
   - Health checking
   - Metrics collection
   - Quota tracking

### Phase 2: Provider Types (Week 2)
1. **Network providers**
   - Alchemy
   - Infura
   - QuickNode
   - Custom RPC

2. **Price providers**
   - Coinbase
   - Coingecko
   - Chainlink
   - Custom oracles

3. **Data providers**
   - Etherscan
   - Graph Protocol
   - Custom indexers

### Phase 3: Advanced Features (Week 3)
1. **Intelligent routing**
   - ML-based provider selection
   - Predictive failover
   - Cost optimization algorithms

2. **Multi-chain support**
   - Chain-specific provider pools
   - Cross-chain routing
   - Bridge providers

3. **Enterprise features**
   - SLA enforcement
   - Custom routing policies
   - Audit logging

## Configuration Example

```typescript
import { RouterConfig, ProviderRegistry } from '@yakkl/routing';

const config: RouterConfig = {
  providers: [
    {
      id: 'alchemy-mainnet',
      type: 'network',
      chain: 'ethereum',
      chainId: 1,
      weight: 7,
      endpoint: 'https://eth-mainnet.g.alchemy.com/v2/',
      authentication: {
        type: 'api-key',
        keySource: 'env',
        keyName: 'ALCHEMY_API_KEY'
      },
      quota: {
        type: 'compute-units',
        limit: 300000000,
        period: 'month'
      },
      capabilities: ['archive', 'trace', 'debug']
    },
    {
      id: 'infura-mainnet',
      type: 'network',
      chain: 'ethereum',
      chainId: 1,
      weight: 5,
      endpoint: 'https://mainnet.infura.io/v3/',
      authentication: {
        type: 'api-key',
        keySource: 'env',
        keyName: 'INFURA_API_KEY'
      },
      quota: {
        type: 'requests',
        limit: 100000,
        period: 'day'
      }
    }
  ],
  strategy: 'weighted-random',
  failover: {
    enabled: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    suspendAfterFailures: 3,
    suspendDuration: 300000 // 5 minutes
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    healthCheckInterval: 300000 // 5 minutes
  }
};
```

## Usage Example

```typescript
import { Router, NetworkProvider } from '@yakkl/routing';

// Initialize router
const router = new Router(config);

// Get a provider
const provider = await router.getProvider<NetworkProvider>({
  type: 'network',
  chain: 'ethereum',
  preferCost: true // Prefer free tier
});

// Use provider
const balance = await provider.getBalance(address);

// Report success/failure
if (success) {
  router.reportSuccess(provider.id, responseTime);
} else {
  router.reportFailure(provider.id, error);
}
```

## Benefits of Extraction

1. **Reusability**
   - Use across all YAKKL packages
   - Share routing logic between projects

2. **Testability**
   - Isolated testing of routing logic
   - Mock providers for testing

3. **Maintainability**
   - Single source of truth for routing
   - Easier to add new providers

4. **Performance**
   - Optimized routing algorithms
   - Better caching strategies

5. **Flexibility**
   - Pluggable strategies
   - Custom provider types

## Files to Migrate

### From yakkl-wallet to @yakkl/routing:
- `/lib/managers/ProviderRoutingManager.ts`
- `/lib/managers/PriceManager.ts` (routing logic only)
- `/lib/managers/ProviderFactory.ts`
- `/lib/managers/Provider.ts` (base interface)
- Related provider implementations

### Dependencies to Update:
- All files importing provider managers
- Background services using providers
- UI components displaying provider status

## Testing Requirements

1. **Unit Tests**
   - Selection algorithm correctness
   - Failover mechanisms
   - Quota tracking

2. **Integration Tests**
   - Multi-provider scenarios
   - Network failure handling
   - Performance under load

3. **E2E Tests**
   - Real provider connections
   - Cost optimization validation
   - SLA compliance

## Migration Checklist

- [ ] Create @yakkl/routing package structure
- [ ] Extract core routing logic
- [ ] Implement selection strategies
- [ ] Build monitoring system
- [ ] Add provider implementations
- [ ] Create comprehensive tests
- [ ] Update yakkl-wallet imports
- [ ] Document API
- [ ] Performance benchmarks
- [ ] Migration guide for consumers