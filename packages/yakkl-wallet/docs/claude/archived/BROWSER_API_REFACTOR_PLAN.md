# Browser API Refactoring Plan - Critical Documentation

## Overview
This document contains the complete plan for refactoring YAKKL wallet's browser API usage to solve SSR conflicts through a message-passing architecture.

## Problem Statement
- SvelteKit's SSR conflicts with MDN browser.* APIs that have guards checking for browser extension context
- Dynamic imports causing runtime errors ("cannot find module 'webextension-polyfill'")
- Background context works fine with direct imports, but client context has SSR build issues
- Current workarounds (aliases, global.d.ts, environment.ts with mocks) are fragile

## Architecture Solution

### Message-Passing Design
```
┌─────────────────────────────────────┐
│       Client UI (SvelteKit)         │
├─────────────────────────────────────┤
│    BrowserAPIService (Proxy)        │
│  - storage.get/set/remove           │
│  - tabs.query/create/update         │
│  - windows.create/update            │
│  - runtime.getManifest/getURL       │
├─────────────────────────────────────┤
│      Message Layer (Existing)       │
│  - safeClientSendMessage            │
│  - Type definitions                 │
└─────────────────────────────────────┘
              ↓ Messages ↓
┌─────────────────────────────────────┐
│   Background Service Worker         │
├─────────────────────────────────────┤
│   BrowserAPIHandler                 │
│  - Direct browser.* API access      │
│  - Security validation              │
│  - Response formatting              │
└─────────────────────────────────────┘
```

## Implementation Files Created

### 1. Browser API Message Types
**File**: `/src/lib/types/browser-api-messages.ts`
- Comprehensive enum of all browser API operations
- Type-safe request/response interfaces
- Payload types for each API method

### 2. Background Browser API Handler
**File**: `/src/contexts/background/handlers/browser-api.handler.ts`
- Handles all browser API requests from client context
- Direct access to `import browser from 'webextension-polyfill'`
- Implements handlers for Storage, Tabs, Windows, Runtime, Notifications, Idle APIs

### 3. Client Browser API Service
**File**: `/src/lib/services/browser-api.service.ts`
- Extends BaseService for consistent messaging
- Provides clean API methods matching browser.* APIs
- No direct browser API usage (SSR-safe)
- Singleton pattern with convenience methods

### 4. Message Routing Update
**File**: `/src/lib/common/listeners/background/unifiedMessageListener.ts`
- Added routing for `BROWSER_API_*` messages
- Dynamic import of handler: `await import('$contexts/background/handlers/browser-api.handler')`

### 5. Test Page
**File**: `/src/routes/(wallet)/test-browser-api/+page.svelte`
- Comprehensive testing of all browser APIs
- Visual test results with timing
- Tests: Storage, Tabs, Windows, Runtime, Notifications, Idle APIs

## Naming Standards

### Storage Keys (yakklXxx pattern)
```typescript
// Current → New
'settings' → 'yakklSettings'
'profile' → 'yakklProfile'
'accounts' → 'yakklAccounts'
'currentAccount' → 'yakklCurrentAccount'
'tokens' → 'yakklTokens'
'networks' → 'yakklNetworks'
'preferences' → 'yakklPreferences'
'emergencyKit' → 'yakklEmergencyKit'
```

## Complete File Inventory

### Configuration Files to Clean Up (Phase 5)
```
/packages/yakkl-wallet/
├── src/app.html (comment out browser-polyfill.js - DONE)
├── static/ext/browser-polyfill.js (keep but not loaded in SSR)
├── vite-plugin-mock-browser-polyfill.ts (remove in Phase 5)
├── vite.config.ts (remove alias in Phase 5)
├── tsconfig.json (remove paths in Phase 5)
├── svelte.config.js (remove alias in Phase 5)
└── src/lib/common/globals.d.ts (simplify in Phase 5)
```

### Files Requiring Refactor (78 total)

#### Critical Services (Phase 1)
```
/src/lib/services/
├── wallet.service.ts - UPDATED (added service name to constructor)
├── transaction.service.ts - UPDATED
├── token.service.ts - UPDATED
├── message.service.ts - UPDATED
├── transactionMonitor.service.ts - UPDATED
└── session-verification.service.ts - UPDATED
```

#### Stores Using browser_ext (Phase 2)
```
/src/lib/stores/
├── account.store.ts - Uses browser_ext.storage
├── profile.store.ts - Uses browser_ext.storage
├── token.store.ts - Uses browser_ext.storage
├── emergency-kit.store.ts - Uses browser_ext.storage
├── network.store.ts - Uses browser_ext.storage
├── settings.store.ts - Uses browser_ext.storage
└── preferences.store.ts - Uses browser_ext.storage
```

