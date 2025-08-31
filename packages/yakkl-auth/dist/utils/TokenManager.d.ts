/**
 * Token management utilities
 */
import type { AuthStorage } from '../types';
export declare class TokenManager {
    private storage;
    private onRefresh?;
    private refreshTimer?;
    constructor(storage: AuthStorage, onRefresh?: ((token: string) => Promise<string>) | undefined);
    saveToken(token: string, expiresIn?: number): Promise<void>;
    getToken(): Promise<string | null>;
    saveRefreshToken(refreshToken: string): Promise<void>;
    getRefreshToken(): Promise<string | null>;
    removeToken(): Promise<void>;
    removeRefreshToken(): Promise<void>;
    clearAll(): Promise<void>;
    private scheduleRefresh;
    private clearRefreshTimer;
    /**
     * Parse JWT without verification (for client-side use only)
     */
    static parseJWT(token: string): any;
    /**
     * Check if token is expired
     */
    static isTokenExpired(token: string): boolean;
}
