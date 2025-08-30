/**
 * VaultBridge Service
 * Bridges the gap between yakkl-wallet and yakkl-security's secure vault
 * 
 * This service dynamically loads the appropriate vault implementation:
 * - Production: Real secure vault from yakkl-security
 * - Development: Can use stub for testing
 * - Open Source: Uses stub implementation
 */

import { log } from '$lib/common/logger-wrapper';
import type { 
  IVaultService, 
  VaultType, 
  VaultReference, 
  ImportOptions,
  DerivationOptions,
  VaultPermissions,
  OrganizationLevel 
} from '$lib/interfaces/vault.interface';
import { browser_ext } from '$lib/common/environment';
import type { EncryptedData } from '$lib/common/interfaces';

/**
 * Stub implementation for open source builds
 * This provides the interface but no real security
 */
class StubVaultService implements IVaultService {
  private vaults = new Map<string, VaultReference>();
  
  async initialize(): Promise<void> {
    log.info('[StubVault] Initialized stub vault service');
  }

  async createVault(type: VaultType, options?: any): Promise<string> {
    const vaultId = `stub_vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const vault: VaultReference = {
      vaultId,
      type,
      label: options?.label,
      organizationLevel: options?.organizationLevel,
      parentVaultId: options?.parentVaultId,
      createdAt: new Date().toISOString(),
      accountCount: 0
    };
    this.vaults.set(vaultId, vault);
    log.warn('[StubVault] Created stub vault:', vaultId);
    return vaultId;
  }

  async importToVault(options: ImportOptions): Promise<string> {
    // In stub mode, just create a vault reference
    const vaultId = await this.createVault('imported', { label: options.label });
    log.warn('[StubVault] Imported to stub vault:', vaultId);
    return vaultId;
  }

  async getVaultReference(vaultId: string): Promise<VaultReference | null> {
    return this.vaults.get(vaultId) || null;
  }

  async listVaultReferences(): Promise<VaultReference[]> {
    return Array.from(this.vaults.values());
  }

  async deriveAccount(vaultId: string, options?: DerivationOptions): Promise<any> {
    // Stub implementation returns mock data
    const index = options?.startIndex || 0;
    return {
      address: `0xstub${vaultId.substr(0, 38)}`,
      publicKey: `0xpub_stub_${Date.now()}`,
      path: options?.path || `m/44'/60'/0'/0/${index}`,
      index
    };
  }

  async vaultExists(vaultId: string): Promise<boolean> {
    return this.vaults.has(vaultId);
  }

  async deleteVault(vaultId: string): Promise<boolean> {
    return this.vaults.delete(vaultId);
  }

  async exportVault(vaultId: string, password: string): Promise<any> {
    log.warn('[StubVault] Export not available in stub mode');
    return null;
  }

  async signTransaction(vaultId: string, accountPath: string, transaction: any): Promise<string> {
    log.warn('[StubVault] Signing not available in stub mode');
    return '0xstub_signature';
  }

  async signMessage(vaultId: string, accountPath: string, message: string): Promise<string> {
    log.warn('[StubVault] Message signing not available in stub mode');
    return '0xstub_message_signature';
  }

  async getVaultStats(vaultId: string): Promise<any> {
    const vault = this.vaults.get(vaultId);
    return {
      accountCount: vault?.accountCount || 0,
      lastAccessed: vault?.lastAccessed || vault?.createdAt || '',
      transactionCount: 0,
      totalValue: '0'
    };
  }

  async validateVaultAccess(vaultId: string, password: string): Promise<boolean> {
    // Stub always returns true for development
    return true;
  }

  async rotateVaultEncryption(vaultId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    log.warn('[StubVault] Encryption rotation not available in stub mode');
    return false;
  }
}

/**
 * Main VaultBridge service
 * Singleton pattern to ensure single instance
 */
