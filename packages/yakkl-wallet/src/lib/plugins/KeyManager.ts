import { log } from './Logger';
import browser from 'webextension-polyfill';
import { subtle } from 'crypto';

// Types for different key categories
type KeyCategory = 'blockchain' | 'ai' | 'analytics' | 'other';

// Constants for encryption
const INSTALLATION_SALT_PREFIX = 'yakkl_v2_';
const KEY_DERIVATION_ITERATIONS = 600000; // Industry standard minimum for PBKDF2
const MAX_DECRYPTION_ATTEMPTS = 5;
const DECRYPTION_COOLDOWN_MS = 30000; // 30 seconds
const KEY_ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface KeyConfig {
  name: string;
  hashedName?: string;
  category: KeyCategory;
  isRequired: boolean;
  envKey: string;
}

interface EncryptedData {
  data: string;       // Base64 encoded encrypted data
  iv: string;         // Base64 encoded IV
  salt: string;       // Base64 encoded salt
  version: number;    // Encryption version
  timestamp: number;  // Encryption timestamp
  hmac: string;      // HMAC for tamper detection
}

interface StoredKey extends EncryptedData {
  category: KeyCategory;
  rotationDue: number;      // Timestamp when rotation is due
  decryptionAttempts: number; // Count of failed decryption attempts
  lastAttemptTime: number;    // Timestamp of last decryption attempt
}

export class KeyManager {
  private static instance: KeyManager;
  private keys: Map<string, StoredKey>;
  private initialized: boolean;
  private encryptionKey: CryptoKey | null = null;
  private hmacKey: CryptoKey | null = null;
  private keyNameMap: Map<string, string> = new Map();
  private decryptionAttempts: Map<string, { count: number, lastAttempt: number }> = new Map();

  // Update keyConfigs to use a method that will hash the names
  private readonly keyConfigs: KeyConfig[] = [
    { name: 'ALCHEMY_API_KEY_PROD', category: 'blockchain', isRequired: true, envKey: 'ALCHEMY_API_KEY_PROD' },
    { name: 'ALCHEMY_API_KEY_DEV', category: 'blockchain', isRequired: false, envKey: 'ALCHEMY_API_KEY_DEV' },
    { name: 'BLOCKNATIVE_API_KEY', category: 'blockchain', isRequired: true, envKey: 'BLOCKNATIVE_API_KEY' },
    { name: 'INFURA_API_KEY', category: 'blockchain', isRequired: true, envKey: 'INFURA_API_KEY' },
    { name: 'OPENAI_API_KEY', category: 'ai', isRequired: false, envKey: 'OPENAI_API_KEY' },
    { name: 'ANTHROPIC_API_KEY', category: 'ai', isRequired: false, envKey: 'ANTHROPIC_API_KEY' }
  ];

  private constructor() {
    this.keys = new Map();
    this.initialized = false;
  }

