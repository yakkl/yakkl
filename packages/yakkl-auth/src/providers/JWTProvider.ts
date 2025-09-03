/**
 * JWT Authentication Provider
 * Handles JWT token generation, verification, and refresh
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { AuthProvider, AuthCredentials, AuthResult, JWTConfig } from '../types';

export class JWTProvider implements AuthProvider {
  name = 'jwt';
  type = 'local' as const;
  private config: JWTConfig;
  private secret: Uint8Array;

  constructor(config: Partial<JWTConfig> = {}) {
    this.config = {
      secret: config.secret || 'default-secret-change-in-production',
      algorithm: config.algorithm || 'HS256',
      issuer: config.issuer || 'yakkl-auth',
      audience: config.audience || 'yakkl-app',
      expiresIn: config.expiresIn || '1h'
    };
    
    // Convert secret to Uint8Array for jose
    this.secret = new TextEncoder().encode(this.config.secret);
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // This would normally validate credentials against a database
      // For now, we'll create a JWT if credentials are provided
      if (!credentials.username && !credentials.email) {
        return {
          success: false,
          error: 'Username or email required'
        };
      }

      const userId = credentials.username || credentials.email || 'unknown';
      const token = await this.generateToken(userId, credentials);
      const refreshToken = await this.generateRefreshToken(userId);

      return {
        success: true,
        user: {
          id: userId,
          email: credentials.email,
          username: credentials.username,
          displayName: credentials.username || credentials.email,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        session: {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          userId,
          token,
          refreshToken,
          expiresAt: new Date(Date.now() + this.getExpiryMs()),
          createdAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  async verify(token: string): Promise<boolean> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      });
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const { payload } = await jwtVerify(refreshToken, this.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      });

      if (!payload.sub) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Generate new tokens
      const newToken = await this.generateToken(payload.sub, { id: payload.sub });
      const newRefreshToken = await this.generateRefreshToken(payload.sub);

      return {
        success: true,
        session: {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          userId: payload.sub,
          token: newToken,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + this.getExpiryMs()),
          createdAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refresh failed'
      };
    }
  }

  async revoke(token: string): Promise<void> {
    // In production, add token to blacklist/revocation list
    // For now, this is a no-op as JWTs are stateless
    console.log('[JWTProvider] Token revoked (would be blacklisted in production)');
  }

  private async generateToken(userId: string, claims: any = {}): Promise<string> {
    const jwt = new SignJWT({
      ...claims,
      sub: userId
    })
      .setProtectedHeader({ alg: this.config.algorithm! })
      .setIssuedAt()
      .setIssuer(this.config.issuer!)
      .setAudience(this.config.audience!)
      .setExpirationTime(this.config.expiresIn!);

    return await jwt.sign(this.secret);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const jwt = new SignJWT({
      sub: userId,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: this.config.algorithm! })
      .setIssuedAt()
      .setIssuer(this.config.issuer!)
      .setAudience(this.config.audience!)
      .setExpirationTime('7d'); // Refresh tokens last longer

    return await jwt.sign(this.secret);
  }

  private getExpiryMs(): number {
    const expiresIn = this.config.expiresIn;
    if (typeof expiresIn === 'number') {
      return expiresIn * 1000; // Convert seconds to ms
    }
    
    // Parse string format (1h, 30m, etc)
    const match = expiresIn?.toString().match(/^(\d+)([hdms])$/);
    if (!match) return 3600000; // Default 1 hour
    
    const [, value, unit] = match;
    const num = parseInt(value);
    
    switch (unit) {
      case 'd': return num * 24 * 60 * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      case 'm': return num * 60 * 1000;
      case 's': return num * 1000;
      default: return 3600000;
    }
  }
}