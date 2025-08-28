# YAKKL Build Execution Plan
*Step-by-Step Implementation Guide*
*Date: 2024-12-27*

## 🎯 Mission Critical: Keep Wallet Running!

**Golden Rule**: Every change must be tested in isolation before integration.

## Phase 0: Setup & Preparation (Day 1)

### Create Package Structure
```bash
# From /yakkl root
mkdir -p packages/yakkl-core/src/{utils,types,constants,interfaces}
mkdir -p packages/yakkl-sdk/src/{providers,contracts,transactions,interfaces}

# Initialize packages
cd packages/yakkl-core && npm init -y
cd packages/yakkl-sdk && npm init -y
```

### Setup TypeScript Configs
```json
// yakkl-core/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true
  },
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Create Abstraction Interfaces FIRST
```typescript
// yakkl-core/src/interfaces/storage.interface.ts
export interface IStorage {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// yakkl-core/src/interfaces/messaging.interface.ts
export interface IMessageBus {
  send<T = any, R = any>(channel: string, data: T): Promise<R>;
  listen<T = any>(channel: string, handler: (data: T) => void): () => void;
}

// yakkl-core/src/interfaces/logger.interface.ts
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: any, ...args: any[]): void;
}
```

## Phase 1: Copy Pure Utilities (Day 2-3)

### Step 1.1: Identify Pure Functions
```bash
# Check each file for browser dependencies
grep -r "browser\." src/lib/common/bignumber.ts
# If no results, it's pure and safe to copy
```

### Step 1.2: Copy BigNumber (Example)
```bash
# COPY, don't move!
cp src/lib/common/bignumber.ts ../yakkl-core/src/utils/bignumber.ts
cp src/lib/common/bignumber.test.ts ../yakkl-core/tests/bignumber.test.ts
```

### Step 1.3: Update Imports in Copied File
```typescript
// yakkl-core/src/utils/bignumber.ts
// BEFORE (if any browser deps):
import { browser } from 'webextension-polyfill';

// AFTER:
// Remove ALL browser imports
// Use abstractions if needed:
import { ILogger } from '../interfaces/logger.interface';

export class BigNumber {
  constructor(private logger?: ILogger) {
    // Optional logger injection
  }
}
```

### Step 1.4: Create Tests
```typescript
// yakkl-core/tests/bignumber.test.ts
import { BigNumber } from '../src/utils/bignumber';

describe('BigNumber', () => {
  it('works without browser APIs', () => {
    const num = new BigNumber('1000000000000000000');
    expect(num.toString()).toBe('1000000000000000000');
  });
});
```

### Step 1.5: Build & Test New Package
```bash
cd packages/yakkl-core
npm run build
npm test
```

## Phase 2: Create Bridge Implementations (Day 4-5)

### Browser Implementation (in yakkl-wallet)
```typescript
// yakkl-wallet/src/lib/bridges/storage.bridge.ts
import browser from 'webextension-polyfill';
import type { IStorage } from '@yakkl/core';

export class BrowserStorage implements IStorage {
  async get<T>(key: string): Promise<T | null> {
    const result = await browser.storage.local.get(key);
    return result[key] || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  async clear(): Promise<void> {
    await browser.storage.local.clear();
  }
}
```

### Mock Implementation (for testing)
```typescript
// yakkl-core/tests/mocks/storage.mock.ts
import type { IStorage } from '../src/interfaces/storage.interface';

export class MockStorage implements IStorage {
  private store = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.store.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
```

## Phase 3: Migrate Services with Dependencies (Day 6-8)

### Example: TransactionService Migration
```typescript
// ORIGINAL: yakkl-wallet/src/lib/services/transaction.service.ts
import browser from 'webextension-polyfill';

export class TransactionService {
  async saveTransaction(tx: Transaction) {
    // Direct browser API usage
    await browser.storage.local.set({ 
      [`tx_${tx.hash}`]: tx 
    });
  }
}

// COPIED TO: yakkl-sdk/src/services/transaction.service.ts
import type { IStorage } from '@yakkl/core';

export class TransactionService {
  constructor(private storage: IStorage) {}

