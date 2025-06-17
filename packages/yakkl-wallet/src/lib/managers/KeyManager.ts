import { log } from '$lib/managers/Logger';
import browser from 'webextension-polyfill';
import { subtle } from 'crypto';
import { detectExecutionContext } from '$lib/common/utils';
import type { Manifest } from 'webextension-polyfill';
import keyConfig from '../../config/keys.json';
import { initializeStorageDefaults } from '$lib/common/backgroundUtils';
import { isBackgroundContext } from '$lib/common/contextCheck';

// Extend the WebExtension manifest type to include environment
interface ExtendedManifest extends Manifest.WebExtensionManifest {
  environment?: Record<string, string>;
}

// Add chrome type definition
declare const chrome: {
  extension?: {
    getBackgroundPage?: () => typeof globalThis | undefined;
  };
};

// Define key categories
export type KeyCategory = 'blockchain' | 'ai' | 'security';

// Constants for encryption
const INSTALLATION_SALT_PREFIX = 'yakkl_v2_';
const KEY_DERIVATION_ITERATIONS = 600000; // Industry standard minimum for PBKDF2
const MAX_DECRYPTION_ATTEMPTS = 5;
const DECRYPTION_COOLDOWN_MS = 30000; // 30 seconds
const KEY_ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Define message interfaces
interface KeyRequest {
  type: 'getKey';
  keyName: string;
}

interface KeyResponse {
  value?: string;
  error?: string;
}

// Define the key configuration interface
interface KeyConfig {
  name: string;
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

interface StoredKey {
  value: string;
  category: KeyCategory;
  createdAt: number;
  lastRotated: number;
}

interface SecureStorage {
  secureKeys: Record<string, StoredKey>;
}

/**
 * KeyManager - Simple secure key management system
 * Only accessible from background context
 */
export class KeyManager {
  private static instance: KeyManager | null = null;
  private static isInitializing = false;
  private initialized = false;
  private keys: Map<string, string> = new Map();
  private keyConfigs: KeyConfig[] = [];

  private constructor() {
    // Initialize with empty key map
    if (!isBackgroundContext()) {
      log.error('KeyManager attempted to run outside background context');
      throw new Error('KeyManager is restricted to background context only');
    }
  }

  /**
   * Get the singleton instance of KeyManager
   */
  public static async getInstance(): Promise<KeyManager> {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }

