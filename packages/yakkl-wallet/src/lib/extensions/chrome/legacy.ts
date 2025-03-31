import { log } from '$lib/plugins/Logger';
import type { Deferrable } from '@ethersproject/properties';
import { Alchemy, Network, type TransactionRequest, type BlockTag } from 'alchemy-sdk';
import { keyManager } from '$lib/plugins/KeyManager';
import browser from 'webextension-polyfill';

// Secure API key management - only accessible in background context
let alchemyApiKey: string | undefined;

// Initialize API keys from environment - should be called only in background context
// export async function initializeApiKeys() {
//   try {
//     // In background script, we can access chrome.storage.local
//     const result = await browser.storage.local.get(['ALCHEMY_API_KEY']);
//     if (result.ALCHEMY_API_KEY) {
//       alchemyApiKey = result.ALCHEMY_API_KEY as string;
//     } else {
//       // If not in storage, try to get from environment
//       const envKey = process.env.VITE_ALCHEMY_API_KEY_PROD;
//       if (envKey) {
//         alchemyApiKey = envKey;
//         // Store for future use
//         browser.storage.local.set({ ALCHEMY_API_KEY: envKey });
//       } else {
//         log.error('Alchemy API key not found in storage or environment');
//       }
//     }
//   } catch (error) {
//     log.error('Failed to initialize API keys', false, error);
//   }
// }

/**********************************************************************************************************************/
// This section is for the Ethereum provider - Legacy version

export async function estimateGas(chainId: any, params: Deferrable<TransactionRequest>, _kval?: string) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    const provider = new Alchemy(getProviderConfig(chainId, apiKey));
    return await provider.transact.estimateGas(params);
  } catch (e) {
    log.error('Error in estimateGas', false, e);
    throw e;
  }
}

export async function getBlock(chainId: any, block: BlockTag | Promise<BlockTag>, apiKeyOverride?: string) {
  try {
    // Try to use the provided API key first
    let apiKey = apiKeyOverride;

    // If no key was provided, try to get it from KeyManager
    if (!apiKey) {
      try {
        apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
      } catch (error) {
        log.warn('Could not get API key from KeyManager, using fallback', false, error);
      }
    }

    // If still no key, use a reasonable fallback mechanism
    if (!apiKey) {
      log.warn('No API key available for Alchemy, using public endpoints');
      // We could implement a public API fallback here
    }

    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getBlock(block);
  } catch (e) {
    log.error('Error in getBlock', false, e);
    throw e;
  }
}

// NOTE: These items should now come from the Wallet.provider.getConfig() function or similar
// chainId must be hex
function getProviderConfig(chainId: any, apiKey: string) {
  try {
    let network = Network.ETH_SEPOLIA;
    switch(chainId) {
      case "0xaa36a7": // Ethereum Sepolia
      case 11155111:
        network = Network.ETH_SEPOLIA;
        break;
      case "0x1": // Ethereum mainnet
      case "0x01":
      case 1:
      default:
        network = Network.ETH_MAINNET;
        break;
    }
    return {
      apiKey: apiKey,
      network: network,
    }
  } catch (e) {
    log.error('Error in getProviderConfig', false, e);
    throw e;
  }
}

// We should implement support for these methods in legacy.ts
// if (legacyMethods.includes(method)) {
//   try {
//     // Query blockchain data as needed
//     switch (method) {
//       case 'eth_getBlockByNumber': {
//         // Get the API key (fallbacks to empty string)
//         const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD') || '';
//
//         // Only pass the API key if it's not empty
//         const keyToUse = apiKey !== '' ? apiKey : undefined;
//
//         return await getBlock(yakklCurrentlySelected.shortcuts.chainId, params[0], keyToUse);
//       }
//       case 'eth_getBlockByHash': {
//         // Get the API key (fallbacks to empty string)
//         const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD') || '';
//
//         // Only pass the API key if it's not empty
//         const keyToUse = apiKey !== '' ? apiKey : undefined;
//
//         return await getBlockByHash(yakklCurrentlySelected.shortcuts.chainId, params[0], keyToUse);
//       }
//     }
//   } catch (e) {
//     log.error('Error in legacy method', false, e);
//     throw e;
//   }
// }

export async function getLatestBlock(chainId: any) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getBlock('latest');
  } catch (e) {
    log.error('Error in getLatestBlock', false, e);
    throw e;
  }
}

export async function ethCall(chainId: any, transaction: Deferrable<TransactionRequest>, blockTag?: BlockTag) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.call(transaction, blockTag || 'latest');
  } catch (e) {
    log.error('Error in ethCall', false, e);
    throw e;
  }
}

export async function getGasPrice(chainId: any) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getGasPrice();
  } catch (e) {
    log.error('Error in getGasPrice', false, e);
    throw e;
  }
}

export async function getBalance(chainId: any, address: string, blockTag?: BlockTag) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getBalance(address, blockTag || 'latest');
  } catch (e) {
    log.error('Error in getBalance', false, e);
    throw e;
  }
}

export async function getCode(chainId: any, address: string, blockTag?: BlockTag) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getCode(address, blockTag || 'latest');
  } catch (e) {
    log.error('Error in getCode', false, e);
    throw e;
  }
}

export async function getNonce(chainId: any, address: string, blockTag?: BlockTag) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getTransactionCount(address, blockTag || 'latest');
  } catch (e) {
    log.error('Error in getNonce', false, e);
    throw e;
  }
}

export async function getTransactionReceipt(chainId: any, txHash: string) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getTransactionReceipt(txHash);
  } catch (e) {
    log.error('Error in getTransactionReceipt', false, e);
    throw e;
  }
}

export async function getTransaction(chainId: any, txHash: string) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getTransaction(txHash);
  } catch (e) {
    log.error('Error in getTransaction', false, e);
    throw e;
  }
}

export async function getLogs(chainId: any, filter: any) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
    return await provider.core.getLogs(filter);
  } catch (e) {
    log.error('Error in getLogs', false, e);
    throw e;
  }
}