  async saveTransaction(tx: Transaction) {
    // Uses injected storage
    await this.storage.set(`tx_${tx.hash}`, tx);
  }
}

// BRIDGE IN: yakkl-wallet/src/lib/bridges/transaction.bridge.ts
import { TransactionService } from '@yakkl/sdk';
import { BrowserStorage } from './storage.bridge';

export function createTransactionService() {
  const storage = new BrowserStorage();
  return new TransactionService(storage);
}
```

## Phase 4: Integration Testing (Day 9-10)

### Test Harness Setup
```typescript
// yakkl-wallet/tests/integration/migration.test.ts
import { BigNumber } from '@yakkl/core';
import { TransactionService } from '@yakkl/sdk';
import { BrowserStorage } from '$lib/bridges/storage.bridge';

describe('Migration Integration', () => {
  it('yakkl-core works in wallet context', () => {
    const num = new BigNumber('1000');
    expect(num).toBeDefined();
  });

  it('yakkl-sdk works with browser storage', async () => {
    const storage = new BrowserStorage();
    const service = new TransactionService(storage);
    
    await service.saveTransaction({ hash: '0x123', value: '1000' });
    const tx = await storage.get('tx_0x123');
    expect(tx).toBeDefined();
  });
});
```

### End-to-End Test
```typescript
// yakkl-wallet/tests/e2e/wallet.test.ts
test('Wallet works with new packages', async () => {
  // Load extension
  const extension = await loadExtension();
  
  // Create wallet
  await extension.createWallet('password');
  
  // Check new packages are working
  const balance = await extension.getBalance();
  expect(balance).toBeDefined(); // Uses BigNumber from @yakkl/core
});
```

## Phase 5: Gradual Replacement (Day 11-15)

### Feature Flag Strategy
```typescript
// yakkl-wallet/.env
USE_NEW_CORE=false
USE_NEW_SDK=false
```

### Conditional Imports
```typescript
// yakkl-wallet/src/lib/utils/imports.ts
const USE_NEW_CORE = import.meta.env.VITE_USE_NEW_CORE === 'true';

export const BigNumber = USE_NEW_CORE 
  ? await import('@yakkl/core').then(m => m.BigNumber)
  : await import('$lib/common/bignumber').then(m => m.BigNumber);
```

### A/B Testing in Production
```typescript
// Monitor both versions
if (USE_NEW_CORE) {
  analytics.track('new_core_usage', { feature: 'BigNumber' });
} else {
  analytics.track('old_core_usage', { feature: 'BigNumber' });
}
```

## Phase 6: Cleanup (Day 16-20)

### Remove Old Code (ONLY after verification)
```bash
# After 1 week of stable production with new packages
rm src/lib/common/bignumber.ts
rm src/lib/common/bignumber.test.ts
```

### Update All Imports
```typescript
// Find and replace all imports
// FROM: import { BigNumber } from '$lib/common/bignumber';
// TO: import { BigNumber } from '@yakkl/core';
```

## Critical Checkpoints

### Before Each Migration:
- [ ] File has no browser dependencies OR abstractions created
- [ ] Tests written for new package version
- [ ] Bridge implementation created
- [ ] Integration test passes
- [ ] Original file still works

### After Each Migration:
- [ ] New package builds successfully
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Feature flag tested

### Before Production:
- [ ] All integration tests pass
- [ ] E2E tests pass
- [ ] Performance benchmarks OK
- [ ] Security audit (if security-related)
- [ ] Rollback plan documented

## Build Configuration Updates

### Webpack Config (for background)
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      // During migration, can swap implementations
      '@yakkl/core': process.env.USE_NEW_CORE 
        ? path.resolve(__dirname, '../yakkl-core/src')
        : path.resolve(__dirname, 'src/lib/common/core-compat'),
    }
  }
};
```

### Vite Config (for UI)
```javascript
// vite.config.js
export default {
  resolve: {
    alias: {
      '@yakkl/core': process.env.USE_NEW_CORE
        ? '@yakkl/core'
        : './src/lib/common/core-compat',
    }
  }
};
```

## Documentation Template

### For Each Migrated Component:
```markdown
# Migration: [Component Name]

## Status: ✅ Complete | 🟡 In Progress | ⭕ Not Started

### Original Location
`yakkl-wallet/src/lib/[path]`

### New Location  
`yakkl-[package]/src/[path]`

### Dependencies Removed
- browser.storage → IStorage interface
- browser.runtime → IMessageBus interface

### Breaking Changes
- Constructor now requires storage injection
- Method X now returns Promise

### Migration Guide
\```typescript
// Old
const service = new Service();

// New
const storage = new BrowserStorage();
const service = new Service(storage);
\```

### Test Coverage
- Unit Tests: 100%
- Integration Tests: 100%
- E2E Tests: ✅ Passing
```

## Emergency Rollback Plan

### If Something Breaks:
```bash
# 1. Immediate rollback via feature flag
echo "USE_NEW_CORE=false" >> .env
echo "USE_NEW_SDK=false" >> .env

# 2. Restart extension
npm run dev:chrome

# 3. If still broken, revert package.json
git checkout HEAD~1 package.json
npm install

# 4. If critical, revert all changes
git revert [migration-commit]
```

## Success Celebration 🎉

When migration is complete:
- [ ] All packages published to npm (private registry)
- [ ] yakkl-wallet uses @yakkl/core and @yakkl/sdk
- [ ] Zero browser dependencies in core/sdk
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team celebration!

---

*This execution plan ensures zero downtime and safe, incremental migration. Follow each step carefully and test thoroughly.*