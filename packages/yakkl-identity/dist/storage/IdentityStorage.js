/**
 * Identity Storage Layer
 * Abstracts storage for different environments
 */
export class IdentityStorage {
    constructor(mode = 'memory') {
        this.identities = new Map();
        this.sessions = new Map();
        this.usage = new Map();
        this.mode = mode;
        if (mode === 'distributed' || mode === 'hybrid') {
            this.initDistributedStorage();
        }
    }
    /**
     * Store identity
     */
    async storeIdentity(identity) {
        this.identities.set(identity.id, identity);
        if (this.mode !== 'memory') {
            await this.persistIdentity(identity);
        }
    }
    /**
     * Get identity by ID
     */
    async getIdentity(id) {
        let identity = this.identities.get(id);
        if (!identity && this.mode !== 'memory') {
            identity = await this.fetchIdentity(id);
            if (identity) {
                this.identities.set(id, identity);
            }
        }
        return identity;
    }
    /**
     * Delete identity
     */
    async deleteIdentity(id) {
        this.identities.delete(id);
        // Delete all sessions for this identity
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.identityId === id) {
                this.sessions.delete(sessionId);
            }
        }
        if (this.mode !== 'memory') {
            await this.removeIdentity(id);
        }
    }
    /**
     * List identities with optional filter
     */
    async listIdentities(filter) {
        let identities = Array.from(this.identities.values());
        if (filter) {
            identities = identities.filter(identity => {
                for (const [key, value] of Object.entries(filter)) {
                    if (identity[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }
        return identities;
    }
    /**
     * Store session
     */
    async storeSession(session) {
        this.sessions.set(session.id, session);
        if (this.mode !== 'memory') {
            await this.persistSession(session);
        }
    }
    /**
     * Get session by ID
     */
    async getSession(id) {
        let session = this.sessions.get(id);
        if (!session && this.mode !== 'memory') {
            session = await this.fetchSession(id);
            if (session) {
                this.sessions.set(id, session);
            }
        }
        // Check if expired
        if (session && new Date() > session.expiresAt) {
            await this.deleteSession(id);
            return undefined;
        }
        return session;
    }
    /**
     * Delete session
     */
    async deleteSession(id) {
        this.sessions.delete(id);
        if (this.mode !== 'memory') {
            await this.removeSession(id);
        }
    }
    /**
     * Delete all sessions for an identity
     */
    async deleteIdentitySessions(identityId) {
        const sessionsToDelete = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.identityId === identityId) {
                sessionsToDelete.push(sessionId);
            }
        }
        for (const sessionId of sessionsToDelete) {
            await this.deleteSession(sessionId);
        }
    }
    /**
     * Store usage tracking
     */
    async storeUsage(tracking) {
        const existing = this.usage.get(tracking.identityId) || [];
        existing.push(tracking);
        this.usage.set(tracking.identityId, existing);
        // Trim old entries (keep last 1000)
        if (existing.length > 1000) {
            existing.splice(0, existing.length - 1000);
        }
        if (this.mode !== 'memory') {
            await this.persistUsage(tracking);
        }
    }
    /**
     * Get usage for identity
     */
    async getUsage(identityId, startTime, endTime) {
        let usage = this.usage.get(identityId) || [];
        if (startTime || endTime) {
            usage = usage.filter(u => {
                if (startTime && u.timestamp < startTime)
                    return false;
                if (endTime && u.timestamp > endTime)
                    return false;
                return true;
            });
        }
        return usage;
    }
    /**
     * Get usage statistics
     */
    async getUsageStats(identityId) {
        const usage = await this.getUsage(identityId);
        const stats = {
            totalRequests: usage.length,
            requestsByService: new Map(),
            requestsByOperation: new Map(),
            lastRequest: usage.length > 0
                ? new Date(usage[usage.length - 1].timestamp)
                : undefined
        };
        for (const u of usage) {
            // Count by service
            const serviceCount = stats.requestsByService.get(u.service) || 0;
            stats.requestsByService.set(u.service, serviceCount + 1);
            // Count by operation
            const opCount = stats.requestsByOperation.get(u.operation) || 0;
            stats.requestsByOperation.set(u.operation, opCount + 1);
        }
        return stats;
    }
    /**
     * Clean expired sessions
     */
    async cleanExpiredSessions() {
        const now = new Date();
        const expired = [];
        for (const [id, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                expired.push(id);
            }
        }
        for (const id of expired) {
            await this.deleteSession(id);
        }
        return expired.length;
    }
    // Distributed storage methods (would connect to Redis, DynamoDB, etc.)
    initDistributedStorage() {
        // Initialize connection to distributed storage
        // This would connect to Redis, DynamoDB, PostgreSQL, etc.
        console.log('[IdentityStorage] Distributed storage initialized');
    }
    async persistIdentity(identity) {
        // Store in distributed storage
        // await redis.set(`identity:${identity.id}`, JSON.stringify(identity));
    }
    async fetchIdentity(id) {
        // Fetch from distributed storage
        // const data = await redis.get(`identity:${id}`);
        // return data ? JSON.parse(data) : undefined;
        return undefined;
    }
    async removeIdentity(id) {
        // Remove from distributed storage
        // await redis.del(`identity:${id}`);
    }
    async persistSession(session) {
        // Store with TTL
        // const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
        // await redis.setex(`session:${session.id}`, ttl, JSON.stringify(session));
    }
    async fetchSession(id) {
        // const data = await redis.get(`session:${id}`);
        // return data ? JSON.parse(data) : undefined;
        return undefined;
    }
    async removeSession(id) {
        // await redis.del(`session:${id}`);
    }
    async persistUsage(tracking) {
        // Store in time-series database or append to log
        // await timeseries.insert(tracking);
    }
}
