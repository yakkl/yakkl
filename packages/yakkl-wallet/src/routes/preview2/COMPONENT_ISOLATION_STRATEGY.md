# Preview2 Component Isolation Strategy

## Core Principle
**NEVER modify shared components in `$lib/components/`** when working on preview2 features.

## Strategy

### 1. When to Copy Components
Copy a component to `/preview2/lib/components/` when:
- It needs preview2-specific styling or behavior
- It uses new `.yakkl-*` classes from preview2 design system
- It has different functionality in preview2

### 2. When to Use Shared Components
Use `$lib/components/` directly when:
- Component works identically in both versions
- No styling changes needed
- Simple display components (e.g., QR, Copy)

### 3. Directory Structure
```
src/
├── lib/components/          # Production components - DO NOT MODIFY
│   ├── Login.svelte
│   ├── Modal.svelte
│   └── ...
└── routes/preview2/
    └── lib/components/      # Preview2-specific components
        ├── Login.svelte     # Modified for preview2
        ├── Terms.svelte     # Modified for preview2
        └── ...
```

### 4. Import Rules
- In preview2 pages: Use relative imports for preview2 components
  ```svelte
  import Login from '../lib/components/Login.svelte';  // Preview2 version
  import QR from '$lib/components/QR.svelte';          // Shared version
  ```
- In production pages: Always use `$lib/components/`

### 5. Migration Process
When preview2 is ready for production:
1. Replace `$lib/components/` with preview2 versions
2. Update all imports
3. Remove `/preview2/lib/components/`
4. Test thoroughly

## Benefits
- **Zero risk** to production users
- **Clean testing** of new UI
- **Easy rollback** if needed
- **Clear separation** of concerns