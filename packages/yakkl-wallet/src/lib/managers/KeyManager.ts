import { log } from '$lib/managers/Logger';
import type { Manifest } from 'webextension-polyfill';
import { initializeStorageDefaults } from '$lib/common/backgroundUtils';
import { API_KEYS, getApiKey } from '$lib/config/api-keys.config';

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
const INSTALLATION_SALT_PREFIX = 'yakkl_';
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
	data: string; // Base64 encoded encrypted data
	iv: string; // Base64 encoded IV
	salt: string; // Base64 encoded salt
	version: number; // Encryption version
	timestamp: number; // Encryption timestamp
	hmac: string; // HMAC for tamper detection
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
		// if (!isBackgroundContext()) {
		// 	log.error('KeyManager attempted to run outside background context');
		// 	throw new Error('KeyManager is restricted to background context only');
		// }
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
			} finally {
				KeyManager.isInitializing = false;
			}
		} else if (KeyManager.isInitializing) {
			// Wait for initialization to complete
			while (!KeyManager.instance.initialized) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		return KeyManager.instance;
	}

	/**
	 * Register a new key configuration
	 */
	public registerKey(
		name: string,
		category: KeyCategory,
		isRequired = false,
		envKey?: string
	): void {
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
		this.registerKey('ALCHEMY_API_KEY_PROD_1', 'blockchain', false);
		this.registerKey('ALCHEMY_API_KEY_DEV', 'blockchain', false);
		this.registerKey('BLOCKNATIVE_API_KEY', 'blockchain', false);
		this.registerKey('INFURA_API_KEY', 'blockchain', false);

		// AI provider keys
		this.registerKey('OPENAI_API_KEY', 'ai', false);
		this.registerKey('ANTHROPIC_API_KEY', 'ai', false);
	}

	/**
	 * Initialize the key manager
	 * Only works in background context
	 */
	public async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Check if we're in a background context using storage defaults
			// This is a reliable way to detect background context
			initializeStorageDefaults();
			// Register default key configurations
			this.initializeDefaultConfigs();

			// Load keys from environment variables
			await this.loadKeysFromEnvironment();

			// Set up message listener for other contexts
			this.setupMessageListener();

			this.initialized = true;
		} catch (error: any) {
			log.error('Failed to initialize KeyManager', false, error);
			throw error;
		}
	}

	/**
	 * Load keys from environment variables
	 */
	private async loadKeysFromEnvironment(): Promise<void> {
		// First try to load from the api-keys.config module
		// This uses webpack DefinePlugin to inject values at build time
		try {
			// Load keys directly from the API_KEYS object
			for (const config of this.keyConfigs) {
				let value: string | undefined;
				let source = '';

				// Try to get the key from api-keys.config
				value = getApiKey(config.name) || getApiKey(config.envKey);

				// Special handling for Alchemy keys
				if (!value && config.name.includes('ALCHEMY')) {
					// Try different Alchemy key patterns from the config
					if (API_KEYS.ALCHEMY_API_KEY_ETHEREUM) {
						value = API_KEYS.ALCHEMY_API_KEY_ETHEREUM;
						source = 'api-keys.config.ALCHEMY_API_KEY_ETHEREUM';
					} else if (API_KEYS.ALCHEMY_API_KEY_PROD_1) {
						value = API_KEYS.ALCHEMY_API_KEY_PROD_1;
						source = 'api-keys.config.ALCHEMY_API_KEY_PROD_1';
					} else if (API_KEYS.ALCHEMY_API_KEY_PROD_2) {
						value = API_KEYS.ALCHEMY_API_KEY_PROD_2;
						source = 'api-keys.config.ALCHEMY_API_KEY_PROD_2';
					} else if (API_KEYS.ALCHEMY_API_KEY_DEV) {
						value = API_KEYS.ALCHEMY_API_KEY_DEV;
						source = 'api-keys.config.ALCHEMY_API_KEY_DEV';
					}
				} else if (!value && config.name.includes('INFURA')) {
					// Try Infura keys
					if (API_KEYS.INFURA_API_KEY_PROD) {
						value = API_KEYS.INFURA_API_KEY_PROD;
						source = 'api-keys.config.INFURA_API_KEY_PROD';
					} else if (API_KEYS.INFURA_API_KEY_DEV) {
						value = API_KEYS.INFURA_API_KEY_DEV;
						source = 'api-keys.config.INFURA_API_KEY_DEV';
					}
				} else if (!value && config.name.includes('BLOCKNATIVE')) {
					if (API_KEYS.BLOCKNATIVE_API_KEY) {
						value = API_KEYS.BLOCKNATIVE_API_KEY;
						source = 'api-keys.config.BLOCKNATIVE_API_KEY';
					}
				} else if (!value && config.name.includes('OPENAI')) {
					if (API_KEYS.OPENAI_API_KEY) {
						value = API_KEYS.OPENAI_API_KEY;
						source = 'api-keys.config.OPENAI_API_KEY';
					}
				} else if (!value && config.name.includes('ANTHROPIC')) {
					if (API_KEYS.ANTHROPIC_API_KEY) {
						value = API_KEYS.ANTHROPIC_API_KEY;
						source = 'api-keys.config.ANTHROPIC_API_KEY';
					}
				} else if (!source && value) {
					source = `api-keys.config.${config.name}`;
				}


				if (value && value !== 'undefined' && value !== '[object Object]' && value !== '') {
					this.keys.set(config.name, value);
					if (process.env.NODE_ENV !== 'production' && source) {
						log.debug(`Loaded key ${config.name} from ${source}`);
					}
				} else {
					if (config.isRequired) {
						log.warn(`Required key ${config.name} not found`);
					} else {
						log.debug(`Optional key ${config.name} not found`);
					}
				}
			}

			// Add detailed key logging for debugging
			this.logKeyDetails();
		} catch (error) {
			log.error('Failed to load keys from api-keys.config', false, error);
		}
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

		return Promise.resolve({ value });
	}

	/**
	 * Get a key value (only available in background context)
	 */
	public getKey(name: string): string | undefined {
		if (!this.initialized) {
			return ''; // Return empty string instead of undefined
		}

		// We trust that initialize() was called in background context
		const value = this.keys.get(name);

		// If the key doesn't exist, return an empty string instead of undefined
		// This allows the code to continue running even without the actual keys
		if (!value) {
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

		return this.keyConfigs.map((config) => ({
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
			return;
		}

		try {
			// Register default key configurations
			this.initializeDefaultConfigs();

			// Set up message listener for other contexts
			this.setupMessageListener();

			this.initialized = true;
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
			return;
		}
		this.keys.set(name, value);
	}

	/**
	 * Get all keys as an object for debugging
	 * DO NOT use in production
	 */
	public getAllKeys(): Record<string, string> | undefined {
		if (!this.isDevelopmentEnvironment()) {
			return undefined;
		}

		if (!this.initialized) {
			return undefined;
		}

		const result: Record<string, string> = {};
		this.keys.forEach((value, key) => {
			result[key] = value;
		});
		return result;
	}
}

// Export a function to get the singleton instance
export const getKeyManager = () => KeyManager.getInstance();
