/**
 * Memory Storage Provider
 * In-memory storage implementation for testing and temporary storage
 */
import { BaseStorageProvider } from './BaseStorageProvider';
import type { StorageOptions, IStorageProvider, StorageCapabilities, IStorage } from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';
export declare class MemoryStorageProvider extends BaseStorageProvider {
    private store;
    private namespace;
    constructor(options?: StorageOptions);
    private getKey;
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
export declare class MemoryStorageProviderFactory implements IStorageProvider {
    readonly type: StorageType;
    createStorage(options?: StorageOptions): IStorage;
    isAvailable(): boolean;
    getCapabilities(): StorageCapabilities;
}
//# sourceMappingURL=MemoryStorageProvider.d.ts.map