    // If not initialized and not currently initializing, initialize
    if (!KeyManager.instance.initialized && !KeyManager.isInitializing) {
      try {
        KeyManager.isInitializing = true;
        await KeyManager.instance.initialize();
        log.debug('KeyManager initialization completed');
      } finally {
        KeyManager.isInitializing = false;
      }
    } else if (KeyManager.isInitializing) {
      // Wait for initialization to complete
      while (!KeyManager.instance.initialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return KeyManager.instance;
  }

  /**
   * Register a new key configuration
   */
  public registerKey(name: string, category: KeyCategory, isRequired = false, envKey?: string): void {
    const config: KeyConfig = {
      name,
      category,
      isRequired,
      envKey: envKey || name
    };
    this.keyConfigs.push(config);
  }

  /**
   * Initialize default key configurations
   */
  private initializeDefaultConfigs(): void {
    // Blockchain provider keys
    this.registerKey('ALCHEMY_API_KEY_PROD', 'blockchain', false);
    this.registerKey('ALCHEMY_API_KEY_DEV', 'blockchain', false);
    this.registerKey('BLOCKNATIVE_API_KEY', 'blockchain', false);
    this.registerKey('INFURA_API_KEY', 'blockchain', false);

    // AI provider keys
    this.registerKey('OPENAI_API_KEY', 'ai', false);
    this.registerKey('ANTHROPIC_API_KEY', 'ai', false);

    log.info('KeyManager initialized default configs');
  }

  /**
   * Initialize the key manager
   * Only works in background context
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      log.debug('KeyManager already initialized, skipping');
      return;
    }

    log.debug('KeyManager initialize called');

    try {
      // Check if we're in a background context using storage defaults
      // This is a reliable way to detect background context
      initializeStorageDefaults();
      log.debug('Background context confirmed via initializeStorageDefaults');

      // Register default key configurations
      this.initializeDefaultConfigs();

      // Load keys from environment variables
      await this.loadKeysFromEnvironment();

      // Set up message listener for other contexts
      this.setupMessageListener();

      this.initialized = true;
      log.debug('KeyManager initialization completed successfully');
    } catch (error: any) {
      log.error('Failed to initialize KeyManager', error);
      throw error;
    }
  }

  /**
   * Load keys from environment variables
   */
  private async loadKeysFromEnvironment(): Promise<void> {
    log.debug('Loading keys from environment');

    // Log all environment variables for debugging (only in dev)
    if (process.env.NODE_ENV !== 'production') {
      log.debug('Available process.env keys:', false, Object.keys(process.env || {}));

      // Check for Vite-style env variables
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        log.debug('Available import.meta.env keys:', false, Object.keys(import.meta.env || {}));
      }
    }

    // Load from environment variables
    for (const config of this.keyConfigs) {
      const envKey = config.envKey;
      let value: string | undefined;
      let source = '';

      // Try process.env (webpack DefinePlugin replaces these)
      if (typeof process !== 'undefined' && process.env) {
        // Try both regular and VITE_ prefixed versions
        value = process.env[envKey];
        if (value) source = `process.env.${envKey}`;

        if (!value) {
          value = process.env[`VITE_${envKey}`];
          if (value) source = `process.env.VITE_${envKey}`;
        }
      }

      // Try import.meta.env (Vite)
      if (!value && typeof import.meta !== 'undefined' && import.meta.env) {
        value = import.meta.env[envKey];
        if (value) source = `import.meta.env.${envKey}`;

        if (!value) {
          value = import.meta.env[`VITE_${envKey}`];
          if (value) source = `import.meta.env.VITE_${envKey}`;
        }
      }

      if (value && value !== 'undefined' && value !== '[object Object]') {
        log.info(`Found key ${config.name} from ${source}`);
        this.keys.set(config.name, value);
      } else {
        if (config.isRequired) {
          log.warn(`Required key ${config.name} not found in environment`);
        } else {
          log.debug(`Optional key ${config.name} not found in environment`);
        }
      }
    }

    // Remove the hardcoded key fallbacks - we don't want to inject fake values
    log.info(`Loaded ${this.keys.size} keys from environment`);

    // Add detailed key logging for debugging
    this.logKeyDetails();
  }

  /**
   * Set up message listener for other contexts to request keys
   */
  private setupMessageListener(): void {
    // Decide if we need to move this to the secureListener
    // TODO: Move this to the secureListener maybe or yakkl-security
    // browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse): any => {
    //   // Type guard for KeyRequest
    //   if (this.isKeyRequest(message)) {
    //     // Only respond to extension contexts for security
    //     if (!sender.id || sender.id !== browser.runtime.id) {
    //       log.warn('Rejected key request from unknown sender', false, sender.id);
    //       return sendResponse({ error: 'Unauthorized sender' });
    //     }

    //     return this.handleKeyRequest(message.keyName);
    //   }
    //   return false; // Let other listeners handle other message types
    // });

    log.debug('KeyManager message listener set up');
  }

  /**
   * Type guard for KeyRequest
   */
  private isKeyRequest(message: unknown): message is KeyRequest {
    return (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'getKey' &&
      'keyName' in message &&
      typeof message.keyName === 'string'
    );
  }

  /**
   * Handle key request from other contexts
   */
  private handleKeyRequest(keyName: string): Promise<KeyResponse> {
    if (!this.initialized) {
      return Promise.resolve({ error: 'KeyManager not initialized' });
    }

    const value = this.keys.get(keyName);
    if (!value) {
      log.warn(`Key requested but not found: ${keyName}`);
      return Promise.resolve({ error: 'Key not found' });
    }

    log.debug(`Providing key: ${keyName}`);
    return Promise.resolve({ value });
  }

  /**
   * Get a key value (only available in background context)
   */
  public getKey(name: string): string | undefined {
    if (!this.initialized) {
      log.error('KeyManager not initialized');
      return '';  // Return empty string instead of undefined
    }

    // We trust that initialize() was called in background context
    const value = this.keys.get(name);

    // If the key doesn't exist, return an empty string instead of undefined
    // This allows the code to continue running even without the actual keys
    if (!value) {
      log.warn(`Key requested but not found: ${name}, returning empty string as fallback`);
      return '';
    }

    return value;
  }

