# RPC Optimization Plan - Activity-Based Intelligent Caching System

## Problem Statement
- Current system makes 240+ RPC calls per hour with 10 accounts and ~50 tokens
- eth_call for ERC-20 tokens is more expensive than eth_getBalance
- Many tokens haven't changed balance in months but are still checked frequently
- Manual refresh can trigger expensive full updates

## Proposed Solution: Activity-Based Tiered Caching

### Activity Tiers
```
HOT:     < 24 hours since last activity    → 15 min cache
WARM:    1-7 days since last activity      → 1 hour cache
COOL:    7-30 days since last activity     → 6 hour cache
COLD:    30-90 days since last activity    → 24 hour cache
FROZEN:  > 90 days since last activity     → Weekly cache
```

### Key Features

#### 1. Activity Tracking
- Track last transaction date per token per account
- Track last balance change date
- Store interaction patterns
- Persist in IndexedDB

#### 2. Smart Balance Checking
- Only check HOT/WARM tokens regularly
- COOL tier on wallet unlock
- COLD/FROZEN only on explicit action or weekly

#### 3. Batch Optimization
- Implement Multicall contract integration
- Batch all token balance calls into single RPC call
- Use JSON-RPC 2.0 batch requests

#### 4. Manual Refresh Throttling
- First refresh: Update everything
- Within 5 minutes: Only update HOT tier
- Within 30 minutes: Update HOT + WARM
- After 30 minutes: Full refresh allowed

#### 5. Progressive Loading
- On wallet load: Check HOT/WARM only
- After 30 seconds: Check COOL tier
- After 2 minutes: Check COLD tier
- Prevents initial slowdown

### Expected Impact
- Current: ~240 calls/hour
- With Tiering: ~50 calls/hour (80% reduction)
- With Multicall: ~10 calls/hour (96% reduction)

### Implementation Files
- New: `activity-tracker.store.ts` - Track all activity
- New: `multicall.service.ts` - Batch balance calls
- Modify: `cache-sync.service.ts` - Add activity tracking
- Modify: `blockchain.ts` handlers - Implement tiered caching
- Modify: `token.store.ts` - Integrate activity tiers

### Implementation Priority
1. Week 1: Activity tracking + tier system
2. Week 2: Multicall integration (biggest win)
3. Week 3: Smart refresh logic
4. Week 4: UI feedback improvements

### Notes
- This is a future optimization
- Current focus is on stabilizing existing functionality
- 15-minute cache for all balances is adequate for now
- Revisit after core issues are resolved

---
*Document created: 2025-09-16*
*Status: PLANNED - Not yet implemented*