  public static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  private async hashKeyName(name: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(INSTALLATION_SALT_PREFIX + name);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hash).toString('base64').replace(/[/+=]/g, '_');
  }

  private async initializeKeyHashes(): Promise<void> {
    for (const config of this.keyConfigs) {
      const hashedName = await this.hashKeyName(config.name);
      config.hashedName = hashedName;
      this.keyNameMap.set(hashedName, config.name);
    }
  }

  /**
   * Initialize the key manager and load keys from storage/environment
   * This should only be called from the background script
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if we're in a background context
      if (!browser.runtime?.getBackgroundPage) {
        throw new Error('KeyManager can only be initialized in background context');
      }

      await this.initializeKeyHashes();
      await this.loadKeysFromStorage();
      await this.loadKeysFromEnvironment();

      this.initialized = true;
      log.info('KeyManager initialized successfully');
    } catch (error) {
      log.error('Failed to initialize KeyManager', false, error);
      throw error;
    }
  }

  /**
   * Get a key by name. This should only be called from background context or trusted internal code.
   */
  public async getKey(name: string): Promise<string | null> {
    try {
      if (!this.isBackgroundContext()) {
        throw new Error('Keys can only be accessed from background context');
      }

      const hashedName = await this.hashKeyName(name);
      const storedKey = this.keys.get(hashedName);
      if (!storedKey) return null;

      // Check rate limiting
      const attempts = this.decryptionAttempts.get(hashedName) || { count: 0, lastAttempt: 0 };
      if (attempts.count >= MAX_DECRYPTION_ATTEMPTS) {
        const cooldownRemaining = DECRYPTION_COOLDOWN_MS - (Date.now() - attempts.lastAttempt);
        if (cooldownRemaining > 0) {
          throw new Error(`Too many decryption attempts. Try again in ${Math.ceil(cooldownRemaining / 1000)} seconds`);
        }
        // Reset after cooldown
        attempts.count = 0;
      }

      try {
        const value = await this.decrypt(storedKey);

        // Reset attempts on success
        this.decryptionAttempts.set(hashedName, { count: 0, lastAttempt: Date.now() });

        // Check if key rotation is needed
        if (await this.shouldRotateKey(storedKey)) {
          await this.rotateKey(name, storedKey);
        }

        return value;
      } catch (error) {
        // Increment failed attempts
        attempts.count++;
        attempts.lastAttempt = Date.now();
        this.decryptionAttempts.set(hashedName, attempts);
        throw error;
      }
    } catch (error) {
      log.error(`Error getting key: ${name}`, false, error);
      return null;
    }
  }

  /**
   * Check if all required keys are available
   */
  public async validateRequiredKeys(): Promise<boolean> {
    try {
      const requiredConfigs = this.keyConfigs.filter(config => config.isRequired);
      for (const config of requiredConfigs) {
        const key = await this.getKey(config.name);
        if (!key) {
          log.error(`Required key missing: ${config.name}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      log.error('Error validating required keys', false, error);
      return false;
    }
  }

  private async loadKeysFromStorage(): Promise<void> {
    try {
      const result = await browser.storage.local.get('secureKeys');
      const storedKeys = result.secureKeys || {};

      for (const [name, stored] of Object.entries(storedKeys)) {
        const storedKey = stored as StoredKey;
        this.keys.set(name, storedKey);
      }
    } catch (error) {
      log.error('Error loading keys from storage', false, error);
    }
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey;

    // Use stable identifiers that don't change with version updates
    const extensionId = browser.runtime.id;
    const browserInfo = await browser.runtime.getBrowserInfo?.() || { name: 'unknown', version: '0' };

    // Create a stable unique identifier using extension-specific data
    const uniqueData = JSON.stringify({
      id: extensionId,
      browser: browserInfo.name,  // Only use browser name, not version
      origin: window.location.origin,
      // Add a static salt that's unique to this version of the key manager
      // If we need to change the encryption method in the future, we can update this salt
      keyManagerVersion: 'v1.0'
    });

    // Create key material with stable entropy sources
    const keyMaterial = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(uniqueData)
    );

    // Derive a key using PBKDF2 with a high iteration count
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Use PBKDF2 with a high iteration count
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(INSTALLATION_SALT_PREFIX),
        iterations: 310000, // Increased iterations for better security
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this.encryptionKey;
  }

  private async encryptValue(value: string): Promise<{ encryptedValue: string; iv: string }> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(value);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return {
      encryptedValue: Buffer.from(encryptedBuffer).toString('base64'),
      iv: Buffer.from(iv).toString('base64')
    };
  }

  private async decryptValue(encryptedValue: string, iv: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(iv, 'base64') },
      key,
      Buffer.from(encryptedValue, 'base64')
    );

    return new TextDecoder().decode(decrypted);
  }

  private async persistKeyToStorage(name: string, value: string, category: KeyCategory): Promise<void> {
    try {
      const hashedName = await this.hashKeyName(name);
      const encryptedData = await this.encrypt(value);

      const storedKey: StoredKey = {
        ...encryptedData,
        category,
        rotationDue: Date.now() + KEY_ROTATION_INTERVAL_MS,
        decryptionAttempts: 0,
        lastAttemptTime: 0
      };

      this.keys.set(hashedName, storedKey);

      const result = await browser.storage.local.get('secureKeys') as { secureKeys?: Record<string, StoredKey> };
      const secureKeys: Record<string, StoredKey> = result.secureKeys || {};
      secureKeys[hashedName] = storedKey;
      await browser.storage.local.set({ secureKeys });
    } catch (error) {
      log.error(`Error persisting key to storage: ${name}`, false, error);
    }
  }

  private async loadKeysFromEnvironment(): Promise<void> {
    try {
      for (const config of this.keyConfigs) {
        // Skip if key already exists in storage
        if (this.keys.has(config.name)) {
          continue;
        }

        // Try to get from environment (both with and without VITE_ prefix)
        const envValue = process.env[`VITE_${config.envKey}`] || process.env[config.envKey];
        if (envValue) {
          await this.persistKeyToStorage(config.name, envValue, config.category);
        } else if (config.isRequired) {
          log.error(`Required key not found: ${config.name}`);
        }
      }
    } catch (error) {
      log.error('Error loading keys from environment', false, error);
    }
  }

  private isBackgroundContext(): boolean {
    return typeof browser.runtime?.getBackgroundPage !== 'undefined';
  }

  /**
   * Clear all stored keys - should only be used during development/testing
   */
  public async clearAllKeys(): Promise<void> {
    if (!this.isBackgroundContext()) {
      throw new Error('Keys can only be cleared from background context');
    }

    try {
      this.keys.clear();
      await browser.storage.local.remove('secureKeys');
      log.info('All keys cleared successfully');
    } catch (error) {
      log.error('Error clearing keys', false, error);
    }
  }

  private async deriveKeys(): Promise<{ encryptionKey: CryptoKey, hmacKey: CryptoKey }> {
    if (this.encryptionKey && this.hmacKey) {
      return { encryptionKey: this.encryptionKey, hmacKey: this.hmacKey };
    }

    // Generate a unique salt for this installation
    const installationSalt = await this.getInstallationSalt();

    // Combine multiple entropy sources
    const entropy = await this.gatherEntropy();

    // Derive the master key using Argon2id (if available) or PBKDF2
    const masterKey = await this.deriveMasterKey(entropy, installationSalt);

    // Split the master key into encryption and HMAC keys
    const derivedKeys = await this.splitMasterKey(masterKey);

    this.encryptionKey = derivedKeys.encryptionKey;
    this.hmacKey = derivedKeys.hmacKey;

    return derivedKeys;
  }

  private async gatherEntropy(): Promise<Uint8Array> {
    // Gather entropy from multiple sources
    const sources = [
      browser.runtime.id,
      window.location.origin,
      navigator.userAgent,
      new Date().getTime().toString(),
      crypto.getRandomValues(new Uint8Array(32))
    ];

    // Combine and hash all sources
    const combined = new TextEncoder().encode(sources.join(''));
    const entropyHash = await crypto.subtle.digest('SHA-512', combined);
    return new Uint8Array(entropyHash);
  }

  private async getInstallationSalt(): Promise<Uint8Array> {
    // Check if we have a stored installation salt
    const stored = await browser.storage.local.get('installationSalt');
    if (stored.installationSalt) {
      return Buffer.from(stored.installationSalt as string, 'base64');
    }

    // Generate new installation salt
    const salt = crypto.getRandomValues(new Uint8Array(32));
    await browser.storage.local.set({
      installationSalt: Buffer.from(salt).toString('base64')
    });
    return salt;
  }

  private async deriveMasterKey(entropy: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
    // Import entropy as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      entropy,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive the master key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: KEY_DERIVATION_ITERATIONS,
        hash: 'SHA-512'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true, // extractable for splitting
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  private async splitMasterKey(masterKey: CryptoKey): Promise<{ encryptionKey: CryptoKey, hmacKey: CryptoKey }> {
    const masterKeyBytes = await crypto.subtle.exportKey('raw', masterKey);
    const masterKeyHash = await crypto.subtle.digest('SHA-512', masterKeyBytes);

    // Split the hash into two parts
    const encKeyMaterial = masterKeyHash.slice(0, 32);
    const hmacKeyMaterial = masterKeyHash.slice(32);

    // Create the encryption key
    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      encKeyMaterial,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );

    // Create the HMAC key
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      hmacKeyMaterial,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign', 'verify']
    );

    return { encryptionKey, hmacKey };
  }

  private async encrypt(value: string): Promise<EncryptedData> {
    const { encryptionKey, hmacKey } = await this.deriveKeys();

    // Generate a unique salt and IV for this encryption
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encoded = new TextEncoder().encode(value);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      encoded
    );

    const encryptedData: EncryptedData = {
      data: Buffer.from(encrypted).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      salt: Buffer.from(salt).toString('base64'),
      version: 1,
      timestamp: Date.now(),
      hmac: '' // Will be set below
    };

    // Calculate HMAC over all fields
    const hmacData = await this.calculateHMAC(encryptedData, hmacKey);
    encryptedData.hmac = Buffer.from(hmacData).toString('base64');

    return encryptedData;
  }

  private async decrypt(encryptedData: EncryptedData): Promise<string> {
    // Verify HMAC first
    const { hmacKey } = await this.deriveKeys();
    const isValid = await this.verifyHMAC(encryptedData, hmacKey);
    if (!isValid) {
      throw new Error('Data tampering detected');
    }

    const { encryptionKey } = await this.deriveKeys();

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: Buffer.from(encryptedData.iv, 'base64')
        },
        encryptionKey,
        Buffer.from(encryptedData.data, 'base64')
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  private async calculateHMAC(data: EncryptedData, hmacKey: CryptoKey): Promise<ArrayBuffer> {
    // Create a string of all fields except hmac
    const { hmac, ...fields } = data;
    const hmacData = JSON.stringify(fields);

    return await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      new TextEncoder().encode(hmacData)
    );
  }

  private async verifyHMAC(data: EncryptedData, hmacKey: CryptoKey): Promise<boolean> {
    const storedHMAC = Buffer.from(data.hmac, 'base64');
    const calculatedHMAC = await this.calculateHMAC(data, hmacKey);

    // Constant-time comparison of the ArrayBuffers
    return this.constantTimeEqual(
      new Uint8Array(storedHMAC),
      new Uint8Array(calculatedHMAC)
    );
  }

  private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }

  private async shouldRotateKey(storedKey: StoredKey): Promise<boolean> {
    return Date.now() >= storedKey.rotationDue;
  }

  private async rotateKey(name: string, storedKey: StoredKey): Promise<void> {
    try {
      // Decrypt the current value
      const currentValue = await this.decrypt(storedKey);

      // Re-encrypt with new salt and IV
      await this.persistKeyToStorage(name, currentValue, storedKey.category);

      log.info(`Rotated encryption for key: ${name}`);
    } catch (error) {
      log.error(`Failed to rotate key: ${name}`, false, error);
    }
  }
}

// Export a singleton instance
export const keyManager = KeyManager.getInstance();
