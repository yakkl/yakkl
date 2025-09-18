/**
 * Background Context JWT Manager
 * Works in all browser extension contexts (background, content scripts, service workers)
 * Does NOT use framework-specific stores - uses browser storage APIs directly
 *
 * Security Features:
 * - Token blacklisting: Invalidated tokens are stored in a blacklist to prevent reuse
 * - Automatic cleanup: Blacklisted tokens expire after 24 hours
 * - Hash-based storage: Only token hashes are stored in the blacklist, not full tokens
 * - Lock integration: Tokens are automatically invalidated when the wallet is locked
 *
 * Usage:
 * - invalidateJWT(token?) - Invalidate a specific token or the current token
 * - clearJWTBlacklist() - Clear all blacklisted tokens (use with caution)
 * - validateToken() now checks blacklist before validating
 * - hasValidToken() also checks if token is blacklisted
 */
export interface JWTPayload {
    sub: string;
    username: string;
    profileId: string;
    planLevel: string;
    sessionId: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
    secureHash?: string;
}
declare class BackgroundJWTManager {
    private static instance;
    private readonly STORAGE_KEY;
    private readonly BLACKLIST_KEY;
    private readonly ISSUER;
    private readonly AUDIENCE;
    private readonly BLACKLIST_EXPIRY_HOURS;
    private constructor();
    static getInstance(): BackgroundJWTManager;
    /**
     * Generate a JWT token - works in any context
     */
    generateToken(userId: string, username: string, profileId: string, planLevel?: string, sessionId?: string, expirationMinutes?: number, secureHash?: string): Promise<string>;
    /**
     * Get current JWT token - works in any context
     */
    getCurrentToken(): Promise<string | null>;
    /**
     * Validate a JWT token
     */
    validateToken(token: string): Promise<boolean>;
    /**
     * Refresh token if needed
     */
    refreshTokenIfNeeded(token: string, refreshThresholdMinutes?: number): Promise<string | null>;
    /**
     * Get token payload without validation
     */
    getTokenPayload(token: string): JWTPayload | null;
    /**
     * Invalidate a specific token or the current token
     * Adds token to blacklist to prevent further use
     */
    invalidateToken(tokenToInvalidate?: string): Promise<void>;
    /**
     * Clear stored token
     */
    clearToken(): Promise<void>;
    /**
     * Get current session information
     */
    getSessionInfo(): Promise<{
        hasActiveSession: boolean;
        sessionExpiresAt: number | null;
        sessionId: string | null;
        payload: JWTPayload | null;
    }>;
    /**
     * Check if token exists and is valid
     */
    hasValidToken(): Promise<boolean>;
    /**
     * Clear all blacklisted tokens
     */
    clearBlacklist(): Promise<void>;
    private getSigningKey;
    private sign;
    private base64UrlEncode;
    private base64UrlDecode;
    private generateSessionId;
    private storeToken;
    private getStoredToken;
    private isExtensionContext;
    /**
     * Add token to blacklist
     */
    private addToBlacklist;
    /**
     * Check if token is blacklisted
     */
    private isTokenBlacklisted;
    /**
     * Get blacklist from storage
     */
    private getBlacklist;
    /**
     * Create a hash of the token for blacklist storage
     */
    private hashToken;
}
export declare const backgroundJWTManager: BackgroundJWTManager;
export { BackgroundJWTManager };
export declare function getJWTForAPI(): Promise<string | null>;
export declare function createJWTForUser(userId: string, username: string, profileId: string, planLevel?: string, sessionId?: string): Promise<string>;
export declare function invalidateJWT(token?: string): Promise<void>;
export declare function clearJWTBlacklist(): Promise<void>;
