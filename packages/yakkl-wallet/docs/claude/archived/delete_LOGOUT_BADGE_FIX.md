# Logout Badge Text Error Fix

## Date: 2025-08-04

### Issue
During logout, the following error was occurring:
```
[ERROR] [BrowserAPI] Error handling BROWSER_API_ACTION_SET_BADGE_TEXT 
TypeError: Cannot destructure property 'details' of 'e' as it is undefined.
```

### Root Cause
The browser API handlers in `browser-api.handler.ts` were attempting to destructure `details` from the payload without checking if the payload was defined. During logout, the payload could be undefined, causing the destructuring to fail.

### Files Modified
- `/src/contexts/background/handlers/browser-api.handler.ts`

### Fixes Applied

1. **handleActionSetBadgeText** (line 317-332)
   - Added null/undefined check for payload and payload.details
   - Falls back to clearing badge text with `{ text: '' }` if payload is invalid

2. **handleActionSetBadgeBackgroundColor** (line 340-352)
   - Added null/undefined check for payload
   - Falls back to transparent color `[0, 0, 0, 0]` if payload is invalid

3. **handleActionGetBadgeText** (line 354-362)
   - Added null/undefined check for payload
   - Falls back to empty object `{}` if payload is invalid

4. **handleActionSetTitle** (line 364-376)
   - Added null/undefined check for payload
   - Falls back to default title 'YAKKL' if payload is invalid

5. **handleActionSetIcon** (line 310-321)
   - Added null/undefined check for payload
   - Skips icon update and returns success if payload is invalid

### Testing
1. Build succeeded without errors
2. Logout process should now complete without the badge text error
3. Badge should clear properly during logout
4. All browser action APIs are now protected against undefined payloads

### Pattern Applied
All handlers now follow this pattern:
```typescript
async function handleActionXXX(payload: PayloadType) {
  if (!payload || !payload.details) {
    log.warn('[BrowserAPI] action.XXX called with invalid payload', false, payload);
    // Apply sensible default or skip operation
    return { success: true };
  }
  
  const { details } = payload;
  // Continue with normal operation
}
```

This defensive programming approach prevents crashes from undefined payloads while still allowing the logout process to complete successfully.