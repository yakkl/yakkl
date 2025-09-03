/**
 * Browser Authentication Handler
 * Handles web-based authentication flows
 */
import type { Identity, AuthRequest } from '../types';
export declare class BrowserAuthHandler {
    private manager;
    constructor(manager: any);
    /**
     * Authenticate in browser context
     */
    authenticate(request: AuthRequest): Promise<Identity | null>;
    /**
     * Handle OAuth authentication
     */
    private handleOAuth;
    /**
     * Handle Passkey authentication
     */
    private handlePasskey;
    /**
     * Handle Email/Magic Link authentication
     */
    private handleEmail;
    /**
     * Handle Web3 Wallet authentication
     */
    private handleWallet;
    private sendMagicLink;
    private verifyMagicLink;
    private hashEmail;
}
