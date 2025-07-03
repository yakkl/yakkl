# YAKKL Preview 2.0 - Next Generation Wallet Experience

## Overview

Preview 2.0 represents a complete architectural overhaul of the YAKKL wallet, featuring modern design, feature-based access control, integrated payment systems, and a comprehensive service-oriented architecture.

## 🚀 Key Features

### Enhanced User Experience
- **Modern Design**: Clean, responsive interface optimized for all screen sizes
- **Real-time Updates**: Live data synchronization with background services
- **Progressive Enhancement**: Graceful fallbacks and loading states
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### Feature-Based Access Control
- **Tiered Plans**: Basic, Pro, and Enterprise subscription levels
- **Granular Permissions**: Individual feature toggles based on user plan
- **Upgrade Flows**: Seamless subscription management and plan upgrades
- **Trial Support**: Time-limited trials with automatic plan transitions

### Payment Infrastructure
- **Crypto Purchases**: Fiat-to-crypto onramp with multiple payment methods
- **Subscription Management**: Automated billing and plan management
- **Merchant Gateway**: White-label payment processing for businesses
- **Revenue Analytics**: Comprehensive tracking of all payment flows

### Advanced Architecture
- **Service Layer**: Clean separation between UI and business logic
- **State Management**: Reactive stores with TypeScript interfaces
- **Migration System**: Safe data migration with backup and rollback
- **Testing Suite**: Comprehensive unit, integration, and E2E tests

## 📁 Directory Structure

```
src/routes/preview2/
├── lib/
│   ├── components/           # Reusable UI components
│   │   ├── SendModal.svelte  # Transaction sending interface
│   │   ├── ReceiveModal.svelte # Payment request generation
│   │   ├── BuyModal.svelte   # Crypto purchase workflow
│   │   ├── TokenPortfolio.svelte # Token list with portfolio view
│   │   └── RecentActivity.svelte # Transaction history
│   ├── config/              # Configuration and feature flags
│   │   └── features.ts      # Feature definitions by plan tier
│   ├── features/            # Feature-based modules
│   │   ├── basic/          # Core wallet functionality
│   │   │   ├── send/       # Token sending
│   │   │   ├── receive/    # Payment requests
│   │   │   └── balance/    # Portfolio management
│   │   ├── pro/            # Premium features
│   │   │   ├── swap/       # Token swapping
│   │   │   └── ai/         # AI assistant
│   │   └── payment/        # Payment infrastructure
│   │       ├── buy/        # Crypto purchases
│   │       ├── subscription/ # Plan management
│   │       └── crypto-payment/ # Merchant gateway
│   ├── services/           # Backend communication layer
│   │   ├── base.service.ts # Abstract service foundation
│   │   ├── wallet.service.ts # Account and chain management
│   │   ├── token.service.ts # Token data and pricing
│   │   └── transaction.service.ts # Transaction handling
│   ├── stores/             # State management
│   │   ├── account.store.ts # Account state
│   │   ├── chain.store.ts  # Network state
│   │   ├── plan.store.ts   # Subscription state
│   │   ├── token.store.ts  # Token portfolio
│   │   ├── transaction.store.ts # Transaction history
│   │   └── ui.store.ts     # UI state and notifications
│   ├── tests/              # Test suites
│   │   ├── services.test.ts # Service layer tests
│   │   ├── stores.test.ts  # State management tests
│   │   ├── components.test.ts # Component tests
│   │   └── e2e.test.ts     # End-to-end tests
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Utility functions
│       └── migration.ts    # Data migration utilities
├── migrate.ts              # Migration orchestration
├── migration-banner.svelte # Migration UI component
├── success/                # Post-migration success page
├── vitest.config.ts        # Test configuration
└── +page.svelte           # Main wallet interface
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- pnpm (package manager)
- Existing YAKKL wallet installation

### Development Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev:wallet

# Run tests
pnpm run test:preview2

# Type checking
pnpm run check:wallet
```

### Feature Flags
Configure feature access in `lib/config/features.ts`:

