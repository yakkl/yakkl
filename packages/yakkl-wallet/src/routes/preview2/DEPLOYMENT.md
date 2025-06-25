# Preview 2.0 Deployment Guide

## 🚀 Overview

This document outlines the deployment strategy for Preview 2.0, including feature flags, gradual rollout, monitoring, and rollback procedures.

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, E2E)
- [ ] TypeScript compilation successful
- [ ] Linting passes without errors
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Accessibility compliance verified

### Feature Validation
- [ ] Migration scripts tested with production data samples
- [ ] Feature flags configured correctly
- [ ] Plan-based access control tested
- [ ] Payment integration tested in sandbox
- [ ] Rollback procedures validated

### Documentation
- [ ] API documentation updated
- [ ] Architecture documentation current
- [ ] Deployment runbook prepared
- [ ] Monitoring dashboards configured
- [ ] Support documentation ready

## 🎛️ Feature Flag Configuration

### Environment-Based Flags

```typescript
// config/features.ts
export const DEPLOYMENT_FLAGS = {
  // Core Preview 2.0 availability
  PREVIEW_2_ENABLED: {
    development: true,
    staging: true,
    production: false // Start disabled in production
  },
  
  // Feature-specific flags
  MIGRATION_ENABLED: {
    development: true,
    staging: true,
    production: false // Enable after core rollout
  },
  
  PAYMENT_GATEWAY_ENABLED: {
    development: true,
    staging: true,
    production: false // Enable for Pro users first
  },
  
  AI_ASSISTANT_ENABLED: {
    development: true,
    staging: false,
    production: false // Future feature
  }
};
```

### User-Based Flags

```typescript
// User-level feature flags
interface UserFlags {
  userId: string;
  flags: {
    preview2Beta: boolean;
    earlyAccess: boolean;
    internalTester: boolean;
  };
}

// Check user eligibility
function canAccessPreview2(user: User): boolean {
  return user.flags.preview2Beta || 
         user.flags.internalTester ||
         user.plan === PlanType.ENTERPRISE;
}
```

### A/B Testing Configuration

```typescript
// A/B test groups
const AB_TESTS = {
  PREVIEW_2_ROLLOUT: {
    name: 'Preview 2.0 Gradual Rollout',
    variants: {
      control: { weight: 90 }, // Keep on legacy
      preview2: { weight: 10 } // Move to Preview 2.0
    },
    eligibility: {
      minAccountAge: 30, // days
      excludeNewUsers: true,
      planTypes: [PlanType.PRO, PlanType.ENTERPRISE]
    }
  }
};
```

## 📈 Deployment Phases

### Phase 1: Internal Testing (Week 1)
**Scope**: Internal team and selected beta users
**Target**: 50 users maximum

```bash
# Enable for internal testing
NODE_ENV=production
PREVIEW_2_ENABLED=true
PREVIEW_2_AUDIENCE=internal
MAX_PREVIEW_2_USERS=50
```

**Success Criteria**:
- Zero critical bugs
- Migration success rate > 99%
- Performance within 10% of baseline
- All core features functional

**Rollback Triggers**:
- Data corruption detected
- Migration failure rate > 5%
- Critical security vulnerability
- Performance degradation > 25%

### Phase 2: Limited Beta (Week 2-3)
**Scope**: Pro and Enterprise users
**Target**: 5% of eligible users

```typescript
// Gradual rollout configuration
const BETA_ROLLOUT = {
  enabled: true,
  percentage: 5,
  eligibility: {
    planTypes: [PlanType.PRO, PlanType.ENTERPRISE],
    minAccountAge: 30,
    excludeRecentIssues: true
  },
  monitoring: {
    errorThreshold: 2,
    performanceThreshold: 15
  }
};
```

**Monitoring Focus**:
- User adoption rates
- Feature usage patterns
- Error rates and types
- Performance metrics
- Support ticket volume

### Phase 3: Expanded Beta (Week 4-5)
**Scope**: All plan types, geographic rollout
**Target**: 25% of users

