/**
 * Main authentication manager
 * Coordinates providers and strategies for secure authentication
 */

import type {
  AuthConfig,
  AuthCredentials,
  AuthProvider,
  AuthResult,
  AuthStrategy,
  Session,
  User,
  AuthStorage
} from './types';
import { JWTProvider } from './providers/JWTProvider';
import { LocalAuthStrategy } from './strategies/LocalAuthStrategy';
import { MemoryStorage } from './utils/MemoryStorage';

export class AuthManager {
  private config: AuthConfig;
  private providers: Map<string, AuthProvider>;
  private strategies: AuthStrategy[];
  private currentSession: Session | null = null;
  private storage: AuthStorage;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.providers = new Map();
    this.strategies = config.strategies || [new LocalAuthStrategy()];
    this.storage = config.storage || new MemoryStorage();
    
    this.initializeProviders();
  }

  /**
   * Authenticate user with credentials
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Try strategies in order of priority
      const sortedStrategies = [...this.strategies].sort((a, b) => b.priority - a.priority);
      
      for (const strategy of sortedStrategies) {
        if (strategy.canHandle(credentials)) {
          const result = await strategy.authenticate(credentials);
          
          if (result.success && result.session) {
            this.currentSession = result.session;
            await this.storage.set('session', result.session);
            await this.storage.set('user', result.user);
          }
          
          return result;
        }
      }
      
      // Fallback to direct provider if specified
      if (credentials.provider) {
        const provider = this.providers.get(credentials.provider);
        if (provider) {
          const result = await provider.authenticate(credentials);
          
          if (result.success && result.session) {
            this.currentSession = result.session;
            await this.storage.set('session', result.session);
            await this.storage.set('user', result.user);
          }
          
          return result;
        }
      }
      
      return {
        success: false,
        error: 'No authentication method available for provided credentials'
      };
    } catch (error) {
      console.error('[AuthManager] Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Verify current session or token
   */
  async verify(token?: string): Promise<boolean> {
    try {
      const sessionToken = token || this.currentSession?.token;
      if (!sessionToken) return false;
      
      // Check with JWT provider by default
      const jwtProvider = this.providers.get('jwt');
      if (jwtProvider) {
        return await jwtProvider.verify(sessionToken);
      }
      
      // Check session expiry
      if (this.currentSession) {
        return new Date() < new Date(this.currentSession.expiresAt);
      }
      
      return false;
    } catch (error) {
      console.error('[AuthManager] Verification error:', error);
      return false;
    }
  }

  /**
   * Refresh current session
   */
  async refresh(): Promise<AuthResult> {
    try {
      if (!this.currentSession?.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }
      
      const jwtProvider = this.providers.get('jwt') as JWTProvider;
      if (jwtProvider?.refresh) {
        const result = await jwtProvider.refresh(this.currentSession.refreshToken);
        
        if (result.success && result.session) {
          this.currentSession = result.session;
          await this.storage.set('session', result.session);
        }
        
        return result;
      }
      
      return {
        success: false,
        error: 'Refresh not supported'
      };
    } catch (error) {
      console.error('[AuthManager] Refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refresh failed'
      };
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      if (this.currentSession?.token) {
        // Revoke token if provider supports it
        const jwtProvider = this.providers.get('jwt');
        if (jwtProvider?.revoke) {
          await jwtProvider.revoke(this.currentSession.token);
        }
      }
      
      this.currentSession = null;
      await this.storage.clear();
    } catch (error) {
      console.error('[AuthManager] Logout error:', error);
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.storage.get('user');
    } catch {
      return null;
    }
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    if (!this.currentSession) return false;
    return new Date() < new Date(this.currentSession.expiresAt);
  }

  /**
   * Add authentication provider
   */
  addProvider(provider: AuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Add authentication strategy
   */
  addStrategy(strategy: AuthStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Initialize default providers
   */
  private initializeProviders(): void {
    // Add default JWT provider
    if (!this.providers.has('jwt')) {
      this.addProvider(new JWTProvider({
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production'
      }));
    }
    
    // Add providers from config
    if (this.config.providers) {
      for (const provider of this.config.providers) {
        this.addProvider(provider);
      }
    }
  }

  /**
   * Merge config with defaults
   */
  private mergeConfig(config: Partial<AuthConfig>): AuthConfig {
    return {
      providers: [],
      strategies: [],
      sessionDuration: 3600, // 1 hour default
      refreshEnabled: true,
      mfaEnabled: false,
      securityLevel: 'medium',
      ...config
    };
  }
}