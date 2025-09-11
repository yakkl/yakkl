/**
 * Identity Adapter for YAKKL Wallet
 * Bridges the existing JWT system with @yakkl/identity package
 * Provides backward compatibility while migrating to the new identity system
 */

import { createBrowserIdentity } from '@yakkl/identity';
import type { Identity, AuthContext, AuthResult as IdentityAuthResult } from '@yakkl/identity';
import { browser_ext, browserSvelte } from '$lib/common/environment';
import { log } from '$lib/common/logger-wrapper';
import type { BrowserJWTPayload as JWTPayload } from '@yakkl/security';
import { getYakklSettings } from '$lib/common/stores';
import { get } from 'svelte/store';

export interface WalletIdentity extends Omit<Identity, 'method' | 'tier'> {
  walletAddress?: string;
  profileId?: string;
  planLevel?: string;
  username?: string;
  method?: Identity['method'];
  tier?: Identity['tier'];
}

export interface WalletAuthResult extends IdentityAuthResult {
  jwt?: string;
  walletIdentity?: WalletIdentity;
}

/**
 * Identity adapter that integrates @yakkl/identity with the existing wallet auth system
 */
export class WalletIdentityAdapter {
  private static instance: WalletIdentityAdapter | null = null;
  private identityManager: any; // Using any for now since IdentityManager is created by factory
  private currentIdentity: WalletIdentity | null = null;
  private authContext: AuthContext;

  private constructor() {
    // Determine context based on environment
    this.authContext = this.determineContext();
    
    // Create identity manager using the factory function
    this.identityManager = createBrowserIdentity({
      storage: 'memory', // Use memory storage for now
      providers: {
        passkey: true,
        oauth: [],
        email: true,
        service: true
      },
      session: {
        ttl: 3600000, // 1 hour
        renewable: true,
        maxRenewals: 5
      }
    });
    
    // Initialize identity manager with wallet-specific config
    this.initializeIdentityManager();
  }

  static getInstance(): WalletIdentityAdapter {
    if (!WalletIdentityAdapter.instance) {
      WalletIdentityAdapter.instance = new WalletIdentityAdapter();
    }
    return WalletIdentityAdapter.instance;
  }

  private determineContext(): AuthContext {
    // Check if we're in a browser extension context
    if (typeof browser_ext !== 'undefined' && browser_ext?.runtime) {
      // Check if we're in a background/service worker context
      if (typeof window === 'undefined' || !window?.document) {
        return 'service'; // Background/service worker context
      }
      return 'browser'; // Extension UI context
    }
    
    // Check if we're in a CLI context (Node.js)
    if (typeof process !== 'undefined' && process.versions?.node) {
      return 'cli';
    }
    
    // Default to browser context
    return 'browser';
  }

  private async initializeIdentityManager() {
    try {
      // Identity manager is already configured in constructor
      // Just log the initialization
      log.debug('Identity manager initialized', false, { context: this.authContext });
    } catch (error) {
      log.error('Failed to initialize identity manager:', false, error);
    }
  }

  /**
   * Create a storage adapter that uses the existing wallet storage
   */
  private createStorageAdapter() {
    if (this.authContext === 'service' || this.authContext === 'browser') {
      // Use browser extension storage
      return {
        get: async (key: string) => {
          const result = await browser_ext.storage.local.get(key);
          return result[key];
        },
        set: async (key: string, value: any) => {
          await browser_ext.storage.local.set({ [key]: value });
        },
        remove: async (key: string) => {
          await browser_ext.storage.local.remove(key);
        },
        clear: async () => {
          await browser_ext.storage.local.clear();
        }
      };
    }
    
    // For other contexts, use in-memory storage (temporary)
    const memoryStorage = new Map<string, any>();
    return {
      get: async (key: string) => memoryStorage.get(key),
      set: async (key: string, value: any) => { memoryStorage.set(key, value); },
      remove: async (key: string) => { memoryStorage.delete(key); },
      clear: async () => { memoryStorage.clear(); }
    };
  }