  /**
   * Get a safe overview of all registered keys and their status
   * Does not expose actual key values
   */
  public getKeyStatus(): Array<{
    name: string;
    category: KeyCategory;
    isRequired: boolean;
    isPresent: boolean;
  }> {
    if (!this.initialized) {
      throw new Error('KeyManager not initialized');
    }

    return this.keyConfigs.map(config => ({
      name: config.name,
      category: config.category,
      isRequired: config.isRequired,
      isPresent: this.keys.has(config.name)
    }));
  }

  /**
   * Force initialize in background context (only for emergency use)
   * Bypasses the background context check
   * @private
   */
  _forceInitializeInBackground(): void {
    if (this.initialized) {
      log.debug('KeyManager already initialized');
      return;
    }

    log.warn('Forcing KeyManager initialization in background - only use in emergency');

    try {
      // Register default key configurations
      this.initializeDefaultConfigs();

      // Set up message listener for other contexts
      this.setupMessageListener();

      this.initialized = true;
      log.info('KeyManager force initialized successfully');
    } catch (error: any) {
      log.error('Failed to force initialize KeyManager', false, error);
      throw error;
    }
  }

  /**
   * Determine if we're in a development environment
   * This method checks multiple possible indicators since NODE_ENV might be inconsistent
   */
  private isDevelopmentEnvironment(): boolean {
    // Check multiple possible indicators for development mode
    return (
      // Standard NODE_ENV check
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') ||
      // Vite-specific development indicator
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === true) ||
      // Check for DEV_MODE flag that might be set in your build process
      (typeof process !== 'undefined' && process.env && process.env.DEV_MODE === 'true')
    );
  }

  /**
   * Log key details for testing/debugging purposes
   * DO NOT use in production - only for development testing!
   */
  private logKeyDetails(): void {
    if (!this.isDevelopmentEnvironment()) {
      log.info('Key details logging disabled in production');
      return;
    }

    log.info('===== API KEY DETAILS (DEV ONLY) =====');

    // First log a simple table-like output that's easy to read
    for (const config of this.keyConfigs) {
      const value = this.keys.get(config.name);
      if (value) {
        // Log each key separately with its raw value
        log.info(`API KEY: ${config.name} = "${value}"`);
      } else {
        log.warn(`API KEY: ${config.name} = NOT FOUND`);
      }
    }

    // Then log detailed object with all properties as a fallback
    log.info('--- DETAILED KEY INFO ---');
    const keyDetails: Record<string, any> = {};
    for (const config of this.keyConfigs) {
      const value = this.keys.get(config.name);
      keyDetails[config.name] = {
        value: value || 'NOT FOUND',
        category: config.category,
        required: config.isRequired,
        found: !!value
      };
    }
    log.info('Key details object:', false, keyDetails);

    // Also log the keys map directly
    log.info('--- KEYS MAP ENTRIES ---');
    const keysObject: Record<string, string> = {};
    this.keys.forEach((value, key) => {
      keysObject[key] = value;
    });
    log.info('Raw key values:', false, keysObject);

    log.info('======================================');
  }

  /**
   * Public method to trigger key logging (for background context testing only)
   * This should ONLY be called in development/debugging
   */
  public debugLogKeys(): void {
    if (!this.initialized) {
      log.error('KeyManager not initialized');
      return;
    }

    this.logKeyDetails();
  }

  /**
   * Directly set a key for development/testing
   * DO NOT use in production
   */
  public setDevelopmentKey(name: string, value: string): void {
    if (!this.isDevelopmentEnvironment()) {
      log.error('setDevelopmentKey is not allowed in production');
      return;
    }

    log.info(`Setting development key: ${name}`);
    this.keys.set(name, value);
  }

  /**
   * Get all keys as an object for debugging
   * DO NOT use in production
   */
  public getAllKeys(): Record<string, string> | undefined {
    if (!this.isDevelopmentEnvironment()) {
      log.error('getAllKeys is not allowed in production');
      return undefined;
    }

    if (!this.initialized) {
      log.error('KeyManager not initialized');
      return undefined;
    }

    const result: Record<string, string> = {};
    this.keys.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

// Export a singleton instance
export const keyManager = KeyManager.getInstance();

