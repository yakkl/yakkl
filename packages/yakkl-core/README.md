# @yakkl/core

Foundation wallet engine for all YAKKL products - the core that powers browser extensions, embedded wallets, SDKs, and enterprise solutions.

## Installation

```bash
npm install @yakkl/core
# or
pnpm add @yakkl/core
```

## Features

### 🎯 Core Utilities
Mathematical operations, validation, formatting, and cryptographic utilities that work across all JavaScript environments.

```typescript
import { validateAddress, formatBigNumber, hashMessage } from '@yakkl/core';

// Address validation
const isValid = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3');

// BigNumber formatting
const formatted = formatBigNumber('1000000000000000000', 18); // "1.0"

// Message hashing
const hash = await hashMessage('Hello YAKKL');
```

### 🔌 Provider Abstraction
Chain-agnostic blockchain provider system supporting multiple chains through a unified interface.

```typescript
import { ProviderManager, ChainType } from '@yakkl/core';

const manager = new ProviderManager();
const provider = await manager.getProvider({
  chainId: 1,
  type: ChainType.EVM,
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR-KEY'
});

const balance = await provider.getBalance('0x...');
```

### 💾 Storage System
Flexible storage abstraction supporting multiple backends with encryption and versioning.

```typescript
import { StorageManager, StorageType } from '@yakkl/core';

const manager = new StorageManager();

// Use different storage types
const localStorage = manager.getStorage(StorageType.LOCAL);
const indexedDB = manager.getStorage(StorageType.INDEXED_DB);
const chromeStorage = manager.getStorage(StorageType.CHROME_LOCAL);

// Encrypted storage
const encrypted = manager.getEncryptedStorage(StorageType.LOCAL);
await encrypted.setEncryptionKey('your-secret-key');
await encrypted.set('sensitive', { privateData: 'secret' });

// Versioned storage with history
const versioned = manager.getVersionedStorage(StorageType.INDEXED_DB);
await versioned.set('config', { theme: 'dark' });
await versioned.undo(); // Revert changes
```

### 🔄 State Management
Framework-agnostic reactive state system with persistence and synchronization.

```typescript
import { writable, derived, persisted, synchronized } from '@yakkl/core';

// Basic writable state
const count = writable(0);
count.subscribe(value => console.log('Count:', value));
count.set(5);

// Derived/computed state
const doubled = derived(count, c => c * 2);

// Persisted state (auto-saves to storage)
const settings = persisted({ theme: 'dark' }, 'settings');

// Synchronized state (across tabs/windows)
const sharedState = synchronized({ user: null }, 'shared-channel');
```

### 📨 Messaging System
Centralized message bus for communication between components.

```typescript
import { MessageBus, MessageRouter } from '@yakkl/core';

const bus = new MessageBus();
const router = new MessageRouter();

// Register handler
router.register('user.login', async (payload) => {
  console.log('User logged in:', payload);
  return { success: true };
});

// Send message
const response = await bus.request('user.login', { 
  username: 'alice',
  timestamp: Date.now()
});
```

### 💉 Dependency Injection
IoC container for managing service dependencies.

```typescript
import { Container, BaseService, InjectionToken } from '@yakkl/core';

// Define service
class UserService extends BaseService {
  async getUser(id: string) {
    return { id, name: 'Alice' };
  }
}

// Register and use
const container = new Container();
const USER_SERVICE = new InjectionToken<UserService>('UserService');

container.register(USER_SERVICE, () => new UserService());
const userService = container.get(USER_SERVICE);
```

## API Reference

### Storage

#### StorageManager
```typescript
class StorageManager {
  getStorage(type: StorageType, options?: StorageOptions): IStorage;
  getEncryptedStorage(type: StorageType): IEncryptedStorage;
  getVersionedStorage(type: StorageType): IVersionedStorage;
  getBestAvailableStorage(): IStorage;
}
```

#### Storage Types
- `StorageType.LOCAL` - Browser localStorage
- `StorageType.SESSION` - Browser sessionStorage
- `StorageType.INDEXED_DB` - IndexedDB
- `StorageType.CHROME_LOCAL` - Chrome extension local storage
- `StorageType.CHROME_SYNC` - Chrome extension sync storage
- `StorageType.MEMORY` - In-memory storage

