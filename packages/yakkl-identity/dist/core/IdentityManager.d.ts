/**
 * Core Identity Manager
 * Central orchestrator for all identity operations
 */
import type { Identity, IdentityConfig, AuthRequest, AuthResult, Session } from '../types';
export declare class IdentityManager {
    private config;
    private handlers;
    private storage;
    private jwtSecret;
    constructor(config: IdentityConfig);
    /**
     * Establish a new identity or authenticate existing
     */
    establish(request: AuthRequest): Promise<AuthResult>;
    /**
     * Verify an identity token
     */
    verify(token: string): Promise<Identity | null>;
    /**
     * Create a new session for an identity
     */
    createSession(identity: Identity): Promise<Session>;
    /**
     * Refresh a session
     */
    refreshSession(refreshToken: string): Promise<Session | null>;
    /**
     * Revoke an identity or session
     */
    revoke(identityOrSessionId: string): Promise<void>;
    /**
     * Track usage for billing/analytics
     */
    trackUsage(identityId: string, service: string, operation: string, metadata?: any): Promise<void>;
    /**
     * Get identity by ID
     */
    getIdentity(id: string): Promise<Identity | null>;
    /**
     * List identities (admin function)
     */
    listIdentities(filter?: Partial<Identity>): Promise<Identity[]>;
    private generateRefreshToken;
    private getPermissions;
    private canRefresh;
    private signUsage;
}
