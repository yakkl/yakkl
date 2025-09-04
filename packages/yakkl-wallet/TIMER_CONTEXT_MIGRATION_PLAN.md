# Timer Management and Context Separation Migration Plan

## Executive Summary
Critical architectural issues discovered where background services are importing client-only code with Svelte stores and window objects, causing service worker failures. This plan addresses complete context separation and proper timer management.

## Critical Issues Discovered

### 1. Background Service Context Violations

**BackgroundIntervalService** (runs in service worker) incorrectly imports:
- ❌ **NativeTokenPriceService** - Uses `window.setInterval` and Svelte stores (`walletCacheStore`)
- ❌ **CacheSyncManager** - Uses `window.setInterval`, Svelte stores (`get`), and client messaging
- ❌ **WalletCacheStore** - Uses Svelte stores (`writable`, `derived`)
- ❌ **TransactionService** - Uses Svelte stores (`get`)

This creates a **cascade failure** where the entire background service worker will crash.

### 2. Price Service Issues
- **native-token-price.service.ts** hardcoded to CoinGecko only
- Duplicates existing **PriceManager** functionality (weighted provider selection)
- Used in both client (home page) and incorrectly in background contexts

### 3. Timer Management Chaos
- **151+ direct setTimeout/setInterval calls** across 102 files
- **25 files using window.setInterval/setTimeout**
- Multiple duplicate timer managers with inconsistent APIs
- No clear context separation

## Proposed Architecture

### Context Separation Strategy

```
/lib/
├── services/
│   ├── client/                    # UI/Client context only
│   │   ├── ClientCacheSyncService.ts
│   │   ├── ClientNativeTokenPriceService.ts
│   │   └── ClientTransactionService.ts
│   └── background/                # Service worker context only
│       ├── BackgroundCacheSyncService.ts
│       ├── BackgroundPriceService.ts
│       └── BackgroundTransactionService.ts
├── stores/                        # Client-only (Svelte stores)
│   └── [all existing stores]
└── managers/
    ├── timers/
    │   ├── UnifiedTimerManager.ts  # Context-agnostic base
    │   ├── ClientTimerManager.ts   # With Svelte stores
    │   └── BackgroundTimerManager.ts # No stores, no window
    └── prices/
        └── PriceManager.ts         # Shared, context-agnostic
```

### Move to yakkl-core

```
packages/yakkl-core/src/managers/
├── timers/
│   ├── BaseTimerManager.ts        # Core logic, no deps
│   ├── ClientTimerAdapter.ts      # Client wrapper
│   └── BackgroundTimerAdapter.ts  # Background wrapper
└── prices/
    └── PriceManager.ts            # Weighted provider selection
```

## Implementation Plan

### Phase 1: Critical Background Fixes (IMMEDIATE - Day 1)

#### 1.1 Create Background-Compatible Services

**BackgroundPriceService.ts** (NEW)
```typescript
// NO Svelte stores, NO window object
import { PriceManager } from '$lib/managers/PriceManager';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import browser from 'webextension-polyfill';

export class BackgroundPriceService {
  private priceManager: PriceManager;
  private timerManager = UnifiedTimerManager.getInstance();
  
  async updateNativeTokenPrice(chainId: number, address: string) {
    const price = await this.priceManager.getMarketPrice(/*...*/);
    // Direct storage update, no stores
    await browser.storage.local.set({
      [`price_${chainId}_${address}`]: price
    });
  }
  
  startAutomaticUpdates() {
    this.timerManager.addInterval('native-price', 
      () => this.updatePrices(), 30000);
  }
}
```

**BackgroundCacheSyncService.ts** (NEW)
```typescript
// NO client messaging, NO Svelte stores
export class BackgroundCacheSyncService {
  // Direct browser.storage operations
  // No window.setInterval - use UnifiedTimerManager
  // Background-to-background messaging only
}
```

**BackgroundTransactionService.ts** (NEW)
```typescript
// NO Svelte store get()
export class BackgroundTransactionService {
  // Direct storage access
  // Return raw data, no store updates
}
```

#### 1.2 Fix BackgroundIntervalService

```typescript
// REMOVE these imports:
- import { NativeTokenPriceService } from './native-token-price.service';
- import { WalletCacheStore } from '$lib/stores/wallet-cache.store';
- import { CacheSyncManager } from '../services/cache-sync.service';
- import { TransactionService } from './transaction.service';

// ADD these imports:
+ import { BackgroundPriceService } from './background/BackgroundPriceService';
+ import { BackgroundCacheSyncService } from './background/BackgroundCacheSyncService';
+ import { BackgroundTransactionService } from './background/BackgroundTransactionService';
+ import { BackgroundCacheStore } from './background/BackgroundCacheStore';
```

