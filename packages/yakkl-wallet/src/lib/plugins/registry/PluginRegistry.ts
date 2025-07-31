import { PlanType } from '$lib/common';
import type { ITradingManager } from '../interfaces/ITradingManager';
import type { IAccountManager } from '../interfaces/IAccountManager';
import type { INewsManager } from '../interfaces/INewsManager';
import type { IHardwareWalletManager } from '../interfaces/IHardwareWalletManager';

import { StandardTradingManager } from '../standard/StandardTradingManager';
import { StandardAccountManager } from '../standard/StandardAccountManager';
import { StandardNewsManager } from '../standard/StandardNewsManager';
import { StandardHardwareWalletManager } from '../standard/StandardHardwareWalletManager';

/**
 * Plugin configuration interface
 */
export interface PluginManagerConfig {
	trading: ITradingManager;
	accounts: IAccountManager;
	news: INewsManager;
	hardwareWallet: IHardwareWalletManager;
}

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
	success: boolean;
	planType: PlanType;
	features: PluginFeatures;
	errors?: string[];
}

/**
 * Available features based on plan
 */
export interface PluginFeatures {
	advancedTrading: boolean;
	unlimitedAccounts: boolean;
	portfolioAnalytics: boolean;
	realTimeNews: boolean;
	customRSSFeeds: boolean;
	dataExport: boolean;
	advancedSearch: boolean;
	personalization: boolean;
	hardwareWallets: boolean;
	multipleHardwareWallets: boolean;
	bulkHardwareSigning: boolean;
	customDerivationPaths: boolean;
}

/**
 * Plugin Registry
 * Manages loading and initialization of plugin implementations based on plan type
 */