```typescript
export const FEATURES = {
  BASIC: ['view_balance', 'send_tokens', 'receive_tokens'],
  PRO: [...BASIC_FEATURES, 'swap_tokens', 'ai_assistant', 'buy_crypto_card'],
  ENTERPRISE: [...PRO_FEATURES, 'white_label', 'priority_support']
};
```

## 🔄 Migration Process

### Automatic Migration
When users first access Preview 2.0, the system automatically:

1. **Assessment**: Checks if migration is needed
2. **Backup**: Creates rollback data for safety
3. **Validation**: Ensures data integrity before conversion
4. **Migration**: Converts legacy data to new format
5. **Verification**: Validates successful migration
6. **Activation**: Enables Preview 2.0 features

### Manual Migration
For development or testing:

```typescript
import { quickMigrate, enablePreview2 } from './migrate';

// Full migration with backup
await quickMigrate({ 
  dryRun: false, 
  verbose: true, 
  backupData: true 
});

// Development mode (no migration needed)
await enablePreview2();
```

### Rollback Support
If migration fails or issues arise:

```typescript
import { Preview2Migration } from './migrate';

const migration = new Preview2Migration();
const result = await migration.execute();

if (!result.success && result.rollback) {
  await migration.rollback(result.rollback);
}
```

## 🎯 Feature Implementation

### Adding New Features

1. **Define Feature**: Add to `lib/config/features.ts`
```typescript
const NEW_FEATURE = 'new_awesome_feature';
```

2. **Create Service**: Implement business logic
```typescript
// lib/services/awesome.service.ts
export class AwesomeService extends BaseService {
  async doAwesomeStuff(): Promise<ServiceResponse<any>> {
    // Implementation
  }
}
```

3. **Add Store State**: Manage feature state
```typescript
// lib/stores/awesome.store.ts
export const awesomeStore = writable({
  data: null,
  loading: false,
  error: null
});
```

4. **Build Component**: Create UI
```typescript
// lib/components/AwesomeComponent.svelte
<script lang="ts">
  import { canUseFeature } from '../stores/plan.store';
  
  $: hasAccess = canUseFeature('new_awesome_feature');
</script>

{#if hasAccess}
  <!-- Feature content -->
{:else}
  <UpgradePrompt feature="new_awesome_feature" />
{/if}
```

5. **Add Tests**: Ensure quality
```typescript
// lib/tests/awesome.test.ts
describe('Awesome Feature', () => {
  it('should work awesomely', () => {
    // Test implementation
  });
});
```

### Access Control Patterns

```typescript
// Component-level access control
{#if canUseFeature('pro_feature')}
  <ProComponent />
{:else}
  <UpgradePrompt />
{/if}

// Service-level access control
class FeatureService extends BaseService {
  async protectedMethod() {
    if (!this.hasFeature('required_feature')) {
      throw new Error('Feature not available');
    }
    // Implementation
  }
}

// Store-level access control
const featureStore = derived([planStore], ([$plan]) => {
  return {
    canAccess: hasFeature($plan.type, 'feature_name'),
    upgradeRequired: $plan.type === PlanType.BASIC
  };
});
```

## 🧪 Testing Strategy

### Unit Tests
Test individual components and services:
```bash
pnpm run test:preview2 -- --watch
```

### Integration Tests
Test store interactions and data flow:
```bash
pnpm run test:preview2 -- --run stores.test.ts
```

### End-to-End Tests
Test complete user workflows:
```bash
pnpm run test:preview2 -- --run e2e.test.ts
```

### Component Testing
Test UI components with user interactions:
```bash
pnpm run test:preview2 -- --run components.test.ts
```

## 🔒 Security Considerations

### Data Protection
- **Encrypted Storage**: Sensitive data encrypted at rest
- **Secure Communication**: All API calls use HTTPS with authentication
- **Input Validation**: All user inputs validated and sanitized
- **CSP Compliance**: Content Security Policy enforced

### Access Control
- **Feature Gating**: Server-side validation of feature access
- **Plan Verification**: Subscription status verified on each request
- **Rate Limiting**: API calls rate-limited to prevent abuse
- **Audit Logging**: All sensitive operations logged

