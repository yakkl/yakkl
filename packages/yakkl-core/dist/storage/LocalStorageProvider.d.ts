/**
 * LocalStorage Provider
 * Browser localStorage implementation
 */
import { BaseStorageProvider } from './BaseStorageProvider';
import type { StorageOptions, IStorageProvider, StorageCapabilities, IStorage } from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';
export declare class LocalStorageProvider extends BaseStorageProvider {
    private namespace;
    constructor(options?: StorageOptions);
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
export declare class LocalStorageProviderFactory implements IStorageProvider {
    readonly type: StorageType;
    createStorage(options?: StorageOptions): IStorage;
    isAvailable(): boolean;
    getCapabilities(): StorageCapabilities;
}
//# sourceMappingURL=LocalStorageProvider.d.ts.map