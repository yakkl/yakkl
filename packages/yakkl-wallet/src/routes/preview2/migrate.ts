import { MigrationUtils } from './lib/utils/migration';
import { accountStore } from './lib/stores/account.store';
import { chainStore } from './lib/stores/chain.store';
import { tokenStore } from './lib/stores/token.store';
import { uiStore } from './lib/stores/ui.store';
import { planStore } from './lib/stores/plan.store';
import { yakklMiscStore } from '$lib/common/stores';
// Mock legacy store functions for migration
const getSettings = async () => ({ plan: { type: 'basic' } });
const setSettings = async (settings: any) => true;
const getAccounts = async (): Promise<any[]> => [];
const getCurrentChain = async (): Promise<any> => ({ name: 'Ethereum', chainId: 1 });
const getAllTokens = async (): Promise<any[]> => [];
import { PlanType } from './lib/config/features';

/**
 * Main migration script to move from old system to preview2
 */

interface MigrationConfig {
  dryRun?: boolean;
  verbose?: boolean;
  backupData?: boolean;
}

export class Preview2Migration {
  private config: MigrationConfig;
  private migrationLog: string[] = [];

  constructor(config: MigrationConfig = {}) {
    this.config = {
      dryRun: false,
      verbose: false,
      backupData: true,
      ...config
    };
  }