```typescript
const EXPANDED_ROLLOUT = {
  percentage: 25,
  regions: ['US', 'EU', 'CA'], // Start with primary regions
  eligibility: {
    planTypes: [PlanType.BASIC, PlanType.PRO, PlanType.ENTERPRISE],
    excludeUnstableConnections: true
  }
};
```

### Phase 4: General Availability (Week 6+)
**Scope**: All users
**Target**: 100% rollout

```typescript
const GA_ROLLOUT = {
  percentage: 100,
  regions: 'all',
  fallbackEnabled: true, // Keep legacy as fallback
  migrationRequired: false // Gradual migration
};
```

## 🔧 Deployment Configuration

### Environment Variables

```bash
# Production deployment
NODE_ENV=production
YAKKL_TYPE=sidepanel

# Preview 2.0 specific
PREVIEW_2_ENABLED=true
PREVIEW_2_ROLLOUT_PERCENTAGE=10
PREVIEW_2_MIGRATION_AUTO=false

# Payment integration
PAYMENT_PROVIDER=stripe
PAYMENT_SANDBOX=false
CRYPTO_PAYMENT_ENABLED=true

# Monitoring
SENTRY_DSN=https://...
ANALYTICS_ENABLED=true
ERROR_REPORTING=true

# Feature flags
FF_MIGRATION_BANNER=true
FF_SUCCESS_ANIMATION=true
FF_SUBSCRIPTION_MODAL=true
```

### Build Configuration

```typescript
// vite.config.ts - Production build
export default defineConfig({
  define: {
    'process.env.PREVIEW_2_ENABLED': JSON.stringify(process.env.PREVIEW_2_ENABLED === 'true'),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'preview2-core': ['./src/routes/preview2/lib'],
          'preview2-features': ['./src/routes/preview2/lib/features'],
          'preview2-services': ['./src/routes/preview2/lib/services']
        }
      }
    }
  }
});
```

### Service Worker Updates

```typescript
// Background service worker configuration
const PREVIEW_2_CONFIG = {
  enabled: process.env.PREVIEW_2_ENABLED === 'true',
  migrationEndpoint: 'https://api.yakkl.com/v2/migrate',
  paymentEndpoint: 'https://payments.yakkl.com/api',
  fallbackToLegacy: true
};

// Update handling
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    // Check if user is in Preview 2.0 beta
    checkPreview2Eligibility();
  }
});
```

## 📊 Monitoring and Observability

### Key Metrics

```typescript
// Performance metrics
const PERFORMANCE_METRICS = {
  pageLoadTime: 'preview2.load_time',
  migrationDuration: 'preview2.migration.duration',
  apiResponseTime: 'preview2.api.response_time',
  componentRenderTime: 'preview2.component.render_time'
};

// Business metrics
const BUSINESS_METRICS = {
  migrationSuccessRate: 'preview2.migration.success_rate',
  featureAdoptionRate: 'preview2.feature.adoption_rate',
  subscriptionConversion: 'preview2.subscription.conversion',
  paymentGatewayUsage: 'preview2.payment.gateway_usage'
};

// Error tracking
const ERROR_METRICS = {
  migrationFailures: 'preview2.migration.failures',
  serviceErrors: 'preview2.service.errors',
  componentErrors: 'preview2.component.errors',
  criticalErrors: 'preview2.critical.errors'
};
```

### Monitoring Dashboard

```typescript
// Grafana/DataDog dashboard configuration
const DASHBOARD_CONFIG = {
  title: 'Preview 2.0 Deployment',
  panels: [
    {
      title: 'User Adoption',
      metrics: ['preview2.users.active', 'preview2.migration.completed'],
      alerts: {
        adoptionRate: { threshold: 80, operator: 'below' }
      }
    },
    {
      title: 'Error Rates',
      metrics: ['preview2.errors.rate', 'preview2.migration.failures'],
      alerts: {
        errorRate: { threshold: 2, operator: 'above' }
      }
    },
    {
      title: 'Performance',
      metrics: ['preview2.load_time', 'preview2.api.latency'],
      alerts: {
        loadTime: { threshold: 3000, operator: 'above' }
      }
    }
  ]
};
```

### Alert Configuration

