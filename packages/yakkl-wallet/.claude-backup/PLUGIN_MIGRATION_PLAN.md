# Plugin Architecture Migration Plan

## Overview
Migrating from current `$lib/plugins` (managers/services) to a secure plugin architecture that separates standard and pro features.

## Phase 1: Rename Current Structure

### 1.1 Directory Changes
- **Rename**: `src/lib/plugins/` → `src/lib/managers/`
- **Create**: New `src/lib/plugins/` for plugin architecture

### 1.2 Configuration Updates

#### vite.config.ts
```typescript
// Change line 55 from:
$plugins: path.resolve('./src/lib/plugins'),
// To:
$managers: path.resolve('./src/lib/managers'),
$plugins: path.resolve('./src/lib/plugins'), // New plugin system
```

#### tsconfig.json
```json
// Change lines 8-9 from:
"$plugins": ["src/lib/plugins"],
"$plugins/*": ["src/lib/plugins/*"],
// To:
"$managers": ["src/lib/managers"],
"$managers/*": ["src/lib/managers/*"],
"$plugins": ["src/lib/plugins"],
"$plugins/*": ["src/lib/plugins/*"],
```

#### webpack.config.cjs
```javascript
// Change line 100 from:
'$plugins': path.resolve(__dirname, 'src/lib/plugins'),
// To:
'$managers': path.resolve(__dirname, 'src/lib/managers'),
'$plugins': path.resolve(__dirname, 'src/lib/plugins'),
```

### 1.3 Import Updates
- **162 files** need `$lib/plugins` → `$lib/managers`
- **60 files** need `$plugins` → `$managers`

## Phase 2: New Plugin Architecture

### 2.1 Core Interfaces
```
src/lib/plugins/
├── interfaces/
│   ├── ITradingManager.ts
│   ├── IAccountManager.ts
│   ├── INewsManager.ts
│   └── IPluginManager.ts
├── standard/
│   ├── StandardTradingManager.ts
│   ├── StandardAccountManager.ts
│   └── StandardNewsManager.ts
├── registry/
│   ├── PluginRegistry.ts
│   └── PluginLoader.ts
├── errors/
│   └── UpgradeRequiredError.ts
└── index.ts
```

### 2.2 Implementation Strategy
1. **Interfaces First**: Define plugin contracts
2. **Standard Implementations**: Free tier with upgrade prompts
3. **Registry System**: Dynamic loading based on plan
4. **Error Handling**: Graceful degradation

## Phase 3: Component Integration

### 3.1 Components to Update
- TradingView components → Use ITradingManager
- Account management → Use IAccountManager  
- News components → Use INewsManager
- LockedSectionCard → Updated error handling

### 3.2 Testing Strategy
- Mock implementations for testing
- Standard vs Pro build validation
- Component behavior verification

## Phase 4: Pro Package Structure

### 4.1 Private Repository
```
yakkl-wallet-pro/
├── src/
│   ├── managers/
│   │   ├── ProTradingManager.ts
│   │   ├── ProAccountManager.ts
│   │   └── ProNewsManager.ts
│   └── index.ts
├── package.json
└── README.md
```

### 4.2 Build Integration
- Pro builds include private packages
- Standard builds gracefully degrade
- License verification at runtime

## Implementation Order
1. ✅ Document migration plan
2. 🔄 Update configuration files
3. 🔄 Rename directories and update imports
4. 🔄 Create plugin interfaces
5. 🔄 Create standard implementations
6. 🔄 Create plugin registry
7. 🔄 Update components
8. 🔄 Create sample pro implementation
9. 🔄 Test complete system

## Security Benefits
- ✅ Zero pro code in public repository
- ✅ Runtime license verification
- ✅ Graceful feature degradation
- ✅ Impossible to bypass without backend access