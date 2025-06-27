# Preview2 Migration Principles

## 1. Selective Import ("Tree Shaking")
- **Only copy what's actively used** - analyze imports before copying
- **Remove dead code** during migration
- **Question every constant/function** - if unused, don't migrate it

### Example
```typescript
// ❌ BAD: Copying entire constants.ts with 500+ unused constants
import { CONSTANT_1, CONSTANT_2, ...CONSTANT_500 } from './constants';

// ✅ GOOD: Only what's needed
export const CHAIN_IDS = {
  ETHEREUM: 1,
  POLYGON: 137
} as const;
```

## 2. Naming Conventions

### Constants
```typescript
// ✅ UPPER_SNAKE_CASE for true constants
const MAX_RETRIES = 3;
const API_TIMEOUT_MS = 5000;

// ✅ PascalCase for enums/types
enum PlanType {
  Basic = 'basic',
  Pro = 'pro'
}

// ✅ camelCase for functions/variables
const currentUser = getUserData();
function calculateFee() {}
```

### File Structure
```
preview2/
├── lib/
│   ├── constants/       # Grouped by feature
│   │   ├── chains.ts    # Only chain-related constants
│   │   ├── plans.ts     # Only plan-related constants
│   │   └── index.ts     # Re-exports
│   ├── utils/           # Pure utility functions
│   └── services/        # Business logic
```

## 3. Logging Strategy

### Development vs Production
```typescript
// logger.ts
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';

export const log = {
  debug: (...args: any[]) => {
    if (LOG_LEVEL === 'debug') console.debug(...args);
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(LOG_LEVEL)) console.info(...args);
  },
  warn: (...args: any[]) => console.warn(...args),  // Always kept
  error: (...args: any[]) => console.error(...args)  // Always kept
};
```

### Build-time Removal (if using Vite)
```javascript
// vite.config.js
export default {
  define: {
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production')
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    pure: process.env.NODE_ENV === 'production' ? ['console.debug', 'console.info'] : []
  }
}
```

## 4. Migration Checklist

Before copying any file:
- [ ] Identify what's actually imported/used
- [ ] Remove unused exports
- [ ] Update naming to match conventions
- [ ] Replace verbose logging with lean logger
- [ ] Group related constants
- [ ] Add proper TypeScript types
- [ ] Document why each piece exists

## 5. Example Migration

### Before (bloated constants.ts)
```typescript
// 500+ lines of mixed constants
export const YAKKL_SOMETHING = 'value';
export const yakklOtherThing = 'value';
export const NetworkIds = {...};
// ... hundreds more
```

### After (lean, organized)
```typescript
// chains.ts - Only chain constants
export const SUPPORTED_CHAINS = {
  ETHEREUM: { id: 1, name: 'Ethereum', symbol: 'ETH' },
  POLYGON: { id: 137, name: 'Polygon', symbol: 'MATIC' }
} as const;

// plans.ts - Only plan constants  
export enum PlanType {
  Basic = 'basic',
  Pro = 'pro'
}

export const PLAN_FEATURES = {
  [PlanType.Basic]: ['send', 'receive'],
  [PlanType.Pro]: ['send', 'receive', 'swap', 'ai']
} as const;
```