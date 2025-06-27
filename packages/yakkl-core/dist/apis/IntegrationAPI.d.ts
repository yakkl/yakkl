/**
 * IntegrationAPI - API for third-party integrations
 */
import { WalletEngine } from '../engine/WalletEngine';
import type { WalletConfig } from '../engine/types';
export interface IntegrationConfig {
    apiKey?: string;
    appName: string;
    appVersion: string;
    permissions: string[];
}
export declare class IntegrationAPI {
    private engine;
    private config;
    constructor(config: IntegrationConfig);
    /**
     * Initialize the integration
     */
    initialize(walletConfig?: Partial<WalletConfig>): Promise<void>;
    /**
     * Get the wallet engine
     */
    getEngine(): WalletEngine;
    /**
     * Check if a permission is granted
     */
    hasPermission(permission: string): boolean;
    /**
     * Request additional permissions
     */
    requestPermissions(permissions: string[]): Promise<boolean>;
    /**
     * Get integration info
     */
    getInfo(): {
        appName: string;
        appVersion: string;
        permissions: string[];
        isInitialized: boolean;
    };
    /**
     * Destroy the integration
     */
    destroy(): Promise<void>;
}
//# sourceMappingURL=IntegrationAPI.d.ts.map