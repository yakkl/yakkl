import { log } from '$lib/plugins/Logger';
import type { Deferrable } from '@ethersproject/properties';
import { Alchemy, Network, type TransactionRequest, type BlockTag } from 'alchemy-sdk';
import { keyManager } from '$lib/plugins/KeyManager';

// Secure API key management - only accessible in background context
let alchemyApiKey: string | undefined;

// Initialize API keys from environment - should be called only in background context
export function initializeApiKeys() {
  try {
    // In background script, we can access chrome.storage.local
    chrome.storage.local.get(['ALCHEMY_API_KEY'], (result) => {
      if (result.ALCHEMY_API_KEY) {
        alchemyApiKey = result.ALCHEMY_API_KEY;
      } else {
        // If not in storage, try to get from environment
        const envKey = process.env.VITE_ALCHEMY_API_KEY_PROD;
        if (envKey) {
          alchemyApiKey = envKey;
          // Store for future use
          chrome.storage.local.set({ ALCHEMY_API_KEY: envKey });
        } else {
          log.error('Alchemy API key not found in storage or environment');
        }
      }
    });
  } catch (error) {
    log.error('Failed to initialize API keys', false, error);
  }
}

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

export async function getBlock(chainId: any, block: BlockTag | Promise<BlockTag>, _kval?: string) {
  try {
    const apiKey = await keyManager.getKey('ALCHEMY_API_KEY_PROD');
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    const provider = new Alchemy(getProviderConfig(chainId, apiKey));
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
