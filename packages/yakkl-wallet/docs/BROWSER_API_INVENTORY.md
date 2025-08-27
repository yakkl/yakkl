# Browser API Inventory
*Complete inventory of browser-specific API usage*
*Generated: 2024-12-27*

## Summary Statistics
- **Total Files with Browser APIs**: 30+
- **Most Common APIs**: storage, runtime, tabs, windows
- **Critical Dependencies**: 12 files (background context)
- **UI Dependencies**: 18 files (can be abstracted)

## Detailed Inventory

### Core Browser APIs Used

| API | Usage Count | Migration Strategy | Priority |
|-----|-------------|-------------------|----------|
| `browser.storage.local` | High | Abstract via IStorage | HIGH |
| `browser.storage.session` | Medium | Abstract via IStorage | HIGH |
| `browser.runtime.sendMessage` | High | Abstract via IMessageBus | HIGH |
| `browser.runtime.connect` | Medium | Keep in wallet | LOW |
| `browser.tabs.*` | Medium | Keep in wallet | LOW |
| `browser.windows.*` | Low | Keep in wallet | LOW |
| `browser.alarms.*` | Low | Abstract via IScheduler | MEDIUM |
| `chrome.sidePanel.*` | Low | Keep in wallet | LOW |

### File-by-File Analysis

## Background Context Files (Critical)

### `/contexts/background/handlers/blockchain.ts`
```typescript
APIs Used:
- browser.storage.session.set() // Line 94
- browser.storage.session.get() // Line 213

Migration: Abstract storage for state management
Target: Create IStateManager interface
```

### `/contexts/background/handlers/tabs.ts`
```typescript
APIs Used:
- browser.tabs.get()
- browser.tabs.query()
- browser.tabs.create()
- browser.tabs.update()

Migration: Keep in wallet (extension-specific)
Target: N/A
```

### `/contexts/background/handlers/windows.ts`
```typescript
APIs Used:
- browser.windows.get()
- browser.windows.getCurrent()
- browser.windows.getAll()
- browser.windows.create()
- browser.windows.update()
- browser.windows.remove()

Migration: Keep in wallet (extension-specific)
Target: N/A
```

## Service Layer Files (Mixed Logic)

### `/lib/services/background-transaction.service.ts`
```typescript
APIs Used:
- browser.storage.local.get() // Lines 83, 197
- browser.storage.local.set() // Lines 157, 215

Migration: Abstract storage
Target: yakkl-sdk with IStorage injection
Status: High priority - contains business logic
```

### `/lib/services/background-price.service.ts`
```typescript
APIs Used:
- browser.storage.local (assumed)

Migration: Abstract storage
Target: yakkl-sdk with IStorage injection
Status: High priority - price logic should be pure
```

### `/lib/services/ui-jwt-validator.service.ts`
```typescript
APIs Used:
- browser.runtime.sendMessage (likely)

Migration: Abstract messaging
Target: Keep in wallet, abstract JWT logic to yakkl-security
Status: Medium priority
```

## Store Files (State Management)

### `/lib/stores/auth-store.ts`
```typescript
APIs Used:
- browser_ext.runtime (indirect)

Migration: Abstract messaging
Target: Core auth logic to yakkl-security
Status: High priority
```

### `/lib/stores/enhancedBookmark.store.ts`
```typescript
APIs Used:
- browser.storage.local (likely)

Migration: Abstract storage
Target: Keep in wallet (extension feature)
Status: Low priority
```

### `/lib/stores/simple-wallet-cache.store.ts`
```typescript
APIs Used:
- browser.storage.local (cache)

Migration: Abstract to ICache
Target: yakkl-core with cache interface
Status: Medium priority
```

## Common/Utility Files

### `/lib/common/utils.ts`
```typescript
APIs Used:
- Various browser checks

Migration: Split pure utils to yakkl-core
Target: yakkl-core (pure functions only)
Status: High priority
```

