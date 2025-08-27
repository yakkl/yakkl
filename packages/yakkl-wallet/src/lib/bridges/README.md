# Browser Bridge Pattern

## Overview

The bridge pattern allows us to decouple business logic from platform-specific implementations. This enables the same code to run in different environments (browser extension, Node.js, React Native, etc.) by swapping out the implementation layer.

## Architecture

```
┌──────────────────────────────┐
│     Business Logic Layer     │
│   (Platform Independent)      │
│   Uses: @yakkl/core interfaces│
└───────────────┬──────────────┘
                │
        ┌───────▼────────┐
        │   Interfaces   │
        │  (IStorage,    │
        │  IMessageBus,  │
        │   ILogger)     │
        └───────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│Browser│  │Node.js│  │Mobile │
│Bridge │  │Bridge │  │Bridge │
└───────┘  └───────┘  └───────┘
```

## Usage Examples

### Storage Bridge

```typescript
import { createBrowserStorage } from '$lib/bridges';
import type { IStorage } from '@yakkl/core/interfaces';

// Create a storage instance
const storage: IStorage = createBrowserStorage('local');

// Use it in your service
class WalletService {
  constructor(private storage: IStorage) {}
  
  async saveWallet(wallet: Wallet) {
    await this.storage.set(`wallet_${wallet.id}`, wallet);
  }
  
  async getWallet(id: string) {
    return await this.storage.get(`wallet_${id}`);
  }
}

// In browser extension context
const walletService = new WalletService(createBrowserStorage('local'));

// In Node.js context (different file/package)
// const walletService = new WalletService(createNodeStorage('./data'));

// In React Native context (different file/package)
// const walletService = new WalletService(createAsyncStorage());
```

### Messaging Bridge

```typescript
import { getBrowserMessaging } from '$lib/bridges';
import type { IMessageBus } from '@yakkl/core/interfaces';

const messaging: IMessageBus = getBrowserMessaging();

// Listen for messages
const unsubscribe = messaging.listen('wallet_update', async (message) => {
  console.log('Wallet updated:', message.data);
});

// Send a message and wait for response
const response = await messaging.send('get_balance', {
  address: '0x123...'
}, { timeout: 5000 });

// Send without waiting
messaging.post('notification', {
  type: 'info',
  message: 'Transaction confirmed'
});

// Clean up
unsubscribe();
```

### Logger Bridge

```typescript
import { createBrowserLogger, LogLevel } from '$lib/bridges';
import type { ILogger } from '@yakkl/core/interfaces';

// Create a logger
const logger: ILogger = createBrowserLogger({
  level: LogLevel.DEBUG,
  timestamps: true,
  context: { module: 'wallet' }
});

// Use it
logger.info('Wallet initialized');
logger.debug('Debug data:', { walletId: '123' });
logger.error('Failed to save', new Error('Storage error'));

// Create child logger with additional context
const txLogger = logger.child({ component: 'transactions' });
txLogger.info('Processing transaction'); // Will include both module and component context
```

## Creating Services with Dependency Injection

```typescript
// In @yakkl/core or @yakkl/sdk
export class TransactionService {
  constructor(
    private storage: IStorage,
    private messaging: IMessageBus,
    private logger: ILogger
  ) {}
  
  async saveTransaction(tx: Transaction) {
    this.logger.info('Saving transaction', tx.hash);
    
    // Save to storage
    await this.storage.set(`tx_${tx.hash}`, tx);
    
    // Notify other parts of the app
    this.messaging.post('transaction_saved', tx);
    
    return tx;
  }
}

// In yakkl-wallet (browser extension)
import { TransactionService } from '@yakkl/sdk';
import { localStorageBridge, getBrowserMessaging, logger } from '$lib/bridges';

const txService = new TransactionService(
  localStorageBridge,
  getBrowserMessaging(),
  logger
);

// In yakkl-backend (Node.js)
import { TransactionService } from '@yakkl/sdk';
import { createRedisStorage, createRabbitMQMessaging, createWinstonLogger } from '@yakkl/node-bridges';

const txService = new TransactionService(
  createRedisStorage(),
  createRabbitMQMessaging(),
  createWinstonLogger()
);
```

## Benefits

1. **Platform Independence**: Business logic doesn't depend on browser APIs
2. **Testability**: Easy to mock interfaces for testing
3. **Reusability**: Same code works in multiple environments
4. **Maintainability**: Changes to browser APIs only affect bridge implementations
5. **Type Safety**: TypeScript interfaces ensure consistency

## Migration Strategy

### Phase 1: Create Bridges (✅ Complete)
- Created storage, messaging, and logger bridges
- Implemented browser-specific versions

### Phase 2: Refactor Services (In Progress)
- Update services to use interfaces instead of direct browser APIs
- Use dependency injection for bridges

### Phase 3: Extract to Packages
- Move pure business logic to @yakkl/core or @yakkl/sdk
- Keep only browser-specific code in yakkl-wallet

### Phase 4: Add Other Platforms
- Create Node.js bridges for backend services
- Create React Native bridges for mobile app
- Create Electron bridges for desktop app

## Testing

```typescript
// Easy to test with mock implementations
import { MockStorage, MockMessageBus, MockLogger } from '@yakkl/core/testing';

describe('WalletService', () => {
  it('saves wallet to storage', async () => {
    const storage = new MockStorage();
    const service = new WalletService(storage);
    
    await service.saveWallet({ id: '123', name: 'Test' });
    
    expect(storage.get('wallet_123')).toEqual({
      id: '123',
      name: 'Test'
    });
  });
});
```

## Next Steps

1. **Identify More Services**: Find services that directly use browser APIs
2. **Create Abstractions**: Define interfaces for their needs
3. **Implement Bridges**: Create browser-specific implementations
4. **Refactor Services**: Update to use interfaces
5. **Extract to Packages**: Move platform-independent code to shared packages

This pattern is key to achieving the goal of a truly modular, cross-platform YAKKL ecosystem.