# YAKKL Core Migration Guide

## Overview
This guide helps migrate existing YAKKL wallet code to use the new @yakkl/core package abstractions.

## Completed Phases (I-VIII)

### Phase I: Core Utilities ✅
**Migrated to @yakkl/core:**
- Mathematical operations → `@yakkl/core/utils/math`
- Validation utilities → `@yakkl/core/utils/validation`
- Formatting utilities → `@yakkl/core/utils/format`
- Crypto utilities → `@yakkl/core/utils/crypto`
- Network utilities → `@yakkl/core/utils/network`

**Migration Example:**
```typescript
// Before
import { validateAddress } from '$lib/utilities/validation';

// After
import { validateAddress } from '@yakkl/core';
```

### Phase II: Interfaces ✅
**Migrated to @yakkl/core:**
- Storage interfaces → `@yakkl/core/interfaces/storage.interface`
- Network interfaces → `@yakkl/core/interfaces/network.interface`
- Wallet interfaces → `@yakkl/core/interfaces/wallet.interface`
- Token interfaces → `@yakkl/core/interfaces/token.interface`
- Provider interfaces → `@yakkl/core/interfaces/provider.interface`

### Phase III: Provider Abstraction ✅
**New in @yakkl/core:**
- `IBlockchainProvider` - Base provider interface
- `ITransactionBuilder` - Transaction construction
- `IContractInterface` - Smart contract interaction
- Chain-agnostic abstractions

### Phase IV: Concrete Providers ✅
**Implemented in @yakkl/core:**
- `EVMProvider` - Ethereum/EVM chains
- `EVMTransactionBuilder` - EVM transaction construction
- `ProviderManager` - Provider lifecycle management

### Phase V: Service Layer ✅
**New service abstractions:**
- `IServiceProvider` - Dependency injection
- `IServiceFactory` - Service creation
- `Container` - IoC container
- `BaseService` - Service foundation

### Phase VI: Messaging ✅
**Enhanced messaging system:**
- `MessageBus` - Central message hub
- `MessageRouter` - Message routing
- `IMessageHandler` - Handler interface
- Stream support for real-time updates

### Phase VII: Storage Abstraction ✅
**Complete storage system:**
- `LocalStorageProvider` - Browser localStorage
- `IndexedDBProvider` - IndexedDB support
- `ChromeStorageProvider` - Extension storage
- `EncryptedStorageWrapper` - Encryption layer
- `VersionedStorageWrapper` - Version history
- `StorageMigrator` - Schema migrations

### Phase VIII: State Management ✅
**Reactive state system:**
- `Observable` - Reactive primitives
- `WritableState` - Mutable state
- `DerivedState` - Computed values
- `StateStore` - Centralized state
- `PersistedState` - Auto-save to storage
- `SynchronizedState` - Cross-context sync

## Migration Steps

### 1. Update Package Dependencies
```json
{
  "dependencies": {
    "@yakkl/core": "workspace:*"
  }
}
```

### 2. Update Imports
Replace wallet-specific imports with @yakkl/core imports:

```typescript
// Storage
import { StorageManager, StorageType } from '@yakkl/core';

// State
import { writable, derived, persisted } from '@yakkl/core';

// Providers
import { EVMProvider, ProviderManager } from '@yakkl/core';

// Services
import { Container, BaseService } from '@yakkl/core';
```

### 3. Migrate Storage Code
```typescript
// Before
const storage = browser.storage.local;
await storage.set({ key: value });

// After
import { StorageManager, StorageType } from '@yakkl/core';
const manager = new StorageManager();
const storage = manager.getStorage(StorageType.CHROME_LOCAL);
await storage.set('key', value);
```

### 4. Migrate State Management
```typescript
// Before (Svelte stores)
import { writable } from 'svelte/store';
const count = writable(0);

// After (Framework-agnostic)
import { writable, persisted } from '@yakkl/core';
const count = writable(0);
const savedCount = persisted(0, 'count'); // Auto-saves to storage
```

### 5. Use New Provider System
```typescript
// Before
const provider = new ethers.JsonRpcProvider(rpcUrl);

// After
import { ProviderManager, ChainType } from '@yakkl/core';
const manager = new ProviderManager();
const provider = await manager.getProvider({
  chainId: 1,
  type: ChainType.EVM,
  rpcUrl
});
```

## Benefits of Migration

1. **Framework Agnostic**: Code works across Svelte, React, Vue, etc.
2. **Better Testing**: Interfaces enable easy mocking
3. **Type Safety**: Full TypeScript support with generics
4. **Performance**: Optimized observable system with batching
5. **Storage Flexibility**: Switch between storage types easily
6. **State Persistence**: Automatic state saving/loading
7. **Cross-Context Sync**: State synchronization across tabs/windows

## Remaining Work

The following packages still need to be extracted/refactored:

### Planned Phases (XI-XVI)

#### Phase XI: SDK Package (@yakkl/sdk)
- Developer-facing APIs
- Wallet integration helpers
- Documentation generation
- Example applications

#### Phase XII: Security Package (@yakkl/security)
- Encryption/decryption services
- Key management
- Secure storage
- Authentication/authorization

#### Phase XIII: Browser Extension (@yakkl/browser-extension)
- Background service abstractions
- Content script utilities
- Extension-specific messaging
- Manifest v3 compatibility

#### Phase XIV: Blockchain Package (@yakkl/blockchain)
- Chain-specific implementations
- Smart contract interfaces
- Transaction management
- Gas optimization

#### Phase XV: UI Components (@yakkl/ui)
- Shared Svelte components
- Design system tokens
- Component documentation
- Storybook integration

#### Phase XVI: Analytics (@yakkl/analytics)
- Event tracking
- Performance monitoring
- Error reporting
- Usage analytics

## Breaking Changes

### Storage API
- `browser.storage` → `StorageManager`
- Async/await required for all operations
- Key-value pairs instead of objects

### State Management
- Svelte stores → Framework-agnostic states
- `$` prefix not available outside Svelte
- Use `.get()` and `.subscribe()` methods

### Provider System
- Direct ethers usage → Provider abstraction
- Chain-specific code → Chain-agnostic interfaces
- Manual provider switching → Automatic management

## Support

For questions or issues during migration:
1. Check the examples in `/examples` directory
2. Review test files for usage patterns
3. Open an issue on GitHub
4. Contact the development team

## Version Compatibility

- @yakkl/core: 0.1.0+
- @yakkl/wallet: 2.0.0+
- Node.js: 20.0.0+
- TypeScript: 5.0.0+