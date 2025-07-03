# Before/After: Lean Migration Example

## Component Feature Checking

### ❌ BEFORE (Bloated)
```typescript
// Multiple imports for plan logic
import { PlanType, hasFeature, getFeaturesForPlan, isTrialUser } from '../config/features';
import { getSettings } from '$lib/common/stores';
import { YAKKL_FEATURE_AI_ASSISTANT, YAKKL_PLAN_PRO, YAKKL_PLAN_BASIC } from '$lib/common/constants';

// Complex feature checking logic scattered throughout component
function checkAIAccess() {
  const settings = await getSettings();
  const planType = settings?.plan?.type || YAKKL_PLAN_BASIC;
  const trialEndsAt = settings?.plan?.trialEndsAt;
  const onTrial = isTrialUser(trialEndsAt);
  const effectivePlan = onTrial ? YAKKL_PLAN_PRO : planType;
  
  if (hasFeature(effectivePlan, YAKKL_FEATURE_AI_ASSISTANT)) {
    return true;
  }
  
  return planType === YAKKL_PLAN_PRO || planType === 'enterprise';
}

// Usage scattered with complex logic
{#if await checkAIAccess()}
  <AIHelpButton />
{:else}
  <button onclick={() => showUpgradeModal()}>🤖 (Pro Feature)</button>
{/if}
```

### ✅ AFTER (Lean)
```typescript
// Single import for feature checking
import { canUseFeature } from './lib/utils/features';

// Simple, consistent usage everywhere
{#if canUseFeature('ai_assistant')}
  <AIHelpButton />
{:else}
  <button onclick={() => uiStore.showInfo('Pro Feature Required')}>🤖</button>
{/if}
```

## Constants Organization

### ❌ BEFORE (Bloated constants.ts - 500+ lines)
```typescript
// Mixed concerns, inconsistent naming, unused exports
export const YAKKL_CHAIN_ETHEREUM = 1;
export const yakklChainPolygon = 137;
export const CHAIN_ETHEREUM_NAME = 'Ethereum';
export const ethereum_mainnet_symbol = 'ETH';
export const YAKKL_FEATURE_SEND = 'send_tokens';
export const FEATURE_AI_ASSISTANT = 'ai_assistant';
export const YAKKL_PLAN_BASIC = 'basic';
export const planTypePro = 'pro';
export const YAKKL_UNUSED_CONSTANT_1 = 'unused';
export const YAKKL_UNUSED_CONSTANT_2 = 'also unused';
// ... 400+ more mixed constants
```

### ✅ AFTER (Organized, lean files - ~90 lines total)
```typescript
// chains.ts - Consistent naming, typed
export const SUPPORTED_CHAINS = {
  ETH_MAINNET: {
    id: 1,
    name: 'Ethereum', 
    symbol: 'ETH'
  }
} as const;

// plans.ts - Clean enums
export enum PlanType {
  Basic = 'basic',
  Pro = 'pro' 
}

export const PLAN_FEATURES = {
  BASIC: ['send_tokens', 'receive_tokens'],
  PRO: ['send_tokens', 'receive_tokens', 'ai_assistant']
} as const;
```

## Logging Optimization

### ❌ BEFORE (Always in bundle)
```typescript
import { log } from '$lib/common/logger-wrapper';

// All logs included in production bundle
log.debug('User clicked button', { userId: 123 });
log.info('Loading wallet data');
log.warn('Network slow');
log.error('Failed to load');
```

### ✅ AFTER (Production optimized)
```typescript
import { log } from '../lib/utils/logger';

// Debug/info stripped in production, warn/error kept
log.debug('User clicked button', { userId: 123 }); // Removed in prod
log.info('Loading wallet data');                   // Removed in prod  
log.warn('Network slow');                          // Kept in prod
log.error('Failed to load');                       // Kept in prod
```

## Bundle Size Impact

```bash
# BEFORE
constants.ts: 15KB (mostly unused)
feature logic: 8KB (complex checks)
logging: 12KB (all levels)
Total overhead: ~35KB

# AFTER  
constants/: 3KB (only used)
feature logic: 2KB (centralized manager)
logging: 1KB (optimized runtime)
Total overhead: ~6KB

Reduction: ~83% smaller 🎉
```

## Development Experience

### ❌ BEFORE
- Hunt through 500+ line constants file
- Complex feature logic in every component
- Inconsistent naming conventions
- Verbose logs cluttering console

### ✅ AFTER
- Clear, organized constants by feature
- Simple `canUseFeature()` everywhere
- Consistent naming conventions
- Clean console, production-ready logging