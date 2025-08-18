# YAKKL Wallet - Simple Data Flow

## Overview
This document describes the simplified data flow for token values and transactions in the YAKKL wallet.

## Core Principles
1. **Always calculate values when balance AND price exist**
2. **Keep data flow simple and unidirectional**
3. **Use derived stores for reactive UI updates**
4. **No complex caching layers - just persistent storage**

## Data Flow

### 1. Blockchain → Storage
```
Blockchain (via providers) 
    ↓
Background Services fetch data
    ↓
Store in persistent storage (IndexedDB/Extension Storage)
```

### 2. Storage → Validation & Calculation
```
Load from storage
    ↓
Validate data (ensure balance/price formats)
    ↓
Calculate values (balance * price = value)
    ↓
Store in Svelte stores (walletCacheStore)
```

### 3. Price Updates
```
Price service fetches new prices
    ↓
Update price property in tokens
    ↓
Recalculate values (call recalculateAllTokenValues())
    ↓
Save to storage
```

### 4. Reactive UI Updates
```
Svelte stores update
    ↓
Derived stores recalculate ($derived)
    ↓
Components automatically re-render
```

## Key Functions

### Value Calculation
```javascript
// Simple, consistent value calculation
const calculateValue = (balance, price, decimals = 18) => {
  if (!balance || !price) return 0n;
  
  // Convert balance to wei
  const balanceWei = balance.includes('.') 
    ? parseUnits(balance, decimals) 
    : BigInt(balance);
  
  // Calculate value in cents
  return toFiatCents(balanceWei * price);
};
```

### Token Update Flow
```javascript
// When updating tokens:
1. Get existing token data
2. Merge with new data (prefer new, fallback to existing)
3. ALWAYS recalculate value if balance AND price exist
4. Store updated token
```

### Transaction Organization
```javascript
// Transactions are organized by network and account:
{
  [chainId]: {
    [accountAddress]: [transactions...]
  }
}
```

## Derived Stores

### Current Account Tokens
```javascript
export const currentAccountTokens = derived(walletCacheStore, ($cache) => {
  return $cache.chainAccountCache[activeChainId]?.[activeAccount]?.tokens || [];
});
```

### Portfolio Value
```javascript
export const currentPortfolioValue = derived(walletCacheStore, ($cache) => {
  return tokens.reduce((sum, token) => sum + token.value, 0n);
});
```

### All Transactions
```javascript
export const allTransactionsByNetworkAndAccount = derived(walletCacheStore, ($cache) => {
  // Returns transactions organized by chainId and account
});
```

## Debugging

### Check Token Values
```javascript
// In console:
walletCacheStore.recalculateAllTokenValues();
```

### View Current State
```javascript
// Check what's in the store:
get(walletCacheStore);
get(currentAccountTokens);
get(allTransactionsByNetworkAndAccount);
```

## Common Issues & Solutions

### Issue: Token shows balance and price but no value
**Solution**: Call `recalculateAllTokenValues()` to force recalculation

### Issue: Values not updating after price change
**Solution**: Ensure price service calls `recalculateAllTokenValues()` after updating prices

### Issue: Transactions not showing
**Solution**: Check that background intervals are running and fetching for all accounts/chains

## Summary

The key to this simplified system is:
1. **Always calculate values** when we have the data
2. **Use derived stores** for reactive updates (no manual updates)
3. **Keep it simple** - no complex caching or synchronization logic

This approach ensures consistency and makes debugging much easier.