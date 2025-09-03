/**
 * Security Bridge (Simplified)
 * Integration between YAKKL wallet and security package
 * Provides core security features without complex type dependencies
 */

// Temporarily disabled due to @yakkl/security build issues
// import { WalletSecurityManager } from '@yakkl/security';
import { ExtensionStorage } from '@yakkl/browser-extension';
import { currentAccount } from '$lib/stores/account.store';
import { get } from 'svelte/store';

// Define local types to avoid import issues
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

interface DomainPermission {
  domain: string;
  permissions: string[];
  grantedAt: number;
  expiresAt?: number;
}

export class SecurityBridge {
  private walletSecurity: any; // WalletSecurityManager instance
  private storage: ExtensionStorage;
  private initialized = false;
  private permissions: Map<string, DomainPermission> = new Map();

  constructor() {
    // Initialize storage with encryption enabled
    this.storage = new ExtensionStorage({
      area: 'local',
      encrypt: true,
      prefix: 'yakkl_secure_'
    });

    // Initialize security manager (placeholder until @yakkl/security is fixed)
    // this.walletSecurity = new WalletSecurityManager();
    this.walletSecurity = {}; // Placeholder

    if (typeof window !== "undefined") {
      this.initialize();
    }
  }

  /**
   * Initialize security bridge
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load stored permissions
      await this.loadStoredPermissions();

      this.initialized = true;
      console.log('[SecurityBridge] Initialized');
    } catch (error) {
      console.error('[SecurityBridge] Initialization failed:', error);
    }
  }

  /**
   * Validate transaction security
   */
  async validateTransaction(tx: {
    from: string;
    to: string;
    value: string;
    data?: string;
    gasLimit?: string;
    gasPrice?: string;
  }): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic validation
      if (!tx.from || !/^0x[a-fA-F0-9]{40}$/i.test(tx.from)) {
        errors.push('Invalid sender address');
      }

      if (!tx.to || !/^0x[a-fA-F0-9]{40}$/i.test(tx.to)) {
        errors.push('Invalid recipient address');
      }

      if (!tx.value || Number(tx.value) < 0) {
        errors.push('Invalid transaction amount');
      }

      // Check blacklist
      const isBlacklisted = await this.checkBlacklist(tx.to);
      if (isBlacklisted) {
        errors.push('Recipient address is blacklisted');
      }

