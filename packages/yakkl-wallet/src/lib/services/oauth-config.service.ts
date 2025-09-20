/**
 * OAuth Configuration Service
 * Securely manages OAuth client configuration
 * In production, credentials are fetched from backend service
 */

import { log } from '$lib/common/logger-wrapper';
import { browser_ext } from '$lib/common/environment';

export interface OAuthProviderConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  authEndpoint?: string;
}

export interface OAuthConfiguration {
  google?: OAuthProviderConfig;
  x?: OAuthProviderConfig;
  meta?: OAuthProviderConfig;
  github?: OAuthProviderConfig;
  discord?: OAuthProviderConfig;
  linkedin?: OAuthProviderConfig;
}

class OAuthConfigService {
  private static instance: OAuthConfigService;
  private config: OAuthConfiguration = {};
  private configLoaded = false;
  private backendUrl = ''; // Set via environment or configuration

  private constructor() {}

  static getInstance(): OAuthConfigService {
    if (!OAuthConfigService.instance) {
      OAuthConfigService.instance = new OAuthConfigService();
    }
    return OAuthConfigService.instance;
  }

  /**
   * Initialize OAuth configuration
   * Fetches from backend service in production
   */
  async initialize(): Promise<void> {
    if (this.configLoaded) return;

    try {
      // In production, fetch from backend
      if (this.backendUrl) {
        await this.fetchFromBackend();
      } else {
        // Development fallback - use extension redirect URLs
        this.setupDevelopmentConfig();
      }

      this.configLoaded = true;
      log.info('[OAuthConfig] Configuration loaded successfully');
    } catch (error) {
      log.error('[OAuthConfig] Failed to load configuration:', false, error);
      // Use fallback configuration
      this.setupFallbackConfig();
    }
  }

  /**
   * Fetch OAuth configuration from backend service
   */
  private async fetchFromBackend(): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/api/oauth/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch OAuth config: ${response.status}`);
      }

      const data = await response.json();
      this.config = this.processBackendConfig(data);
    } catch (error) {
      log.error('[OAuthConfig] Backend fetch failed:', false, error);
      throw error;
    }
  }

  /**
   * Process configuration from backend
   */
  private processBackendConfig(data: any): OAuthConfiguration {
    const config: OAuthConfiguration = {};

    // Process each provider
    if (data.google) {
      config.google = {
        clientId: data.google.clientId,
        redirectUri: this.getRedirectUri('google'),
        scopes: data.google.scopes || ['openid', 'email', 'profile']
      };
    }

    if (data.x) {
      config.x = {
        clientId: data.x.clientId,
        redirectUri: this.getRedirectUri('x'),
        scopes: data.x.scopes || ['users.read', 'tweet.read']
      };
    }

    if (data.meta) {
      config.meta = {
        clientId: data.meta.clientId,
        redirectUri: this.getRedirectUri('meta'),
        scopes: data.meta.scopes || ['email', 'public_profile']
      };
    }

    if (data.github) {
      config.github = {
        clientId: data.github.clientId,
        redirectUri: this.getRedirectUri('github'),
        scopes: data.github.scopes || ['read:user', 'user:email']
      };
    }

    if (data.discord) {
      config.discord = {
        clientId: data.discord.clientId,
        redirectUri: this.getRedirectUri('discord'),
        scopes: data.discord.scopes || ['identify', 'email']
      };
    }

    if (data.linkedin) {
      config.linkedin = {
        clientId: data.linkedin.clientId,
        redirectUri: this.getRedirectUri('linkedin'),
        scopes: data.linkedin.scopes || ['r_liteprofile', 'r_emailaddress']
      };
    }

    return config;
  }

  /**
   * Setup development configuration
   */
  private setupDevelopmentConfig(): void {
    log.warn('[OAuthConfig] Using development configuration');

    this.config = {
      google: {
        clientId: '', // Set via environment variable in development
        redirectUri: this.getRedirectUri('google'),
        scopes: ['openid', 'email', 'profile']
      },
      x: {
        clientId: '', // Set via environment variable in development
        redirectUri: this.getRedirectUri('x'),
        scopes: ['users.read', 'tweet.read']
      }
    };
  }

  /**
   * Setup fallback configuration
   */
  private setupFallbackConfig(): void {
    log.warn('[OAuthConfig] Using fallback configuration - OAuth will not work');

    this.config = {
      google: {
        clientId: '',
        redirectUri: this.getRedirectUri('google'),
        scopes: ['openid', 'email', 'profile']
      },
      x: {
        clientId: '',
        redirectUri: this.getRedirectUri('x'),
        scopes: ['users.read', 'tweet.read']
      }
    };
  }

  /**
   * Get redirect URI for a provider
   */
  private getRedirectUri(provider: string): string {
    // For browser extensions, use identity API
    if (browser_ext?.identity?.getRedirectURL) {
      return browser_ext.identity.getRedirectURL(provider);
    }

    // For web contexts, use origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth/${provider}/callback`;
    }

    // Fallback
    return `https://yakkl.com/auth/${provider}/callback`;
  }

  /**
   * Get configuration for a specific provider
   */
  async getProviderConfig(provider: keyof OAuthConfiguration): Promise<OAuthProviderConfig | null> {
    if (!this.configLoaded) {
      await this.initialize();
    }

    const config = this.config[provider];

    if (!config || !config.clientId) {
      log.warn(`[OAuthConfig] No configuration available for provider: ${provider}`);
      return null;
    }

    return config;
  }

  /**
   * Check if a provider is configured
   */
  async isProviderConfigured(provider: keyof OAuthConfiguration): Promise<boolean> {
    const config = await this.getProviderConfig(provider);
    return config !== null && config.clientId !== '';
  }

  /**
   * Get all configured providers
   */
  async getConfiguredProviders(): Promise<string[]> {
    if (!this.configLoaded) {
      await this.initialize();
    }

    const providers: string[] = [];

    for (const [provider, config] of Object.entries(this.config)) {
      if (config && config.clientId) {
        providers.push(provider);
      }
    }

    return providers;
  }

  /**
   * Set backend URL for fetching configuration
   */
  setBackendUrl(url: string): void {
    this.backendUrl = url;
    this.configLoaded = false; // Force reload
  }

  /**
   * Manually set configuration (for testing)
   */
  setConfiguration(config: OAuthConfiguration): void {
    this.config = config;
    this.configLoaded = true;
  }

  /**
   * Clear configuration
   */
  clearConfiguration(): void {
    this.config = {};
    this.configLoaded = false;
  }
}

// Export singleton instance
export const oauthConfigService = OAuthConfigService.getInstance();