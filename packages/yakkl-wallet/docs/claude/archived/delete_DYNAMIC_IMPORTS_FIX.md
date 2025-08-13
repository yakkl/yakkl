# Dynamic Imports Fix - BackgroundIntervalService

## Date: 2025-08-04

### Issue
```
[ERROR] Failed to initialize interval service: 
TypeError: Failed to execute 'importScripts' on 'WorkerGlobalScope': 
Module scripts don't support importScripts().
```

### Root Cause
The `BackgroundIntervalService` was using dynamic imports (`await import()`) which are incompatible with webpack's service worker/web worker context. Dynamic imports try to use `importScripts()` which is not allowed in module scripts.

### Files Modified
- `/src/lib/services/background-interval.service.ts`
- `/packages/yakkl-wallet/.claude/CLAUDE.md` (added critical rule)

### Changes Made

1. **Converted all dynamic imports to static imports:**
   ```typescript
   // BEFORE (problematic):
   const module = await import('./transaction.service');
   this.transactionService = module.TransactionService.getInstance();
   
   // AFTER (correct):
   import { TransactionService } from './transaction.service';
   // ...
   this.transactionService = TransactionService.getInstance();
   ```

2. **Static imports added:**
   - `TransactionService` from './transaction.service'
   - `NativeTokenPriceService` from './native-token-price.service'
   - `WalletCacheStore` from '$lib/stores/wallet-cache.store'
   - `CacheSyncManager` from '../services/cache-sync.service'

3. **Removed `ensureServicesLoaded()` method** - No longer needed with static imports

4. **Updated constructor** to initialize services immediately

### Project Rule Established

**⚠️ CRITICAL RULE: NO DYNAMIC IMPORTS**

- Use static imports only throughout the project
- Dynamic imports break webpack in service worker contexts
- Only exception: `webextension-polyfill` in client context with proper browser environment check
- This rule has been added to `.claude/CLAUDE.md` for future reference

### Why This Matters

1. **Service Workers**: Chrome extensions run background scripts as service workers (or module workers)
2. **Webpack Bundling**: Dynamic imports generate code that tries to use `importScripts()` at runtime
3. **Module Scripts**: Modern module scripts don't support `importScripts()`, causing runtime errors
4. **Static Analysis**: Static imports allow webpack to properly bundle all dependencies at build time

### Testing
- Build completed successfully
- Background interval service should now initialize without errors
- All interval-based updates (transactions, prices, portfolio) should work properly

### Best Practices Going Forward

1. **Always use static imports** at the top of files
2. **Avoid circular dependencies** by proper module organization
3. **If circular dependency issues arise**, refactor the code structure rather than using dynamic imports
4. **Document any exceptions** clearly if dynamic imports are absolutely necessary (which should be extremely rare)