import type { ISigner } from '../interfaces/signer.interface';
import { ChainType } from '../interfaces/provider.interface';

class NullSigner implements ISigner {
  chain(): ChainType { return ChainType.EVM; }
  async signMessage(): Promise<string> { throw new Error('Signer not registered for this chain'); }
}

export class SignerRegistry {
  private static instance: SignerRegistry;
  private signers = new Map<ChainType, ISigner>();
  private fallback = new NullSigner();

  static getInstance(): SignerRegistry {
    if (!this.instance) this.instance = new SignerRegistry();
    return this.instance;
  }

  register(chain: ChainType, signer: ISigner): void {
    this.signers.set(chain, signer);
  }

  get(chain: ChainType): ISigner {
    return this.signers.get(chain) ?? this.fallback;
  }

  clear(): void {
    this.signers.clear();
  }
}

export const signers = SignerRegistry.getInstance();

