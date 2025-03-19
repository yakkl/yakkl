import { secureVault } from '@yakkl/security';
import type {
  BackupKit,
  EncryptedData,
  SecureAccount,
  AccountKey
} from '@yakkl/security';

export class WalletSecurityManager {
  private static instance: WalletSecurityManager;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): WalletSecurityManager {
    if (!WalletSecurityManager.instance) {
      WalletSecurityManager.instance = new WalletSecurityManager();
    }
    return WalletSecurityManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await secureVault.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize security manager:', error);
      throw new Error('Security initialization failed');
    }
  }

  public async createAccount(password: string): Promise<SecureAccount> {
    if (!this.initialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      return await secureVault.createSecureAccount(password);
    } catch (error) {
      console.error('Failed to create account:', error);
      throw new Error('Account creation failed');
    }
  }

  public async importAccount(backupKit: BackupKit, password: string): Promise<SecureAccount> {
    if (!this.initialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      return await secureVault.importSecureAccount(backupKit, password);
    } catch (error) {
      console.error('Failed to import account:', error);
      throw new Error('Account import failed');
    }
  }

  public async encryptData(data: string, accountId: string): Promise<EncryptedData> {
    if (!this.initialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      return await secureVault.encryptData(data, accountId);
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      throw new Error('Data encryption failed');
    }
  }

  public async decryptData(encryptedData: EncryptedData, accountId: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      return await secureVault.decryptData(encryptedData, accountId);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      throw new Error('Data decryption failed');
    }
  }

  public async createBackup(accountId: string): Promise<BackupKit> {
    if (!this.initialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      return await secureVault.generateBackupKit(accountId);
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Backup creation failed');
    }
  }

  public async rotateKeys(accountId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Security manager not initialized');
    }

    try {
      await secureVault.rotateKeys(accountId);
      // Create a new backup after key rotation
      const backupKit = await this.createBackup(accountId);

      // Store backup with backend service
      await this.storeBackup(backupKit, accountId);
    } catch (error) {
      console.error('Failed to rotate keys:', error);
      throw new Error('Key rotation failed');
    }
  }

  private async storeBackup(backupKit: BackupKit, accountId: string): Promise<void> {
    try {
      const response = await fetch('https://api.yakkl.com/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          accountId,
          deviceId: await this.getDeviceId(),
          shares: backupKit.shares,
          threshold: backupKit.threshold,
          version: backupKit.version,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to store backup with backend');
      }
    } catch (error) {
      console.error('Failed to store backup:', error);
      throw new Error('Backup storage failed');
    }
  }

  private async getAuthToken(): Promise<string> {
    // Implement token retrieval from secure storage
    const token = await secureVault.decryptData(
      await this.getEncryptedToken(),
      'system'
    );
    return token;
  }

  private async getDeviceId(): Promise<string> {
    // Implement device ID retrieval from secure storage
    const deviceId = await secureVault.decryptData(
      await this.getEncryptedDeviceId(),
      'system'
    );
    return deviceId;
  }

  private async getEncryptedToken(): Promise<EncryptedData> {
    // Implement encrypted token retrieval from storage
    throw new Error('Not implemented');
  }

  private async getEncryptedDeviceId(): Promise<EncryptedData> {
    // Implement encrypted device ID retrieval from storage
    throw new Error('Not implemented');
  }
}