```typescript
// Critical alerts
const CRITICAL_ALERTS = {
  migrationFailureSpike: {
    condition: 'migration_failure_rate > 5%',
    action: 'pause_migration',
    notification: ['engineering', 'product']
  },
  
  performanceDegradation: {
    condition: 'avg_load_time > 5s',
    action: 'reduce_rollout_percentage',
    notification: ['engineering', 'devops']
  },
  
  criticalError: {
    condition: 'critical_error_count > 10',
    action: 'halt_deployment',
    notification: ['engineering', 'product', 'leadership']
  }
};
```

## 🔄 Rollback Procedures

### Automatic Rollback Triggers

```typescript
// Automated rollback conditions
const ROLLBACK_CONDITIONS = {
  errorRate: {
    threshold: 5, // percent
    duration: 300, // seconds
    action: 'partial_rollback'
  },
  
  migrationFailures: {
    threshold: 10, // percent
    action: 'halt_migration'
  },
  
  criticalBug: {
    manual: true,
    action: 'immediate_rollback'
  }
};

// Rollback execution
async function executeRollback(type: RollbackType) {
  switch (type) {
    case 'partial':
      // Reduce rollout percentage
      await updateFeatureFlag('PREVIEW_2_ROLLOUT_PERCENTAGE', 0);
      break;
      
    case 'full':
      // Disable Preview 2.0 entirely
      await updateFeatureFlag('PREVIEW_2_ENABLED', false);
      break;
      
    case 'migration_halt':
      // Stop new migrations, keep existing users
      await updateFeatureFlag('MIGRATION_ENABLED', false);
      break;
  }
}
```

### Manual Rollback Process

1. **Assessment**
   ```bash
   # Check current deployment status
   kubectl get deployments -l app=yakkl-wallet
   
   # Check error rates
   curl -s "https://api.monitoring.com/metrics/preview2.errors"
   ```

2. **Decision Matrix**
   ```typescript
   const ROLLBACK_DECISION = {
     low_severity: 'monitor_and_patch',
     medium_severity: 'reduce_rollout',
     high_severity: 'halt_new_users',
     critical_severity: 'immediate_rollback'
   };
   ```

3. **Execution**
   ```bash
   # Immediate rollback
   ./scripts/rollback-preview2.sh --level=immediate
   
   # Gradual rollback
   ./scripts/rollback-preview2.sh --level=gradual --percentage=50
   ```

### Data Recovery

```typescript
// User data rollback
class DataRecovery {
  async rollbackUser(userId: string): Promise<boolean> {
    try {
      // Retrieve backup data
      const backup = await this.getBackupData(userId);
      
      // Validate backup integrity
      const isValid = await this.validateBackup(backup);
      if (!isValid) {
        throw new Error('Backup data corrupted');
      }
      
      // Restore original data
      await this.restoreUserData(userId, backup);
      
      // Verify restoration
      await this.verifyRestoration(userId);
      
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }
}
```

## 🔐 Security Considerations

### Deployment Security

```typescript
// Security checks before deployment
const SECURITY_CHECKLIST = {
  codeVulnerabilities: 'run_security_scan',
  dependencyAudit: 'npm_audit',
  sensitiveDataCheck: 'check_for_secrets',
  accessControlValidation: 'validate_permissions',
  encryptionVerification: 'verify_encryption'
};

// Runtime security monitoring
const SECURITY_MONITORING = {
  unusualApiPatterns: 'monitor_api_abuse',
  authenticationFailures: 'track_auth_failures',
  dataAccessPatterns: 'monitor_data_access',
  migrationSecurity: 'validate_migration_safety'
};
```

### Access Control Updates

```typescript
// Permission changes for Preview 2.0
const PERMISSION_UPDATES = {
  preview2Access: {
    resource: 'preview2.*',
    actions: ['read', 'write'],
    conditions: {
      planTypes: [PlanType.PRO, PlanType.ENTERPRISE],
      betaOptIn: true
    }
  },
  
  migrationAccess: {
    resource: 'migration.*',
    actions: ['execute'],
    conditions: {
      userConsent: true,
      dataBackupCreated: true
    }
  }
};
```

