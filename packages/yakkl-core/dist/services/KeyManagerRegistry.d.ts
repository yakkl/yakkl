import { ChainType } from '../interfaces/provider.interface';
import type { IKeyManager } from '../interfaces/keys.interface';
export declare class KeyManagerRegistry {
    private static instance;
    private managers;
    private fallback;
    static getInstance(): KeyManagerRegistry;
    register(chainType: ChainType, manager: IKeyManager): void;
    get(chainType: ChainType): IKeyManager;
    clear(): void;
}
export declare const keyManagers: KeyManagerRegistry;
//# sourceMappingURL=KeyManagerRegistry.d.ts.map