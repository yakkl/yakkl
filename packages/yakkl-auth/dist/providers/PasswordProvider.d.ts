/**
 * Password Authentication Provider
 * Traditional username/password authentication with secure hashing
 */
import type { AuthProvider, AuthCredentials, AuthResult } from '../types';
export interface PasswordConfig {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    bcryptRounds?: number;
    maxAttempts?: number;
    lockoutDuration?: number;
}
export declare class PasswordProvider implements AuthProvider {
    name: string;
    type: "local";
    private config;
    private users;
    private attempts;
    private lockouts;
    constructor(config?: PasswordConfig);
    /**
     * Register new user with password
     */
    register(credentials: {
        username?: string;
        email?: string;
        password: string;
        metadata?: any;
    }): Promise<AuthResult>;
    /**
     * Authenticate with username/password
     */
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    /**
     * Change password
     */
    changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Reset password (with reset token)
     */
    resetPassword(resetToken: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Verify token
     */
    verify(token: string): Promise<boolean>;
    private validatePassword;
    private hashPassword;
    private verifyPassword;
    private recordFailedAttempt;
    private isLockedOut;
    private sanitizeUser;
    private generateUserId;
    private generateSessionId;
    private generateToken;
    private parseToken;
}
