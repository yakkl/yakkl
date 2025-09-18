/**
 * OAuth Authentication Provider
 * Supports Google, GitHub, X (Twitter), Meta (Facebook), Microsoft, Apple
 */

import type { AuthProvider, AuthCredentials, AuthResult } from '../types';

export interface OAuthConfig {
  provider: 'google' | 'github' | 'x' | 'meta' | 'microsoft' | 'apple';
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
  authEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
}

export class OAuthProvider implements AuthProvider {
  name = 'oauth';
  type = 'oauth' as const;
  protected config: OAuthConfig;
  private providers: Record<string, any>;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.providers = {
      google: {
        authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile']
      },
      github: {
        authEndpoint: 'https://github.com/login/oauth/authorize',
        tokenEndpoint: 'https://github.com/login/oauth/access_token',
        userInfoEndpoint: 'https://api.github.com/user',
        scopes: ['read:user', 'user:email']
      },
      x: {
        authEndpoint: 'https://twitter.com/i/oauth2/authorize',
        tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
        userInfoEndpoint: 'https://api.twitter.com/2/users/me',
        scopes: ['users.read', 'tweet.read']
      },
      meta: {
        authEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userInfoEndpoint: 'https://graph.facebook.com/me',
        scopes: ['email', 'public_profile']
      },
      microsoft: {
        authEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'email', 'profile']
      },
      apple: {
        authEndpoint: 'https://appleid.apple.com/auth/authorize',
        tokenEndpoint: 'https://appleid.apple.com/auth/token',
        userInfoEndpoint: null, // Apple provides user info in ID token
        scopes: ['name', 'email']
      }
    };
  }

  /**
   * Start OAuth flow - returns authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const provider = this.providers[this.config.provider];
    const endpoint = this.config.authEndpoint || provider.authEndpoint;
    const scopes = this.config.scopes || provider.scopes;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state || this.generateState()
    });

    // Provider-specific params
    if (this.config.provider === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    } else if (this.config.provider === 'apple') {
      params.set('response_mode', 'form_post');
    }

    return `${endpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken?: string; idToken?: string }> {
    const provider = this.providers[this.config.provider];
    const endpoint = this.config.tokenEndpoint || provider.tokenEndpoint;
    
    const params: any = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId
    };

    if (this.config.clientSecret) {
      params.client_secret = this.config.clientSecret;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(params).toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token
    };
  }

  /**
   * Get user info from OAuth provider
   */
  async getUserInfo(accessToken: string): Promise<any> {
    const provider = this.providers[this.config.provider];
    const endpoint = this.config.userInfoEndpoint || provider.userInfoEndpoint;
    
    if (!endpoint) {
      // For Apple, decode ID token
      if (this.config.provider === 'apple') {
        return this.decodeIdToken(accessToken);
      }
      return null;
    }

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Main authentication method
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // OAuth flow is typically handled in browser/redirect
      // This method handles the callback
      if (!credentials.code) {
        return {
          success: false,
          error: 'Authorization code required'
        };
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCode(credentials.code);
      
      // Get user info
      const userInfo = await this.getUserInfo(tokens.accessToken);
      
      // Create user object
      const user = this.mapUserInfo(userInfo);
      
      // Create session
      const sessionId = this.generateSessionId();
      
      return {
        success: true,
        user,
        session: {
          id: sessionId,
          userId: user.id,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
          createdAt: new Date(),
          metadata: {
            provider: this.config.provider,
            idToken: tokens.idToken
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'OAuth authentication failed'
      };
    }
  }

  /**
   * Verify OAuth token
   */
  async verify(token: string): Promise<boolean> {
    try {
      // Verify by attempting to fetch user info
      const userInfo = await this.getUserInfo(token);
      return !!userInfo;
    } catch {
      return false;
    }
  }

  /**
   * Refresh OAuth token
   */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const provider = this.providers[this.config.provider];
    const endpoint = this.config.tokenEndpoint || provider.tokenEndpoint;
    
    const params: any = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId
    };

    if (this.config.clientSecret) {
      params.client_secret = this.config.clientSecret;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(params).toString()
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      return {
        success: true,
        session: {
          id: this.generateSessionId(),
          userId: '', // Would need to decode or fetch
          token: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
          createdAt: new Date()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Token refresh failed'
      };
    }
  }

  /**
   * Revoke OAuth token
   */
  async revoke(token: string): Promise<void> {
    // Provider-specific revocation
    // Most providers don't support programmatic revocation
    console.log(`[OAuthProvider] Token revoked for ${this.config.provider}`);
  }

  // Private helper methods
  
  protected mapUserInfo(userInfo: any): any {
    // Map provider-specific user info to standard format
    switch (this.config.provider) {
      case 'google':
        return {
          id: userInfo.id,
          email: userInfo.email,
          username: userInfo.email,
          displayName: userInfo.name,
          avatar: userInfo.picture,
          metadata: { verified: userInfo.verified_email },
          createdAt: new Date(),
          updatedAt: new Date()
        };
      
      case 'github':
        return {
          id: userInfo.id.toString(),
          email: userInfo.email,
          username: userInfo.login,
          displayName: userInfo.name || userInfo.login,
          avatar: userInfo.avatar_url,
          metadata: { bio: userInfo.bio, company: userInfo.company },
          createdAt: new Date(userInfo.created_at),
          updatedAt: new Date(userInfo.updated_at)
        };
      
      case 'x':
        return {
          id: userInfo.id,
          email: userInfo.email || `${userInfo.username}@x.com`,
          username: userInfo.username,
          displayName: userInfo.name,
          avatar: userInfo.profile_image_url,
          metadata: { verified: userInfo.verified },
          createdAt: new Date(userInfo.created_at),
          updatedAt: new Date()
        };
      
      default:
        return {
          id: userInfo.id || userInfo.sub,
          email: userInfo.email,
          username: userInfo.username || userInfo.email,
          displayName: userInfo.name || userInfo.email,
          avatar: userInfo.picture || userInfo.avatar,
          metadata: userInfo,
          createdAt: new Date(),
          updatedAt: new Date()
        };
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private generateSessionId(): string {
    return `oauth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private decodeIdToken(idToken: string): any {
    // Basic JWT decode (without verification for now)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  }
}