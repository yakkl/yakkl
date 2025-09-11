# JWT Migration Plan - Move to yakkl-security
**Date**: 2025-01-17
**Status**: Planning
**Priority**: High

## Current State

### Files Currently in yakkl-wallet (Should Move)
1. `/lib/utilities/jwt.ts` - Core JWT manager with browser context
2. `/lib/utilities/jwt-background.ts` - Background service worker JWT handling
3. `/lib/services/background-jwt-validator.service.ts` - Background validation logic

### Files That Should Stay in yakkl-wallet (UI Only)
1. `/lib/services/ui-jwt-validator.service.ts` - UI-specific validation
2. `/lib/components/JWTValidationModal.svelte` - UI modal component
3. `/lib/components/JWTValidationModalProvider.svelte` - UI modal provider

### Files Using JWT (Need Import Updates)
1. `/lib/stores/auth-store.ts` - Uses jwtManager
2. `/lib/managers/SessionManager.ts` - Uses jwtManager
3. `/routes/(wallet)/login/+page.svelte` - Uses jwtManager
4. `/contexts/background/handlers/session.ts` - Uses backgroundJWTManager

## Target Architecture

```
yakkl-security/
├── src/
│   ├── jwt/
│   │   ├── manager.ts (existing - base JWT logic)
│   │   ├── browser-jwt-manager.ts (new - browser extension support)
│   │   ├── background-jwt-validator.ts (moved from wallet)
│   │   └── types.ts (new - shared JWT types)
│   └── index.ts (export JWT modules)

yakkl-wallet/
├── src/lib/
│   ├── services/
│   │   └── ui-jwt-validator.service.ts (stays - imports from @yakkl/security)
│   └── components/
│       ├── JWTValidationModal.svelte (stays - UI only)
│       └── JWTValidationModalProvider.svelte (stays - UI only)
```

## Migration Steps

### Phase 1: Extend yakkl-security (Without Breaking Wallet)

1. **Create Browser JWT Manager in yakkl-security**
   ```typescript
   // yakkl-security/src/jwt/browser-jwt-manager.ts
   import { JWTManager } from './manager';

   export class BrowserJWTManager extends JWTManager {
     // Add browser.storage.local support
     // Handle service worker context
     // Add session management
   }
   ```

2. **Create JWT Types**
   ```typescript
   // yakkl-security/src/jwt/types.ts
   export interface JWTPayload {
     sub: string;
     iat: number;
     exp: number;
     profileId?: string;
     username?: string;
     planLevel?: string;
     sessionId?: string;
   }
   ```

3. **Move Background Validator**
   - Copy `background-jwt-validator.service.ts` to yakkl-security
   - Update imports to use local JWT manager
   - Export from yakkl-security index

### Phase 2: Update Wallet Imports (One at a Time)

1. **Update SessionManager.ts**
   ```typescript
   // Before:
   import { jwtManager } from '$lib/utilities/jwt';

   // After:
   import { BrowserJWTManager } from '@yakkl/security/jwt';
   const jwtManager = BrowserJWTManager.getInstance();
   ```

2. **Update auth-store.ts**
   - Same pattern as SessionManager

3. **Update login pages**
   - Update all login/register pages to use @yakkl/security

4. **Update background handlers**
   - Update session.ts and other handlers

### Phase 3: Cleanup

1. **Move to deadcode directory**
   ```bash
   mkdir -p deadcode/jwt
   mv src/lib/utilities/jwt.ts deadcode/jwt/
   mv src/lib/utilities/jwt-background.ts deadcode/jwt/
   mv src/lib/services/background-jwt-validator.service.ts deadcode/jwt/
   ```

2. **Update package.json**
   - Ensure @yakkl/security is a dependency
   - Remove any JWT-specific dependencies if not used elsewhere

## Testing Requirements

### Unit Tests
- [ ] JWT generation in yakkl-security
- [ ] JWT validation in yakkl-security
- [ ] Browser storage integration
- [ ] Service worker context handling

### Integration Tests
- [ ] Login flow generates JWT
- [ ] JWT is stored in background
- [ ] JWT validation doesn't show false positives
- [ ] Session timeout works correctly
- [ ] JWT refresh works

### E2E Tests
- [ ] Complete login → home navigation
- [ ] No "JWT Invalid" popup after login
- [ ] JWT persists across page refreshes
- [ ] JWT cleared on logout

## Rollback Plan

If issues arise:
1. Git revert the import changes
2. Restore JWT files from deadcode
3. Update imports back to local files

## Benefits After Migration

1. **Security**: JWT logic in dedicated security package
2. **Reusability**: Other YAKKL products can use same JWT
3. **Maintainability**: Single source of truth for JWT
4. **Testing**: Centralized JWT tests
5. **Type Safety**: Shared types across packages

## Current Blockers

- Need to ensure yakkl-security exports are properly configured
- Need to test browser extension APIs in yakkl-security context
- Need to validate no circular dependencies

## Notes

- The current JWT fix (preventing false validation popup) should be preserved
- Background JWT handler already works correctly with USER_LOGIN_SUCCESS
- UI validation service needs careful migration to preserve grace periods