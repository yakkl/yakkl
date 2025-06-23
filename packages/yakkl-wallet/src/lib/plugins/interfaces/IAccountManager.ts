import type { PlanType } from '$lib/common';

/**
 * Account data interfaces
 */
export interface Account {
	id: string;
	name: string;
	address: string;
	type: AccountType;
	balance: string;
	tokens: AccountToken[];
	isDefault: boolean;
	createdAt: number;
	updatedAt: number;
	metadata?: AccountMetadata;
}

export interface AccountToken {
	symbol: string;
	address: string;
	balance: string;
	decimals: number;
	price: number;
	value: number;
	logo?: string;
}

export interface AccountMetadata {
	alias?: string;
	color?: string;
	emoji?: string;
	tags?: string[];
	notes?: string;
	isHidden?: boolean;
	isWatched?: boolean;
}

export interface AccountLimits {
	maxAccounts: number;
	currentAccounts: number;
	canCreateAccount: boolean;
	planType: PlanType;
}

export interface AccountAnalytics {
	totalValue: number;
	totalChange24h: number;
	totalChangePercent24h: number;
	portfolioDistribution: PortfolioDistribution[];
	topGainers: AccountToken[];
	topLosers: AccountToken[];
	recentTransactions: RecentTransaction[];
	performanceMetrics: PerformanceMetrics;
}

export interface PortfolioDistribution {
	symbol: string;
	percentage: number;
	value: number;
	color: string;
}

export interface RecentTransaction {
	hash: string;
	type: 'send' | 'receive' | 'swap' | 'approve';
	amount: string;
	symbol: string;
	timestamp: number;
	status: 'pending' | 'confirmed' | 'failed';
	gasUsed?: string;
	gasPrice?: string;
}

export interface PerformanceMetrics {
	roi24h: number;
	roi7d: number;
	roi30d: number;
	roiAll: number;
	sharpeRatio?: number;
	volatility?: number;
	maxDrawdown?: number;
}

export interface MultiAccountOperations {
	transferBetweenAccounts: boolean;
	bulkOperations: boolean;
	accountGroups: boolean;
	advancedPermissions: boolean;
}

export type AccountType = 'eoa' | 'multisig' | 'smart_contract' | 'hardware' | 'watch_only';

export interface CreateAccountOptions {
	name?: string;
	type?: AccountType;
	metadata?: AccountMetadata;
	importPrivateKey?: string;
	importMnemonic?: string;
	watchAddress?: string;
}

export interface AccountBackup {
	accounts: Account[];
	metadata: {
		version: string;
		createdAt: number;
		planType: PlanType;
		encrypted: boolean;
	};
	checksum: string;
}

/**
 * Account Manager Interface
 * Defines the contract for both standard and pro account functionality
 */
export interface IAccountManager {
	/**
	 * Get account limits based on current plan
	 */
	getAccountLimits(): Promise<AccountLimits>;

	/**
	 * Create a new account (limited by plan)
	 */
	createAccount(options?: CreateAccountOptions): Promise<Account>;

	/**
	 * Get all accounts
	 */
	getAccounts(): Promise<Account[]>;

	/**
	 * Get account by ID
	 */
	getAccount(id: string): Promise<Account | null>;

	/**
	 * Update account metadata
	 */
	updateAccount(id: string, updates: Partial<Account>): Promise<Account>;

	/**
	 * Delete account (if allowed by plan)
	 */
	deleteAccount(id: string): Promise<boolean>;

	/**
	 * Get portfolio analytics (PRO feature)
	 */
	getAccountAnalytics(accountId?: string): Promise<AccountAnalytics>;

	/**
	 * Get advanced multi-account operations (PRO feature)
	 */
	getMultiAccountOperations(): Promise<MultiAccountOperations>;

	/**
	 * Export account data (PRO feature)
	 */
	exportAccountData(accountIds?: string[]): Promise<AccountBackup>;

	/**
	 * Import account data (PRO feature)
	 */
	importAccountData(backup: AccountBackup, password?: string): Promise<Account[]>;

	/**
	 * Set account as default
	 */
	setDefaultAccount(id: string): Promise<boolean>;

	/**
	 * Check if account creation is allowed
	 */
	canCreateAccount(): Promise<boolean>;

	/**
	 * Get account balance with detailed breakdown (PRO feature)
	 */
	getDetailedBalance(accountId: string): Promise<AccountToken[]>;

	/**
	 * Initialize the account manager
	 */
	initialize(planType: PlanType): Promise<void>;

	/**
	 * Check if advanced features are available
	 */
	isAdvancedFeaturesEnabled(): boolean;

	/**
	 * Clean up resources
	 */
	dispose(): Promise<void>;
}
