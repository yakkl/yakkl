# Portfolio View Fix Test Plan

## Issues Fixed

1. **Token values cycling between 0 and correct values**
   - Fixed by preserving cached balances when fetch fails in TokenService
   - Added type-safe handling of token.quantity field
   - Prevented overwriting good data with zeros in CacheSync

2. **Portfolio view expanding/contracting automatically**
   - Fixed by removing auto-expand logic based on value changes
   - Changed from `{#if false}` to `{#if isExpanded}` to enable user-controlled expansion
   - Added expand/collapse arrow button for both basic and pro users

3. **Initial load showing $0.00 instead of cached data**
   - Added diagnostic logging to compare svelte store vs persistent storage
   - Fixed import issues with storage utilities
   - Ensured cache is preserved across sessions

## Testing Steps

### 1. Test Token Value Stability
- [ ] Load extension and navigate to home page
- [ ] Observe token values for 30 seconds
- [ ] Verify values don't cycle to 0 and back
- [ ] Check console for any "Using cached balance" messages

### 2. Test Portfolio Expansion Control
- [ ] Click the down arrow button next to view mode
- [ ] Verify portfolio expands to large layout
- [ ] Click arrow again to collapse
- [ ] Verify expansion state is not affected by value changes
- [ ] Ensure arrow rotates 180 degrees when clicked

### 3. Test Cache Persistence
- [ ] Note portfolio value
- [ ] Reload extension
- [ ] Verify initial value matches previous value (not $0.00)
- [ ] Check console for DIAGNOSTIC output comparing store vs cache

### 4. Test Error Recovery
- [ ] Simulate network failure (disconnect internet)
- [ ] Verify token values remain stable
- [ ] Check console for "Using cached balance" messages
- [ ] Reconnect and verify values update properly

## Console Commands for Testing

```javascript
// Check current cache state
chrome.storage.local.get('walletCache', (result) => {
  console.log('Cache:', result.walletCache);
});

// Check portfolio rollups
chrome.storage.local.get('walletCache', (result) => {
  const cache = result.walletCache;
  console.log('Portfolio Rollups:', cache?.portfolioRollups);
  console.log('Current Total:', cache?.portfolioRollups?.current?.totalValue);
});

// Monitor token updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TOKEN_UPDATE' || message.type === 'PORTFOLIO_DATA_REFRESHED') {
    console.log('Update received:', message);
  }
});
```

## Expected Behavior

1. Token values should remain stable and not flicker
2. Portfolio view should only expand when user clicks arrow
3. Initial page load should show cached values immediately
4. Errors should be handled gracefully with cached data preserved

## Known Issues Remaining

- Cloudflare speed check may still cause issues (already has error handling)
- Login status messages could be enhanced further
- Performance could be optimized for large token lists

## Code Changes Summary

1. **PortfolioOverview.svelte**
   - Changed `{#if false}` to `{#if isExpanded}` for layout control
   - Added expand/collapse button for basic users
   - Added diagnostic logging
   - Fixed import for getObjectFromLocalStorage

2. **TokenService.ts**
   - Added proper type handling for token.quantity
   - Preserve cached balances on fetch failure
   - Added extensive logging for debugging

3. **CacheSync.service.ts**
   - Prevent overwriting good data with zeros
   - Add validation before updates
   - Use deep comparison to prevent unnecessary updates