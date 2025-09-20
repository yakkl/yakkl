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
export declare class OAuthProvider implements AuthProvider {
    name: string;
    type: "oauth";
    protected config: OAuthConfig;
    private providers;
    constructor(config: OAuthConfig);
    /**
     * Start OAuth flow - returns authorization URL
     */
    getAuthorizationUrl(state?: string): string;
    /**
     * Exchange authorization code for tokens
     */
    exchangeCode(code: string): Promise<{
        accessToken: string;
        refreshToken?: string;
        idToken?: string;
    }>;
    /**
     * Get user info from OAuth provider
     */
    getUserInfo(accessToken: string): Promise<any>;
    /**
     * Main authentication method
     */
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    /**
     * Verify OAuth token
     */
    verify(token: string): Promise<boolean>;
    /**
     * Refresh OAuth token
     */
    refresh(refreshToken: string): Promise<AuthResult>;
    /**
     * Revoke OAuth token
     */
    revoke(token: string): Promise<void>;
    protected mapUserInfo(userInfo: any): any;
    private generateState;
    private generateSessionId;
    private decodeIdToken;
}