### State

#### State Creation
```typescript
function writable<T>(initial: T, options?: StateOptions): IWritableState<T>;
function readable<T>(initial: T, options?: StateOptions): IReadableState<T>;
function derived<T>(deps: IReadableState[], fn: (...values) => T): IDerivedState<T>;
function persisted<T>(initial: T, key: string): PersistedState<T>;
```

#### State Store
```typescript
const store = createStore({
  user: null,
  settings: { theme: 'dark' },
  tokens: []
});

store.subscribe('user', user => console.log('User changed:', user));
store.set('user', { id: 1, name: 'Alice' });
```

### Providers

#### Provider Manager
```typescript
interface ProviderConfig {
  chainId: number;
  type: ChainType;
  rpcUrl?: string;
  apiKey?: string;
}

class ProviderManager {
  async getProvider(config: ProviderConfig): Promise<IBlockchainProvider>;
  async switchProvider(chainId: number): Promise<void>;
}
```

### Messaging

#### Message Bus
```typescript
class MessageBus {
  async request<T>(type: string, payload?: any): Promise<T>;
  publish(type: string, payload?: any): void;
  subscribe(type: string, handler: MessageHandler): Unsubscribe;
  stream<T>(type: string, payload?: any): AsyncIterator<T>;
}
```

## Migration Guide

### From Browser Storage to Storage Manager
```typescript
// Before
const data = await browser.storage.local.get('key');
await browser.storage.local.set({ key: value });

// After
import { StorageManager, StorageType } from '@yakkl/core';
const storage = new StorageManager().getStorage(StorageType.CHROME_LOCAL);
const data = await storage.get('key');
await storage.set('key', value);
```

### From Svelte Stores to Core State
```typescript
// Before (Svelte-specific)
import { writable } from 'svelte/store';
const store = writable(0);
$store; // Svelte syntax

// After (Framework-agnostic)
import { writable } from '@yakkl/core';
const store = writable(0);
store.get(); // Works everywhere
```

## Examples

### Complete Storage Example
```typescript
import { 
  StorageManager, 
  StorageType,
  StorageMigrator 
} from '@yakkl/core';

// Setup storage with encryption and migrations
const manager = new StorageManager();
const storage = manager.getEncryptedStorage(StorageType.INDEXED_DB);

// Set encryption
await storage.setEncryptionKey('user-password-derived-key');

// Define migrations
const migrations = [
  StorageMigrator.createDataMigration(
    '1.0.0',
    'Initial schema',
    (key, value) => {
      if (key.startsWith('old_')) {
        return null; // Remove old keys
      }
      return value;
    }
  )
];

// Apply migrations
const migrator = manager.createMigrator(storage, migrations);
await migrator.migrate();

// Use storage
await storage.set('user', { id: 1, name: 'Alice' });
```

### State Management with Persistence
```typescript
import { createStore, persisted, synchronized } from '@yakkl/core';

// Create a store with different state types
const store = createStore({
  // Regular state
  count: 0,
  
  // Persisted state (survives reload)
  settings: persisted({ theme: 'dark' }, 'settings'),
  
  // Synchronized state (shared across tabs)
  sharedData: synchronized({ notifications: [] }, 'notifications')
});

// Subscribe to changes
store.subscribe('count', count => {
  console.log('Count changed:', count);
});

// Update state
store.update('count', c => c + 1);
```

## Architecture

```
@yakkl/core/
├── src/
│   ├── interfaces/       # Type definitions
│   ├── utils/           # Utility functions
│   ├── providers/       # Blockchain providers
│   ├── storage/         # Storage implementations
│   ├── state/           # State management
│   ├── messaging/       # Message bus
│   ├── services/        # Service layer
│   └── di/             # Dependency injection
├── dist/               # Compiled output
└── tests/             # Test files
```

## Development

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck
```

## Requirements

- Node.js 20.0.0+
- TypeScript 5.0.0+
- ES2022+ environment

## License

MIT © YAKKL, Inc.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## Support

- [Documentation](https://docs.yakkl.com)
- [GitHub Issues](https://github.com/yakkl/yakkl-core/issues)
- [Discord Community](https://discord.gg/yakkl)