### Phase 2: Client Service Updates (Day 2)

#### 2.1 Rename/Refactor Client Services

- Rename `native-token-price.service.ts` → `client/ClientNativeTokenPriceService.ts`
- Keep Svelte stores for reactivity
- Use PriceManager instead of hardcoded CoinGecko
- Replace `window.setInterval` with `ClientTimerManager`

#### 2.2 Update Client Imports

```typescript
// home/+page.svelte
- import { nativeTokenPriceService } from '$lib/services/native-token-price.service';
+ import { clientNativeTokenPriceService } from '$lib/services/client/ClientNativeTokenPriceService';

// cache-sync.service.ts → client/ClientCacheSyncService.ts
// Keep client messaging and stores
```

### Phase 3: Timer Manager Consolidation (Day 3)

#### 3.1 Deprecate Duplicates
- Mark `TimerManagerInterval.ts` as @deprecated
- Mark `TimerManagerTimeout.ts` as @deprecated
- Keep `TimerManager.ts` as legacy wrapper

#### 3.2 Create Context-Aware Helper

```typescript
// lib/utils/timer-context.ts
export function getTimerManager() {
  const isBackground = typeof window === 'undefined' || 
    self.constructor.name === 'ServiceWorkerGlobalScope';
  
  return isBackground 
    ? UnifiedTimerManager.getInstance()
    : TimerManager.getInstance(); // Has Svelte stores
}
```

### Phase 4: Systematic Migration (Week 2)

#### 4.1 Replace Direct Timer Calls

**Priority 1: Background contexts (will break in production)**
- All files in `/contexts/background/**`
- Services imported by background

**Priority 2: Client components**
- Can continue using window.* temporarily
- Migrate to ClientTimerManager for consistency

#### 4.2 Testing Strategy
1. Test background service worker startup
2. Verify no "window is not defined" errors
3. Check no "Cannot access store before initialization"
4. Validate price updates work in both contexts

### Phase 5: Move to yakkl-core (Week 3)

Only after stabilization:
1. Extract UnifiedTimerManager → BaseTimerManager
2. Move PriceManager to yakkl-core
3. Update all import paths
4. Ensure tree-shaking removes unused client code

## Files to Modify

### Immediate (Phase 1)
1. `/lib/services/background-interval.service.ts` - Remove client imports
2. Create `/lib/services/background/BackgroundPriceService.ts`
3. Create `/lib/services/background/BackgroundCacheSyncService.ts`
4. Create `/lib/services/background/BackgroundTransactionService.ts`
5. Create `/lib/services/background/BackgroundCacheStore.ts`

### Client Updates (Phase 2)
1. `/lib/services/native-token-price.service.ts` → `/lib/services/client/ClientNativeTokenPriceService.ts`
2. `/lib/services/cache-sync.service.ts` → `/lib/services/client/ClientCacheSyncService.ts`
3. `/routes/(wallet)/home/+page.svelte` - Update imports

### Total Impact
- **102 files** with direct timer calls
- **25 files** with window.setInterval/setTimeout
- **4 critical** background service files

## Success Criteria

1. ✅ Background service worker starts without errors
2. ✅ No "window is not defined" errors in background
3. ✅ No Svelte store access errors in background
4. ✅ Price updates work in both contexts
5. ✅ All timers properly managed and cleanable
6. ✅ PriceManager used consistently (no hardcoded providers)

## Risk Mitigation

1. **Create checkpoints** before each phase
2. **Test in Chrome extension** developer mode after each change
3. **Keep legacy services** temporarily with @deprecated
4. **Gradual migration** - fix critical issues first
5. **Maintain backward compatibility** during transition

## Notes

- UnifiedTimerManager is already context-agnostic (good!)
- PriceManager is context-agnostic (good!)
- WalletCacheStore needs background equivalent
- Client services can keep Svelte stores for reactivity
- Background services must use direct storage APIs

## Next Steps

1. Review and approve this plan
2. Create checkpoint: `git commit -m "CHECKPOINT: Before timer/context migration"`
3. Start with Phase 1 critical fixes
4. Test thoroughly in extension environment
5. Proceed to subsequent phases only after validation

---

**Created**: 2025-09-08
**Status**: PENDING APPROVAL
**Priority**: CRITICAL - Service worker failures in production