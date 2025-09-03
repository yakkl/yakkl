/**
 * Core Identity Manager
 * Central orchestrator for all identity operations
 */

import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import type {
  Identity,
  IdentityConfig,
  AuthRequest,
  AuthResult,
  Session,
  AuthContext,
  IdentityMethod
} from '../types';
import { BrowserAuthHandler } from '../handlers/BrowserAuthHandler';
import { CLIAuthHandler } from '../handlers/CLIAuthHandler';
import { ServiceAuthHandler } from '../handlers/ServiceAuthHandler';
import { AgentAuthHandler } from '../handlers/AgentAuthHandler';
import { IdentityStorage } from '../storage/IdentityStorage';

export class IdentityManager {
  private handlers: Map<AuthContext, any>;
  private storage: IdentityStorage;
  private jwtSecret: Uint8Array;
  
  constructor(private config: IdentityConfig) {
    this.storage = new IdentityStorage(config.storage);
    this.jwtSecret = new TextEncoder().encode(
      process.env.IDENTITY_SECRET || nanoid(32)
    );
    
    // Initialize context handlers
    this.handlers = new Map<AuthContext, any>();
    this.handlers.set('browser', new BrowserAuthHandler(this));
    this.handlers.set('cli', new CLIAuthHandler(this));
    this.handlers.set('service', new ServiceAuthHandler(this));
    this.handlers.set('agent', new AgentAuthHandler(this));
  }

  /**
   * Establish a new identity or authenticate existing
   */
  async establish(request: AuthRequest): Promise<AuthResult> {
    try {
      const handler = this.handlers.get(request.context);
      
      if (!handler) {
        return {
          success: false,
          error: `Unsupported context: ${request.context}`
        };
      }

      // Delegate to appropriate handler
      const identity = await handler.authenticate(request);
      
      if (!identity) {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }

      // Create session
      const session = await this.createSession(identity);
      
      return {
        success: true,
        identity,
        session
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Verify an identity token
   */
  async verify(token: string): Promise<Identity | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      
      if (!payload.sub) {
        return null;
      }

      // Retrieve identity from storage
      const identity = await this.storage.getIdentity(payload.sub);
      return identity ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Create a new session for an identity
   */
  async createSession(identity: Identity): Promise<Session> {
    const sessionId = nanoid();
    const expiresAt = new Date(Date.now() + this.config.session.ttl * 1000);
    
    // Generate session token
    const token = await new SignJWT({
      sub: identity.id,
      sid: sessionId,
      tier: identity.tier,
      context: identity.metadata.context
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(this.jwtSecret);

    // Generate refresh token if renewable
    let refreshToken: string | undefined;
    if (this.config.session.renewable) {
      refreshToken = await this.generateRefreshToken(identity.id, sessionId);
    }

    const session: Session = {
      id: sessionId,
      identityId: identity.id,
      token,
      refreshToken,
      expiresAt,
      permissions: this.getPermissions(identity)
    };

    // Store session
    await this.storage.storeSession(session);

    return session;
  }

  /**
   * Refresh a session
   */
  async refreshSession(refreshToken: string): Promise<Session | null> {
    try {
      const { payload } = await jwtVerify(refreshToken, this.jwtSecret);
      
      if (!payload.sub || !payload.sid) {
        return null;
      }

      const identity = await this.storage.getIdentity(payload.sub as string);
      if (!identity) {
        return null;
      }

      // Check if refresh is allowed
      const oldSession = await this.storage.getSession(payload.sid as string);
      if (!oldSession || !this.canRefresh(oldSession)) {
        return null;
      }

      // Create new session
      return this.createSession(identity);
    } catch {
      return null;
    }
  }

  /**
   * Revoke an identity or session
   */
  async revoke(identityOrSessionId: string): Promise<void> {
    // Try as session first
    const session = await this.storage.getSession(identityOrSessionId);
    if (session) {
      await this.storage.deleteSession(identityOrSessionId);
      return;
    }

    // Try as identity
    const identity = await this.storage.getIdentity(identityOrSessionId);
    if (identity) {
      await this.storage.deleteIdentity(identityOrSessionId);
      // Also delete all sessions for this identity
      await this.storage.deleteIdentitySessions(identityOrSessionId);
    }
  }

  /**
   * Track usage for billing/analytics
   */
  async trackUsage(
    identityId: string,
    service: string,
    operation: string,
    metadata?: any
  ): Promise<void> {
    if (!this.config.tracking?.enabled) {
      return;
    }

    const usage = {
      identityId,
      service,
      operation,
      timestamp: Date.now(),
      metadata,
      signature: await this.signUsage(identityId, operation)
    };

    await this.storage.storeUsage(usage);
  }

  /**
   * Get identity by ID
   */
  async getIdentity(id: string): Promise<Identity | null> {
    const identity = await this.storage.getIdentity(id);
    return identity ?? null;
  }

  /**
   * List identities (admin function)
   */
  async listIdentities(filter?: Partial<Identity>): Promise<Identity[]> {
    return this.storage.listIdentities(filter);
  }

  // Private helper methods

  private async generateRefreshToken(
    identityId: string,
    sessionId: string
  ): Promise<string> {
    return new SignJWT({
      sub: identityId,
      sid: sessionId,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.jwtSecret);
  }

  private getPermissions(identity: Identity): string[] {
    // Map tier to permissions
    const tierPermissions: Record<string, string[]> = {
      community: ['read', 'basic'],
      developer: ['read', 'write', 'api', 'sdk'],
      professional: ['read', 'write', 'api', 'sdk', 'analytics', 'priority'],
      enterprise: ['*'] // All permissions
    };

    return tierPermissions[identity.tier] || [];
  }

  private canRefresh(session: Session): boolean {
    // Check if session can be refreshed
    if (!this.config.session.renewable) {
      return false;
    }

    if (this.config.session.maxRenewals) {
      // Check renewal count (would need to track this)
      // For now, always allow if renewable
    }

    return true;
  }

  private async signUsage(identityId: string, operation: string): Promise<string> {
    // Create signature for usage tracking
    const data = `${identityId}:${operation}:${Date.now()}`;
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        this.jwtSecret,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      encoder.encode(data)
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
}