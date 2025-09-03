/**
 * JWT Authentication Provider
 * Handles JWT token generation, verification, and refresh
 */
import type { AuthProvider, AuthCredentials, AuthResult, JWTConfig } from '../types';
export declare class JWTProvider implements AuthProvider {
    name: string;
    type: "local";
    private config;
    private secret;
    constructor(config?: Partial<JWTConfig>);
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    verify(token: string): Promise<boolean>;
    refresh(refreshToken: string): Promise<AuthResult>;
    revoke(token: string): Promise<void>;
    private generateToken;
    private generateRefreshToken;
    private getExpiryMs;
}
