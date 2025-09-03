/**
 * Local Authentication Strategy
 * Handles username/password and other local auth methods
 */
import type { AuthStrategy, AuthCredentials, AuthResult } from '../types';
export declare class LocalAuthStrategy implements AuthStrategy {
    name: string;
    priority: number;
    /**
     * Check if this strategy can handle the credentials
     */
    canHandle(credentials: AuthCredentials): boolean;
    /**
     * Authenticate using local strategy
     */
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    /**
     * Register new user
     */
    register(credentials: AuthCredentials): Promise<AuthResult>;
}
