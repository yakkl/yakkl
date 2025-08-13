import {
	getObjectFromLocalStorage,
	removeObjectFromLocalStorage,
	setObjectInLocalStorage
} from '$lib/common/storage';
import { log } from '$lib/common/logger-wrapper';
import { AccessSourceType, PromoClassificationType } from '$lib/common/types';
import {
    getObjectFromExtensionStorage,
    setObjectInExtensionStorage,
    getYakklTokenCache,
    setYakklTokenCacheStorage
} from '$lib/common/stores';

// List of all storage keys that need to be upgraded
const yakklUpdateStorage = [
	'preferences',
	'profile',
	'yakklSettings',
	'yakklAccounts',
	'yakklBookmarkedArticles',
	'yakklChats',
	'yakklConnectedDomains',
	'yakklContacts',
	'yakklCombinedTokens',
	'yakklCurrentlySelected',
	'yakklPrimaryAccounts',
	'yakklRegisteredData',
	'yakklSecurity',
	'yakklTokenData',
	'yakklTokenDataCustom',
	'yakklWalletBlockchains',
	'yakklWalletProviders',
	'yakklWatchList',
  'yakklTokenCache',
	'yakklTokenViewCache',
  'yakklAddressTokenCache',
  'yakklWalletCache'
];

const yakklRenameStorage = [
	{oldname: 'settings', newname: 'yakklSettings'},
];

interface UpgradeMigration {
	version: string;
	description: string;
	migrate: (data: any, storageKey: string) => Promise<any>;
}

/**
 * Simple migration for converting number-based financial data to BigNumberish
 * Version: 2.1.0
 */
export async function migrateFinancialDataToBigNumberish(): Promise<void> {
    try {
        log.info('[Migration] Starting financial data migration to BigNumberish');

        // Migrate wallet cache data
        await migrateWalletCacheData();

        // Migrate token cache data
        await migrateTokenCacheData();

        log.info('[Migration] Completed financial data migration to BigNumberish');
    } catch (error) {
        log.error('[Migration] Failed financial data migration:', false, error);
        throw error;
    }
}

async function migrateWalletCacheData(): Promise<void> {
    try {
        const cacheKey = 'yakklWalletCache';
        const cache = await getObjectFromExtensionStorage(cacheKey) as any;

        if (!cache?.chainAccountCache) return;

        // Simple migration: convert number fields to string representation
        for (const chainId in cache.chainAccountCache) {
            const chainCache = cache.chainAccountCache[chainId];

            for (const address in chainCache) {
                const accountCache = chainCache[address];

                // Migrate token values
                accountCache.tokens = accountCache.tokens.map((token: any) => ({
                    ...token,
                    price: typeof token.price === 'number' ? token.price.toString() : token.price,
                    value: typeof token.value === 'number' ? token.value.toString() : token.value,
                    price24hChange: typeof token.price24hChange === 'number' ? token.price24hChange.toString() : token.price24hChange
                }));
            }
        }

        await setObjectInExtensionStorage(cacheKey, cache);
        log.info('[Migration] Migrated wallet cache data');
    } catch (error) {
        log.warn('[Migration] Failed to migrate wallet cache:', false, error);
    }
}

async function migrateTokenCacheData(): Promise<void> {
    try {
        const cache = await getYakklTokenCache();

        const migratedCache = cache.map((entry: any) => ({
            ...entry,
            price: typeof entry.price === 'number' ? entry.price.toString() : entry.price,
            value: typeof entry.value === 'number' ? entry.value.toString() : entry.value
        }));

        await setYakklTokenCacheStorage(migratedCache, true);
        log.info('[Migration] Migrated token cache data');
    } catch (error) {
        log.warn('[Migration] Failed to migrate token cache:', false, error);
    }
}

export class UpgradeMigrationManager {
	private static instance: UpgradeMigrationManager | null = null;