### Migration Safety
- **Backup Creation**: Automatic backups before any migration
- **Rollback Support**: Ability to revert failed migrations
- **Data Validation**: Integrity checks throughout process
- **Error Recovery**: Graceful handling of migration failures

## 📈 Performance Optimization

### Bundle Size
- **Tree Shaking**: Unused code automatically removed
- **Dynamic Imports**: Features loaded on-demand
- **Component Splitting**: Large components split into chunks
- **Asset Optimization**: Images and fonts optimized

### Runtime Performance
- **Reactive Updates**: Only affected components re-render
- **Efficient Stores**: Minimal state updates and derivations
- **Request Caching**: API responses cached appropriately
- **Virtual Scrolling**: Large lists virtualized for performance

### Loading States
- **Skeleton Screens**: Placeholder content during loading
- **Progressive Enhancement**: Core functionality loads first
- **Error Boundaries**: Graceful error handling and recovery
- **Offline Support**: Basic functionality available offline

## 🚀 Deployment

### Build Process
```bash
# Production build
pnpm run build:wallet

# Test build
pnpm run preview:wallet
```

### Environment Configuration
```bash
# Production
NODE_ENV=production
YAKKL_TYPE=sidepanel

# Development
NODE_ENV=development
YAKKL_TYPE=popup
DEV_MODE=true
```

### Feature Flags
Control feature rollout:
```typescript
const FEATURE_FLAGS = {
  PREVIEW_2_ENABLED: process.env.NODE_ENV !== 'production',
  PAYMENT_GATEWAY_ENABLED: true,
  AI_ASSISTANT_ENABLED: false
};
```

## 🔧 Troubleshooting

### Common Issues

**Migration Fails**
```bash
# Check migration logs
console.log(migration.getLogs());

# Verify legacy data
await validateLegacyData(legacyData);

# Rollback if needed
await migration.rollback(rollbackData);
```

**Feature Access Issues**
```bash
# Check plan status
console.log(get(planStore));

# Verify feature definitions
console.log(canUseFeature('feature_name'));

# Refresh plan data
await planStore.loadPlan();
```

**Store Synchronization**
```bash
# Reset stores
accountStore.reset();
tokenStore.reset();

# Reload data
await refreshAllData();
```

### Debug Mode
Enable verbose logging:
```typescript
localStorage.setItem('YAKKL_DEBUG', 'true');
```

## 🤝 Contributing

### Code Standards
- **TypeScript**: All code must be typed
- **Testing**: New features require tests
- **Documentation**: Public APIs must be documented
- **Accessibility**: UI components must be accessible

### Development Workflow
1. Create feature branch from `develop`
2. Implement feature with tests
3. Update documentation
4. Submit pull request
5. Code review and approval
6. Merge to `develop`

### Release Process
1. Test on `develop` branch
2. Create release candidate
3. User acceptance testing
4. Merge to `main`
5. Deploy to production
6. Monitor for issues

## 📞 Support

### Documentation
- **Code Comments**: Inline documentation for complex logic
- **Type Definitions**: Comprehensive TypeScript interfaces
- **API Documentation**: Service layer documentation
- **User Guides**: End-user documentation

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Design discussions and questions
- **Discord**: Real-time community support
- **Documentation**: Comprehensive guides and tutorials

---

## ⚡ Quick Start Example

```typescript
// 1. Import preview2 functionality
import { enablePreview2, canUseFeature } from './migrate';

// 2. Enable preview2 mode
await enablePreview2();

// 3. Check feature access
if (canUseFeature('swap_tokens')) {
  // Show swap interface
} else {
  // Show upgrade prompt
}

// 4. Use services
import { WalletService } from './lib/services/wallet.service';
const wallet = WalletService.getInstance();
const accounts = await wallet.getAccounts();

// 5. Use stores
import { tokenStore } from './lib/stores/token.store';
await tokenStore.refresh();
```

Preview 2.0 transforms the YAKKL wallet into a modern, scalable, and feature-rich platform ready for the future of decentralized finance.