export class VaultBridgeService implements IVaultService {
  private static instance: VaultBridgeService | null = null;
  private vaultService: IVaultService | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): VaultBridgeService {
    if (!VaultBridgeService.instance) {
      VaultBridgeService.instance = new VaultBridgeService();
    }
    return VaultBridgeService.instance;
  }

  /**
   * Initialize the vault service
   * Dynamically loads the appropriate implementation
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    await this.initPromise;
    this.isInitialized = true;
  }

  private async _initialize(): Promise<void> {
    try {
      // Check if we're in production build with yakkl-security available
      const isProduction = import.meta.env.PROD;
      const hasSecureVault = import.meta.env.VITE_HAS_SECURE_VAULT === 'true';

      if (isProduction && hasSecureVault) {
        try {
          // TODO: Once yakkl-security is set up as a proper package, import the secure vault
          // For now, check if the copied security files include a vault service
          // The secure vault will be copied from yakkl-security during build
          // const { SecureVaultService } = await import('$lib/security/vault');
          // this.vaultService = new SecureVaultService();
          // await this.vaultService.initialize();
          // log.info('[VaultBridge] Initialized with secure vault');
          
          // For now, use stub until secure vault is properly set up
          this.vaultService = new StubVaultService();
          await this.vaultService.initialize();
          log.info('[VaultBridge] Using stub vault (secure vault integration pending)');
        } catch (error) {
          log.error('[VaultBridge] Failed to load secure vault, falling back to stub:', false, error);
          this.vaultService = new StubVaultService();
          await this.vaultService.initialize();
        }
      } else {
        // Use stub for development/open source builds
        this.vaultService = new StubVaultService();
        await this.vaultService.initialize();
        log.info('[VaultBridge] Initialized with stub vault (dev/open source mode)');
      }
    } catch (error) {
      log.error('[VaultBridge] Initialization error:', false, error);
      // Fallback to stub on any error
      this.vaultService = new StubVaultService();
      await this.vaultService.initialize();
    }
  }

  /**
   * Ensure vault service is available
   */
  private async ensureVaultService(): Promise<IVaultService> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.vaultService) {
      throw new Error('Vault service not initialized');
    }
    return this.vaultService;
  }

  // Implement IVaultService interface by delegating to actual service

  async createVault(type: VaultType, options?: {
    label?: string;
    parentVaultId?: string;
    organizationLevel?: OrganizationLevel;
    permissions?: VaultPermissions;
  }): Promise<string> {
    const service = await this.ensureVaultService();
    const vaultId = await service.createVault(type, options);
    
    // Store vault reference in browser storage for persistence
    if (browser_ext?.storage) {
      try {
        const vaultRefs = await this.getStoredVaultReferences();
        const newRef: VaultReference = {
          vaultId,
          type,
          label: options?.label,
          organizationLevel: options?.organizationLevel,
          parentVaultId: options?.parentVaultId,
          createdAt: new Date().toISOString(),
          accountCount: 0
        };
        vaultRefs.push(newRef);
        await browser_ext.storage.local.set({ vaultReferences: vaultRefs });
      } catch (error) {
        log.warn('[VaultBridge] Failed to persist vault reference:', false, error);
      }
    }
    
    return vaultId;
  }

  async importToVault(options: ImportOptions): Promise<string> {
    const service = await this.ensureVaultService();
    const vaultId = await service.importToVault(options);
    
    // Store reference
    if (browser_ext?.storage) {
      try {
        const vaultRefs = await this.getStoredVaultReferences();
        const newRef: VaultReference = {
          vaultId,
          type: 'imported',
          label: options.label,
          createdAt: new Date().toISOString(),
          accountCount: 0
        };
        vaultRefs.push(newRef);
        await browser_ext.storage.local.set({ vaultReferences: vaultRefs });
      } catch (error) {
        log.warn('[VaultBridge] Failed to persist import vault reference:', false, error);
      }
    }
    
    return vaultId;
  }

  async getVaultReference(vaultId: string): Promise<VaultReference | null> {
    const service = await this.ensureVaultService();
    return service.getVaultReference(vaultId);
  }

  async listVaultReferences(): Promise<VaultReference[]> {
    const service = await this.ensureVaultService();
    const vaultRefs = await service.listVaultReferences();
    
    // Also check browser storage for persisted references
    if (browser_ext?.storage) {
      try {
        const storedRefs = await this.getStoredVaultReferences();
        // Merge stored and service references (dedup by vaultId)
        const refMap = new Map<string, VaultReference>();
        vaultRefs.forEach(ref => refMap.set(ref.vaultId, ref));
        storedRefs.forEach(ref => {
          if (!refMap.has(ref.vaultId)) {
            refMap.set(ref.vaultId, ref);
          }
        });
        return Array.from(refMap.values());
      } catch (error) {
        log.warn('[VaultBridge] Failed to load stored vault references:', false, error);
      }
    }
    
    return vaultRefs;
  }

  async deriveAccount(vaultId: string, options?: DerivationOptions): Promise<{
    address: string;
    publicKey: string;
    path: string;
    index: number;
  }> {
    const service = await this.ensureVaultService();
    const account = await service.deriveAccount(vaultId, options);
    
    // Update account count in reference
    if (browser_ext?.storage) {
      try {
        const vaultRefs = await this.getStoredVaultReferences();
        const ref = vaultRefs.find(r => r.vaultId === vaultId);
        if (ref) {
          ref.accountCount = (ref.accountCount || 0) + 1;
          ref.lastAccessed = new Date().toISOString();
          await browser_ext.storage.local.set({ vaultReferences: vaultRefs });
        }
      } catch (error) {
        log.warn('[VaultBridge] Failed to update vault reference:', false, error);
      }
    }
    
    return account;
  }

  async vaultExists(vaultId: string): Promise<boolean> {
    const service = await this.ensureVaultService();
    return service.vaultExists(vaultId);
  }

  async deleteVault(vaultId: string): Promise<boolean> {
    const service = await this.ensureVaultService();
    const result = await service.deleteVault(vaultId);
    
    // Remove from stored references
    if (result && browser_ext?.storage) {
      try {
        const vaultRefs = await this.getStoredVaultReferences();
        const filtered = vaultRefs.filter(r => r.vaultId !== vaultId);
        await browser_ext.storage.local.set({ vaultReferences: filtered });
      } catch (error) {
        log.warn('[VaultBridge] Failed to remove vault reference:', false, error);
      }
    }
    
    return result;
  }

  async exportVault(vaultId: string, password: string): Promise<{
    type: VaultType;
    data: string;
  } | null> {
    const service = await this.ensureVaultService();
    return service.exportVault(vaultId, password);
  }

  async signTransaction(vaultId: string, accountPath: string, transaction: any): Promise<string> {
    const service = await this.ensureVaultService();
    return service.signTransaction(vaultId, accountPath, transaction);
  }

  async signMessage(vaultId: string, accountPath: string, message: string): Promise<string> {
    const service = await this.ensureVaultService();
    return service.signMessage(vaultId, accountPath, message);
  }

  async getVaultStats(vaultId: string): Promise<{
    accountCount: number;
    lastAccessed: string;
    transactionCount: number;
    totalValue?: string;
  }> {
    const service = await this.ensureVaultService();
    return service.getVaultStats(vaultId);
  }

  async validateVaultAccess(vaultId: string, password: string): Promise<boolean> {
    const service = await this.ensureVaultService();
    return service.validateVaultAccess(vaultId, password);
  }

  async rotateVaultEncryption(vaultId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const service = await this.ensureVaultService();
    return service.rotateVaultEncryption(vaultId, oldPassword, newPassword);
  }

  /**
   * Helper method to get stored vault references from browser storage
   */
  private async getStoredVaultReferences(): Promise<VaultReference[]> {
    if (!browser_ext?.storage) return [];
    
    try {
      const result = await browser_ext.storage.local.get('vaultReferences');
      return (result?.vaultReferences as VaultReference[]) || [];
    } catch (error) {
      log.warn('[VaultBridge] Failed to get stored vault references:', false, error);
      return [];
    }
  }
}

/**
 * Export singleton instance getter
 */
export const getVaultService = (): IVaultService => {
  return VaultBridgeService.getInstance();
};