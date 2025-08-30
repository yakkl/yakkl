# YAKKL Code Migration Strategy
*Safe, Incremental Migration with Zero Downtime*
*Date: 2024-12-27*

## Core Principle: COPY → TEST → REPLACE

**NEVER move code directly. ALWAYS copy first, ensuring the wallet keeps running.**

## Browser API Analysis

### Identified Browser-Specific APIs
```typescript
// Found in 30+ files throughout the codebase
browser.storage.*      // Storage operations
browser.runtime.*      // Message passing, ports
browser.tabs.*         // Tab management
browser.windows.*      // Window management
browser.alarms.*       // Background timers
browser.notifications.* // User notifications
browser.contextMenus.*  // Context menu
browser.action.*       // Extension icon/popup
chrome.sidePanel.*     // Chrome-specific feature
```

### Browser API Distribution
```
yakkl-wallet/
├── contexts/background/    # Heavy browser API usage
├── lib/services/           # Mixed browser + business logic
├── lib/stores/            # Some browser storage calls
├── lib/common/            # Mixed utilities + browser
├── lib/managers/          # Some browser dependencies
└── routes/                # UI with browser messaging
```

## Migration Architecture

### Target Package Structure
```
yakkl-core/                 # ZERO browser dependencies
├── utils/                  # Pure utilities
├── types/                  # TypeScript types
├── constants/              # Network configs, etc.
└── algorithms/             # Pure computation

yakkl-sdk/                  # ZERO browser dependencies  
├── providers/              # Blockchain providers
├── contracts/              # Contract interfaces
├── transactions/           # Transaction builders
└── abstractions/           # High-level operations

yakkl-security/             # Abstracted storage only
├── core/                   # Encryption, vault
├── interfaces/             # Storage abstractions
└── providers/              # Storage implementations

yakkl-wallet/               # ALL browser-specific code
├── browser-api/            # Browser API wrappers
├── extension/              # Extension-specific
└── bridges/                # Package integrations
```

## Abstraction Strategy

### Storage Abstraction
```typescript
// yakkl-security/interfaces/storage.interface.ts
interface ISecureStorage {
  get<T>(key: string): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

// yakkl-wallet/browser-api/storage.implementation.ts
class BrowserSecureStorage implements ISecureStorage {
  async get<T>(key: string): Promise<T> {
    return browser.storage.local.get(key);
  }
  // ... browser-specific implementation
}

// yakkl-security can work without browser APIs
// yakkl-wallet injects browser implementation
```

### Message Passing Abstraction
```typescript
// yakkl-core/interfaces/messaging.interface.ts
interface IMessageBus {
  send(channel: string, data: any): Promise<any>;
  listen(channel: string, handler: Function): void;
}

// yakkl-wallet/browser-api/messaging.implementation.ts
class BrowserMessageBus implements IMessageBus {
  async send(channel: string, data: any) {
    return browser.runtime.sendMessage({ channel, data });
  }
  // ... browser-specific implementation
}
```

## Detailed Migration Plan

### Phase 1: Preparation (Week 1)

#### Step 1.1: Create Test Infrastructure
```typescript
// yakkl-wallet/tests/migration-tests/
├── storage.test.ts       # Test storage abstractions
├── messaging.test.ts     # Test message passing
├── providers.test.ts     # Test blockchain providers
└── security.test.ts      # Test security operations
```

#### Step 1.2: Document Browser Dependencies
```typescript
// yakkl-wallet/docs/BROWSER_DEPENDENCIES.md
// List every file using browser.* or chrome.*
// Categorize by:
// - Can be abstracted easily
// - Requires refactoring
// - Must stay in wallet
```

#### Step 1.3: Create Abstraction Interfaces
```typescript
// Create interfaces FIRST, before moving any code
// This ensures we know exactly what needs abstracting
```

### Phase 2: Copy to yakkl-core (Week 2)

#### Safe Migration Process:
```typescript
// STEP 1: COPY (don't move)
cp src/lib/common/bignumber.ts ../yakkl-core/src/utils/

// STEP 2: Remove browser dependencies
// In yakkl-core version, replace:
import browser from 'webextension-polyfill';
// With abstraction:
import { IStorage } from '@yakkl/core/interfaces';

// STEP 3: Create test
// yakkl-core/tests/bignumber.test.ts
test('BigNumber works without browser', () => {
  // Test pure functionality
});

// STEP 4: Keep original working
// yakkl-wallet still uses original file
```

#### Files to Copy to yakkl-core:
```
Priority 1 (Pure utilities - no browser deps):
- bignumber.ts → utils/bignumber.ts
- constants.ts → constants/networks.ts  
- types.ts → types/common.ts
- encryption.ts → crypto/encryption.ts (if no storage calls)

Priority 2 (Need abstraction):
- logger.ts → utils/logger.ts (abstract console/storage)
- errors.ts → utils/errors.ts
- validators.ts → utils/validators.ts
```

### Phase 3: Copy to yakkl-sdk (Week 3)

#### Migration with Provider Abstraction:
```typescript
// Original in yakkl-wallet
class AlchemyProvider {
  constructor() {
    // May use browser.storage for API keys
    this.apiKey = await browser.storage.local.get('alchemy_key');
  }
}

// Copied to yakkl-sdk  
class AlchemyProvider {
  constructor(private config: IProviderConfig) {
    // Config injected, no browser dependency
    this.apiKey = config.apiKey;
  }
}

// yakkl-wallet creates bridge
class AlchemyProviderBridge {
  async create() {
    const apiKey = await browser.storage.local.get('alchemy_key');
    return new AlchemyProvider({ apiKey });
  }
}
```

