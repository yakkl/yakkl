import { PlanType } from '$lib/common';
import type {
  IAccountManager,
  Account,
  AccountLimits,
  CreateAccountOptions,
  AccountAnalytics,
  MultiAccountOperations,
  AccountBackup,
  AccountToken
} from '../interfaces/IAccountManager';
import { UpgradeRequiredError } from '../errors/UpgradeRequiredError';

/**
 * Standard Account Manager Implementation
 * Provides basic account functionality for free users
 * Pro features throw UpgradeRequiredError
 */
export class StandardAccountManager implements IAccountManager {
  private planType: PlanType = PlanType.STANDARD;
  private initialized = false;
  private accounts: Account[] = [];

  // Standard plan limits
  private readonly STANDARD_ACCOUNT_LIMIT = 3;
  private readonly PRO_ACCOUNT_LIMIT = 50;

  async initialize(planType: PlanType): Promise<void> {
    this.planType = planType;
    this.initialized = true;

    // Load existing accounts from storage (mock implementation)
    await this.loadAccounts();
  }

  isAdvancedFeaturesEnabled(): boolean {
    return this.planType === PlanType.PRO || this.planType === PlanType.ENTERPRISE;
  }

  private async loadAccounts(): Promise<void> {
    // Mock implementation - replace with actual storage loading
    this.accounts = [
      {
        id: 'account-1',
        name: 'Main Account',
        address: '0x1234...5678',
        type: 'eoa',
        balance: '1.5',
        tokens: [],
        isDefault: true,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now()
      }
    ];
  }

  async getAccountLimits(): Promise<AccountLimits> {
    const maxAccounts = this.isAdvancedFeaturesEnabled()
      ? this.PRO_ACCOUNT_LIMIT
      : this.STANDARD_ACCOUNT_LIMIT;

    return {
      maxAccounts,
      currentAccounts: this.accounts.length,
      canCreateAccount: this.accounts.length < maxAccounts,
      planType: this.planType
    };
  }

  async canCreateAccount(): Promise<boolean> {
    const limits = await this.getAccountLimits();
    return limits.canCreateAccount;
  }

  async createAccount(options: CreateAccountOptions = {}): Promise<Account> {
    if (!this.initialized) {
      throw new Error('Account manager not initialized');
    }

    const canCreate = await this.canCreateAccount();
    if (!canCreate) {
      const limits = await this.getAccountLimits();
      throw new UpgradeRequiredError(
        `You've reached the account limit (${limits.maxAccounts}) for your plan. Upgrade to PRO for up to ${this.PRO_ACCOUNT_LIMIT} accounts.`,
        'Account Creation',
        'PRO'
      );
    }

    // Mock account creation
    const newAccount: Account = {
      id: `account-${Date.now()}`,
      name: options.name || `Account ${this.accounts.length + 1}`,
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      type: options.type || 'eoa',
      balance: '0',
      tokens: [],
      isDefault: this.accounts.length === 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: options.metadata
    };

    this.accounts.push(newAccount);
    await this.saveAccounts();

    return newAccount;
  }

  async getAccounts(): Promise<Account[]> {
    if (!this.initialized) {
      throw new Error('Account manager not initialized');
    }
    return [...this.accounts];
  }

  async getAccount(id: string): Promise<Account | null> {
    if (!this.initialized) {
      throw new Error('Account manager not initialized');
    }
    return this.accounts.find(account => account.id === id) || null;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    if (!this.initialized) {
      throw new Error('Account manager not initialized');
    }

    const accountIndex = this.accounts.findIndex(account => account.id === id);
    if (accountIndex === -1) {
      throw new Error('Account not found');
    }

    this.accounts[accountIndex] = {
      ...this.accounts[accountIndex],
      ...updates,
      id, // Prevent ID changes
      updatedAt: Date.now()
    };

    await this.saveAccounts();
    return this.accounts[accountIndex];
  }

  async deleteAccount(id: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Account manager not initialized');
    }

    const accountIndex = this.accounts.findIndex(account => account.id === id);
    if (accountIndex === -1) {
      return false;
    }

    // Prevent deleting the last account
    if (this.accounts.length === 1) {
      throw new Error('Cannot delete the last account');
    }

    // Prevent deleting default account without setting another as default
    const accountToDelete = this.accounts[accountIndex];
    if (accountToDelete.isDefault && this.accounts.length > 1) {
      // Set another account as default
      const otherAccount = this.accounts.find((acc, idx) => idx !== accountIndex);
      if (otherAccount) {
        await this.setDefaultAccount(otherAccount.id);
      }
    }

    this.accounts.splice(accountIndex, 1);
    await this.saveAccounts();
    return true;
  }

  async setDefaultAccount(id: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Account manager not initialized');
    }

    const account = await this.getAccount(id);
    if (!account) {
      return false;
    }

    // Remove default from all accounts
    this.accounts.forEach(acc => {
      acc.isDefault = false;
    });

    // Set the specified account as default
    const targetAccount = this.accounts.find(acc => acc.id === id);
    if (targetAccount) {
      targetAccount.isDefault = true;
      await this.saveAccounts();
      return true;
    }

    return false;
  }

  async getDetailedBalance(accountId: string): Promise<AccountToken[]> {
    throw new UpgradeRequiredError(
      'Detailed balance breakdown with token analytics requires a PRO plan',
      'Detailed Balance',
      'PRO'
    );
  }

  async getAccountAnalytics(accountId?: string): Promise<AccountAnalytics> {
    throw new UpgradeRequiredError(
      'Portfolio analytics and performance metrics require a PRO plan',
      'Account Analytics',
      'PRO'
    );
  }

  async getMultiAccountOperations(): Promise<MultiAccountOperations> {
    throw new UpgradeRequiredError(
      'Multi-account operations and bulk transfers require a PRO plan',
      'Multi-Account Operations',
      'PRO'
    );
  }

  async exportAccountData(accountIds?: string[]): Promise<AccountBackup> {
    throw new UpgradeRequiredError(
      'Account data export and backup features require a PRO plan',
      'Account Export',
      'PRO'
    );
  }

  async importAccountData(backup: AccountBackup, password?: string): Promise<Account[]> {
    throw new UpgradeRequiredError(
      'Account data import and restoration features require a PRO plan',
      'Account Import',
      'PRO'
    );
  }

  private async saveAccounts(): Promise<void> {
    // Mock implementation - replace with actual storage saving
    // In real implementation, this would save to IndexedDB or other storage
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    this.accounts = [];
  }
}
