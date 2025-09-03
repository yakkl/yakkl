/**
 * SDK Integration
 * Connects the wallet with @yakkl/sdk package
 */

import { sdkBridge } from './sdk-bridge';
import { currentAccount } from '../stores/account.store';
import { currentChain } from '../stores/chain.store';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Initialize SDK with wallet state
 */
export async function initializeSDK(): Promise<void> {
  if (!browser) return;
  
  // The SDK bridge handles all initialization
  console.log('[SDK] Initializing SDK integration');
  
  // Subscribe to account changes for logging
  currentAccount.subscribe(account => {
    if (account) {
      console.log('[SDK] Account updated:', account.address);
    }
  });

  // Subscribe to chain changes for logging
  currentChain.subscribe(chain => {
    if (chain) {
      console.log('[SDK] Chain updated:', chain.name);
    }
  });
  
  // Inject provider into window for dApp access
  if (browser && typeof window !== 'undefined') {
    // Create YAKKL provider object
    const yakklProvider = sdkBridge.getProvider();
    
    if (yakklProvider) {
      // Inject as window.yakkl
      (window as any).yakkl = yakklProvider;
      
      // Also inject as window.ethereum if not present
      if (!(window as any).ethereum) {
        (window as any).ethereum = yakklProvider;
      }
      
      // Announce provider using EIP-6963
      announceProvider();
    }
  }
  
  console.log('[SDK] SDK integration initialized');
}

/**
 * Announce provider using EIP-6963
 */
function announceProvider(): void {
  if (!browser) return;
  
  const info = sdkBridge.getWalletInfo();
  
  // Dispatch EIP-6963 provider announcement
  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'yakkl-wallet-v2',
          name: info.name,
          icon: info.icon,
          rdns: 'com.yakkl.wallet'
        },
        provider: sdkBridge.getProvider()
      }
    })
  );
  
  console.log('[SDK] Provider announced via EIP-6963');
}

// Export SDK bridge methods
export {
  connectDApp,
  disconnectDApp,
  handleRPCRequest,
  getWalletInfo,
  getSupportedMethods
} from './sdk-bridge';

// Export SDK types and utilities
export type {
  WalletAccount,
  WalletTransaction,
  RPCRequest,
  RPCResponse,
  WalletInfo,
  EthereumRequest
} from '@yakkl/sdk';