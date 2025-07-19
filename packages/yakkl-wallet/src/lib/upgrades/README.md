# YAKKL Upgrade Migration System

## Overview

The `UpgradeMigrationManager` provides a systematic approach to upgrading data structures when the application version changes. This ensures that stored data remains consistent and compatible across versions.

## Key Features

- **Automatic Backups**: Creates backups before any migration
- **Rollback Support**: Can restore from backups if migration fails
- **Selective Upgrades**: Only runs migrations needed between versions
- **Comprehensive Logging**: Detailed logs of all migration activity
- **Safe Error Handling**: Continues with other storage objects if one fails

## How It Works

1. **Version Detection**: Compares current version with stored data versions
2. **Migration Selection**: Finds all migrations between the old and new version
3. **Backup Creation**: Creates backups of all storage objects
4. **Migration Execution**: Runs migrations in version order
5. **Version Update**: Updates all storage objects to current version
6. **Cleanup**: Removes backups after successful migration

## Adding New Migrations

When you make breaking changes to data structures, add a new migration:

```typescript
// In UpgradeMigrationManager.ts, add to the migrations array:
{
  version: '0.32.0',
  description: 'Add newField to yakklAccounts',
  migrate: async (data: any, storageKey: string) => {
    if (storageKey === 'yakklAccounts' && Array.isArray(data)) {
      return data.map(account => ({
        ...account,
        newField: 'defaultValue'
      }));
    }
    return data;
  }
}
```

## Usage Examples

### Basic Usage
```typescript
import UpgradeMigrationManager from '$lib/upgrades/UpgradeMigrationManager';

const migrationManager = UpgradeMigrationManager.getInstance();
await migrationManager.upgradeAllData('0.30.0', '0.31.0');
```

### Check if Upgrade Needed
```typescript
const upgradeNeeded = await migrationManager.checkIfUpgradeNeeded('0.31.0');
if (upgradeNeeded) {
  await migrationManager.upgradeAllData(currentVersion, '0.31.0');
}
```

### Add Dynamic Migration
```typescript
migrationManager.addMigration({
  version: '0.33.0',
  description: 'Runtime migration example',
  migrate: async (data, storageKey) => {
    // Your migration logic here
    return data;
  }
});
```

## Best Practices

1. **Version Numbering**: Use semantic versioning (x.y.z)
2. **Descriptive Messages**: Clearly describe what each migration does
3. **Backward Compatibility**: Ensure migrations can handle missing fields
4. **Testing**: Test migrations with real data before release
5. **Incremental Changes**: Keep migrations focused on specific changes

## Storage Objects

The system automatically handles these storage objects:
- `preferences`
- `profile`
- `settings`
- `yakklAccounts`
- `yakklBookmarkedArticles`
- `yakklChats`
- `yakklConnectedDomains`
- `yakklContacts`
- `yakklCombinedTokens`
- `yakklCurrentlySelected`
- `yakklPrimaryAccounts`
- `yakklRegisteredData`
- `yakklSecurity`
- `yakklTokenData`
- `yakklTokenDataCustom`
- `yakklWalletBlockchains`
- `yakklWalletProviders`
- `yakklWatchList`

## Migration Examples

### Simple Field Addition
```typescript
{
  version: '0.31.0',
  description: 'Add theme preference',
  migrate: async (data, storageKey) => {
    if (storageKey === 'preferences' && !data.theme) {
      data.theme = 'default';
    }
    return data;
  }
}
```

### Array Item Transformation
```typescript
{
  version: '0.32.0',
  description: 'Update account structure',
  migrate: async (data, storageKey) => {
    if (storageKey === 'yakklAccounts' && Array.isArray(data)) {
      return data.map(account => ({
        ...account,
        metadata: account.meta || {},
        // Remove old field
        meta: undefined
      }));
    }
    return data;
  }
}
```

### Conditional Migration
```typescript
{
  version: '0.33.0',
  description: 'Migrate userName to username',
  migrate: async (data, storageKey) => {
    if (storageKey === 'profile' && data.userName && !data.username) {
      data.username = data.userName.toLowerCase();
      delete data.userName;
    }
    return data;
  }
}
```

## Error Handling

The system is designed to be robust:

- Individual storage object failures don't stop the entire migration
- Automatic backup restoration on critical failures
- Detailed error logging for debugging
- Graceful handling of missing or corrupted data

## Debugging

Use the browser console to access migration status:

```javascript
// In browser console
const manager = window.UpgradeMigrationManager?.getInstance();
console.log(manager?.getMigrations());
```

## Backward Compatibility

The old `upgrades.ts` functions still work as wrappers around the new system:

- `upgrade(fromVersion, toVersion)` - Main upgrade function
- `checkVersion(version)` - Check if upgrade needed
- `updateVersion(version)` - Update version fields
- `removeBackups()` - Clean up backup files