### `/lib/managers/KeyManager.ts`
```typescript
APIs Used:
- browser.storage (for secure keys)

Migration: Already has yakkl-security version
Target: Use yakkl-security implementation
Status: Ready for migration
```

## UI/Route Files

### `/routes/+layout.ts`
```typescript
APIs Used:
- browser.runtime.connect() // Line 102
- browser.runtime checks // Lines 90, 96

Migration: Keep in wallet
Target: N/A (UI-specific)
Status: No migration needed
```

### Multiple `/routes/(dapp)/dapp/popups/*.svelte`
```typescript
APIs Used:
- browser.runtime.sendMessage
- browser.windows.close

Migration: Keep in wallet
Target: N/A (UI-specific)
Status: No migration needed
```

## Migration Priority Matrix

### 🔴 Priority 1: Core Business Logic (Week 1-2)
These MUST be abstracted to enable SDK/Core extraction:

1. **Storage Abstraction**
   - `/lib/services/background-transaction.service.ts`
   - `/lib/services/background-price.service.ts`
   - `/lib/stores/simple-wallet-cache.store.ts`

2. **Pure Utilities**
   - `/lib/common/utils.ts` (split pure functions)
   - `/lib/common/bignumber.ts`
   - `/lib/common/constants.ts`

### 🟡 Priority 2: Security & Auth (Week 3)
These need careful abstraction:

1. **Security Layer**
   - `/lib/managers/KeyManager.ts` → yakkl-security
   - `/lib/services/ui-jwt-validator.service.ts` (abstract JWT)

2. **Auth Flow**
   - `/lib/stores/auth-store.ts` (abstract messaging)

### 🟢 Priority 3: SDK Components (Week 4)
Blockchain operations:

1. **Providers**
   - All provider files (abstract API key storage)
   
2. **Transaction Management**
   - Transaction builders (make pure)
   - Gas estimation (make pure)

### ⚪ Priority 4: Keep in Wallet
These stay as-is:

- All `/routes/**` files
- All `/contexts/background/handlers/` for tabs/windows
- Extension lifecycle management
- Browser action/popup handling

## Abstraction Interfaces Needed

### 1. IStorage (yakkl-core)
```typescript
interface IStorage {
  get<T>(key: string): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### 2. IMessageBus (yakkl-core)
```typescript
interface IMessageBus {
  send(channel: string, data: any): Promise<any>;
  listen(channel: string, handler: Function): () => void;
  unlisten(channel: string, handler: Function): void;
}
```

### 3. ICache (yakkl-core)
```typescript
interface ICache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}
```

### 4. IScheduler (yakkl-core)
```typescript
interface IScheduler {
  schedule(name: string, delay: number, callback: Function): void;
  cancel(name: string): void;
  cancelAll(): void;
}
```

## Testing Requirements

For each migrated file:

### Unit Tests
```typescript
// Test without browser APIs
test('Works with mock storage', async () => {
  const mockStorage: IStorage = {
    get: jest.fn(),
    set: jest.fn(),
    // ...
  };
  
  const service = new Service(mockStorage);
  // Test business logic
});
```

### Integration Tests
```typescript
// Test with browser APIs
test('Works with browser storage', async () => {
  const browserStorage = new BrowserStorage();
  const service = new Service(browserStorage);
  // Test with real browser APIs
});
```

## Success Metrics

### Per-File Metrics:
- [ ] Browser APIs identified
- [ ] Abstraction created
- [ ] Tests written
- [ ] Code copied to new package
- [ ] Original still working
- [ ] New version tested
- [ ] Migration complete

### Overall Metrics:
- [ ] 0 browser APIs in yakkl-core
- [ ] 0 browser APIs in yakkl-sdk
- [ ] All abstractions documented
- [ ] 100% test coverage
- [ ] No production issues

---

*This inventory will be updated as migration progresses. Each file's status should be tracked in version control.*