  /**
   * Authenticate user with backward compatibility for existing JWT system
   */
  async authenticate(credentials: {
    username?: string;
    password?: string;
    walletAddress?: string;
    profileId?: string;
    planLevel?: string;
    provider?: 'local' | 'google' | 'github' | 'x' | 'meta';
  }): Promise<WalletAuthResult> {
    try {
      // Use identity manager for authentication
      const result = await this.identityManager.establish({
        method: 'email', // Use email method instead of password
        context: this.authContext,
        credentials: credentials
      });

      if (!result.success || !result.identity) {
        return {
          success: false,
          error: result.error || 'Authentication failed'
        };
      }

      // Enhance identity with wallet-specific data
      const walletIdentity: WalletIdentity = {
        ...result.identity,
        walletAddress: credentials.walletAddress,
        profileId: credentials.profileId,
        planLevel: credentials.planLevel || 'explorer_member',
        username: credentials.username
      };

      // Generate JWT for backward compatibility
      const session = await this.identityManager.createSession(result.identity);
      const jwt = session.token;

      // Store current identity
      this.currentIdentity = walletIdentity;

      // Update auth state in browser storage for UI to read
      if (this.authContext === 'browser' || this.authContext === 'service') {
        // Store auth state in browser storage instead of Svelte store
        await browser_ext.storage.local.set({
          yakkl_auth_state: {
            isAuthenticated: true,
            hasValidJWT: true,
            jwt,
            user: {
              id: walletIdentity.id,
              username: walletIdentity.username || '',
              profileId: walletIdentity.profileId || '',
              planLevel: walletIdentity.planLevel || 'explorer_member'
            }
          }
        });
      }

      return {
        success: true,
        identity: result.identity,
        walletIdentity,
        jwt,
        session: result.session
      };
    } catch (error) {
      log.error('Authentication failed:', false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Validate an existing JWT token
   */
  async validateJWT(token: string): Promise<boolean> {
    try {
      const identity = await this.identityManager.verify(token);
      return identity !== null;
    } catch (error) {
      log.error('JWT validation failed:', false, error);
      return false;
    }
  }

  /**
   * Get current identity
   */
  getCurrentIdentity(): WalletIdentity | null {
    return this.currentIdentity;
  }

  /**
   * Create a service account for headless operations
   */
  async createServiceAccount(
    parentIdentity: WalletIdentity,
    config: {
      name: string;
      description?: string;
      permissions?: string[];
      expiresIn?: number;
    }
  ): Promise<{ account: any; privateKey: string; publicKey: string }> {
    try {
      // Use the service handler from identity manager
      // Service handler is not directly accessible, use establish instead
      const serviceHandler = null; // this.identityManager.getHandler('service');
      if (!serviceHandler) {
        throw new Error('Service handler not available');
      }

      return await serviceHandler.createServiceAccount(parentIdentity, config);
    } catch (error) {
      log.error('Failed to create service account:', false, error);
      throw error;
    }
  }

  /**
   * Handle OAuth authentication flow
   */
  async authenticateOAuth(provider: 'google' | 'github' | 'x' | 'meta'): Promise<WalletAuthResult> {
    try {
      // Check if we need to spawn a browser (CLI context)
      if (this.authContext === 'cli') {
        // CLI handler is not directly accessible, use establish instead
        const cliHandler = null; // this.identityManager.getHandler('cli');
        if (cliHandler) {
          const identity = await cliHandler.browserFlow({ provider });
          if (identity) {
            const walletIdentity: WalletIdentity = {
              ...identity,
              planLevel: 'explorer_member'
            };
            return {
              success: true,
              identity,
              walletIdentity
            };
          }
        }
      }

      // Standard OAuth flow for browser context
      const result = await this.identityManager.establish({
        method: 'oauth',
        context: this.authContext,
        credentials: { provider }
      });

      if (result.success && result.identity) {
        const walletIdentity: WalletIdentity = {
          ...result.identity,
          planLevel: 'explorer_member'
        };
        
        this.currentIdentity = walletIdentity;
        
        return {
          success: true,
          identity: result.identity,
          walletIdentity
        };
      }

      return {
        success: false,
        error: result.error || 'OAuth authentication failed'
      };
    } catch (error) {
      log.error('OAuth authentication failed:', false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth authentication failed'
      };
    }
  }

  /**
   * Logout and clear identity
   */
  async logout(): Promise<void> {
    try {
      if (this.currentIdentity) {
        await this.identityManager.revoke(this.currentIdentity.id);
      }
      
      this.currentIdentity = null;

      // Clear auth state in browser storage
      if (this.authContext === 'browser' || this.authContext === 'service') {
        await browser_ext.storage.local.set({
          yakkl_auth_state: {
            isAuthenticated: false,
            hasValidJWT: false,
            jwt: null,
            user: null
          }
        });
      }

      // Clear browser storage
      if (this.authContext === 'service' || this.authContext === 'browser') {
        await browser_ext.storage.local.remove(['yakkl_jwt_token', 'yakkl_identity']);
      }
    } catch (error) {
      log.error('Logout failed:', false, error);
    }
  }

  /**
   * Migrate existing JWT to new identity system
   */
  async migrateFromJWT(jwtPayload: JWTPayload): Promise<WalletIdentity | null> {
    try {
      // Create identity from existing JWT payload
      const identity: WalletIdentity = {
        id: jwtPayload.sub,
        metadata: {
          name: jwtPayload.username,
          context: this.authContext,
          profileId: jwtPayload.profileId,
          planLevel: jwtPayload.planLevel,
          sessionId: jwtPayload.sessionId
        },
        createdAt: new Date(jwtPayload.iat * 1000),
        updatedAt: new Date(), // Add required updatedAt field
        profileId: jwtPayload.profileId,
        planLevel: jwtPayload.planLevel,
        username: jwtPayload.username
      };

      // Register with identity manager using establish with delegated method
      await this.identityManager.establish({
        method: 'delegated', // Use delegated method for migration
        context: this.authContext,
        credentials: {
          identity
        }
      });
      
      this.currentIdentity = identity;
      
      log.info('Successfully migrated JWT to identity system', false, {
        userId: identity.id,
        context: this.authContext
      });

      return identity;
    } catch (error) {
      log.error('Failed to migrate JWT:', false, error);
      return null;
    }
  }
}

// Export singleton instance
export const walletIdentityAdapter = WalletIdentityAdapter.getInstance();