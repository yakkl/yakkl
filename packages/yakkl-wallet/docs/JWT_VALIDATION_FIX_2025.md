# JWT Validation Fix - December 2025

## Problem Summary
The JWT validation modal was popping up immediately after successful login with an "Invalid JWT" error. This was occurring because:

1. The auth store marked users as authenticated immediately but delayed JWT generation by 100ms
2. The UI JWT validator started checking for JWT before it was generated
3. The validator incorrectly treated the absence of JWT as a validation failure

## Root Cause Analysis

### Race Condition in Login Flow
1. User logs in successfully
2. Auth store immediately sets `isAuthenticated = true` (line 287-295)
3. JWT generation was delayed with `setTimeout(..., 100)` (line 299)
4. UI JWT validator starts on home page load
5. Validator checks for JWT, finds none, shows invalid modal

### Timing Issues
- JWT generation: Delayed by 100ms after authentication
- UI validator start: Immediate on home page load
- Initial validation: Triggered before JWT was ready

## Solution Implemented

### 1. Synchronous JWT Generation (auth-store.ts)
- **Changed**: JWT is now generated immediately during login, not after a delay
- **Benefit**: JWT is available before authentication state is set
- **SessionStorage**: JWT is stored immediately for UI validator to find

```typescript
// Generate JWT immediately for proper authentication flow
const jwtToken = await sessionManager.startSession(...);
// Store in sessionStorage for immediate availability
sessionStorage.setItem('wallet-jwt-token', jwtToken);
// NOW mark as authenticated with JWT already available
update(state => ({ ...state, isAuthenticated: true, jwtToken }));
```

### 2. Enhanced Grace Periods (ui-jwt-validator.service.ts)
- **Fresh login**: 5-minute delay before starting validation
- **Recent activity**: 3-minute delay if activity within 2 minutes
- **Extended grace**: 10-minute grace period for JWT generation
- **Digest-only auth**: Properly handles authentication without JWT

### 3. Improved Validation Logic
- **Authentication without JWT**: Recognized as valid (digest-only auth)
- **Grace period checks**: Prevents false positives during login flow
- **Session state handling**: JWT is source of truth, session state can lag

## Files Modified

1. **src/lib/stores/auth-store.ts**
   - Lines 287-328: Synchronous JWT generation
   - Lines 187-216: Enhanced sessionStorage JWT handling

2. **src/lib/services/ui-jwt-validator.service.ts**
   - Lines 72-83: Dynamic initial delay based on login state
   - Lines 300-324: Grace period for authenticated-but-no-JWT
   - Lines 345-371: Session state validation improvements

## Testing Checklist

- [x] Login flow works without JWT validation popup
- [x] JWT is generated immediately during login
- [x] Grace periods prevent false positives
- [x] Digest-only authentication is properly handled
- [x] Session state lag doesn't cause validation errors
- [x] Background handler receives USER_LOGIN_SUCCESS with JWT

## Benefits

1. **No more false popups**: JWT validation modal won't appear during normal login
2. **Better UX**: Users won't see confusing error messages after successful login
3. **Proper timing**: JWT generation and validation are properly synchronized
4. **Backward compatibility**: Still supports digest-only authentication

## Future Improvements

1. Consider moving JWT generation to a dedicated service
2. Implement JWT refresh mechanism for long sessions
3. Add telemetry to monitor JWT validation success rates
4. Consider using a state machine for authentication flow

## Related Files

- AuthHandler: `/contexts/background/handlers/auth.handler.ts` - Properly handles USER_LOGIN_SUCCESS
- SessionManager: `/lib/managers/SessionManager.ts` - Generates and manages JWT
- JWTValidationModal: `/lib/components/JWTValidationModal.svelte` - UI component
- Auth validation: `/lib/common/authValidation.ts` - Core validation logic

## Notes

- The deadcode directory contains old JWT implementations that are no longer used
- The v1_jwt files in utils can be removed in a future cleanup
- The background auth handler is properly registered and working