	private migrations: UpgradeMigration[] = [
		{
			version: '2.0.2',
			description: 'Migrate settings to yakklSettings',
			migrate: async (data: any, storageKey: string) => {
				if (storageKey === 'settings') {
					log.info('Migrating settings to yakklSettings');
				}
				return data;
			}
		},
		{
			version: '2.0.1',
			description: 'Migrate userName to username in profile',
			migrate: async (data: any, storageKey: string) => {
				if (storageKey === 'profile' && data && data.userName && !data.username) {
					log.info('Migrating profile.userName to profile.username');
					data.username = data.userName.toLowerCase();
					delete data.userName;
				}
				return data;
			}
		},
		{
			version: '0.31.0',
			description: 'Add plan.source, plan.promo, and trialCountdownPinned to settings',
			migrate: async (data: any, storageKey: string) => {
				if (storageKey === 'yakklSettings' && data) {
					let changed = false;

					if (!data.plan) {
						data.plan = {};
						changed = true;
					}

					if (data.plan.source === undefined) {
						data.plan.source = AccessSourceType.STANDARD;
						changed = true;
					}

					if (data.plan.promo === undefined) {
						data.plan.promo = PromoClassificationType.NONE;
						changed = true;
					}

					if (data.plan.trialEndDate === undefined) {
						data.plan.trialEndDate = '';
						changed = true;
					}

					if (data.trialCountdownPinned === undefined) {
						data.trialCountdownPinned = false;
						changed = true;
					}

					if (changed) {
						log.info('Updated settings with new plan fields');
					}
				}
				return data;
			}
		}
		// Add new migrations here as needed
	];

	private constructor() {}

	static getInstance(): UpgradeMigrationManager {
		if (!UpgradeMigrationManager.instance) {
			UpgradeMigrationManager.instance = new UpgradeMigrationManager();
		}
		return UpgradeMigrationManager.instance;
	}

	/**
	 * Main upgrade function - upgrades all data from one version to another
	 */
	async upgradeAllData(fromVersion: string, toVersion: string): Promise<void> {
		try {
			log.info(`Starting data structure upgrade from ${fromVersion} to ${toVersion}`);

			// Get all migrations that need to run
			const migrationsToRun = this.getMigrationsToRun(fromVersion, toVersion);

			if (migrationsToRun.length === 0) {
				log.info('No data structure migrations needed');
				await this.updateAllVersions(toVersion);
				return;
			}

			log.info(`Found ${migrationsToRun.length} migrations to run`);

			try {
				// Run rename migrations in order - renames any old storage keys to new ones (e.g. settings to yakklSettings) - do this first to avoid conflicts
				// 1.
				for (const migration of migrationsToRun) {
					await this.runRenameMigration(migration);
				}

				// Create backups first
				// 2.
				await this.createBackups();

				// Run migrations in order
				// 3.
				for (const migration of migrationsToRun) {
					await this.runMigration(migration);
				}

				// Update all versions to current
				// 4.
				await this.updateAllVersions(toVersion);

				// Clean up backups after successful upgrade
				// 5.
				setTimeout(() => this.cleanupBackups(), 5000); // Cleanup after 5 seconds

				log.info(`Successfully completed data structure upgrade to ${toVersion}`);
			} catch (error) {
				log.error('Data structure upgrade failed, restoring backups:', false, error);
				await this.restoreBackups();
				throw error;
			}
		} catch (error) {
			log.error('Critical error in data structure upgrade:', false, error);
			throw error;
		}
	}

	/**
	 * Get migrations that need to run between two versions
	 */
	private getMigrationsToRun(fromVersion: string, toVersion: string): UpgradeMigration[] {
		return this.migrations.filter(
			(migration) =>
				this.isVersionNewer(migration.version, fromVersion) &&
				!this.isVersionNewer(migration.version, toVersion)
		);
	}

	private async runRenameMigration(migration: UpgradeMigration): Promise<void> {
		log.info(`Running rename migration: ${migration.description} (v${migration.version})`);

		let migratedCount = 0;

		for (const storageKey of yakklRenameStorage) {
			try {
				let data = await getObjectFromLocalStorage(storageKey.oldname);
				if (!data) continue;

				await setObjectInLocalStorage(storageKey.newname, data);
				migratedCount++;
				log.debug(`Migrated ${storageKey.oldname} to ${storageKey.newname}`);
			} catch (error) {
				log.warn(`Failed to migrate ${storageKey.oldname}:`, false, error);
				// Don't fail the entire migration for one storage key
			}
		}

		log.info(`Migration completed. Updated ${migratedCount} storage objects.`);
	}

	/**
	 * Run a single migration across all storage objects
	 */
	private async runMigration(migration: UpgradeMigration): Promise<void> {
		log.info(`Running migration: ${migration.description} (v${migration.version})`);

		let migratedCount = 0;

		for (const storageKey of yakklUpdateStorage) {
			try {
				let data = await getObjectFromLocalStorage(storageKey);
				if (!data) continue;

				const originalData = JSON.stringify(data);

				// Handle arrays
				if (Array.isArray(data)) {
					data = await Promise.all(data.map((item) => migration.migrate(item, storageKey)));
				} else {
					data = await migration.migrate(data, storageKey);
				}

				// Only save if data actually changed
				if (JSON.stringify(data) !== originalData) {
					await setObjectInLocalStorage(storageKey, data);
					migratedCount++;
					log.debug(`Migrated ${storageKey}`);
				}
			} catch (error) {
				log.warn(`Failed to migrate ${storageKey}:`, false, error);
				// Don't fail the entire migration for one storage key
			}
		}

		log.info(`Migration completed. Updated ${migratedCount} storage objects.`);
	}

