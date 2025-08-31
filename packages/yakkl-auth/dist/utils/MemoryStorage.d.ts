/**
 * In-memory storage implementation
 * Used as default storage when no persistent storage is provided
 */
import type { AuthStorage } from '../types';
export declare class MemoryStorage implements AuthStorage {
    private store;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
}