export class PluginRegistry {
	private static instance: PluginRegistry;
	private managers: PluginManagerConfig | null = null;
	private currentPlan: PlanType = PlanType.EXPLORER_MEMBER;
	private initialized = false;

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): PluginRegistry {
		if (!PluginRegistry.instance) {
			PluginRegistry.instance = new PluginRegistry();
		}
		return PluginRegistry.instance;
	}

	/**
	 * Initialize the plugin registry with the user's plan
	 */
	async initialize(planType: PlanType): Promise<PluginLoadResult> {
		try {
			this.currentPlan = planType;

			// Always dispose existing managers first
			if (this.managers) {
				await this.dispose();
			}

			// Load appropriate implementations based on plan
			if (planType === PlanType.YAKKL_PRO || planType === PlanType.ENTERPRISE) {
				this.managers = await this.loadProManagers();
			} else {
				this.managers = await this.loadStandardManagers();
			}

			// Initialize all managers
			await Promise.all([
				this.managers.trading.initialize(planType),
				this.managers.accounts.initialize(planType),
				this.managers.news.initialize(planType),
				this.managers.hardwareWallet.initialize()
			]);

			this.initialized = true;

			return {
				success: true,
				planType,
				features: this.getAvailableFeatures(planType)
			};
		} catch (error) {
			console.error('Failed to initialize plugin registry:', error);

			// Fallback to standard managers on error
			this.managers = await this.loadStandardManagers();
			await Promise.all([
				this.managers.trading.initialize(PlanType.EXPLORER_MEMBER),
				this.managers.accounts.initialize(PlanType.EXPLORER_MEMBER),
				this.managers.news.initialize(PlanType.EXPLORER_MEMBER),
				this.managers.hardwareWallet.initialize()
			]);

			this.initialized = true;
			this.currentPlan = PlanType.EXPLORER_MEMBER;

			return {
				success: false,
				planType: PlanType.EXPLORER_MEMBER,
				features: this.getAvailableFeatures(PlanType.EXPLORER_MEMBER),
				errors: [error instanceof Error ? error.message : 'Unknown error occurred']
			};
		}
	}

	/**
	 * Load Pro implementations (dynamic import from pro package)
	 */
	private async loadProManagers(): Promise<PluginManagerConfig> {
		try {
			// Try to dynamically import Pro managers
			// In a real implementation, this would import from @yakkl/wallet-pro
			const proManagers = await this.attemptProImport();

			if (proManagers) {
				return {
					trading: new proManagers.ProTradingManager(),
					accounts: new proManagers.ProAccountManager(),
					news: new proManagers.ProNewsManager(),
					hardwareWallet: new proManagers.ProHardwareWalletManager()
				};
			}

			// Fallback to standard if pro package not available
			console.warn('Pro managers not available, falling back to standard');
			return this.loadStandardManagers();
		} catch (error) {
			console.warn('Failed to load pro managers, falling back to standard:', error);
			return this.loadStandardManagers();
		}
	}

	/**
	 * Attempt to import Pro managers
	 * This would be replaced with actual dynamic import in production
	 */
	private async attemptProImport(): Promise<any> {
		try {
			// This is where the dynamic import would happen:
			// const proManagers = await import('@yakkl/wallet-pro/managers');
			// return proManagers;

			// For now, return null to simulate pro package not being available
			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Load Standard implementations
	 */
	private async loadStandardManagers(): Promise<PluginManagerConfig> {
		return {
			trading: new StandardTradingManager(),
			accounts: new StandardAccountManager(),
			news: new StandardNewsManager(),
			hardwareWallet: new StandardHardwareWalletManager()
		};
	}

	/**
	 * Get available features based on plan type
	 */
	private getAvailableFeatures(planType: PlanType): PluginFeatures {
		const isAdvanced = planType === PlanType.YAKKL_PRO || planType === PlanType.ENTERPRISE;

		return {
			advancedTrading: isAdvanced,
			unlimitedAccounts: isAdvanced,
			portfolioAnalytics: isAdvanced,
			realTimeNews: isAdvanced,
			customRSSFeeds: isAdvanced,
			dataExport: isAdvanced,
			advancedSearch: isAdvanced,
			personalization: isAdvanced,
			hardwareWallets: true, // Available to all users
			multipleHardwareWallets: isAdvanced,
			bulkHardwareSigning: isAdvanced,
			customDerivationPaths: isAdvanced
		};
	}

	/**
	 * Get trading manager
	 */
	get trading(): ITradingManager {
		if (!this.initialized || !this.managers) {
			throw new Error('Plugin registry not initialized');
		}
		return this.managers.trading;
	}

	/**
	 * Get account manager
	 */
	get accounts(): IAccountManager {
		if (!this.initialized || !this.managers) {
			throw new Error('Plugin registry not initialized');
		}
		return this.managers.accounts;
	}

	/**
	 * Get news manager
	 */
	get news(): INewsManager {
		if (!this.initialized || !this.managers) {
			throw new Error('Plugin registry not initialized');
		}
		return this.managers.news;
	}

	/**
	 * Get hardware wallet manager
	 */
	get hardwareWallet(): IHardwareWalletManager {
		if (!this.initialized || !this.managers) {
			throw new Error('Plugin registry not initialized');
		}
		return this.managers.hardwareWallet;
	}

	/**
	 * Get current plan type
	 */
	getCurrentPlan(): PlanType {
		return this.currentPlan;
	}

	/**
	 * Get available features for current plan
	 */
	getFeatures(): PluginFeatures {
		return this.getAvailableFeatures(this.currentPlan);
	}

	/**
	 * Check if plugin registry is initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Reinitialize with new plan (for plan upgrades/downgrades)
	 */
	async reinitialize(newPlanType: PlanType): Promise<PluginLoadResult> {
		if (newPlanType === this.currentPlan && this.initialized) {
			// No change needed
			return {
				success: true,
				planType: newPlanType,
				features: this.getAvailableFeatures(newPlanType)
			};
		}

		return this.initialize(newPlanType);
	}

	/**
	 * Dispose all managers and clean up resources
	 */
	async dispose(): Promise<void> {
		if (this.managers) {
			await Promise.all([
				this.managers.trading.dispose(),
				this.managers.accounts.dispose(),
				this.managers.news.dispose(),
				this.managers.hardwareWallet.dispose()
			]);
			this.managers = null;
		}

		this.initialized = false;
		this.currentPlan = PlanType.EXPLORER_MEMBER;
	}
}

/**
 * Global plugin registry instance
 */
export const pluginRegistry = PluginRegistry.getInstance();
