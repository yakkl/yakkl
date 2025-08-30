/**
 * Chrome Storage Provider
 * Browser extension storage implementation (chrome.storage.local and chrome.storage.sync)
 */
import { BaseStorageProvider } from './BaseStorageProvider';
import type { StorageOptions, IStorageProvider, StorageCapabilities, IStorage } from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';
export declare class ChromeStorageProvider extends BaseStorageProvider {
    private storage;
    private namespace;
    private isSync;
    constructor(options?: StorageOptions & {
        sync?: boolean;
    });
    private getKey;
    private isOurKey;
    private extractKey;
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    getKeys(): Promise<string[]>;
    getInfo(): Promise<{
        bytesInUse?: number;
        quota?: number;
        usage?: number;
    }>;
}
export declare class ChromeLocalStorageProviderFactory implements IStorageProvider {
    readonly type: StorageType;
    createStorage(options?: StorageOptions): IStorage;
    isAvailable(): boolean;
    getCapabilities(): StorageCapabilities;
}
export declare class ChromeSyncStorageProviderFactory implements IStorageProvider {
    readonly type: StorageType;
    createStorage(options?: StorageOptions): IStorage;
    isAvailable(): boolean;
    getCapabilities(): StorageCapabilities;
}
//# sourceMappingURL=ChromeStorageProvider.d.ts.map