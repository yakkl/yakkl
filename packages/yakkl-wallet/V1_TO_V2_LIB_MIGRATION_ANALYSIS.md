# V1 to V2 Library Migration Analysis

## Summary

**Total V1 lib files:** 876 files  
**Files that can be copied directly:** 330 files (38%)  
**Files needing conflict resolution:** 546 files (62%)

## Directories That Can Be Copied Directly

These directories don't exist in V2 and can be copied without conflicts:

| Directory | Files | Description |
|-----------|-------|-------------|
| `api` | 4 | API interfaces and utilities |
| `common` | 133 | Common utilities, stores, listeners, auth |
| `data` | 2 | Data models and mock data |
| `hooks` | 1 | Svelte hooks |
| `imports` | 1 | Import utilities |
| `managers` | 149 | Blockchain, contract, network, provider managers |
| `models` | 2 | Data models |
| `new_format` | 10 | New format features and licensing |
| `permissions` | 5 | Permission management |
| `plugins` | 19 | Plugin system and hardware wallet support |
| `streams` | 1 | Stream utilities |
| `themes` | 1 | Theme configuration |
| `tokens` | 1 | Token utilities |
| `upgrades` | 1 | Upgrade scripts |

### Key Subdirectories in Direct Copy Directories

**common/**
- `actions/` - Action handlers
- `activities/` - Activity tracking
- `auth/` - Authentication logic
- `idle/` - Idle detection
- `listeners/` - Event listeners (background, content, ui)
- `shared/` - Shared utilities
- `stores/` - Svelte stores
- `types/` - TypeScript types

**managers/**
- `blockchains/` - Multi-chain support (EVM, Bitcoin, Solana, etc.)
- `contracts/` - Smart contract interactions
- `networks/` - Network configurations
- `providers/` - Network and price providers
- `security.tmp/` - Security features
- `swaps/` - DEX integrations
- `tokens/` - Token management
- `utilities/` - Manager utilities

## Directories Requiring Conflict Resolution

These directories exist in both V1 and V2:

| V1 Directory | V2 Directory | V1 Files | V2 Files | Notes |
|-------------|--------------|----------|----------|-------|
| `components` | `components` | 471 | 34 | V1 has UI library, V2 has app components |
| `services` | `services` | 1 | 5 | Different service implementations |
| `stores` | `stores` | 4 | 9 | Different store structures |
| `utilities` | `utils` | 19 | 3 | Name change, likely different utilities |
| `extensions` | `ext` | 46 | 4 | Name change, extension-specific code |

### Component Differences

**V1 components/** contains:
- Full shadcn/ui component library (accordion, alert, button, etc.)
- Hardware wallet components
- Icon components
- Send transaction components
- Private/Pro components

**V2 components/** contains:
- Application-specific components (Login, UserMenu, SendModal, etc.)
- Feature components organized by modules
- Private/Pro component directories (empty placeholders)

## Migration Strategy Recommendations

### Phase 1: Direct Copy (No Conflicts)
1. Copy all directories that don't exist in V2
2. These represent core functionality that V2 likely needs
3. Priority: `common`, `managers`, `api`, `plugins`

### Phase 2: Merge Components
1. V1 UI components should go to a subdirectory like `components/ui/`
2. Keep V2 app components at the top level
3. This maintains separation between UI library and app components

### Phase 3: Resolve Conflicts
1. **stores**: Merge carefully, V2 may have different state management
2. **services**: Review both implementations, merge as needed
3. **utilities/utils**: Consolidate common utilities, remove duplicates
4. **extensions/ext**: Merge extension-specific code carefully

## File Distribution by Category

- **Core Infrastructure**: ~300 files (common, managers, api)
- **UI Components**: ~470 files (components)
- **Extension Code**: ~46 files (extensions)
- **Features & Utilities**: ~60 files (remaining directories)

## Important Considerations

1. **Type Definitions**: Ensure TypeScript types are compatible between V1 and V2
2. **Import Paths**: Update import statements after migration
3. **Dependencies**: Check if V2 has all necessary dependencies from V1
4. **Configuration**: Some features may need configuration updates
5. **Testing**: Extensive testing needed after migration