# Import Path Migration Strategy

## Current State Analysis

### Import Statistics
- **Total Import Occurrences**: 1,356
- **Files Affected**: 439
- **Most Common Patterns**:
  - `$lib/common/*` - Core utilities and types
  - `$lib/utilities/*` - Utility functions
  - `$lib/managers/*` - Business logic managers
  - `$lib/services/*` - Service layer
  - `$lib/stores/*` - Svelte stores

## Migration Approach

### Phase 1: Preparation
1. **Create Import Map**
   - Document all current import paths
   - Map to new package locations
   - Identify circular dependencies

2. **Build Codemod Tools**
   - TypeScript AST-based transformation
   - Pattern-based replacement
   - Validation scripts

### Phase 2: Package Exports Setup

#### @yakkl/core
```typescript
// Current imports from wallet
import { BigNumber } from '$lib/common/bignumber';
import { validateAddress } from '$lib/common/validation';

// New imports after migration
import { BigNumber } from '@yakkl/core/math';
import { validateAddress } from '@yakkl/core/validators';
```

#### @yakkl/security
```typescript
// Current imports
import { encryptData } from '$lib/common/encryption';
import { jwtManager } from '$lib/utilities/jwt';

// New imports after migration
import { encryptData } from '@yakkl/security/crypto';
import { jwtManager } from '@yakkl/security/jwt';
```

#### @yakkl/routing
```typescript
// Current imports
import { ProviderRoutingManager } from '$lib/managers/ProviderRoutingManager';
import { PriceManager } from '$lib/managers/PriceManager';

// New imports after migration
import { ProviderRouter } from '@yakkl/routing';
import { PriceRouter } from '@yakkl/routing/price';
```

#### @yakkl/ui
```typescript
// Current imports
import Button from '$lib/components/Button.svelte';
import Modal from '$lib/components/Modal.svelte';

// New imports after migration
import { Button } from '@yakkl/ui';
import { Modal } from '@yakkl/ui';
```

## Codemod Implementation

### 1. AST-Based Transformer (TypeScript)
```typescript
// codemod/update-imports.ts
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface ImportMapping {
  from: string;
  to: string;
}

const importMappings: ImportMapping[] = [
  // Core utilities
  { from: '$lib/common/bignumber', to: '@yakkl/core/math' },
  { from: '$lib/common/validation', to: '@yakkl/core/validators' },
  { from: '$lib/common/types', to: '@yakkl/core/types' },
  
  // Security
  { from: '$lib/common/encryption', to: '@yakkl/security/crypto' },
  { from: '$lib/utilities/jwt', to: '@yakkl/security/jwt' },
  { from: '$lib/utilities/jwt-background', to: '@yakkl/security/jwt/background' },
  
  // Routing
  { from: '$lib/managers/ProviderRoutingManager', to: '@yakkl/routing' },
  { from: '$lib/managers/PriceManager', to: '@yakkl/routing/price' },
  
  // UI Components
  { from: '$lib/components/Button.svelte', to: '@yakkl/ui' },
  { from: '$lib/components/Modal.svelte', to: '@yakkl/ui' },
  { from: '$lib/components/Toast.svelte', to: '@yakkl/ui' },
];

function updateImports(sourceFile: ts.SourceFile): ts.SourceFile {
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (sourceFile) => {
      const visitor: ts.Visitor = (node) => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            const importPath = moduleSpecifier.text;
            const mapping = importMappings.find(m => importPath.startsWith(m.from));
            
            if (mapping) {
              return ts.factory.updateImportDeclaration(
                node,
                node.decorators,
                node.modifiers,
                node.importClause,
                ts.factory.createStringLiteral(
                  importPath.replace(mapping.from, mapping.to)
                ),
                node.assertClause
              );
            }
          }
        }
        return ts.visitEachChild(node, visitor, context);
      };
      return ts.visitNode(sourceFile, visitor);
    };
  };
  
  const result = ts.transform(sourceFile, [transformer]);
  return result.transformed[0];
}
```

### 2. Regex-Based Fallback (for Svelte files)
```bash
#!/bin/bash
# scripts/update-svelte-imports.sh

# Create backup
cp -r src src.backup

# Update imports in Svelte files
find src -name "*.svelte" -type f | while read file; do
  # Core imports
  sed -i "s|from '\$lib/common/bignumber'|from '@yakkl/core/math'|g" "$file"
  sed -i "s|from '\$lib/common/validation'|from '@yakkl/core/validators'|g" "$file"
  
  # Security imports
  sed -i "s|from '\$lib/common/encryption'|from '@yakkl/security/crypto'|g" "$file"
  sed -i "s|from '\$lib/utilities/jwt'|from '@yakkl/security/jwt'|g" "$file"
  
  # UI imports
  sed -i "s|from '\$lib/components/Button.svelte'|from '@yakkl/ui'|g" "$file"
  sed -i "s|from '\$lib/components/Modal.svelte'|from '@yakkl/ui'|g" "$file"
done

echo "Import paths updated in Svelte files"
```

