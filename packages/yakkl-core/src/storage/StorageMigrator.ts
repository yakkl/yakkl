/**
 * Storage Migrator
 * Handles storage schema migrations
 */

import type { 
  IStorage,
  IStorageMigrator,
  StorageMigration,
  MigrationHistory 
} from '../interfaces/storage-enhanced.interface';

export class StorageMigrator implements IStorageMigrator {
  private storage: IStorage;
  private migrations: Map<string, StorageMigration> = new Map();
  private migrationOrder: string[] = [];
  private versionKey = '__migration_version__';
  private historyKey = '__migration_history__';

  constructor(storage: IStorage, migrations: StorageMigration[]) {
    this.storage = storage;
    
    // Sort migrations by version and store them
    const sorted = migrations.sort((a, b) => 
      this.compareVersions(a.version, b.version)
    );
    
    for (const migration of sorted) {
      this.migrations.set(migration.version, migration);
      this.migrationOrder.push(migration.version);
    }
  }

  registerMigration(migration: StorageMigration): void {
    this.migrations.set(migration.version, migration);
    
    // Re-sort migration order
    this.migrationOrder = Array.from(this.migrations.keys()).sort(
      (a, b) => this.compareVersions(a, b)
    );
  }

  async getCurrentVersion(): Promise<string> {
    const version = await this.storage.get<string>(this.versionKey);
    return version || '0.0.0';
  }

  async getHistory(): Promise<MigrationHistory[]> {
    const history = await this.storage.get<MigrationHistory[]>(this.historyKey);
    return history || [];
  }

  async migrate(targetVersion?: string): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const target = targetVersion || this.getLatestVersion();
    
    if (this.compareVersions(currentVersion, target) >= 0) {
      console.log(`Already at version ${currentVersion}, no migration needed`);
      return;
    }

    const migrationsToRun = this.getMigrationsBetween(currentVersion, target, 'up');
    
    for (const version of migrationsToRun) {
      const migration = this.migrations.get(version);
      if (!migration) continue;

      console.log(`Running migration ${version}: ${migration.description || 'No description'}`);
      
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        await migration.up(this.storage);
        await this.storage.set(this.versionKey, version);
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        console.error(`Migration ${version} failed:`, err);
        throw err;
      } finally {
        // Record in history
        await this.addToHistory({
          version,
          executedAt: startTime,
          direction: 'up',
          success,
          error
        });
      }

      console.log(`Migration ${version} completed successfully`);
    }
  }

  async rollback(targetVersion: string): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    
    if (this.compareVersions(currentVersion, targetVersion) <= 0) {
      console.log(`Already at version ${currentVersion}, no rollback needed`);
      return;
    }

    const migrationsToRun = this.getMigrationsBetween(targetVersion, currentVersion, 'down');
    
    for (const version of migrationsToRun.reverse()) {
      const migration = this.migrations.get(version);
      if (!migration || !migration.down) {
        throw new Error(`Cannot rollback migration ${version}: No down migration defined`);
      }

      console.log(`Rolling back migration ${version}: ${migration.description || 'No description'}`);
      
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        await migration.down(this.storage);
        
        // Find the previous version
        const versionIndex = this.migrationOrder.indexOf(version);
        const previousVersion = versionIndex > 0 
          ? this.migrationOrder[versionIndex - 1] 
          : '0.0.0';
        
        await this.storage.set(this.versionKey, previousVersion);
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        console.error(`Rollback ${version} failed:`, err);
        throw err;
      } finally {
        // Record in history
        await this.addToHistory({
          version,
          executedAt: startTime,
          direction: 'down',
          success,
          error
        });
      }

      console.log(`Rollback ${version} completed successfully`);
    }
  }

  private async addToHistory(entry: MigrationHistory): Promise<void> {
    const history = await this.getHistory();
    history.push(entry);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    await this.storage.set(this.historyKey, history);
  }

  private getMigrationsBetween(
    fromVersion: string, 
    toVersion: string, 
    direction: 'up' | 'down'
  ): string[] {
    const migrations: string[] = [];
    
    for (const version of this.migrationOrder) {
      const comparison = this.compareVersions(version, fromVersion);
      const targetComparison = this.compareVersions(version, toVersion);
      
      if (direction === 'up') {
        if (comparison > 0 && targetComparison <= 0) {
          migrations.push(version);
        }
      } else {
        if (comparison <= 0 && targetComparison > 0) {
          migrations.push(version);
        }
      }
    }
    
    return migrations;
  }

  private getLatestVersion(): string {
    if (this.migrationOrder.length === 0) {
      return '0.0.0';
    }
    return this.migrationOrder[this.migrationOrder.length - 1];
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  /**
   * Create a migration that transforms data structure
   */
  static createDataMigration(
    version: string,
    description: string,
    transform: (key: string, value: any) => any | null
  ): StorageMigration {
    return {
      version,
      description,
      up: async (storage: IStorage) => {
        const keys = await storage.getKeys();
        
        for (const key of keys) {
          const value = await storage.get(key);
          const transformed = transform(key, value);
          
          if (transformed === null) {
            await storage.remove(key);
          } else if (transformed !== value) {
            await storage.set(key, transformed);
          }
        }
      },
      down: async (storage: IStorage) => {
        throw new Error(`Rollback not supported for data migration ${version}`);
      }
    };
  }

  /**
   * Create a migration that renames keys
   */
  static createRenameMigration(
    version: string,
    description: string,
    renames: Record<string, string>
  ): StorageMigration {
    return {
      version,
      description,
      up: async (storage: IStorage) => {
        for (const [oldKey, newKey] of Object.entries(renames)) {
          const value = await storage.get(oldKey);
          if (value !== null) {
            await storage.set(newKey, value);
            await storage.remove(oldKey);
          }
        }
      },
      down: async (storage: IStorage) => {
        // Reverse the renames
        for (const [oldKey, newKey] of Object.entries(renames)) {
          const value = await storage.get(newKey);
          if (value !== null) {
            await storage.set(oldKey, value);
            await storage.remove(newKey);
          }
        }
      }
    };
  }
}