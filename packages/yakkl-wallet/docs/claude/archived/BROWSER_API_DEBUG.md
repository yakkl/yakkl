# Browser API Debug Steps

## Debug Logging Added

I've added comprehensive logging to help debug the browser API test failures. Here's what was added:

### 1. Browser API Service (`browser-api.service.ts`)
- Logs when service is initialized
- Logs each API call (storageGet, storageSet, etc.)
- Logs request details including port status
- Logs response details including success/error

### 2. Base Service (`base.service.ts`)
- Logs message sending details
- Logs response details
- Logs any exceptions caught

### 3. Test Page (`test-browser-api/+page.svelte`)
- Logs browserAPI object details on mount
- Logs session token status
- Logs before each API call
- Logs results of storage operations

### 4. Login Flow (`login/+page.svelte`)
- Logs onSuccess parameters
- Logs session token status after sync
- Logs before navigation

### 5. Security/Verify (`security.ts`)
- Logs before calling storeEncryptedHash
- Logs the response from storeEncryptedHash
- Logs session token storage status

### 6. Session Management (`auth/session.ts`)
- Logs storeEncryptedHash parameters
- Logs browser extension availability
- Logs background message sending
- Logs response from background

## Expected Debug Flow

1. User logs in successfully
2. `verify()` is called with credentials
3. `storeEncryptedHash()` sends message to background
4. Background creates session token and returns it
5. Session token is stored in Svelte store
6. Navigation to test-browser-api page
7. Test page checks for session token
8. Browser API calls should work with valid session

## To Test

1. Build the extension: `pnpm run dev:wallet`
2. Load in Chrome and open the extension
3. Open DevTools console
4. Login with credentials
5. Watch console for debug output
6. Check if session token is created
7. Check if browser API calls succeed

## Key Things to Look For

1. **Session Token Creation**: Look for `[storeEncryptedHash]` logs to see if token is created
2. **Browser API Object**: Check `[BrowserAPI Test] browserAPI object:` to see if it's the service or actual browser
3. **Port Connection**: Look for `[BaseService]` logs showing port status
4. **Response Format**: Check if responses have `success` and `data` fields

## Common Issues

1. **Session token not created**: Check if `STORE_SESSION_HASH` message reaches background
2. **Port not connected**: Background service worker might have restarted
3. **Response format mismatch**: Background handler might not be returning correct format
4. **Browser API conflict**: The imported browserAPI might be overridden by global browser object