#### Files to Copy to yakkl-sdk:
```
Priority 1 (Blockchain operations):
- providers/alchemy.ts → providers/alchemy.ts
- contracts/erc20.ts → contracts/standards/erc20.ts
- transactions/builder.ts → transactions/builder.ts

Priority 2 (Need key management abstraction):
- signers/wallet.ts → signers/wallet.ts (inject key provider)
- providers/infura.ts → providers/infura.ts
```

### Phase 4: Integration Testing (Week 4)

#### Test Strategy:
```typescript
// 1. Unit tests in new packages
cd yakkl-core && npm test
cd yakkl-sdk && npm test

// 2. Integration tests in wallet
// yakkl-wallet/tests/integration/
test('Wallet works with new packages', async () => {
  // Import from new packages
  import { BigNumber } from '@yakkl/core';
  import { AlchemyProvider } from '@yakkl/sdk';
  
  // Test they work with browser APIs
  const provider = await createProvider(); // Uses browser.storage
  expect(provider).toBeInstanceOf(AlchemyProvider);
});

// 3. E2E tests
// Full extension test with new packages
```

### Phase 5: Gradual Replacement (Week 5)

#### Safe Replacement Process:
```typescript
// STEP 1: Import both versions
import { BigNumber as OldBigNumber } from '$lib/common/bignumber';
import { BigNumber as NewBigNumber } from '@yakkl/core';

// STEP 2: Add feature flag
const USE_NEW_BIGNUMBER = process.env.USE_NEW_PACKAGES === 'true';

// STEP 3: Conditional usage
const BigNumber = USE_NEW_BIGNUMBER ? NewBigNumber : OldBigNumber;

// STEP 4: Test thoroughly
// STEP 5: Remove old version when confident
```

## Browser API Handling Guide

### Category 1: Keep in yakkl-wallet
```typescript
// Extension lifecycle
browser.runtime.onInstalled
browser.runtime.onStartup
browser.runtime.onSuspend

// Extension UI
browser.action.*
browser.windows.*
browser.tabs.*
chrome.sidePanel.*

// Extension-specific storage
browser.storage.local (for extension settings)
browser.storage.sync (for cross-device sync)
```

### Category 2: Abstract for Other Packages
```typescript
// Storage (for security/keys)
browser.storage.local → ISecureStorage

// Messaging (for SDK operations)
browser.runtime.sendMessage → IMessageBus

// Alarms (for background tasks)
browser.alarms → IScheduler
```

### Category 3: Remove Completely
```typescript
// Replace with pure alternatives
browser.storage for caching → In-memory cache
browser.alarms for timing → setTimeout/setInterval
console.log → Logger abstraction
```

## Documentation Requirements

### For Each Migrated File:
```markdown
# Migration: [filename]
**Original**: yakkl-wallet/src/lib/[path]
**New**: yakkl-[package]/src/[path]
**Date**: YYYY-MM-DD
**Status**: Copied | Testing | Replaced | Deprecated

## Changes Made:
- Removed browser.storage dependency
- Abstracted messaging through IMessageBus
- ...

## Testing:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass

## Breaking Changes:
- None | List changes

## Migration Path:
```code
// Old usage
import { util } from '$lib/common';

// New usage  
import { util } from '@yakkl/core';
```
```

## Risk Mitigation

### 1. Never Break Production
- ALWAYS copy, never move
- Keep feature flags for rollback
- Test each change in isolation

### 2. Browser API Inventory
```typescript
// Create comprehensive list
// yakkl-wallet/docs/BROWSER_API_INVENTORY.md
{
  "file": "path/to/file.ts",
  "apis": ["browser.storage", "browser.runtime"],
  "migration": "abstract" | "keep" | "remove",
  "status": "pending" | "in-progress" | "complete"
}
```

### 3. Rollback Strategy
```typescript
// package.json versions
{
  "dependencies": {
    "@yakkl/core": "^0.1.0", // Can rollback to 0.0.0
    "@yakkl/sdk": "^0.1.0"   // Can rollback to 0.0.0
  }
}

// Feature flags
ENABLE_NEW_CORE=false
ENABLE_NEW_SDK=false
```

## Success Metrics

### Phase Completion Criteria:
- [ ] All tests passing
- [ ] No performance regression
- [ ] No new errors in production
- [ ] Documentation complete
- [ ] Team sign-off

### Migration Complete When:
- [ ] yakkl-core has zero browser dependencies
- [ ] yakkl-sdk has zero browser dependencies  
- [ ] yakkl-wallet uses new packages
- [ ] Old code safely removed
- [ ] Full test coverage

## Timeline Summary

**Week 1**: Preparation & Abstractions
**Week 2**: Copy to yakkl-core
**Week 3**: Copy to yakkl-sdk  
**Week 4**: Integration Testing
**Week 5**: Gradual Replacement
**Week 6**: Cleanup & Documentation

**Total**: 6 weeks with zero downtime

---

*This migration strategy ensures the wallet continues functioning throughout the entire process. No user will experience any disruption.*