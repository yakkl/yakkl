/**
 * Secure storage with encryption
 */
import type { AuthStorage } from '../types';
export declare class SecureStorage implements AuthStorage {
    private prefix;
    private store;
    private encryptionKey?;
    constructor(prefix?: string);
    initialize(password?: string): Promise<void>;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    private encrypt;
    private decrypt;
}
