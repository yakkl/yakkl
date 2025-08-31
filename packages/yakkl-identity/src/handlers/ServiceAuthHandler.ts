/**
 * Service Account Authentication Handler
 * For server-to-server, agents, MCP servers - no UI required
 */

import * as nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';
import { nanoid } from 'nanoid';
import type { Identity, AuthRequest, ServiceAccount } from '../types';

export class ServiceAuthHandler {
  private serviceAccounts: Map<string, ServiceAccount> = new Map();
  
  constructor(private manager: any) {}

  /**
   * Authenticate a service account
   */
  async authenticate(request: AuthRequest): Promise<Identity | null> {
    const { credentials } = request;
    
    if (!credentials?.accountId || !credentials?.signature) {
      throw new Error('Service account ID and signature required');
    }

    const account = await this.getServiceAccount(credentials.accountId);
    if (!account) {
      throw new Error('Service account not found');
    }

    // Verify signature
    const valid = await this.verifySignature(
      account,
      credentials.signature,
      credentials.nonce || Date.now().toString()
    );

    if (!valid) {
      throw new Error('Invalid signature');
    }

    // Update last used
    account.lastUsed = new Date();
    await this.updateServiceAccount(account);

    // Return identity
    return {
      id: account.id,
      method: 'service',
      publicKey: account.publicKey,
      tier: 'developer', // Service accounts get developer tier by default
      metadata: {
        name: account.name,
        context: 'service',
        parent: account.parentIdentity
      },
      createdAt: account.createdAt,
      updatedAt: new Date()
    };
  }

  /**
   * Create a new service account
   */
  async createServiceAccount(
    parentIdentity: Identity,
    config: {
      name: string;
      permissions?: string[];
      restrictions?: string[];
      ttl?: number;
      autoRenew?: boolean;
    }
  ): Promise<{
    account: ServiceAccount;
    privateKey: string;
    publicKey: string;
  }> {
    // Generate keypair
    const keypair = nacl.sign.keyPair();
    
    const account: ServiceAccount = {
      id: `svc_${nanoid()}`,
      parentIdentity: parentIdentity.id,
      name: config.name,
      publicKey: naclUtil.encodeBase64(keypair.publicKey),
      permissions: config.permissions || this.getDefaultPermissions(),
      restrictions: config.restrictions,
      autoRenew: config.autoRenew ?? true,
      ttl: config.ttl || 3600,
      createdAt: new Date()
    };

    // Store account
    await this.storeServiceAccount(account);

    // Return with private key (only time it's available)
    return {
      account,
      privateKey: naclUtil.encodeBase64(keypair.secretKey),
      publicKey: account.publicKey
    };
  }

  /**
   * Generate configuration for service account
   */
  generateConfig(account: ServiceAccount, privateKey: string): string {
    const config = {
      YAKKL_SERVICE_ACCOUNT_ID: account.id,
      YAKKL_SERVICE_ACCOUNT_KEY: privateKey,
      YAKKL_SERVICE_NAME: account.name,
      YAKKL_AUTH_ENDPOINT: process.env.YAKKL_AUTH_ENDPOINT || 'https://api.yakkl.com/auth'
    };

    return Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }

  /**
   * Authenticate with private key from environment or file
   */
  async authenticateFromKey(keySource: 'env' | 'file', path?: string): Promise<Identity | null> {
    let privateKey: string;
    let accountId: string;

    if (keySource === 'env') {
      privateKey = process.env.YAKKL_SERVICE_ACCOUNT_KEY || '';
      accountId = process.env.YAKKL_SERVICE_ACCOUNT_ID || '';
    } else {
      // Read from file
      const fs = await import('fs');
      const content = fs.readFileSync(path!, 'utf-8');
      const config = this.parseConfigFile(content);
      privateKey = config.key;
      accountId = config.id;
    }

    if (!privateKey || !accountId) {
      throw new Error('Service account credentials not found');
    }

    // Create signature
    const nonce = Date.now().toString();
    const message = `${accountId}:${nonce}`;
    const signature = this.signMessage(message, privateKey);

    // Authenticate
    return this.authenticate({
      context: 'service',
      method: 'service',
      credentials: {
        accountId,
        signature,
        nonce
      }
    });
  }

  /**
   * Rotate service account keys
   */
  async rotateKeys(accountId: string): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const account = await this.getServiceAccount(accountId);
    if (!account) {
      throw new Error('Service account not found');
    }

    // Generate new keypair
    const keypair = nacl.sign.keyPair();
    
    // Update account
    account.publicKey = naclUtil.encodeBase64(keypair.publicKey);
    await this.updateServiceAccount(account);

    return {
      publicKey: account.publicKey,
      privateKey: naclUtil.encodeBase64(keypair.secretKey)
    };
  }

  /**
   * Delete service account
   */
  async deleteServiceAccount(accountId: string): Promise<void> {
    this.serviceAccounts.delete(accountId);
    // In production, also delete from persistent storage
  }

  // Private helper methods

  private async verifySignature(
    account: ServiceAccount,
    signature: string,
    nonce: string
  ): Promise<boolean> {
    try {
      const message = `${account.id}:${nonce}`;
      const messageBytes = naclUtil.decodeUTF8(message);
      const signatureBytes = naclUtil.decodeBase64(signature);
      const publicKeyBytes = naclUtil.decodeBase64(account.publicKey);

      // Extract message from signed message (nacl.sign combines message + signature)
      const verified = nacl.sign.open(signatureBytes, publicKeyBytes);
      
      if (!verified) {
        return false;
      }

      // Check the message matches
      return naclUtil.encodeUTF8(verified) === message;
    } catch {
      return false;
    }
  }

  private signMessage(message: string, privateKey: string): string {
    const messageBytes = naclUtil.decodeUTF8(message);
    const secretKeyBytes = naclUtil.decodeBase64(privateKey);
    const signedMessage = nacl.sign(messageBytes, secretKeyBytes);
    return naclUtil.encodeBase64(signedMessage);
  }

  private async getServiceAccount(id: string): Promise<ServiceAccount | null> {
    // In production, fetch from persistent storage
    return this.serviceAccounts.get(id) || null;
  }

  private async storeServiceAccount(account: ServiceAccount): Promise<void> {
    // In production, store in persistent storage
    this.serviceAccounts.set(account.id, account);
  }

  private async updateServiceAccount(account: ServiceAccount): Promise<void> {
    // In production, update in persistent storage
    this.serviceAccounts.set(account.id, account);
  }

  private getDefaultPermissions(): string[] {
    return ['api.read', 'api.write', 'sdk.use'];
  }

  private parseConfigFile(content: string): { id: string; key: string } {
    const lines = content.split('\n');
    const config: any = {};
    
    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    }

    return {
      id: config.YAKKL_SERVICE_ACCOUNT_ID || '',
      key: config.YAKKL_SERVICE_ACCOUNT_KEY || ''
    };
  }
}