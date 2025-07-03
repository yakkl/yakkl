# Preview2 Lean Migration Summary

## ✅ Completed

### 1. Component Isolation Strategy
- Created `/preview2/lib/components/` for modified components
- Reverted changes to shared `$lib/components/` (production safe)
- Clear migration path documented

### 2. Lean Constants & Tree Shaking
```typescript
// ❌ OLD: Massive constants file (500+ lines)
export const YAKKL_SOMETHING = 'value';
export const yakklOtherThing = 'value';
// ... hundreds more unused constants

// ✅ NEW: Organized, lean constants
// chains.ts - Only chain constants (30 lines)
export const SUPPORTED_CHAINS = {
  ETH_MAINNET: { id: 1, name: 'Ethereum', ... },
  // Only what's actually used
} as const;

// plans.ts - Only plan constants (40 lines)  
export enum PlanType {
  Basic = 'basic',
  Pro = 'pro'
}
```

### 3. Optimized Logging
```typescript
// ❌ OLD: Verbose logging everywhere
console.log('Debug info'); // Always included in bundle

// ✅ NEW: Environment-aware logging
const log = new Logger();
log.debug('Debug info');  // Stripped in production
log.error('Error');       // Always kept
```

### 4. Consistent Naming Conventions
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Enums**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Files**: `kebab-case.ts`

### 5. Feature Management
```typescript
// ❌ OLD: Complex feature checking across multiple files
if (planType === 'pro' && hasAccess && trialValid) { ... }

// ✅ NEW: Clean, centralized feature management
import { canUseFeature } from '../utils/features';
if (canUseFeature('ai_assistant')) { ... }
```

### 6. Build Scripts
- Added `dev2:wallet` script for preview2 development
- Environment variables: `VITE_LOG_LEVEL=debug VITE_PREVIEW2=true`

## File Structure Comparison

### Before (Bloated)
```
src/lib/common/
├── constants.ts        # 500+ lines, mixed concerns
├── types.ts           # 200+ types, many unused
└── utilities.ts       # 300+ functions, mixed quality
```

### After (Lean)
```
preview2/lib/
├── constants/
│   ├── chains.ts      # 30 lines, chain-specific
│   ├── plans.ts       # 40 lines, plan-specific  
│   └── index.ts       # 20 lines, re-exports
├── utils/
│   ├── logger.ts      # 40 lines, optimized
│   └── features.ts    # 80 lines, feature management
└── stores/
    └── plan.store.lean.ts  # 100 lines vs 200+
```

## Bundle Size Impact

### Estimated Reductions
- **Constants**: ~80% reduction (500 lines → 90 lines)
- **Logging**: ~90% debug/info logs removed in production
- **Feature Logic**: ~60% reduction in complexity
- **Type Definitions**: Only what's used

### Runtime Performance
- Faster feature checks (single manager vs complex logic)
- Reduced memory usage (fewer unused constants)
- Cleaner dependency graph

## Migration Guidelines

### DO
✅ Copy only what's needed  
✅ Use lean constants from `/preview2/lib/constants/`  
✅ Follow naming conventions  
✅ Use feature manager for access control  
✅ Use optimized logger  

### DON'T
❌ Copy entire files without analysis  
❌ Mix naming conventions  
❌ Use verbose logging  
❌ Create circular dependencies  
❌ Modify shared `$lib/` components  

## Next Steps

1. **Replace existing stores** with lean versions
2. **Migrate components** using isolation strategy
3. **Add build-time optimizations** for production
4. **Create migration tests** to ensure compatibility
5. **Document feature differences** between v1 and preview2

## Commands

```bash
# Development with preview2 optimizations
pnpm run dev2:wallet

# Environment variables
VITE_LOG_LEVEL=debug    # Enable debug logs
VITE_PREVIEW2=true      # Enable preview2 features
```