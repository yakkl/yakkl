# YAKKL Wallet Preview2 Rebuild Plan

## Executive Summary
Fast-track rebuild of YAKKL wallet using existing components with new UI/UX, proper separation of Basic/Pro tiers, and clean architecture.

## Phase 1: Configuration & Architecture Foundation (Day 1-2)

### 1.1 Update Configuration Files
```bash
# Use existing configs as base, update for preview2
cp tailwind.new-wallet.config.js src/routes/preview2/tailwind.config.js
# Extend tsconfig for preview2 specific paths
# Keep existing svelte.config.js - it works
```

### 1.2 Create Directory Structure
```
/preview2/
├── lib/
│   ├── components/     # Move existing preview2/components here
│   ├── stores/         # Feature-specific stores
│   ├── services/       # Background communication layer
│   ├── types/          # TypeScript interfaces
│   ├── utils/          # Shared utilities
│   └── features/
│       ├── basic/      # Basic tier features
│       ├── pro/        # Pro tier features
│       └── shared/     # Shared features
```

### 1.3 Setup Feature Flags
```typescript
// lib/config/features.ts
export const FEATURES = {
  BASIC: ['send', 'receive', 'view_balance'],
  PRO: ['swap', 'staking', 'advanced_analytics', 'ai_help'],
  PAYMENT: ['buy_crypto', 'subscription']
};
```

## Phase 2: Organize Library Structure (Day 2-3)

### 2.1 Move & Organize Components
```bash
# Move existing preview2 components
mv src/routes/preview2/components/* src/routes/preview2/lib/components/

# Copy reusable components from main lib
cp src/lib/components/{Modal,Card,ThemeToggle}.svelte src/routes/preview2/lib/components/
```

### 2.2 Create Service Layer
```typescript
// lib/services/wallet.service.ts
import { safeClientSendMessage } from '$lib/utilities/safeClientSendMessage';

export class WalletService {
  async getAccounts() {
    return safeClientSendMessage({ method: 'eth_accounts' });
  }
  
  async getBalance(address: string) {
    return safeClientSendMessage({ method: 'eth_getBalance', params: [address] });
  }
}
```

### 2.3 Setup Stores Architecture
```typescript
// lib/stores/index.ts
export { accountStore } from './account.store';
export { tokenStore } from './token.store';
export { settingsStore } from './settings.store';
```

## Phase 3: Wire Up Real Data (Day 3-4)

### 3.1 Replace Mock Data
- Use existing `yakklAccountStore` from `$lib/common/stores/accounts.ts`
- Use existing `yakklCombinedTokenStore` from `$lib/common/stores/tokens.ts`
- Leverage existing WebSocket client for real-time updates

### 3.2 Connect Background Services
```typescript
// lib/services/background.service.ts
import { unifiedMessageListener } from '$lib/common/listeners/background/unifiedMessageListener';

export function initBackgroundConnection() {
  // Reuse existing message patterns
}
```

### 3.3 Adapt Existing Components
- Wrap existing components with new styling
- Create adapter layers for data transformation
- Maintain backward compatibility

## Phase 4: Build Feature Modules (Day 4-6)

### 4.1 Basic Features Module
```
features/basic/
├── send/
│   ├── SendForm.svelte (adapt existing)
│   └── send.service.ts
├── receive/
│   ├── ReceiveQR.svelte
│   └── receive.service.ts
└── balance/
    ├── BalanceView.svelte
    └── balance.service.ts
```

### 4.2 Pro Features Module
```
features/pro/
├── swap/
│   ├── SwapInterface.svelte (use existing SwapTokenPanel)
│   └── swap.service.ts
├── analytics/
│   ├── Analytics.svelte
│   └── analytics.service.ts
└── ai/
    ├── AIAssistant.svelte
    └── ai.service.ts
```

### 4.3 Payment Module
```
features/payment/
├── buy/
│   ├── BuyCrypto.svelte (adapt existing Buy.svelte)
│   └── stripe.service.ts
├── subscription/
│   ├── Subscription.svelte
│   └── plan.service.ts
└── crypto-payment/
    ├── CryptoPayment.svelte
    └── payment.service.ts
```

## Phase 5: Payment Infrastructure (Day 6-7)

### 5.1 Crypto Payment Gateway
- Build on existing Stripe integration
- Add crypto payment options
- Create white-label ready architecture

### 5.2 Subscription Management
- Use existing PlanBadge and Upgrade components
- Enhance with crypto payment options
- Build API for white-label licensing

## Phase 6: Testing & Migration (Day 7-9)

### 6.1 Testing Strategy
```bash
# Unit tests for services
pnpm test:preview2

# Integration tests with background
pnpm test:integration

# E2E tests for user flows
pnpm test:e2e
```

### 6.2 Migration Steps
1. **Parallel Running**: Both UIs accessible via feature flag
2. **Component Migration**: One feature at a time
3. **Data Migration**: Ensure store compatibility
4. **Route Migration**: Update paths when ready

### 6.3 Rollback Plan
```bash
# Keep old routes as backup
mv src/routes/(wallet) src/routes/(wallet-legacy)
mv src/routes/preview2/* src/routes/(wallet)/
```

## Phase 7: Sidepanel UI Update (Day 9-10)

### 7.1 Market Insights Redesign
- Apply new design system to sidepanel
- Keep existing functionality
- Add Pro tier features

### 7.2 Component Reuse
- Use new Header/Footer components
- Apply consistent styling
- Maintain existing data feeds

## Phase 8: Documentation & Cleanup (Day 10-11)

### 8.1 Technical Documentation
- Component API documentation
- Service layer documentation
- Migration guide for developers

### 8.2 Code Cleanup
- Remove unused mock data
- Archive old components
- Optimize bundle size

## Implementation Order (Priority)

1. **Immediate Actions** (Today):
   - Move preview2/components to preview2/lib/components
   - Create service layer structure
   - Setup feature flags

2. **Tomorrow**:
   - Wire up real account data
   - Replace mock chain data
   - Connect to background services

3. **Day 3-4**:
   - Build send/receive with real data
   - Implement balance displays
   - Add loading/error states

4. **Day 5-6**:
   - Pro features (swap, analytics)
   - Payment infrastructure
   - Testing setup

5. **Day 7-8**:
   - Migration testing
   - Documentation
   - Performance optimization

## Key Success Metrics
- [ ] All mock data replaced with real services
- [ ] Basic/Pro separation working with feature flags
- [ ] Payment flow operational
- [ ] All existing tests passing
- [ ] Performance equal or better than current
- [ ] Clean migration path documented

## Risk Mitigation
1. **Keep both UIs** running until confident
2. **Feature flags** for gradual rollout
3. **Extensive testing** before migration
4. **Regular backups** of working code
5. **Clear rollback** procedures

## Tools & Resources Needed
- Existing stores and services (reuse heavily)
- Background message patterns (already built)
- Component library (adapt existing)
- Test infrastructure (enhance current)

## Notes
- Focus on reusing existing code with new UI wrapper
- Don't reinvent - adapt and enhance
- Keep security patterns from existing code
- Maintain backward compatibility during transition