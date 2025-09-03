/**
 * Core authentication types
 */

export interface User {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface AuthCredentials {
  username?: string;
  email?: string;
  password?: string;
  token?: string;
  provider?: string;
  [key: string]: any;
}

export interface AuthProvider {
  name: string;
  type: 'local' | 'oauth' | 'web3' | 'biometric' | 'hardware' | 'passkey';
  
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  verify(token: string): Promise<boolean>;
  refresh?(refreshToken: string): Promise<AuthResult>;
  revoke?(token: string): Promise<void>;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  requiresMFA?: boolean;
  mfaToken?: string;
}

export interface AuthStrategy {
  name: string;
  priority: number;
  
  canHandle(credentials: AuthCredentials): boolean;
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
}

export interface AuthConfig {
  providers: AuthProvider[];
  strategies?: AuthStrategy[];
  sessionDuration?: number; // in seconds
  refreshEnabled?: boolean;
  mfaEnabled?: boolean;
  securityLevel?: 'low' | 'medium' | 'high' | 'paranoid';
  storage?: AuthStorage;
}

export interface AuthStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface MFAConfig {
  type: 'totp' | 'sms' | 'email' | 'hardware' | 'biometric';
  enabled: boolean;
  required?: boolean;
  backupCodes?: boolean;
}

export interface JWTConfig {
  secret: string;
  algorithm?: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string | number;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope?: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
}

export interface Web3AuthConfig {
  chainId: number;
  rpcUrl?: string;
  message?: string;
  verifySignature?: boolean;
}