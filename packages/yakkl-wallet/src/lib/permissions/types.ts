// src/lib/permissions/types.ts

/**
 * Security levels for wallet permissions
 */
export enum SecurityLevel {
  /**
   * Require approval every session (highest security)
   */
  HIGH = 'high',

  /**
   * Require approval every 7 days (balanced security/convenience)
   */
  MEDIUM = 'medium',

  /**
   * Remember until revoked (dApp-compatible, lowest security)
   */
  STANDARD = 'standard'
}

/**
 * Permission data structure stored for each domain
 */
export interface PermissionData {
  /**
   * List of approved account addresses
   */
  accounts: string[];

  /**
   * Timestamp when approval was granted
   */
  approvedAt: number;

  /**
   * Timestamp when approval expires
   */
  expiresAt: number;

  /**
   * Timestamp when permission was last used
   */
  lastUsed: number;

  /**
   * Current session ID (used for HIGH security level)
   */
  sessionId?: string;
}

/**
 * Encrypted permission data stored in browser storage
 */
export interface EncryptedPermissionStore {
  /**
   * Base64-encoded encrypted permission data
   */
  encrypted: string;

  /**
   * Base64-encoded initialization vector for decryption
   */
  iv: string;
}

/**
 * Account-level permission settings
 */
export interface AccountPermission {
  /**
   * Account address
   */
  address: string;

  /**
   * Whether this is a private account requiring extra approval
   */
  isPrivate: boolean;

  /**
   * Per-domain permissions for this account
   */
  domainPermissions: {
    [origin: string]: {
      granted: boolean;
      expiresAt: number;
    }
  };
}

/**
 * Result from permission prompt
 */
export interface PermissionResponse {
  /**
   * Whether user approved the connection
   */
  approved: boolean;

  /**
   * Accounts the user approved for connection
   */
  accounts: string[];
}