  /**
   * Execute the complete migration
   */
  async execute(): Promise<{
    success: boolean;
    report: any;
    rollback?: any;
  }> {
    this.log('Starting Preview2 migration...');

    try {
      // Step 1: Create rollback data if needed
      const rollbackData = this.config.backupData 
        ? await this.createBackup()
        : null;

      // Step 2: Load legacy data
      const legacyData = await this.loadLegacyData();
      this.log(`Loaded legacy data: ${legacyData.accounts.length} accounts, ${legacyData.tokens.length} tokens`);

      // Step 3: Validate legacy data
      const validation = this.validateLegacyData(legacyData);
      if (!validation.isValid) {
        throw new Error(`Legacy data validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 4: Convert data to new format
      const convertedData = await this.convertData(legacyData);
      this.log(`Converted data: ${convertedData.accounts.length} accounts, ${convertedData.tokens.length} tokens`);

      // Step 5: Validate converted data
      const conversionValidation = MigrationUtils.validateMigration(legacyData, convertedData);
      if (!conversionValidation.isValid) {
        throw new Error(`Data conversion validation failed: ${conversionValidation.errors.join(', ')}`);
      }

      if (conversionValidation.warnings.length > 0) {
        this.log(`Warnings: ${conversionValidation.warnings.join(', ')}`);
      }

      // Step 6: Apply migration (unless dry run)
      if (!this.config.dryRun) {
        await this.applyMigration(convertedData);
        this.log('Migration applied successfully');
      } else {
        this.log('Dry run completed - no changes applied');
      }

      // Step 7: Generate report
      const report = MigrationUtils.createMigrationReport(
        convertedData.accounts.length,
        convertedData.tokens.length,
        convertedData.transactions?.length || 0,
        []
      );

      this.log('Migration completed successfully');

      return {
        success: true,
        report,
        rollback: rollbackData
      };

    } catch (error) {
      this.log(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      const report = MigrationUtils.createMigrationReport(0, 0, 0, [
        error instanceof Error ? error.message : 'Unknown error'
      ]);

      return {
        success: false,
        report
      };
    }
  }

  /**
   * Create backup of current data
   */
  private async createBackup(): Promise<any> {
    this.log('Creating backup...');

    const originalData = {
      accounts: await getAccounts(),
      settings: await getSettings(),
      chain: await getCurrentChain(),
      tokens: await getAllTokens(),
      timestamp: Date.now()
    };

    return MigrationUtils.createRollbackData(originalData);
  }

  /**
   * Load all legacy data
   */
  private async loadLegacyData(): Promise<{
    accounts: any[];
    tokens: any[];
    settings: any;
    chain: any;
    transactions?: any[];
  }> {
    const [accounts, settings, chain, tokens] = await Promise.all([
      getAccounts(),
      getSettings(),
      getCurrentChain(),
      getAllTokens()
    ]);

    return {
      accounts: accounts || [],
      tokens: tokens || [],
      settings: settings || {},
      chain: chain || null
    };
  }

  /**
   * Validate legacy data before conversion
   */
  private validateLegacyData(data: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required data
    if (!data.accounts || data.accounts.length === 0) {
      warnings.push('No accounts found in legacy data');
    }

    if (!data.settings) {
      warnings.push('No settings found in legacy data');
    }

    // Validate account structure
    data.accounts?.forEach((account: any, index: number) => {
      if (!account.ethAddress && !account.address) {
        errors.push(`Account at index ${index} missing address`);
      }
    });

    // Validate token structure
    data.tokens?.forEach((token: any, index: number) => {
      if (!token.symbol) {
        errors.push(`Token at index ${index} missing symbol`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convert legacy data to preview2 format
   */
  private async convertData(legacyData: any): Promise<{
    accounts: any[];
    tokens: any[];
    settings: any;
    chains: any[];
    transactions?: any[];
  }> {
    // Convert accounts
    const accounts = MigrationUtils.convertAccounts(legacyData.accounts);

    // Convert tokens (extend with mock pricing data for conversion)
    const tokensWithPricing = legacyData.tokens.map((token: any) => ({
      ...token,
      totalValue: token.totalValue || (parseFloat(token.balance || '0') * 2500).toString(), // Mock ETH price
      totalQuantity: token.totalQuantity || token.balance || '0',
      price: token.price || '2500' // Mock price
    }));
    const tokens = MigrationUtils.convertTokens(tokensWithPricing);

    // Convert settings
    const settings = await MigrationUtils.migrateUserSettings(legacyData.settings);

    // Convert chain data
    const chains = legacyData.chain ? [MigrationUtils.convertChain(legacyData.chain)] : [];

    return {
      accounts,
      tokens,
      settings,
      chains
    };
  }

  /**
   * Apply the migration to preview2 stores
   */
  private async applyMigration(convertedData: any): Promise<void> {
    this.log('Applying migration to preview2 stores...');

    try {
      // Initialize stores with converted data
      if (convertedData.accounts.length > 0) {
        // Set the first account as current
        accountStore.setCurrentAccount(convertedData.accounts[0]);
        
        // Load all accounts
        // Accounts are loaded via loadAccounts() method
        await accountStore.loadAccounts();
      }

      // Set up chain data
      if (convertedData.chains.length > 0) {
        await chainStore.loadChains();
        // The chain store will handle setting the current chain
      }

      // Set up tokens
      if (convertedData.tokens.length > 0) {
        // Token data will be loaded via refresh() method
        await tokenStore.refresh();
      }

      // Set up plan
      await planStore.loadPlan();
      if (convertedData.settings.plan.type !== PlanType.BASIC) {
        await planStore.upgradePlan(convertedData.settings.plan.type);
      }

      // Set up UI preferences
      uiStore.setTheme(convertedData.settings.theme);

      // Update settings with preview2 flag
      await setSettings({
        ...convertedData.settings,
        preview2Enabled: true,
        migrationCompleted: true,
        migrationDate: new Date().toISOString()
      });

      this.log('Store initialization completed');

    } catch (error) {
      throw new Error(`Failed to apply migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rollback migration if something goes wrong
   */
  async rollback(rollbackData: any): Promise<{
    success: boolean;
    message: string;
  }> {
    this.log('Starting rollback...');

    try {
      const result = await MigrationUtils.executeRollback(rollbackData);
      this.log(result.message);
      return result;
    } catch (error) {
      const message = `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(message);
      return {
        success: false,
        message
      };
    }
  }

  /**
   * Get migration logs
   */
  getLogs(): string[] {
    return [...this.migrationLog];
  }

  /**
   * Clear migration logs
   */
  clearLogs(): void {
    this.migrationLog = [];
  }

  /**
   * Internal logging
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    this.migrationLog.push(logMessage);
    
    if (this.config.verbose) {
      console.log(logMessage);
    }
  }
}

/**
 * Quick migration for development/testing
 */
export async function quickMigrate(options: MigrationConfig = {}): Promise<void> {
  const migration = new Preview2Migration({
    verbose: true,
    ...options
  });

  const result = await migration.execute();
  
  if (!result.success) {
    console.error('Migration failed:', result.report);
    throw new Error('Migration failed');
  }

  console.log('Migration completed successfully:', result.report);
}

/**
 * Enable preview2 features without full migration (for development)
 */
export async function enablePreview2(): Promise<void> {
  const settings = await getSettings();
  await setSettings({
    ...settings,
    preview2Enabled: true,
    devMode: true
  });

  console.log('Preview2 enabled in development mode');
}

/**
 * Check if migration is needed
 */
export async function isMigrationNeeded(): Promise<boolean> {
  const settings = await getSettings();
  return !(settings as any).preview2Enabled && !(settings as any).migrationCompleted;
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  isNeeded: boolean;
  isCompleted: boolean;
  migrationDate?: string;
}> {
  const settings = await getSettings();
  
  return {
    isNeeded: await isMigrationNeeded(),
    isCompleted: (settings as any).migrationCompleted || false,
    migrationDate: (settings as any).migrationDate
  };
}