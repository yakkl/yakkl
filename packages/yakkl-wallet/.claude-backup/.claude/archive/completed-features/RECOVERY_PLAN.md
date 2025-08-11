# YAKKL Wallet Import Recovery Plan

## Problem Summary
- **Root Cause**: Mass reversion of static imports created malformed syntax
- **Affected Files**: ~100+ files touched, many with corrupted imports
- **Main Issues**:
  1. Malformed import statements: `import { const browser = getBrowserExt()!;`
  2. Wrong import patterns in wrong contexts
  3. Some files severely truncated
  4. Missing modules and type errors

## Recovery Strategy

### Phase 1: Fix Critical Syntax Errors (Priority: HIGH)

#### Corrupted Import Pattern
```typescript
// BROKEN - Current state in many files
import {
const browser = getBrowserExt()!;
  getBlock,
  
// FIXED - What it should be
import { getBlock } from 'somewhere';
const browser = getBrowserExt()!;
```

**Affected Files** (based on compilation errors):
1. `/src/lib/extensions/chrome/eip-6963.ts` - CRITICAL (truncated to 10 lines)
2. `/src/lib/extensions/chrome/context.ts` - CRITICAL (truncated)
3. `/src/contexts/background/extensions/chrome/content.ts`
4. `/src/contexts/background/extensions/chrome/dapp.ts`

### Phase 2: Apply Correct Import Patterns

#### Background Context Files (Use STATIC imports)
```typescript
// ✅ CORRECT for background context
import browser from 'webextension-polyfill';
```

**Files to fix**:
- All files in `/src/contexts/background/`
- All files in `/src/lib/extensions/chrome/` (background-related)
- `content.ts` files (they run in background context)

#### Client Context Files (Use DYNAMIC imports with guards)
```typescript
// ✅ CORRECT for client context (.svelte, client-side .ts)
let browser: any;
if (typeof window !== 'undefined') {
  browser = await import('webextension-polyfill');
}

// OR for type-only imports
import type { Browser } from 'webextension-polyfill';
```

**Files to check**:
- All `.svelte` files
- All files in `/src/lib/services/` that run client-side
- All files in `/src/routes/`

### Phase 3: Restore Truncated Files

**Critical Files to Restore**:
1. `/src/lib/extensions/chrome/eip-6963.ts` (only 10 lines, needs full restore)
2. `/src/lib/extensions/chrome/context.ts` (only 7 lines)

**Options**:
- Copy from `/src/contexts/background/extensions/chrome/eip-6963.ts` (if complete)
- Restore from `feature/v2-rebuild` branch
- Check git history before the mass change

### Phase 4: Fix Module Resolution

**Current Errors**:
- `Can't resolve '$plugins/Logger'` → Should be `'$lib/managers/Logger'`
- Missing exports from modules
- Type mismatches

### Implementation Steps

1. **Create Safety Checkpoint**
   ```bash
   git stash
   git checkout -b fix/import-recovery
   /checkpoint create "before import recovery"
   ```

2. **Fix Malformed Imports First** (Manual or scripted)
   ```bash
   # Find all files with the broken pattern
   grep -r "const browser = getBrowserExt" --include="*.ts" src/
   ```

3. **Apply Context-Specific Fixes**
   - Background: Convert to static imports
   - Client: Keep dynamic with SSR guards

4. **Restore Truncated Files**
   ```bash
   # Compare with good branch
   git show feature/v2-rebuild:path/to/file.ts > temp.ts
   ```

5. **Test Incrementally**
   ```bash
   # After each batch of fixes
   pnpm run dev:wallet
   ```

## Quick Fix Script

```bash
#!/bin/bash
# Fix common malformed imports
find src -name "*.ts" -type f -exec sed -i '' 's/import {$/import {/g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/^const browser = getBrowserExt()!;$//g' {} \;
```

## Success Criteria
- Zero compilation errors
- All imports follow correct context patterns
- No truncated files
- Tests pass
- Application runs correctly

## Rollback Plan
If fixes make things worse:
```bash
git checkout feature/v2-rebuild -- problematic-file.ts
# OR
git reset --hard HEAD~1
/checkpoint revert <checkpoint-tag>
```