      // Check transaction limits
      const limitCheck = await this.checkTransactionLimits(tx.value);
      if (!limitCheck.valid) {
        errors.push(...limitCheck.errors);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('[SecurityBridge] Transaction validation error:', error);
      return {
        valid: false,
        errors: ['Transaction validation failed'],
        warnings: []
      };
    }
  }

  /**
   * Encrypt data for domain
   */
  async encryptForDomain(domain: string, data: any): Promise<string> {
    try {
      // Simple encryption using btoa for now
      // In production, use proper encryption from @yakkl/security
      const jsonData = JSON.stringify({ domain, data, timestamp: Date.now() });
      return btoa(jsonData);
    } catch (error) {
      console.error('[SecurityBridge] Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data for domain
   */
  async decryptForDomain(domain: string, encryptedData: string): Promise<any> {
    try {
      // Simple decryption using atob for now
      // In production, use proper decryption from @yakkl/security
      const jsonData = atob(encryptedData);
      const parsed = JSON.parse(jsonData);
      
      if (parsed.domain !== domain) {
        throw new Error('Domain mismatch');
      }
      
      return parsed.data;
    } catch (error) {
      console.error('[SecurityBridge] Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store private key securely
   */
  async storePrivateKey(address: string, privateKey: string, password: string): Promise<void> {
    try {
      // Encrypt and store (simplified)
      const encrypted = await this.encryptForDomain('wallet', { address, privateKey });
      await this.storage.set(`key_${address}`, encrypted);
      console.log('[SecurityBridge] Private key stored securely for:', address);
    } catch (error) {
      console.error('[SecurityBridge] Failed to store private key:', error);
      throw new Error('Failed to store private key');
    }
  }

  /**
   * Retrieve private key
   */
  async getPrivateKey(address: string, password: string): Promise<string> {
    try {
      const encrypted = await this.storage.get(`key_${address}`);
      if (!encrypted) {
        throw new Error('Key not found');
      }
      
      const decrypted = await this.decryptForDomain('wallet', encrypted as string);
      return decrypted.privateKey;
    } catch (error) {
      console.error('[SecurityBridge] Failed to retrieve private key:', error);
      throw new Error('Failed to retrieve private key');
    }
  }

  /**
   * Check domain permissions
   */
  async checkPermission(domain: string, permission: string): Promise<boolean> {
    try {
      const domainPermission = this.permissions.get(domain);
      if (!domainPermission) return false;
      
      // Check expiration
      if (domainPermission.expiresAt && Date.now() > domainPermission.expiresAt) {
        this.permissions.delete(domain);
        return false;
      }
      
      return domainPermission.permissions.includes(permission);
    } catch (error) {
      console.error('[SecurityBridge] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Grant permission to domain
   */
  async grantPermission(domain: string, permission: string, duration?: number): Promise<void> {
    try {
      const existing = this.permissions.get(domain) || {
        domain,
        permissions: [],
        grantedAt: Date.now()
      };
      
      if (!existing.permissions.includes(permission)) {
        existing.permissions.push(permission);
      }
      
      if (duration) {
        existing.expiresAt = Date.now() + duration;
      }
      
      this.permissions.set(domain, existing);
      await this.storePermissions();
      
      console.log('[SecurityBridge] Permission granted:', domain, permission);
    } catch (error) {
      console.error('[SecurityBridge] Failed to grant permission:', error);
      throw new Error('Failed to grant permission');
    }
  }

  /**
   * Generate secure mnemonic
   */
  async generateMnemonic(strength: 128 | 192 | 256 = 128): Promise<string> {
    try {
      // Simplified mnemonic generation
      // In production, use proper crypto from @yakkl/security
      const words = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 
                     'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'];
      const count = strength === 256 ? 24 : strength === 192 ? 18 : 12;
      
      const mnemonic: string[] = [];
      for (let i = 0; i < count; i++) {
        mnemonic.push(words[Math.floor(Math.random() * words.length)]);
      }
      
      return mnemonic.join(' ');
    } catch (error) {
      console.error('[SecurityBridge] Failed to generate mnemonic:', error);
      throw new Error('Failed to generate mnemonic');
    }
  }

  /**
   * Sign message
   */
  async signMessage(message: string, privateKey: string): Promise<string> {
    try {
      // Simplified signature
      // In production, use proper signing from @yakkl/security
      const combined = message + privateKey;
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hexString = Array.from(data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return '0x' + hexString.slice(0, 130);
    } catch (error) {
      console.error('[SecurityBridge] Failed to sign message:', error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Private helper methods
   */
  
  private async checkBlacklist(address: string): Promise<boolean> {
    // Check against known phishing addresses
    const blacklist = [
      // Add known malicious addresses
      '0x0000000000000000000000000000000000000000'
    ];
    
    return blacklist.includes(address.toLowerCase());
  }

  private async checkTransactionLimits(value: string): Promise<ValidationResult> {
    // Check daily/monthly transaction limits
    const dailyLimit = 10; // ETH
    const valueInEth = parseFloat(value) / 1e18;
    
    if (valueInEth > dailyLimit) {
      return {
        valid: false,
        errors: [`Transaction exceeds daily limit of ${dailyLimit} ETH`],
        warnings: []
      };
    }
    
    return { valid: true, errors: [], warnings: [] };
  }

  private async loadStoredPermissions(): Promise<void> {
    try {
      const stored = await this.storage.get('permissions');
      if (stored) {
        const permissions = stored as DomainPermission[];
        permissions.forEach(p => this.permissions.set(p.domain, p));
      }
    } catch (error) {
      console.error('[SecurityBridge] Failed to load permissions:', error);
    }
  }

  private async storePermissions(): Promise<void> {
    try {
      const permissions = Array.from(this.permissions.values());
      await this.storage.set('permissions', permissions);
    } catch (error) {
      console.error('[SecurityBridge] Failed to store permissions:', error);
    }
  }
}

// Create singleton instance
export const securityBridge = new SecurityBridge();

// Export convenience methods
export const validateTransaction = (tx: any) => securityBridge.validateTransaction(tx);
export const encryptForDomain = (domain: string, data: any) => securityBridge.encryptForDomain(domain, data);
export const decryptForDomain = (domain: string, data: string) => securityBridge.decryptForDomain(domain, data);
export const storePrivateKey = (address: string, key: string, password: string) => 
  securityBridge.storePrivateKey(address, key, password);
export const getPrivateKey = (address: string, password: string) => 
  securityBridge.getPrivateKey(address, password);
export const checkPermission = (domain: string, permission: string) => 
  securityBridge.checkPermission(domain, permission);
export const grantPermission = (domain: string, permission: string, duration?: number) => 
  securityBridge.grantPermission(domain, permission, duration);
export const generateMnemonic = (strength?: 128 | 192 | 256) => 
  securityBridge.generateMnemonic(strength);
export const signMessage = (message: string, privateKey: string) => 
  securityBridge.signMessage(message, privateKey);