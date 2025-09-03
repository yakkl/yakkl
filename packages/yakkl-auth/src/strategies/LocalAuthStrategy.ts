/**
 * Local Authentication Strategy
 * Handles username/password and other local auth methods
 */

import type { AuthStrategy, AuthCredentials, AuthResult } from '../types';

export class LocalAuthStrategy implements AuthStrategy {
  name = 'local';
  priority = 1;

  /**
   * Check if this strategy can handle the credentials
   */
  canHandle(credentials: AuthCredentials): boolean {
    return !!(
      (credentials.username || credentials.email) && 
      credentials.password
    );
  }

  /**
   * Authenticate using local strategy
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    // Use PasswordProvider for actual authentication
    const { PasswordProvider } = await import('../providers/PasswordProvider');
    
    const provider = new PasswordProvider({
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true
    });

    return provider.authenticate(credentials);
  }

  /**
   * Register new user
   */
  async register(credentials: AuthCredentials): Promise<AuthResult> {
    const { PasswordProvider } = await import('../providers/PasswordProvider');
    
    const provider = new PasswordProvider({
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true
    });

    return provider.register({
      username: credentials.username,
      email: credentials.email,
      password: credentials.password!,
      metadata: credentials.metadata
    });
  }
}