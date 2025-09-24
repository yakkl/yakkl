import { keyManagers } from '../KeyManagerRegistry';
import { ChainType } from '../../interfaces/provider.interface';
import { EVMKeyManager } from './EVMKeyManager';
import { signers } from '../SignerRegistry';
import { EVMSigner } from '../signers/EVMSigner';
import { BitcoinKeyManager } from './BitcoinKeyManager';
import { SolanaKeyManager } from './SolanaKeyManager';

// Register default signer (transitional ethers-based)
try { signers.register(ChainType.EVM, new EVMSigner()); } catch {}

// Register default EVM key manager (fallback)
try { keyManagers.register(ChainType.EVM, new EVMKeyManager()); } catch {}
// Register BTC & SOL key managers (basic scaffolds). Replace with native HD implementations later.
try { keyManagers.register(ChainType.BITCOIN, new BitcoinKeyManager()); } catch {}
try { keyManagers.register(ChainType.SOLANA, new SolanaKeyManager()); } catch {}

// Attempt to register native EVM key manager (noble-based) if available
// Keep fallback registration above; this will override if succeeds.
(async () => {
  try {
    const mod = await import('./EVMKeyManager.native');
    if (mod && mod.NativeEVMKeyManager) {
      const native = new mod.NativeEVMKeyManager();
      keyManagers.register(ChainType.EVM, native);
    }
  } catch {
    // ignore if native not available (deps not installed yet)
  }
  try {
    const smod = await import('../signers/EVMSigner.native');
    if (smod && smod.NativeEVMSigner) {
      signers.register(ChainType.EVM, new smod.NativeEVMSigner());
    }
  } catch {
    // ignore if native signer not available
  }
})();
