/**
 * Token management utilities
 */

import type { AuthStorage } from '../types';

export class TokenManager {
  private refreshTimer?: NodeJS.Timeout;
  
  constructor(
    private storage: AuthStorage,
    private onRefresh?: (token: string) => Promise<string>
  ) {}

  async saveToken(token: string, expiresIn?: number): Promise<void> {
    await this.storage.set('auth_token', token);
    
    if (expiresIn) {
      await this.storage.set('token_expiry', Date.now() + expiresIn * 1000);
      this.scheduleRefresh(expiresIn);
    }
  }

  async getToken(): Promise<string | null> {
    const token = await this.storage.get('auth_token');
    const expiry = await this.storage.get('token_expiry');
    
    if (token && expiry && Date.now() > expiry) {
      // Token expired
      await this.removeToken();
      return null;
    }
    
    return token;
  }

  async saveRefreshToken(refreshToken: string): Promise<void> {
    await this.storage.set('refresh_token', refreshToken);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.storage.get('refresh_token');
  }

  async removeToken(): Promise<void> {
    this.clearRefreshTimer();
    await this.storage.remove('auth_token');
    await this.storage.remove('token_expiry');
  }

  async removeRefreshToken(): Promise<void> {
    await this.storage.remove('refresh_token');
  }

  async clearAll(): Promise<void> {
    this.clearRefreshTimer();
    await this.removeToken();
    await this.removeRefreshToken();
  }

  private scheduleRefresh(expiresIn: number): void {
    this.clearRefreshTimer();
    
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;
    
    if (refreshTime > 0 && this.onRefresh) {
      this.refreshTimer = setTimeout(async () => {
        try {
          const currentToken = await this.getToken();
          if (currentToken && this.onRefresh) {
            const newToken = await this.onRefresh(currentToken);
            await this.saveToken(newToken, expiresIn);
          }
        } catch (error) {
          console.error('[TokenManager] Failed to refresh token:', error);
        }
      }, refreshTime);
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Parse JWT without verification (for client-side use only)
   */
  static parseJWT(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('[TokenManager] Failed to parse JWT:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const payload = TokenManager.parseJWT(token);
    if (!payload || !payload.exp) {
      return true;
    }
    
    return Date.now() >= payload.exp * 1000;
  }
}