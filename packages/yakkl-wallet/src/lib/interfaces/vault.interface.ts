/**
 * Vault Interface for YAKKL Wallet
 * Provides abstraction over secure vault implementation
 * 
 * The actual implementation resides in yakkl-security (private repo)
 * This interface allows the wallet to work with both real and stub implementations
 */

import type { EncryptedData } from '$lib/common/interfaces';

/**
 * Vault types based on key material source
 */
export type VaultType = 
  | 'master'      // Primary HD wallet with seed phrase
  | 'division'    // Enterprise division vault (derived from master)
  | 'imported'    // Imported private keys or seed phrases
  | 'hardware'    // Hardware wallet (Ledger, Trezor, etc.)
  | 'watch';      // Watch-only addresses (no private keys)

/**
 * Organization hierarchy levels for enterprise use
 */
export type OrganizationLevel = 
  | 'root'        // Top-level organization
  | 'division'    // Division level
  | 'unit'        // Business unit
  | 'department'  // Department level
  | 'team';       // Team level

/**
 * Vault permissions for access control
 */
export interface VaultPermissions {
  canDerive: boolean;           // Can derive new accounts
  canExport: boolean;           // Can export keys/seed
  canSign: boolean;             // Can sign transactions
  canDelegate: boolean;         // Can create sub-vaults
  requiredSignatures?: number;  // Multi-sig threshold
  approvers?: string[];         // List of approver IDs for multi-sig
}

/**
 * Hardware wallet metadata
 */
export interface HardwareWalletInfo {
  type: 'ledger' | 'trezor' | 'keepkey' | 'other';
  deviceId: string;
  label?: string;
  firmwareVersion?: string;
  supportedCoins?: string[];
}

/**
 * Vault reference stored in ProfileData
 * This is a lightweight reference, not the actual vault data
 */
export interface VaultReference {
  vaultId: string;                    // Unique vault identifier
  type: VaultType;                    // Type of vault
  label?: string;                     // User-friendly name
  organizationLevel?: OrganizationLevel; // For enterprise hierarchies
  parentVaultId?: string;             // For hierarchical structures
  createdAt: string;                  // ISO timestamp
  lastAccessed?: string;              // ISO timestamp
  accountCount: number;               // Number of derived accounts
}

/**
 * Account derivation options
 */
export interface DerivationOptions {
  path?: string;                      // BIP44 path (e.g., "m/44'/60'/0'/0/0")
  count?: number;                     // Number of accounts to derive
  startIndex?: number;                // Starting index for derivation
  label?: string;                     // Account label template
  blockchain?: string;                // Target blockchain
}

/**
 * Import options for various key material types
 */
export interface ImportOptions {
  type: 'seed' | 'private_key' | 'keystore' | 'emergency_kit';
  data: string;                       // The key material (will be encrypted)
  password?: string;                  // For encrypted keystores
  label?: string;                     // User-friendly name
}

/**
 * Vault service interface
 * Implementations: 
 * - Production: Uses yakkl-security secure vault
 * - Development: Can use stub implementation
 * - Testing: Uses mock implementation
 */
export interface IVaultService {
  /**
   * Initialize the vault service
   */
  initialize(): Promise<void>;

  /**
   * Create a new vault
   * @param type - Type of vault to create
   * @param options - Additional options for vault creation
   * @returns Vault ID
   */
  createVault(type: VaultType, options?: {
    label?: string;
    parentVaultId?: string;
    organizationLevel?: OrganizationLevel;
    permissions?: VaultPermissions;
  }): Promise<string>;

  /**
   * Import key material into a vault
   * @param options - Import options including key material
   * @returns Vault ID of created vault
   */
  importToVault(options: ImportOptions): Promise<string>;

  /**
   * Get vault reference (metadata only, no keys)
   * @param vaultId - Vault identifier
   * @returns Vault reference or null if not found
   */
  getVaultReference(vaultId: string): Promise<VaultReference | null>;

  /**
   * List all vault references for a profile
   * @returns Array of vault references
   */
  listVaultReferences(): Promise<VaultReference[]>;

  /**
   * Derive account(s) from a vault
   * @param vaultId - Vault to derive from
   * @param options - Derivation options
   * @returns Derived account data (public info only)
   */
  deriveAccount(vaultId: string, options?: DerivationOptions): Promise<{
    address: string;
    publicKey: string;
    path: string;
    index: number;
  }>;

  /**
   * Check if a vault exists
   * @param vaultId - Vault identifier
   * @returns True if vault exists
   */
  vaultExists(vaultId: string): Promise<boolean>;

  /**
   * Delete a vault (requires appropriate permissions)
   * @param vaultId - Vault to delete
   * @returns Success status
   */
  deleteVault(vaultId: string): Promise<boolean>;

  /**
   * Export vault data (requires permissions)
   * @param vaultId - Vault to export
   * @param password - Password to decrypt vault
   * @returns Exported data or null if not permitted
   */
  exportVault(vaultId: string, password: string): Promise<{
    type: VaultType;
    data: string; // Seed phrase or private key
  } | null>;

  /**
   * Sign a transaction using vault
   * @param vaultId - Vault to use for signing
   * @param accountPath - Account derivation path
   * @param transaction - Transaction to sign
   * @returns Signed transaction
   */
  signTransaction(
    vaultId: string, 
    accountPath: string, 
    transaction: any
  ): Promise<string>;

  /**
   * Sign a message using vault
   * @param vaultId - Vault to use for signing
   * @param accountPath - Account derivation path
   * @param message - Message to sign
   * @returns Signature
   */
  signMessage(
    vaultId: string,
    accountPath: string,
    message: string
  ): Promise<string>;

  /**
   * Get vault statistics
   * @param vaultId - Vault identifier
   * @returns Vault statistics
   */
  getVaultStats(vaultId: string): Promise<{
    accountCount: number;
    lastAccessed: string;
    transactionCount: number;
    totalValue?: string;
  }>;

  /**
   * Validate vault password/PIN
   * @param vaultId - Vault to validate
   * @param password - Password to check
   * @returns True if password is valid
   */
  validateVaultAccess(vaultId: string, password: string): Promise<boolean>;

  /**
   * Rotate vault encryption (security best practice)
   * @param vaultId - Vault to rotate
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @returns Success status
   */
  rotateVaultEncryption(
    vaultId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean>;
}

/**
 * Vault events for reactive updates
 */
export interface VaultEvents {
  onVaultCreated: (vaultId: string) => void;
  onVaultDeleted: (vaultId: string) => void;
  onAccountDerived: (vaultId: string, address: string) => void;
  onVaultAccessed: (vaultId: string) => void;
  onVaultLocked: (vaultId: string) => void;
  onVaultUnlocked: (vaultId: string) => void;
}

/**
 * Factory function type for creating vault service
 */
export type VaultServiceFactory = () => Promise<IVaultService>;