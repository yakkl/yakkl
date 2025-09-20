# RPC Usage Analysis Across YAKKL Packages

## Date: 2025-09-16

## Executive Summary
Analysis of RPC usage patterns across all yakkl-* packages to identify potential excessive API calls and optimization opportunities.

## Packages Analyzed
- yakkl-core
- yakkl-sdk
- yakkl-backend
- yakkl-web3-utils
- yakkl-blockchain-private
- yakkl-swaps
- yakkl-wallet-v1

## Critical Findings

### 1. yakkl-core - Aggressive Cache TTLs
**Location**: `packages/yakkl-core/src/constants/index.ts`
**Lines**: 151-157
```typescript
CACHE_TTL: {
  BALANCE: 30,      // ⚠️ 30 seconds - TOO AGGRESSIVE!
  PRICE: 60,        // 60 seconds - reasonable
  TRANSACTION: 300, // 5 minutes - good
  METADATA: 3600,   // 1 hour - good
  STATIC: 86400    // 1 day - good
}
```

**Location**: `packages/yakkl-core/src/engine/TransactionManager.ts`
- Line 444: Balance cache validation using 30-second TTL
- Line 191: Direct `provider.getBalance(address)` call
- Line 241: Direct `provider.estimateGas()` call
- Line 387: Direct `provider.getTransaction(hash)` call
- Line 390: Direct `provider.getBlock()` call

### 2. yakkl-sdk - No Caching Layer
**Location**: `packages/yakkl-sdk/src/client/WalletClient.ts`
- Line 129: Direct `provider.getBalance()` - No caching
- Line 165: Direct `provider.sendTransaction()`
**Issue**: Every SDK call hits the RPC directly without any cache

### 3. Polling Intervals Found

#### yakkl-core
- **DiscoveryProtocol.ts** (Line 55): 30-second interval for environment scanning
- **rate-limiter.ts**: 5-minute cleanup interval

#### yakkl-backend
- **RSSFeedService.ts** (Line 90): 5-minute interval for RSS updates

## Good Practices Found

### 1. No Hardcoded Provider Keys
- Using public RPC endpoints
- No Alchemy/Infura API keys in code
- Default endpoints:
  - Ethereum: `https://eth.llamarpc.com`
  - Polygon: `https://polygon-rpc.com`
  - Arbitrum: `https://arb1.arbitrum.io/rpc`
  - BSC: `https://bsc-dataseed.binance.org`
  - Avalanche: `https://api.avax.network/ext/bc/C/rpc`

### 2. Reasonable Polling Intervals
- No aggressive polling under 30 seconds (except balance cache)
- Most intervals are 5+ minutes

## Packages with No Issues
- **yakkl-web3-utils**: No provider calls found
- **yakkl-blockchain-private**: Minimal/empty package
- **yakkl-swaps**: No TypeScript/JavaScript files
- **yakkl-backend**: Only RSS polling (5 min) - reasonable

## Recommendations

### Immediate Actions
1. **Check yakkl-wallet imports from yakkl-core**
   - If using CACHE_TTL.BALANCE constant, increase from 30s to 5+ minutes

2. **Add caching to yakkl-sdk**
   - Implement cache layer similar to yakkl-wallet's GET_NATIVE_BALANCE handler

3. **Update yakkl-core TransactionManager**
   - Replace direct provider calls with cached handlers

### Long-term Improvements
1. Centralize cache configuration across packages
2. Implement shared cache service for all packages
3. Add monitoring for RPC call patterns
4. Consider implementing request batching

## Impact Assessment
- **yakkl-core's 30-second balance TTL**: Could cause 120 calls/hour per account
- **yakkl-sdk no caching**: Direct impact depends on usage frequency
- **Combined impact**: Could add significant RPC overhead if both are actively used

## Conclusion
While yakkl-wallet's immediate RPC issues have been fixed (186 calls/min → ~12 calls/hour), the yakkl-core and yakkl-sdk packages need attention to prevent future RPC cost issues.