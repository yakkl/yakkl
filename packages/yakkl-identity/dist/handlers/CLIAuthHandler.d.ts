/**
 * CLI Authentication Handler
 * Supports browser spawn, device code, and interactive flows
 */
import type { Identity, AuthRequest } from '../types';
export declare class CLIAuthHandler {
    private manager;
    private pendingAuths;
    constructor(manager: any);
    /**
     * Authenticate from CLI context
     */
    authenticate(request: AuthRequest): Promise<Identity | null>;
    /**
     * Browser-based OAuth flow for CLI
     */
    browserFlow(credentials: any): Promise<Identity | null>;
    /**
     * Device code flow (like GitHub CLI)
     */
    deviceCodeFlow(credentials: any): Promise<Identity | null>;
    /**
     * Interactive terminal flow
     */
    interactiveFlow(credentials: any): Promise<Identity | null>;
    /**
     * Service account flow for CLI
     */
    serviceAccountFlow(credentials: any): Promise<Identity | null>;
    private findAvailablePort;
    private buildAuthUrl;
    private exchangeCode;
    private requestDeviceCode;
    private pollForCompletion;
    private checkDeviceAuth;
    private sendMagicLink;
    private verifyMagicLink;
    private loadServiceAccount;
    private authenticateServiceAccount;
}
