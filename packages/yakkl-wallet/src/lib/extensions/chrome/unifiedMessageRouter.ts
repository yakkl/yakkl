// unified-message-router.ts
// A router that uses ALL your existing handlers without changing them

import { onEIP6963PortListener } from './eip-6963';
import { onDappListener } from './dapp';
import { onPortInternalListener } from '$lib/common/listeners/ui/portListeners';
import { log } from '$lib/managers/Logger';
import type { Runtime } from 'webextension-polyfill';
import browser from 'webextension-polyfill';
import { YAKKL_DAPP } from '$lib/common/constants';

// This is the single handler that routes to your existing handlers
export async function onUnifiedMessageHandler(message: any, port: Runtime.Port): Promise<void> {
  try {
    log.debug('Unified router received message', false, {
      method: message.method,
      action: message.action,
      type: message.type,
      id: message.id
    });

    // Determine which existing handler should process this message
    const handler = determineHandler(message);

    // Route to the appropriate existing handler
    switch (handler) {
      case 'web3':
        // Use your existing EIP6963 handler for Web3 methods
        return onEIP6963PortListener(message, port);

      case 'internal':
        // Use your existing internal handler
        return onPortInternalListener(message, port);

      case 'dapp':
      default:
        // Use your existing DApp handler for everything else
        return onDappListener(message, port);
    }

  } catch (error) {
    log.error('Error in unified message handler', false, { error, message });
    throw error;
  }
}

// Determine which handler to use based on message content
function determineHandler(message: any): 'web3' | 'internal' | 'dapp' {
  // Check for Web3 RPC methods
  if (message.method && isWeb3Method(message.method)) {
    return 'web3';
  }

  // Check for internal actions (like resolve/reject)
  if (message.action && isInternalAction(message.action)) {
    return 'internal';
  }

  // Check for specific message types that indicate Web3
  if (message.type && message.type.includes('EIP6963')) {
    return 'web3';
  }

  // Default to DApp handler
  return 'dapp';
}

// Check if this is a Web3 method (no changes to your method lists)
function isWeb3Method(method: string): boolean {
  // These are all the methods from your READONLY_METHODS and write methods
  const web3Methods = [
    // Account methods
    'eth_accounts',
    'eth_requestAccounts',
    'eth_coinbase',

    // Transaction methods
    'eth_sendTransaction',
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_getTransactionCount',
    'eth_getTransactionByHash',
    'eth_getTransactionReceipt',

    // Block methods
    'eth_blockNumber',
    'eth_getBlockByHash',
    'eth_getBlockByNumber',

    // Chain/Network methods
    'eth_chainId',
    'net_version',
    'net_listening',
    'net_peerCount',
    'web3_clientVersion',

    // Signing methods
    'eth_sign',
    'personal_sign',
    'eth_signTypedData_v4',

    // Wallet methods
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_requestPermissions',
    'wallet_getPermissions',
    'wallet_revokePermissions',
    'wallet_watchAsset',

    // Other standard methods
    'eth_getBalance',
    'eth_getCode',
    'eth_getStorageAt',
    'eth_getLogs',
    'eth_protocolVersion',
    'eth_syncing'
  ];

  // Check if the method is in our list OR follows the pattern
  return web3Methods.includes(method) ||
         method.startsWith('eth_') ||
         method.startsWith('wallet_') ||
         method.startsWith('net_') ||
         method.startsWith('web3_');
}

// Check if this is an internal action
function isInternalAction(action: string): boolean {
  const internalActions = [
    'resolveRequest',
    'rejectRequest',
    'resolve',
    'reject',
    'connect',
    'disconnect'
  ];

  return internalActions.includes(action);
}

// Helper to migrate existing code gradually
export function createUnifiedPortConnection(preferredPort?: string): string {
  // This helps you migrate popup components one at a time
  // During transition, it returns the port name to use

  // If no preference, use YAKKL_DAPP (which will become the unified port)
  return preferredPort || 'YAKKL_DAPP';
}

// Compatibility layer for existing code
export {
  onUnifiedMessageHandler as onEIP6963PortListener_New,  // Alias for migration
  onUnifiedMessageHandler as onDappListener_New,         // Alias for migration
};

// Optional: Add a migration helper for your popup components
export class UnifiedPortAdapter {
  private port: Runtime.Port;

  constructor(portName: string = YAKKL_DAPP) {
    // This adapter helps migrate popup components gradually
    this.port = browser.runtime.connect({ name: portName });

    // Set up the unified message handling
    this.port.onMessage.addListener((message) => {
      // Your existing message handling logic
      this.handleMessage(message);
    });
  }

  private handleMessage(message: any) {
    // Existing message handling logic from your popups
    // This stays exactly the same
  }

  // Expose the same interface your popups expect
  sendMessage(message: any) {
    this.port.postMessage(message);
  }

  disconnect() {
    this.port.disconnect();
  }
}