### 3. Validation Script
```typescript
// scripts/validate-imports.ts
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const DISALLOWED_PATTERNS = [
  /from ['"]\.\.\/\.\.\//, // Relative imports going up multiple levels
  /from ['"]\$lib\/common\//, // Old common imports
  /from ['"]\$lib\/utilities\//, // Old utilities imports
];

function validateFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors: string[] = [];
  
  DISALLOWED_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(content)) {
      errors.push(`${filePath}: Contains disallowed import pattern #${index + 1}`);
    }
  });
  
  return errors;
}

// Run validation
const files = glob.sync('src/**/*.{ts,tsx,svelte}');
const allErrors: string[] = [];

files.forEach(file => {
  const errors = validateFile(file);
  allErrors.push(...errors);
});

if (allErrors.length > 0) {
  console.error('Import validation failed:');
  allErrors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
} else {
  console.log('✅ All imports validated successfully');
}
```

## Migration Execution Plan

### Step 1: Create Re-export Shims (Week 1)
Create temporary re-export files in wallet to maintain compatibility:

```typescript
// src/lib/common/bignumber.ts (temporary shim)
export * from '@yakkl/core/math';
console.warn('Deprecated: Import from @yakkl/core/math directly');
```

### Step 2: Gradual Migration (Weeks 2-3)
1. Run codemod on non-critical files first
2. Test each batch thoroughly
3. Update imports in new code immediately
4. Monitor for runtime errors

### Step 3: Final Cleanup (Week 4)
1. Remove all shim files
2. Run final validation
3. Update documentation
4. Remove backup files

## Import Organization Best Practices

### 1. Import Order
```typescript
// 1. Node/npm packages
import { writable } from 'svelte/store';
import type { BigNumber } from 'ethers';

// 2. @yakkl packages
import { validateAddress } from '@yakkl/core';
import { Button, Modal } from '@yakkl/ui';

// 3. Local absolute imports
import { authStore } from '$lib/stores/auth-store';

// 4. Local relative imports
import { helper } from './helper';
```

### 2. Barrel Exports
Each package should have clear barrel exports:

```typescript
// @yakkl/core/index.ts
export * from './math';
export * from './validators';
export * from './types';
export * from './utils';
```

### 3. Type-Only Imports
Use type-only imports where possible:

```typescript
import type { BigNumber } from '@yakkl/core';
import { validateAddress } from '@yakkl/core';
```

## Rollback Strategy

### If Issues Arise:
1. **Immediate Rollback**
   ```bash
   git stash
   git checkout main
   rm -rf src
   mv src.backup src
   ```

2. **Partial Rollback**
   - Revert specific files from backup
   - Re-run old import patterns
   - Use shim files temporarily

3. **Gradual Fix**
   - Keep both import patterns working
   - Fix issues incrementally
   - Monitor error logs

## Testing Strategy

### 1. Unit Tests
- Test all exported functions
- Verify import resolution
- Check type definitions

### 2. Integration Tests
- Test cross-package imports
- Verify build process
- Check bundle size

### 3. E2E Tests
- Full application flow
- Browser extension specific tests
- Performance benchmarks

## Success Metrics

1. **Zero Runtime Errors** from import issues
2. **Bundle Size** reduced by 10%+ (due to better tree-shaking)
3. **Build Time** improved by 20%+
4. **Type Checking** passes 100%
5. **All Tests** passing

## Common Issues & Solutions

### Issue: Circular Dependencies
**Solution**: Use dynamic imports or restructure exports

### Issue: Missing Type Definitions
**Solution**: Ensure all packages have proper .d.ts files

### Issue: Build Failures
**Solution**: Check tsconfig paths and package.json exports

### Issue: Runtime Import Errors
**Solution**: Verify package.json "exports" field configuration

## Timeline

- **Week 1**: Setup and tooling
- **Week 2**: Core and Security packages
- **Week 3**: Routing and UI packages
- **Week 4**: Testing and cleanup
- **Week 5**: Documentation and training

## Automation Scripts

### Run All Migrations
```bash
#!/bin/bash
# scripts/migrate-all.sh

echo "Starting import migration..."

# Backup
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Run TypeScript codemod
npx ts-node scripts/codemod/update-imports.ts

# Run Svelte updates
./scripts/update-svelte-imports.sh

# Validate
npx ts-node scripts/validate-imports.ts

# Run tests
npm test

echo "Migration complete!"
```

## Monitoring

After migration, monitor:
1. Build logs for import warnings
2. Runtime console for deprecation warnings
3. Bundle analyzer for duplicate modules
4. Test coverage for import-related issues

This strategy ensures a safe, systematic migration of all import paths with minimal disruption to development.