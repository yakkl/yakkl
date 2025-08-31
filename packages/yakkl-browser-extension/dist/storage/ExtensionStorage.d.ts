/**
 * Browser Extension Storage
 * Abstraction for browser.storage API with type safety
 */
export type StorageArea = 'local' | 'sync' | 'managed' | 'session';
export interface StorageOptions {
    area?: StorageArea;
    encrypt?: boolean;
    prefix?: string;
}
export interface StorageChange<T = any> {
    oldValue?: T;
    newValue?: T;
}
export type StorageChangeHandler<T = any> = (changes: Record<string, StorageChange<T>>, areaName: StorageArea) => void;
/**
 * Type-safe browser extension storage
 */
export declare class ExtensionStorage<T extends Record<string, any> = Record<string, any>> {
    private area;
    private prefix;
    private encrypt;
    constructor(options?: StorageOptions);
    /**
     * Get item from storage
     */
    get<K extends keyof T>(key: K): Promise<T[K] | undefined>;
    /**
     * Get multiple items from storage
     */
    getMultiple<K extends keyof T>(keys: K[]): Promise<Partial<T>>;
    /**
     * Get all items from storage
     */
    getAll(): Promise<T>;
    /**
     * Set item in storage
     */
    set<K extends keyof T>(key: K, value: T[K]): Promise<void>;
    /**
     * Set multiple items in storage
     */
    setMultiple(items: Partial<T>): Promise<void>;
    /**
     * Remove item from storage
     */
    remove<K extends keyof T>(key: K): Promise<void>;
    /**
     * Remove multiple items from storage
     */
    removeMultiple<K extends keyof T>(keys: K[]): Promise<void>;
    /**
     * Clear all items from storage
     */
    clear(): Promise<void>;
    /**
     * Get storage usage
     */
    getUsage(): Promise<number>;
    /**
     * Watch for storage changes
     */
    watch<K extends keyof T>(keys: K | K[], handler: StorageChangeHandler<T[K]>): () => void;
    /**
     * Get full storage key with prefix
     */
    private getFullKey;
    /**
     * Get storage area
     */
    private getStorageArea;
    /**
     * Encrypt value (placeholder - implement with @yakkl/security)
     */
    private encryptValue;
    /**
     * Decrypt value (placeholder - implement with @yakkl/security)
     */
    private decryptValue;
    /**
     * Get browser API
     */
    private getBrowser;
}
/**
 * Create typed storage instance
 */
export declare function createExtensionStorage<T extends Record<string, any>>(options?: StorageOptions): ExtensionStorage<T>;
