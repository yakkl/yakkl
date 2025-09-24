import { ChainType } from '../interfaces/provider.interface';
import type { IKeyManager } from '../interfaces/keys.interface';

class NullKeyManager implements IKeyManager {
  async createRandomAccount(): Promise<any> { throw new Error('KeyManager not registered for this chain'); }
  async importFromMnemonic(): Promise<any> { throw new Error('KeyManager not registered for this chain'); }
  async importFromPrivateKey(): Promise<any> { throw new Error('KeyManager not registered for this chain'); }
  async importFromSeed(): Promise<any> { throw new Error('KeyManager not registered for this chain'); }
  async deriveAccount(): Promise<any> { throw new Error('KeyManager not registered for this chain'); }
}

export class KeyManagerRegistry {
  private static instance: KeyManagerRegistry;
  private managers = new Map<ChainType, IKeyManager>();
  private fallback = new NullKeyManager();

  static getInstance(): KeyManagerRegistry {
    if (!this.instance) this.instance = new KeyManagerRegistry();
    return this.instance;
  }

  register(chainType: ChainType, manager: IKeyManager): void {
    this.managers.set(chainType, manager);
  }

  get(chainType: ChainType): IKeyManager {
    return this.managers.get(chainType) ?? this.fallback;
  }

  clear(): void {
    this.managers.clear();
  }
}

export const keyManagers = KeyManagerRegistry.getInstance();