	/**
	 * Create backups of all storage objects
	 */
	private async createBackups(): Promise<void> {
		log.info('Creating backups before migration...');
		let backupCount = 0;

		for (const storageKey of yakklUpdateStorage) {
			try {
				const data = await getObjectFromLocalStorage(storageKey);
				if (data) {
					await setObjectInLocalStorage(`${storageKey}Backup`, data);
					backupCount++;
				}
			} catch (error) {
				log.warn(`Failed to backup ${storageKey}:`, false, error);
			}
		}

		log.info(`Created ${backupCount} backups`);
	}

	/**
	 * Restore from backups if migration fails
	 */
	private async restoreBackups(): Promise<void> {
		log.info('Restoring from backups...');
		let restoredCount = 0;

		for (const storageKey of yakklUpdateStorage) {
			try {
				const backup = await getObjectFromLocalStorage(`${storageKey}Backup`);
				if (backup) {
					await setObjectInLocalStorage(storageKey, backup);
					restoredCount++;
				}
			} catch (error) {
				log.warn(`Failed to restore ${storageKey}:`, false, error);
			}
		}

		log.info(`Restored ${restoredCount} objects from backup`);
	}

	/**
	 * Clean up backup files
	 */
	async cleanupBackups(): Promise<void> {
		log.info('Cleaning up backup files...');
		let cleanedCount = 0;

		for (const storageKey of yakklUpdateStorage) {
			try {
				await removeObjectFromLocalStorage(`${storageKey}Backup`);
				cleanedCount++;
			} catch (error) {
				log.warn(`Failed to cleanup backup ${storageKey}:`, false, error);
			}
		}

		log.info(`Cleaned up ${cleanedCount} backup files`);
	}

	/**
	 * Update version fields in all storage objects
	 */
	async updateAllVersions(toVersion: string): Promise<void> {
		if (!toVersion) return;

		log.info(`Updating all storage versions to ${toVersion}`);
		let updatedCount = 0;

		for (const storageKey of yakklUpdateStorage) {
			try {
				let data: any = await getObjectFromLocalStorage(storageKey);

				if (data) {
					if (Array.isArray(data)) {
						data = data.map((item) => ({
							...item,
							version: toVersion
						}));
					} else {
						data.version = toVersion;
					}

					await setObjectInLocalStorage(storageKey, data);
					updatedCount++;
				} else {
					log.debug(`No data found for ${storageKey}. May not have been initialized yet.`);
				}
			} catch (error) {
				log.warn(`Failed to update version for ${storageKey}:`, false, error);
			}
		}

		log.info(`Updated version field in ${updatedCount} storage objects`);
	}

	/**
	 * Simple semantic version comparison
	 */
	private isVersionNewer(version1: string, version2: string): boolean {
		if (!version1 || !version2) return false;

		const v1Parts = version1.split('.').map(Number);
		const v2Parts = version2.split('.').map(Number);

		for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
			const v1Part = v1Parts[i] || 0;
			const v2Part = v2Parts[i] || 0;

			if (v1Part > v2Part) return true;
			if (v1Part < v2Part) return false;
		}
		return false;
	}

	/**
	 * Check if an upgrade is needed by examining current versions
	 */
	async checkIfUpgradeNeeded(currentVersion: string): Promise<boolean> {
		try {
			for (const storageKey of yakklUpdateStorage) {
				const data = await getObjectFromLocalStorage(storageKey);
				if (data && (data as any).version && (data as any).version !== currentVersion) {
					return true;
				}
			}
			return false;
		} catch (error) {
			log.warn('Error checking if upgrade needed:', false, error);
			return true; // Assume upgrade needed if we can't check
		}
	}

	/**
	 * Add a new migration programmatically
	 */
	addMigration(migration: UpgradeMigration): void {
		// Insert in version order
		const insertIndex = this.migrations.findIndex((m) =>
			this.isVersionNewer(migration.version, m.version)
		);

		if (insertIndex === -1) {
			this.migrations.push(migration);
		} else {
			this.migrations.splice(insertIndex, 0, migration);
		}

		log.info(`Added migration for version ${migration.version}: ${migration.description}`);
	}

	/**
	 * Get list of available migrations
	 */
	getMigrations(): UpgradeMigration[] {
		return [...this.migrations];
	}
}

export default UpgradeMigrationManager;