#### Managers Requiring Split (Phase 3)
```
/src/lib/managers/
├── PopupManager.ts → Split to client/background versions
├── TabManager.ts → Split to client/background versions
├── NotificationManager.ts → Split to client/background versions
└── IdleManager.ts → Split to client/background versions
```

#### Components Using Services (Phase 4)
- 30+ components in `/src/lib/components/`
- 20+ routes in `/src/routes/`

## Implementation Phases

### Phase 0: Foundation Setup ✅ COMPLETE
- [x] Create message protocol infrastructure
- [x] Create BrowserAPIService base
- [x] Create background handler
- [x] Update BaseService with serviceName

### Phase 1: Core Services Refactor (Week 1)
1. **StorageService** (NEW) - Centralize all storage operations
2. **AuthService** - Update to use BrowserAPIService
3. **WalletService** - Remove browser_ext usage

### Phase 2: Store Refactoring (Week 2)
- Replace all `browser_ext.storage` with `browserAPI.storage*`
- Update all 7 stores listed above

### Phase 3: Manager Classes Split (Week 3)
- Create client versions using BrowserAPIService
- Keep background versions with direct browser access
- New structure:
  ```
  /src/lib/managers/client/PopupManager.ts
  /src/contexts/background/managers/PopupManager.ts
  ```

### Phase 4: Component Updates (Week 4)
- Update all components to use new services
- Priority: Layout → Core → Features → Utilities

### Phase 5: Cleanup (Week 5)
- Remove vite-plugin-mock-browser-polyfill.ts
- Update all config files
- Simplify environment.ts
- Remove workarounds

## Testing Strategy

### Proof of Concept Testing
1. Navigate to `/test-browser-api` when logged in
2. All tests should pass showing:
   - Storage operations work
   - Tab/Window queries work
   - Runtime APIs work
   - Notifications display
   - Idle state detection works

### Integration Testing
- Mock message layer for unit tests
- Test full message flow
- Verify background handlers
- Cross-browser testing

## Risk Mitigation

### High Risk Areas
1. **BaseService Refactor** - Affects entire app
   - Mitigation: Parallel implementation, extensive testing
2. **Storage Operations** - Data loss potential
   - Mitigation: Implement transactions, validation
3. **Authentication Flow** - User lockout risk
   - Mitigation: Test on separate instance, recovery mechanism

### Performance Considerations
1. Message passing adds ~5-10ms latency
2. Implement request batching for multiple operations
3. Add caching for frequently accessed data
4. Use debouncing for rapid calls

## Future Considerations

### Background-to-Store Synchronization (Not Implemented)
- Concept: Allow background to read/write Svelte stores
- Challenge: Stores only work in client context
- Potential solution: Dedicated port connection with reactive updates
- Complexity: Sync issues, latency, requires client running
- Status: Noted for future exploration

## Rollback Plan

If issues arise, use the checkpoint created:
```bash
# Rollback to checkpoint
git reset --hard checkpoint-20250729-201314
```

## Known Issues & Workarounds

### Navigation in Browser Extensions
- **Issue**: `redirect()` from `@sveltejs/kit` doesn't work in browser extensions
- **Files Affected**: `/routes/(wallet)/+layout.ts` and similar auth guards
- **Solution**: Use `goto()` from `$app/navigation` instead
- **Pattern**: Return auth status from load function, handle navigation in component
- **Helper**: Use `safeNavigate()` from `$lib/common/safeNavigate.ts`

Example fix needed:
```typescript
// In +layout.ts - return status instead of redirect
return {
  authenticated: false,
  redirectTo: PATH_LOGIN
};

// In +layout.svelte - handle navigation
import { goto } from '$app/navigation';
if (!data.authenticated && data.redirectTo) {
  await goto(data.redirectTo);
}
```

## Key Benefits
1. **Permanent solution** to SSR conflicts
2. **Enhanced security** through proper context isolation
3. **Improved maintainability** with clear API boundaries
4. **Better developer experience** with type-safe APIs
5. **Future-proof** architecture

## Estimated Effort
- 50-80 hours of development work
- 6-week implementation timeline
- Incremental rollout with feature flags

## Success Metrics
- No SSR build errors
- All browser APIs accessible in client
- Performance impact < 10ms per operation
- Zero breaking changes for users

---

**Last Updated**: 2025-07-29
**Status**: Proof of Concept Complete
**Next Step**: Begin Phase 1 implementation after POC testing
