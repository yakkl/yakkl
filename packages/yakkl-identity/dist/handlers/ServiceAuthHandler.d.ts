/**
 * Service Account Authentication Handler
 * For server-to-server, agents, MCP servers - no UI required
 */
import type { Identity, AuthRequest, ServiceAccount } from '../types';
export declare class ServiceAuthHandler {
    private manager;
    private serviceAccounts;
    constructor(manager: any);
    /**
     * Authenticate a service account
     */
    authenticate(request: AuthRequest): Promise<Identity | null>;
    /**
     * Create a new service account
     */
    createServiceAccount(parentIdentity: Identity, config: {
        name: string;
        permissions?: string[];
        restrictions?: string[];
        ttl?: number;
        autoRenew?: boolean;
    }): Promise<{
        account: ServiceAccount;
        privateKey: string;
        publicKey: string;
    }>;
    /**
     * Generate configuration for service account
     */
    generateConfig(account: ServiceAccount, privateKey: string): string;
    /**
     * Authenticate with private key from environment or file
     */
    authenticateFromKey(keySource: 'env' | 'file', path?: string): Promise<Identity | null>;
    /**
     * Rotate service account keys
     */
    rotateKeys(accountId: string): Promise<{
        publicKey: string;
        privateKey: string;
    }>;
    /**
     * Delete service account
     */
    deleteServiceAccount(accountId: string): Promise<void>;
    private verifySignature;
    private signMessage;
    private getServiceAccount;
    private storeServiceAccount;
    private updateServiceAccount;
    private getDefaultPermissions;
    private parseConfigFile;
}
