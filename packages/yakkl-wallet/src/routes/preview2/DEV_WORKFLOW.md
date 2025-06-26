# Development Workflow - Preview2 Feature Tiers

## Overview
This document outlines the development, build, and distribution process for YAKKL's tiered feature system.

## Feature Tier Structure

### 📦 **Public Tier** (Current Repo)
- **Plan**: Basic
- **Features**: Core wallet functionality
- **Repository**: `yakkl/yakkl` (public)
- **Distribution**: Open source

### 💎 **Pro Tier**
- **Plan**: Pro
- **Features**: Advanced analytics, AI assistance, premium swaps
- **Repository**: `yakkl/yakkl-wallet-pro` (private)
- **Distribution**: Paid subscription

### 🔒 **Private Tier**
- **Plan**: Private
- **Features**: Maximum security, air-gapped operations, Shamir backup
- **Repository**: `yakkl/yakkl-wallet-private` (private)
- **Distribution**: Enterprise/high-security clients

## Development Workflow

### 1. **Feature Development**
```bash
# Develop features in preview2 first
cd packages/yakkl-wallet/src/routes/preview2

# Pro features
src/routes/preview2/lib/components/pro/
├── AdvancedAnalytics.svelte
├── AIAssistant.svelte
├── PremiumSwap.svelte
└── ProDashboard.svelte

# Private features  
src/routes/preview2/lib/components/private/
├── SecureRecovery.svelte
├── ShamirBackup.svelte
├── HardwareIntegration.svelte
└── AirGappedSigning.svelte
```

### 2. **Feature Isolation**
```typescript
// All features check access level
import { canUseFeature } from '../../utils/features';

// Pro feature example
{#if canUseFeature('advanced_analytics')}
  <AdvancedAnalytics />
{:else}
  <UpgradePrompt plan="Pro" />
{/if}

// Private feature example  
{#if canUseFeature('private_key_backup')}
  <SecureRecovery />
{:else}
  <UpgradePrompt plan="Private" />
{/if}
```

### 3. **Build Process**

#### **Development Build**
```bash
# Test all features locally
VITE_PREVIEW2=true VITE_PLAN_TYPE=private pnpm run dev2:wallet

# Test specific tier
VITE_PREVIEW2=true VITE_PLAN_TYPE=pro pnpm run dev2:wallet
VITE_PREVIEW2=true VITE_PLAN_TYPE=basic pnpm run dev2:wallet
```

#### **Production Build**
```bash
# Public build (Basic tier only)
VITE_PLAN_TYPE=basic pnpm run build:wallet

# Pro build (includes Pro features)
VITE_PLAN_TYPE=pro pnpm run build:wallet:pro

# Private build (includes all features)
VITE_PLAN_TYPE=private pnpm run build:wallet:private
```

### 4. **Repository Migration Strategy**

#### **Phase 1: Prepare for Split**
1. ✅ Develop all features in preview2
2. ✅ Create proper feature isolation
3. ✅ Test tier-based access control
4. ✅ Document component dependencies

#### **Phase 2: Create Pro Repo**
```bash
# Create yakkl-wallet-pro repository
mkdir yakkl-wallet-pro
cd yakkl-wallet-pro

# Copy base wallet + pro features
cp -r ../yakkl/packages/yakkl-wallet/src/routes/preview2/lib/components/pro/* ./src/components/
cp -r ../yakkl/packages/yakkl-wallet/src/routes/preview2/lib/utils/* ./src/utils/
cp -r ../yakkl/packages/yakkl-wallet/src/routes/preview2/lib/stores/* ./src/stores/

# Update package.json for pro tier
{
  "name": "@yakkl/wallet-pro",
  "private": true,
  "scripts": {
    "build": "vite build --config vite.pro.config.js"
  }
}
```

#### **Phase 3: Create Private Repo**
```bash
# Create yakkl-wallet-private repository
mkdir yakkl-wallet-private
cd yakkl-wallet-private

# Copy all features including private
cp -r ../yakkl-wallet-pro/* ./
cp -r ../yakkl/packages/yakkl-wallet/src/routes/preview2/lib/components/private/* ./src/components/
```

### 5. **Distribution Strategy**

#### **Basic (Public)**
```bash
# Public npm package
npm publish @yakkl/wallet

# Chrome Web Store - Free
# Firefox Add-ons - Free
```

#### **Pro (Private)**
```bash
# Private npm registry or direct distribution
npm publish @yakkl/wallet-pro --registry=https://registry.yakkl.com

# Subscription-based downloads
# Signed extension packages
```

#### **Private (Enterprise)**
```bash
# Direct enterprise distribution
# Custom deployment packages
# On-premise installation
```

## Environment Configuration

### **Development Environment Variables**
```bash
# .env.development
VITE_PREVIEW2=true
VITE_PLAN_TYPE=private  # or pro, basic
VITE_FEATURES_ENABLED=advanced_analytics,ai_assistant,private_key_backup
VITE_BUILD_TARGET=development
```

### **Production Environment Variables**
```bash
# .env.production.basic
VITE_PLAN_TYPE=basic
VITE_FEATURES_ENABLED=view_balance,send_tokens,receive_tokens
VITE_BUILD_TARGET=production

# .env.production.pro
VITE_PLAN_TYPE=pro
VITE_FEATURES_ENABLED=basic,advanced_analytics,ai_assistant,swap_tokens
VITE_BUILD_TARGET=production

# .env.production.private
VITE_PLAN_TYPE=private
VITE_FEATURES_ENABLED=all
VITE_BUILD_TARGET=production
```

## Build Scripts

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev2:wallet": "VITE_PREVIEW2=true vite dev",
    "dev2:wallet:pro": "VITE_PREVIEW2=true VITE_PLAN_TYPE=pro vite dev",
    "dev2:wallet:private": "VITE_PREVIEW2=true VITE_PLAN_TYPE=private vite dev",
    
    "build:wallet": "vite build",
    "build:wallet:pro": "VITE_PLAN_TYPE=pro vite build --config vite.pro.config.js",
    "build:wallet:private": "VITE_PLAN_TYPE=private vite build --config vite.private.config.js",
    
    "package:basic": "pnpm run build:wallet && pnpm run package:extension",
    "package:pro": "pnpm run build:wallet:pro && pnpm run package:extension:pro",
    "package:private": "pnpm run build:wallet:private && pnpm run package:extension:private"
  }
}
```

## Testing Strategy

### **Feature Testing**
```bash
# Test feature isolation
pnpm test:features

# Test upgrade prompts
pnpm test:upgrade-prompts

# Test plan switching
pnpm test:plan-switching
```

### **Integration Testing**
```bash
# Test basic → pro upgrade
pnpm test:upgrade:basic-to-pro

# Test pro → private upgrade  
pnpm test:upgrade:pro-to-private

# Test feature access control
pnpm test:access-control
```

## Next Steps

1. **✅ Complete Preview2 Feature Development**
   - Finish Pro features (AdvancedAnalytics, AIAssistant)
   - Finish Private features (SecureRecovery, ShamirBackup)
   - Test all tier transitions

2. **🔄 Setup Build Infrastructure**
   - Create tier-specific build configs
   - Setup environment-based feature flags
   - Test distribution packages

3. **📦 Repository Migration**
   - Create yakkl-wallet-pro repo
   - Create yakkl-wallet-private repo
   - Move features to appropriate repos
   - Update build processes

4. **🚀 Launch Strategy**
   - Beta test with select users
   - Rollout pro tier subscriptions
   - Enterprise private tier sales

This workflow ensures clean separation of concerns, proper feature isolation, and scalable development across all tiers.