## 📋 Deployment Scripts

### Pre-Deployment

```bash
#!/bin/bash
# scripts/pre-deploy-preview2.sh

set -e

echo "Starting Preview 2.0 pre-deployment checks..."

# Run tests
echo "Running test suite..."
npm run test:preview2

# Type checking
echo "Running TypeScript checks..."
npm run check:wallet

# Build verification
echo "Verifying build..."
npm run build:wallet

# Security scan
echo "Running security scan..."
npm audit --audit-level=moderate

# Feature flag validation
echo "Validating feature flags..."
node scripts/validate-feature-flags.js

echo "Pre-deployment checks completed successfully!"
```

### Deployment

```bash
#!/bin/bash
# scripts/deploy-preview2.sh

ENVIRONMENT=${1:-staging}
ROLLOUT_PERCENTAGE=${2:-10}

echo "Deploying Preview 2.0 to $ENVIRONMENT with $ROLLOUT_PERCENTAGE% rollout"

# Set environment variables
export NODE_ENV=$ENVIRONMENT
export PREVIEW_2_ENABLED=true
export PREVIEW_2_ROLLOUT_PERCENTAGE=$ROLLOUT_PERCENTAGE

# Deploy application
echo "Building application..."
npm run build:wallet

echo "Updating service worker..."
./scripts/update-service-worker.sh

echo "Updating feature flags..."
./scripts/update-feature-flags.sh $ENVIRONMENT $ROLLOUT_PERCENTAGE

echo "Deployment completed successfully!"
echo "Monitor metrics at: https://monitoring.yakkl.com/preview2"
```

### Post-Deployment

```bash
#!/bin/bash
# scripts/post-deploy-preview2.sh

echo "Running post-deployment verification..."

# Health checks
echo "Checking application health..."
curl -f https://app.yakkl.com/health/preview2 || exit 1

# Smoke tests
echo "Running smoke tests..."
npm run test:smoke:preview2

# Monitor initial metrics
echo "Collecting initial metrics..."
./scripts/collect-deployment-metrics.sh

# Send deployment notification
echo "Sending deployment notification..."
./scripts/notify-deployment.sh "Preview 2.0 deployed successfully"

echo "Post-deployment verification completed!"
```

## 📞 Support and Communication

### User Communication

```typescript
// In-app notification for Preview 2.0 availability
const PREVIEW_2_ANNOUNCEMENT = {
  title: "Welcome to Preview 2.0!",
  message: "Experience the new YAKKL wallet with enhanced features and improved design.",
  actions: [
    { text: "Try Now", action: "migrate_to_preview2" },
    { text: "Learn More", action: "show_preview2_info" },
    { text: "Maybe Later", action: "dismiss_notification" }
  ],
  targeting: {
    planTypes: [PlanType.PRO, PlanType.ENTERPRISE],
    betaOptIn: true
  }
};
```

### Support Documentation

```markdown
# Preview 2.0 Support Guide

## For Support Team

### Common Issues
1. **Migration Failed**
   - Check user's backup data
   - Verify account status
   - Initiate manual rollback if needed

2. **Feature Access Issues**
   - Verify user's plan type
   - Check feature flag status
   - Refresh user permissions

3. **Performance Issues**
   - Check browser compatibility
   - Verify extension version
   - Clear local storage if needed

### Escalation Process
- Level 1: Support team handles basic issues
- Level 2: Engineering team for technical issues  
- Level 3: Product team for critical bugs
```

### Incident Response

```typescript
// Incident classification
const INCIDENT_LEVELS = {
  P0: {
    description: 'Critical system failure',
    response_time: '15 minutes',
    stakeholders: ['engineering', 'product', 'leadership']
  },
  P1: {
    description: 'Major feature broken',
    response_time: '1 hour',
    stakeholders: ['engineering', 'product']
  },
  P2: {
    description: 'Minor issues affecting some users',
    response_time: '4 hours',
    stakeholders: ['engineering']
  }
};
```

This deployment guide ensures a safe, monitored, and reversible rollout of Preview 2.0 while maintaining system stability and user experience.