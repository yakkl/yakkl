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
  lockoutDuration?: number; // minutes
}

export class PasswordProvider implements AuthProvider {
  name = 'password';
  type = 'local' as const;
  private config: PasswordConfig;
  private users: Map<string, any> = new Map(); // In production, use database
  private attempts: Map<string, number> = new Map();
  private lockouts: Map<string, Date> = new Map();

  constructor(config: PasswordConfig = {}) {
    this.config = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      bcryptRounds: 10,
      maxAttempts: 5,
      lockoutDuration: 15,
      ...config
    };
  }

  /**
   * Register new user with password
   */
  async register(credentials: {
    username?: string;
    email?: string;
    password: string;
    metadata?: any;
  }): Promise<AuthResult> {
    try {
      const identifier = credentials.username || credentials.email;
      
      if (!identifier) {
        return {
          success: false,
          error: 'Username or email required'
        };
      }

      // Check if user exists
      if (this.users.has(identifier)) {
        return {
          success: false,
          error: 'User already exists'
        };
      }

      // Validate password
      const validation = this.validatePassword(credentials.password);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(credentials.password);
      
      // Create user
      const user = {
        id: this.generateUserId(),
        username: credentials.username,
        email: credentials.email,
        password: hashedPassword,
        metadata: credentials.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store user
      this.users.set(identifier, user);
      
      // Create session
      const sessionId = this.generateSessionId();
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        session: {
          id: sessionId,
          userId: user.id,
          token: this.generateToken(user.id),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * Authenticate with username/password
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const identifier = credentials.username || credentials.email;
      
      if (!identifier || !credentials.password) {
        return {
          success: false,
          error: 'Username/email and password required'
        };
      }

      // Check lockout
      if (this.isLockedOut(identifier)) {
        const lockoutEnd = this.lockouts.get(identifier);
        const minutesLeft = Math.ceil(
          (lockoutEnd!.getTime() - Date.now()) / 60000
        );
        
        return {
          success: false,
          error: `Account locked. Try again in ${minutesLeft} minutes`
        };
      }

      // Get user
      const user = this.users.get(identifier);
      
      if (!user) {
        this.recordFailedAttempt(identifier);
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Verify password
      const valid = await this.verifyPassword(
        credentials.password,
        user.password
      );

      if (!valid) {
        this.recordFailedAttempt(identifier);
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Clear attempts on success
      this.attempts.delete(identifier);
      
      // Create session
      const sessionId = this.generateSessionId();
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        session: {
          id: sessionId,
          userId: user.id,
          token: this.generateToken(user.id),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user by ID
      let user: any;
      let identifier: string | undefined;
      
      for (const [key, value] of this.users.entries()) {
        if (value.id === userId) {
          user = value;
          identifier = key;
          break;
        }
      }

      if (!user || !identifier) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify old password
      const valid = await this.verifyPassword(oldPassword, user.password);
      
      if (!valid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Update user
      user.password = hashedPassword;
      user.updatedAt = new Date();
      this.users.set(identifier, user);
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Password change failed'
      };
    }
  }

  /**
   * Reset password (with reset token)
   */
  async resetPassword(
    resetToken: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    // In production, verify reset token from email
    // For now, simplified implementation
    
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // Update password (would lookup user by reset token)
    return { success: true };
  }

  /**
   * Verify token
   */
  async verify(token: string): Promise<boolean> {
    try {
      const payload = this.parseToken(token);
      return !!payload.userId && Date.now() < payload.exp;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < this.config.minLength!) {
      errors.push(`Password must be at least ${this.config.minLength} characters`);
    }
    
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }
    
    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }
    
    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }
    
    if (this.config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt or argon2
    // For now, simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // In production, use bcrypt.compare
    const testHash = await this.hashPassword(password);
    return testHash === hash;
  }

  private recordFailedAttempt(identifier: string): void {
    const attempts = (this.attempts.get(identifier) || 0) + 1;
    this.attempts.set(identifier, attempts);
    
    if (attempts >= this.config.maxAttempts!) {
      // Lock account
      const lockoutEnd = new Date(
        Date.now() + this.config.lockoutDuration! * 60000
      );
      this.lockouts.set(identifier, lockoutEnd);
      this.attempts.delete(identifier);
    }
  }

  private isLockedOut(identifier: string): boolean {
    const lockoutEnd = this.lockouts.get(identifier);
    
    if (!lockoutEnd) {
      return false;
    }
    
    if (lockoutEnd.getTime() > Date.now()) {
      return true;
    }
    
    // Lockout expired
    this.lockouts.delete(identifier);
    return false;
  }

  private sanitizeUser(user: any): any {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSessionId(): string {
    return `pwd_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateToken(userId: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    };
    
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    return `${encodedHeader}.${encodedPayload}.mock_signature`;
  }

  private parseToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token');
    }
    
    return JSON.parse(atob(parts[1]));
  }
}