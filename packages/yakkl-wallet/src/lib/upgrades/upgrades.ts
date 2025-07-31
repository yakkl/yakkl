/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-debugger */
// Upgrades for the app - now using UpgradeMigrationManager for systematic upgrades

import { log } from '$lib/common/logger-wrapper';
import UpgradeMigrationManager from './UpgradeMigrationManager';

// This list gets updated with each new version - moved to UpgradeMigrationManager
// NOTE: Add new storage areas in UpgradeMigrationManager.ts

/**
 * Main upgrade function - now uses the systematic UpgradeMigrationManager
 */
export async function upgrade(fromVersion: string, toVersion: string): Promise<void> {
	try {
		log.info(`Starting upgrade from ${fromVersion} to ${toVersion}`);

		const migrationManager = UpgradeMigrationManager.getInstance();
		await migrationManager.upgradeAllData(fromVersion, toVersion);

		log.info(`Successfully upgraded from ${fromVersion} to ${toVersion}`);
	} catch (error) {
		log.error('Upgrade failed:', false, error);
		throw error;
	}
}

/**
 * Check if upgrade is needed
 */
export async function checkVersion(toVersion: string): Promise<boolean> {
	try {
		const migrationManager = UpgradeMigrationManager.getInstance();
		const upgradeNeeded = await migrationManager.checkIfUpgradeNeeded(toVersion);
		return !upgradeNeeded; // Return true if NO upgrade needed (opposite of checkIfUpgradeNeeded)
	} catch (error) {
		log.warn('Error checking version:', false, error);
		return false; // Assume upgrade needed if we can't check
	}
}

/**
 * @deprecated - Use UpgradeMigrationManager.updateAllVersions() instead
 * This function is kept for backward compatibility
 */
export async function updateVersion(toVersion: string): Promise<void> {
	try {
		const migrationManager = UpgradeMigrationManager.getInstance();
		await migrationManager.updateAllVersions(toVersion);
	} catch (error) {
		log.warn('Error updating version:', false, error);
	}
}

/**
 * @deprecated - Use UpgradeMigrationManager.cleanupBackups() instead
 * This function is kept for backward compatibility
 */
export async function removeBackups(): Promise<void> {
	try {
		const migrationManager = UpgradeMigrationManager.getInstance();
		await migrationManager.cleanupBackups();
	} catch (error) {
		log.warn('Error removing backups:', false, error);
	}
}

/**
 * @deprecated - This function is replaced by the migration system
 * All upgrade logic should now be added as migrations in UpgradeMigrationManager
 */
async function latest(toVersion: string): Promise<void> {
	log.warn('latest() function is deprecated - upgrade logic moved to UpgradeMigrationManager');

	// For safety, still run the new migration system
	const migrationManager = UpgradeMigrationManager.getInstance();
	await migrationManager.upgradeAllData('0.0.0', toVersion); // Run all migrations
}
