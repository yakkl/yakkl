/**
 * SDK Integration
 * Connects the wallet with @yakkl/sdk package
 */

import { WalletClient, type WalletAccount } from '@yakkl/sdk';
import { currentAccount } from '../stores/account.store';
import { currentChain } from '../stores/chain.store';
import { get } from 'svelte/store';

// Create wallet client instance
export const walletClient = new WalletClient();

/**
 * Initialize SDK with wallet state
 */
export async function initializeSDK(): Promise<void> {
  // Subscribe to account changes
  currentAccount.subscribe(account => {
    if (account) {
      // Update SDK with current account
      console.log('[SDK] Account updated:', account.address);
    }
  });

  // Subscribe to chain changes
  currentChain.subscribe(chain => {
    if (chain) {
      // Update SDK with current chain
      console.log('[SDK] Chain updated:', chain.name);
    }
  });
  
  console.log('[SDK] Initialized');
}

// Export SDK methods for use in wallet
export {
  WalletClient,
  type WalletAccount,
  type WalletTransaction,
  type RPCRequest,
  type RPCResponse
} from '@yakkl/sdk';