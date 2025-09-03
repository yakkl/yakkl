/**
 * Identity Storage Layer
 * Abstracts storage for different environments
 */
import type { Identity, Session, UsageTracking } from '../types';
export declare class IdentityStorage {
    private identities;
    private sessions;
    private usage;
    private mode;
    constructor(mode?: 'memory' | 'distributed' | 'hybrid');
    /**
     * Store identity
     */
    storeIdentity(identity: Identity): Promise<void>;
    /**
     * Get identity by ID
     */
    getIdentity(id: string): Promise<Identity | undefined>;
    /**
     * Delete identity
     */
    deleteIdentity(id: string): Promise<void>;
    /**
     * List identities with optional filter
     */
    listIdentities(filter?: Partial<Identity>): Promise<Identity[]>;
    /**
     * Store session
     */
    storeSession(session: Session): Promise<void>;
    /**
     * Get session by ID
     */
    getSession(id: string): Promise<Session | undefined>;
    /**
     * Delete session
     */
    deleteSession(id: string): Promise<void>;
    /**
     * Delete all sessions for an identity
     */
    deleteIdentitySessions(identityId: string): Promise<void>;
    /**
     * Store usage tracking
     */
    storeUsage(tracking: UsageTracking): Promise<void>;
    /**
     * Get usage for identity
     */
    getUsage(identityId: string, startTime?: number, endTime?: number): Promise<UsageTracking[]>;
    /**
     * Get usage statistics
     */
    getUsageStats(identityId: string): Promise<{
        totalRequests: number;
        requestsByService: Map<string, number>;
        requestsByOperation: Map<string, number>;
        lastRequest?: Date;
    }>;
    /**
     * Clean expired sessions
     */
    cleanExpiredSessions(): Promise<number>;
    private initDistributedStorage;
    private persistIdentity;
    private fetchIdentity;
    private removeIdentity;
    private persistSession;
    private fetchSession;
    private removeSession;
    private persistUsage;
}
