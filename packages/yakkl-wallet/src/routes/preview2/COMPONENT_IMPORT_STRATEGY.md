# Component Import Strategy for Preview2

## Decision Matrix: When to Copy vs. Import

### ✅ **Use Shared Components** (`$lib/components/`)
Import directly when components are:
- **Pure display components** (no business logic changes needed)
- **Stable and working** in current system
- **No styling conflicts** with preview2 design

**Examples**:
```typescript
import AuthError from '$lib/components/AuthError.svelte';     // Pure error display
import AuthLoading from '$lib/components/AuthLoading.svelte'; // Pure loading spinner
import QR from '$lib/components/QR.svelte';                   // QR code generator
import Copy from '$lib/components/Copy.svelte';               // Copy to clipboard
import Modal from '$lib/components/Modal.svelte';             // Basic modal structure
```

### 📋 **Copy to Preview2** (`/preview2/lib/components/`)
Copy and modify when components need:
- **Preview2-specific styling** (new `.yakkl-*` classes)
- **Different business logic** (lean feature management)
- **New functionality** not in original

**Examples**:
```typescript
import Login from '../lib/components/Login.svelte';           // Modified buttons & styling
import RegistrationOption from '../lib/components/RegistrationOption.svelte'; // New styling
// Future: Header, Footer, Settings when they need preview2 features
```

### 🆕 **Create New** (`/preview2/lib/`)
Create from scratch for:
- **Preview2-only features** (lean logger, feature manager)
- **New utilities** (lean constants, stores)
- **Architecture improvements** (better organization)

**Examples**:
```typescript
import { log } from '../lib/utils/logger';                    // Lean logger
import { canUseFeature } from '../lib/utils/features';        // Feature manager
import { SUPPORTED_CHAINS } from '../lib/constants/chains';   // Lean constants
```

## Import Path Patterns

### From Preview2 Components
```typescript
// ✅ Shared components (stable)
import AuthError from '$lib/components/AuthError.svelte';

// ✅ Preview2 components (modified)
import Login from '../lib/components/Login.svelte';

// ✅ Preview2 utilities (new)
import { log } from '../lib/utils/logger';
import { canUseFeature } from '../lib/utils/features';
```

### From Preview2 Pages
```typescript
// ✅ Shared components
import Modal from '$lib/components/Modal.svelte';

// ✅ Preview2 components  
import Login from './lib/components/Login.svelte';

// ✅ Preview2 utilities
import { ROUTES } from './lib/constants';
```

## Benefits of This Strategy

### 🔄 **Minimal Duplication**
- Only copy what actually needs changes
- Reuse stable, working components
- Reduce maintenance burden

### 🛡️ **Risk Isolation** 
- Production components untouched
- Preview2 changes contained
- Easy rollback if needed

### ⚡ **Development Speed**
- Don't reinvent working components
- Focus on actual improvements
- Faster iteration cycles

### 🧹 **Clean Migration Path**
```bash
# When preview2 is ready for production:
1. Replace $lib/components with preview2 versions
2. Update import paths throughout codebase  
3. Remove /preview2/lib/components directory
4. Test and deploy
```

## Real Example: Login Component

```typescript
// src/routes/preview2/lib/components/Login.svelte
import { verify } from '$lib/common/security';           // ✅ Shared utility
import AuthError from '$lib/components/AuthError.svelte'; // ✅ Shared component  
import { log } from '../utils/logger';                   // ✅ Preview2 utility

// This component:
// - Uses shared AuthError (no changes needed)
// - Uses shared security functions (stable)  
// - Uses preview2 logger (optimized for dev/prod)
// - Has preview2 styling (new .yakkl-btn-* classes)
```

This strategy ensures **maximum reuse** with **minimum risk** while providing a **clear upgrade path** when preview2 is ready for production.