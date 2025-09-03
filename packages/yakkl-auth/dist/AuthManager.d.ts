/**
 * Main authentication manager
 * Coordinates providers and strategies for secure authentication
 */
import type { AuthConfig, AuthCredentials, AuthProvider, AuthResult, AuthStrategy, Session, User } from './types';
export declare class AuthManager {
    private config;
    private providers;
    private strategies;
    private currentSession;
    private storage;
    constructor(config?: Partial<AuthConfig>);
    /**
     * Authenticate user with credentials
     */
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    /**
     * Verify current session or token
     */
    verify(token?: string): Promise<boolean>;
    /**
     * Refresh current session
     */
    refresh(): Promise<AuthResult>;
    /**
     * Logout and clear session
     */
    logout(): Promise<void>;
    /**
     * Get current user
     */
    getCurrentUser(): Promise<User | null>;
    /**
     * Get current session
     */
    getSession(): Session | null;
    /**
     * Check if authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Add authentication provider
     */
    addProvider(provider: AuthProvider): void;
    /**
     * Add authentication strategy
     */
    addStrategy(strategy: AuthStrategy): void;
    /**
     * Initialize default providers
     */
    private initializeProviders;
    /**
     * Merge config with defaults
     */
    private mergeConfig;
}
