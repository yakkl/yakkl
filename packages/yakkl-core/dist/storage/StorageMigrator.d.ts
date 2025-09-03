/**
 * Storage Migrator
 * Handles storage schema migrations
 */
import type { IStorage, IStorageMigrator, StorageMigration, MigrationHistory } from '../interfaces/storage-enhanced.interface';
export declare class StorageMigrator implements IStorageMigrator {
    private storage;
    private migrations;
    private migrationOrder;
    private versionKey;
    private historyKey;
    constructor(storage: IStorage, migrations: StorageMigration[]);
    registerMigration(migration: StorageMigration): void;
    getCurrentVersion(): Promise<string>;
    getHistory(): Promise<MigrationHistory[]>;
    migrate(targetVersion?: string): Promise<void>;
    rollback(targetVersion: string): Promise<void>;
    private addToHistory;
    private getMigrationsBetween;
    private getLatestVersion;
    private compareVersions;
    /**
     * Create a migration that transforms data structure
     */
    static createDataMigration(version: string, description: string, transform: (key: string, value: any) => any | null): StorageMigration;
    /**
     * Create a migration that renames keys
     */
    static createRenameMigration(version: string, description: string, renames: Record<string, string>): StorageMigration;
}
//# sourceMappingURL=StorageMigrator.d.ts.map