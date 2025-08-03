# JWT Token Invalidation Implementation

## Overview

This document describes the JWT token invalidation feature added to the YAKKL wallet for enhanced security during wallet lock operations.

## Implementation Details

### 1. Core JWT Blacklist System (`jwt-background.ts`)

Added token blacklisting functionality:
- Tokens are added to a blacklist when invalidated
- Blacklisted tokens are stored as SHA-256 hashes (not full tokens)
- Blacklist entries expire after 24 hours
- All validation methods check the blacklist

**New Methods:**
- `invalidateToken(token?: string)` - Invalidate a specific token or current token
- `clearBlacklist()` - Clear all blacklisted tokens
- `isTokenBlacklisted(token: string)` - Check if token is blacklisted
- `addToBlacklist(token: string)` - Add token to blacklist
- `hashToken(token: string)` - Create SHA-256 hash of token

### 2. Lock Integration

#### `locks.ts`
- Updated `setLocks()` to accept optional `tokenToInvalidate` parameter
- Automatically invalidates JWT when wallet is locked

#### `lockWallet.ts`
- Updated `lockWallet()` to accept optional `tokenToInvalidate` parameter
- Invalidates JWT as the first step in the lock process

### 3. PopupSecurityManager Integration

Added public method to `PopupSecurityManager`:
```typescript
async invalidateJWTToken(token?: string): Promise<boolean>
```

This allows the popup security system to invalidate tokens during:
- Security breaches
- Session timeouts
- Suspicious activity
- User-initiated locks

## Usage Examples

### Basic Token Invalidation
```typescript
import { invalidateJWT } from '$lib/utilities/jwt-background';

// Invalidate current token
await invalidateJWT();

// Invalidate specific token
await invalidateJWT(suspiciousToken);
```

### During Wallet Lock
```typescript
import { setLocks } from '$lib/common/locks';
import { lockWallet } from '$lib/common/lockWallet';

// Lock with automatic token invalidation
await setLocks(true);

// Lock with specific token invalidation
await lockWallet('security-breach', compromisedToken);
```

### Using PopupSecurityManager
```typescript
import { popupSecurityManager } from '$lib/managers/PopupSecurityManager';

// Invalidate token through security manager
const success = await popupSecurityManager.invalidateJWTToken(token);
```

## Security Benefits

1. **Immediate Revocation**: Tokens are invalidated immediately, preventing reuse
2. **Multi-Token Support**: Can invalidate specific tokens in multi-session scenarios
3. **Secure Storage**: Only token hashes are stored, not full tokens
4. **Automatic Cleanup**: Blacklist entries expire after 24 hours
5. **Lock Integration**: Automatic invalidation during wallet lock operations

## Storage

- **Token Storage Key**: `yakkl_jwt_token`
- **Blacklist Storage Key**: `yakkl_jwt_blacklist`
- **Storage Location**: Chrome local storage or localStorage (depending on context)

## Testing

See the following test files:
- `jwt-background.test.ts` - Core JWT manager tests
- `PopupSecurityManager.example.ts` - Security manager usage examples

## Migration Notes

Existing code using `setLocks()` or `lockWallet()` will continue to work without changes. The token invalidation happens automatically when these functions are called.

To invalidate a specific token during lock:
```typescript
// Old way
await setLocks(true);

// New way with specific token
await setLocks(true, undefined, tokenToInvalidate);
```

## Future Enhancements

1. Add support for multiple active tokens tracking
2. Implement token rotation on invalidation
3. Add metrics for blacklist hits
4. Implement persistent blacklist across extension restarts