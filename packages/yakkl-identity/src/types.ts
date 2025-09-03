/**
 * Universal Identity System Types
 * Generic naming to work across all domains (AI, analytics, crypto, etc.)
 */

export type IdentityMethod = 
  | 'passkey'
  | 'oauth'
  | 'email'
  | 'service'
  | 'delegated'
  | 'wallet'
  | 'certificate';

export type AuthContext = 
  | 'browser'
  | 'cli'
  | 'service'
  | 'agent'
  | 'mcp';

export type AccessTier = 
  | 'community'
  | 'developer'
  | 'professional'
  | 'enterprise';

export interface Identity {
  id: string;
  method: IdentityMethod;
  publicKey?: string;
  tier: AccessTier;
  metadata: IdentityMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityMetadata {
  name?: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  context: AuthContext;
  parent?: string; // For delegated/service accounts
  [key: string]: any; // Allow additional properties
}

export interface Session {
  id: string;
  identityId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface ServiceAccount {
  id: string;
  parentIdentity: string;
  name: string;
  publicKey: string;
  permissions: string[];
  restrictions?: string[];
  autoRenew: boolean;
  ttl: number;
  createdAt: Date;
  lastUsed?: Date;
}

export interface AuthRequest {
  context: AuthContext;
  method: IdentityMethod;
  credentials?: any;
  metadata?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  identity?: Identity;
  session?: Session;
  error?: string;
}

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes: string[];
}

export interface PasskeyCredential {
  id: string;
  publicKey: string;
  algorithm: string;
  attestation?: any;
}

export interface UsageTracking {
  identityId: string;
  service: string;
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
  signature: string;
}

export interface IdentityConfig {
  storage: 'memory' | 'distributed' | 'hybrid';
  providers: {
    oauth?: OAuthProvider[];
    passkey?: boolean;
    email?: boolean;
    service?: boolean;
  };
  session: {
    ttl: number;
    renewable: boolean;
    maxRenewals?: number;
  };
  tracking?: {
    enabled: boolean;
    services: string[];
  };
}