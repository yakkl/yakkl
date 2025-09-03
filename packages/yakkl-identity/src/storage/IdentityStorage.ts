/**
 * Identity Storage Layer
 * Abstracts storage for different environments
 */

import type { Identity, Session, UsageTracking } from '../types';

export class IdentityStorage {
  private identities: Map<string, Identity> = new Map();
  private sessions: Map<string, Session> = new Map();
  private usage: Map<string, UsageTracking[]> = new Map();
  private mode: 'memory' | 'distributed' | 'hybrid';

  constructor(mode: 'memory' | 'distributed' | 'hybrid' = 'memory') {
    this.mode = mode;
    
    if (mode === 'distributed' || mode === 'hybrid') {
      this.initDistributedStorage();
    }
  }

  /**
   * Store identity
   */
  async storeIdentity(identity: Identity): Promise<void> {
    this.identities.set(identity.id, identity);
    
    if (this.mode !== 'memory') {
      await this.persistIdentity(identity);
    }
  }

  /**
   * Get identity by ID
   */
  async getIdentity(id: string): Promise<Identity | undefined> {
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
  async deleteIdentity(id: string): Promise<void> {
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
  async listIdentities(filter?: Partial<Identity>): Promise<Identity[]> {
    let identities = Array.from(this.identities.values());
    
    if (filter) {
      identities = identities.filter(identity => {
        for (const [key, value] of Object.entries(filter)) {
          if ((identity as any)[key] !== value) {
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
  async storeSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
    
    if (this.mode !== 'memory') {
      await this.persistSession(session);
    }
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<Session | undefined> {
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
  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    
    if (this.mode !== 'memory') {
      await this.removeSession(id);
    }
  }

  /**
   * Delete all sessions for an identity
   */
  async deleteIdentitySessions(identityId: string): Promise<void> {
    const sessionsToDelete: string[] = [];
    
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
  async storeUsage(tracking: UsageTracking): Promise<void> {
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
  async getUsage(
    identityId: string,
    startTime?: number,
    endTime?: number
  ): Promise<UsageTracking[]> {
    let usage = this.usage.get(identityId) || [];
    
    if (startTime || endTime) {
      usage = usage.filter(u => {
        if (startTime && u.timestamp < startTime) return false;
        if (endTime && u.timestamp > endTime) return false;
        return true;
      });
    }
    
    return usage;
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(identityId: string): Promise<{
    totalRequests: number;
    requestsByService: Map<string, number>;
    requestsByOperation: Map<string, number>;
    lastRequest?: Date;
  }> {
    const usage = await this.getUsage(identityId);
    
    const stats = {
      totalRequests: usage.length,
      requestsByService: new Map<string, number>(),
      requestsByOperation: new Map<string, number>(),
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
  async cleanExpiredSessions(): Promise<number> {
    const now = new Date();
    const expired: string[] = [];
    
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

  private initDistributedStorage(): void {
    // Initialize connection to distributed storage
    // This would connect to Redis, DynamoDB, PostgreSQL, etc.
    console.log('[IdentityStorage] Distributed storage initialized');
  }

  private async persistIdentity(identity: Identity): Promise<void> {
    // Store in distributed storage
    // await redis.set(`identity:${identity.id}`, JSON.stringify(identity));
  }

  private async fetchIdentity(id: string): Promise<Identity | undefined> {
    // Fetch from distributed storage
    // const data = await redis.get(`identity:${id}`);
    // return data ? JSON.parse(data) : undefined;
    return undefined;
  }

  private async removeIdentity(id: string): Promise<void> {
    // Remove from distributed storage
    // await redis.del(`identity:${id}`);
  }

  private async persistSession(session: Session): Promise<void> {
    // Store with TTL
    // const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    // await redis.setex(`session:${session.id}`, ttl, JSON.stringify(session));
  }

  private async fetchSession(id: string): Promise<Session | undefined> {
    // const data = await redis.get(`session:${id}`);
    // return data ? JSON.parse(data) : undefined;
    return undefined;
  }

  private async removeSession(id: string): Promise<void> {
    // await redis.del(`session:${id}`);
  }

  private async persistUsage(tracking: UsageTracking): Promise<void> {
    // Store in time-series database or append to log
    // await timeseries.insert(tracking);
  }
}