import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { BlockchainExplorer } from '$lib/managers/providers/explorer/BlockchainExplorer';
// AlchemyTransactionFetcher import removed - using SDK explorer routing manager
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import { log } from '$lib/common/logger-wrapper';
import { sendToExtensionUI } from '$lib/common/safeMessaging';
import browser from 'webextension-polyfill';
import { ProviderRoutingManager } from '$lib/managers/ProviderRoutingManager';
import { BackgroundIntervalService } from '$lib/services/background-interval.service';
import { backgroundProviderManager } from '../services/provider-manager';
import { providerCache } from '../services/provider-cache.service';
import { ethers } from 'ethers'; // Keep for Contract functionality only
import { BigNumberishUtils, type ProviderInterface } from '@yakkl/core'; // Use for formatUnits replacement

// In-memory cache for native balances to prevent repeated provider calls
const nativeBalanceCache = new Map<string, { balance: string; timestamp: number }>();

/**
 * Update storage only if balance has changed (differential update)
 * This prevents unnecessary reactive updates in the UI
 */
async function updateStorageIfChanged(chainId: number, address: string, newBalance: string): Promise<void> {
  try {
    // Get current stored balance
    const storageKey = `native_balance_${chainId}_${address.toLowerCase()}`;
    const stored = await browser.storage.local.get(storageKey);
    const currentBalance = stored[storageKey];

    // Only update if balance changed
    if (currentBalance !== newBalance) {
      log.info('[Blockchain] Balance changed, updating storage', {
        old: currentBalance,
        new: newBalance,
        chainId,
        address
      });

      await browser.storage.local.set({
        [storageKey]: newBalance,
        [`${storageKey}_updated`]: Date.now()
      });
    } else {
      log.debug('[Blockchain] Balance unchanged, skipping storage update', {
        balance: newBalance,
        chainId,
        address
      });
    }
  } catch (error) {
    log.error('[Blockchain] Failed to update storage', error);
    // Don't throw - this is optional optimization
  }
}

export const blockchainHandlers = new Map<string, MessageHandlerFunc>([
  ['yakkl_getTransactionHistory', async (payload): Promise<MessageResponse> => {
    try {
      log.info('Blockchain handler: Received payload:', false, { payload, payloadType: typeof payload, payloadKeys: payload ? Object.keys(payload) : [] });

      // The messaging service spreads the data at the top level, so address and limit are directly in payload
      const { address, limit = 0 } = payload || {};  // Default 0 means fetch all transactions

      if (!address) {
        log.warn('Blockchain handler: Address is missing from payload:', false, { payload });
        return { success: false, error: 'Address is required' };
      }

      // Get current chain from store - handle missing data gracefully
      let chainId = 1; // Default to Ethereum mainnet
      let currentlySelectedOutside: any = null;
      try {
        const currentlySelected = await getYakklCurrentlySelected();
        currentlySelectedOutside = currentlySelected;
        chainId = currentlySelected?.shortcuts?.chainId || 1;
        log.info('Blockchain handler: Got chain ID from store:', false, chainId);
      } catch (error) {
        log.warn('Blockchain handler: Could not get currently selected, using default chainId:', false, chainId);
      }

        log.info('Blockchain handler: Getting transaction history', false, {
          address,
          chainId,
          limit,
          currentlySelected: currentlySelectedOutside?.shortcuts
        });


            // Use Etherscan only in background context (Alchemy SDK has webpack issues)
      let transactions: any[] = [];

      log.info('Blockchain handler: Starting transaction fetch', false, {
        address,
        chainId,
        limit,
        hasEtherscanKey: !!process.env.ETHERSCAN_API_KEY,
        context: 'background'
      });

      try {
        // Use Etherscan directly in background context
        const explorer = BlockchainExplorer.getInstance();
        transactions = await explorer.getTransactionHistory(address, chainId, limit, true);
        log.info('Successfully fetched transactions from Etherscan', false, { count: transactions.length });
      } catch (etherscanError) {
        log.error('Etherscan transaction fetch failed', false, {
          error: etherscanError instanceof Error ? etherscanError.message : etherscanError,
          chainId,
          address
        });
        transactions = [];
      }

      log.info('Blockchain handler: Retrieved transactions from explorer', false, {
        count: transactions.length,
        firstTransaction: transactions[0] ? {
          hash: transactions[0].hash,
          type: transactions[0].type,
          value: transactions[0].value,
          timestamp: transactions[0].timestamp,
          status: transactions[0].status
        } : null,
        hasTransactions: transactions.length > 0,
        transactionHashes: transactions.slice(0, 5).map(tx => tx.hash)
      });

      // Ensure transactions are serializable before returning
      const serializedTransactions = transactions.map(tx => {
        // Since timestamp is already a number (milliseconds) in TransactionDisplay,
        // we don't need to convert it
        return { ...tx };
      });

      log.info('Blockchain handler: Returning serialized transactions', false, {
        count: serializedTransactions.length,
        success: true,
        sampleData: serializedTransactions[0]
      });

      // Store transactions in session storage for persistence across contexts
      await browser.storage.session.set({
        [`transactions_${address}_${chainId}`]: {
          transactions: serializedTransactions,
          timestamp: Date.now()
        }
      });

      // Broadcast the transaction update to all UI contexts
      await sendToExtensionUI({
        type: 'yakkl_transactionUpdate',
        payload: {
          address,
          chainId,
          transactions: serializedTransactions
        }
      });

      const result = { success: true, data: serializedTransactions };
      log.info('Blockchain handler: Final return value', false, result);

      return result;
    } catch (error) {
      log.error('Failed to get transaction history:', false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        payload
      });
      return { success: false, error: (error as Error).message || 'Failed to get transaction history' };
    }
  }],

  ['GET_TOKEN_BALANCE', async (payload): Promise<MessageResponse> => {
    try {
      const { address, tokenAddress, chainId } = payload?.data || payload || {};

      if (!address || !tokenAddress || !chainId) {
        log.error('GET_TOKEN_BALANCE: Missing required parameters', false, { address, tokenAddress, chainId });
        return {
          success: false,
          error: 'Missing required parameters: address, tokenAddress, or chainId'
        };
      }

      log.info('GET_TOKEN_BALANCE: Fetching token balance', false, { address, tokenAddress, chainId });

      // Initialize and get provider from background manager
      await backgroundProviderManager.initialize(chainId);
      const provider = backgroundProviderManager.getProvider();

      if (!provider) {
        log.error('GET_TOKEN_BALANCE: No provider available', false);
        return { success: false, error: 'No provider available' };
      }

      // Create contract instance for ERC20 token
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
      ];

      // Create an ethers provider wrapper for our IProvider
      // Our IProvider has the necessary methods but ethers expects a specific interface
      const ethersProvider = {
        ...provider,
        // Add any missing methods that ethers.Contract expects
        getNetwork: async () => ({ chainId: BigInt(chainId), name: 'ethereum' }),
        call: async (transaction: any) => provider.call ? provider.call(transaction) : provider.request({ method: 'eth_call', params: [transaction, 'latest'] })
      };

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, ethersProvider as any);

      // Fetch token data in parallel
      const [balance, decimals, symbol, name] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals(),
        tokenContract.symbol().catch(() => 'UNKNOWN'),
        tokenContract.name().catch(() => 'Unknown Token')
      ]);

      // Format the balance using yakkl utilities
      const formattedBalance = BigNumberishUtils.format(balance, decimals);

      const result = {
        balance: formattedBalance,
        rawBalance: balance.toString(),
        decimals,
        symbol,
        name,
        address: tokenAddress
      };

      log.info('GET_TOKEN_BALANCE: Successfully fetched token balance', false, result);

      return { success: true, data: result };
    } catch (error) {
      log.error('GET_TOKEN_BALANCE: Failed to get token balance', false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        payload
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get token balance'
      };
    }
  }],

  ['GET_NATIVE_BALANCE', async (payload): Promise<MessageResponse> => {
    try {
      const { address, chainId } = payload?.data || payload || {};

      if (!address || !chainId) {
        const errorMsg = 'Missing required parameters: address or chainId';
        console.error('GET_NATIVE_BALANCE: ' + errorMsg, {
          address,
          chainId,
          payload,
          payloadData: payload?.data
        });
        return {
          success: false,
          error: errorMsg
        };
      }

      // Check cache first (memory cache for immediate responses)
      const cacheKey = `native_balance_${chainId}_${address.toLowerCase()}`;
      const cached = nativeBalanceCache.get(cacheKey);
      // CRITICAL: 15 minute cache to prevent excessive Alchemy API calls
      // User reported 900+ calls in 45 seconds - get_balance is VERY expensive!
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log('GET_NATIVE_BALANCE: Returning cached balance (TTL: 15 minutes)');
        return {
          success: true,
          data: {
            balance: cached.balance,
            address,
            chainId,
            fromCache: true
          }
        };
      }

      // Get provider from cache service (handles initialization and caching)
      let provider: ProviderInterface | null = null;
      try {
        // Use statically imported provider cache service
        provider = await providerCache.getProvider(chainId); // check below for error handling
      } catch (initError) {
        console.error('GET_NATIVE_BALANCE: Failed to get provider from cache', initError);
        // Fallback to direct initialization
        try {
          await backgroundProviderManager.initialize(chainId);
          provider = backgroundProviderManager.getProvider();
        } catch (fallbackError) {
          console.error('GET_NATIVE_BALANCE: Fallback also failed', fallbackError);
          return {
            success: false,
            error: `Provider initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`
          };
        }
      }

      if (!provider) {
        console.error('GET_NATIVE_BALANCE: No provider available');
        return { success: false, error: 'No provider available' };
      }

      // Get native token balance
      let balance: bigint;
      try {
        balance = await provider.getBalance(address);
        console.log('GET_NATIVE_BALANCE: Raw balance received:', balance);
      } catch (balanceError) {
        console.error('GET_NATIVE_BALANCE: Failed to call getBalance', balanceError);
        return {
          success: false,
          error: `Failed to fetch balance: ${balanceError instanceof Error ? balanceError.message : 'Unknown error'}`
        };
      }

      const balanceString = balance.toString();
      console.log('GET_NATIVE_BALANCE: Balance as string:', balanceString);

      // Update cache
      nativeBalanceCache.set(cacheKey, {
        balance: balanceString,
        timestamp: Date.now()
      });

      // Check if we should update storage (differential update)
      await updateStorageIfChanged(chainId, address, balanceString);

      const responseData = {
        balance: balanceString,
        address,
        chainId
      };

      console.log('GET_NATIVE_BALANCE: Preparing successful response:', responseData);

      const finalResponse = {
        success: true,
        data: responseData
      };

      console.log('GET_NATIVE_BALANCE: Returning final response:', finalResponse);
      return finalResponse;
    } catch (error) {
      console.error('GET_NATIVE_BALANCE: Unhandled error caught', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        payload
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get native balance'
      };
    }
  }],

  ['yakkl_trackActivity', async (payload): Promise<MessageResponse> => {
    try {
      // Payload now contains the activity data directly
      const activityData = payload;

      // For now, just log the activity
      console.log('Activity tracked:', activityData);

      // TODO: Implement actual activity tracking storage
      // This could store to IndexedDB or send to analytics service

      return { success: true, data: true };
    } catch (error) {
      console.error('Failed to track activity:', error);
      return { success: false, error: (error as Error).message };
    }
  }],

  ['yakkl_broadcastTransactions', async (payload): Promise<MessageResponse> => {
    try {
      const { address, chainId, transactions } = payload || {};

      if (!address || !transactions) {
        return { success: false, error: 'Address and transactions are required' };
      }

      // Broadcast the transaction update to all UI contexts
      await sendToExtensionUI({
        type: 'yakkl_transactionUpdate',
        payload: {
          address,
          chainId,
          transactions
        }
      });

      log.info('Blockchain handler: Broadcasted transaction update', false, {
        address,
        chainId,
        transactionCount: transactions.length
      });

      return { success: true, data: true };
    } catch (error) {
      log.error('Failed to broadcast transactions:', false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });
      return { success: false, error: (error as Error).message || 'Failed to broadcast transactions' };
    }
  }],

  ['blockchain.getTokenDetails', async (payload): Promise<MessageResponse> => {
    try {
      const { address, chainId } = payload || {};

      if (!address) {
        return { success: false, error: 'Token address is required' };
      }

      // For now, return mock data
      // TODO: Implement actual token contract reading via ethers.js
      const mockTokenDetails = {
        name: 'Sample Token',
        symbol: 'SAMP',
        decimals: 18,
        address: address,
        chainId: chainId || 1
      };

      return { success: true, data: mockTokenDetails };
    } catch (error) {
      console.error('Failed to get token details:', error);
      return { success: false, error: (error as Error).message };
    }
  }],

  ['yakkl_isOwnTransaction', async (payload): Promise<MessageResponse> => {
    try {
      const { hash } = payload || {};

      if (!hash) {
        return { success: false, error: 'Transaction hash is required' };
      }

      // Check if this transaction was initiated by YAKKL wallet
      // For now, we'll check session storage for pending transactions
      // In the future, this should check a persistent store of wallet-initiated transactions
      const pendingTxs = await browser.storage.session.get('pendingTransactions');
      const pending = (pendingTxs.pendingTransactions || []) as Array<{hash: string}>;

      // Check if the hash exists in our pending transactions
      const isOwn = pending.some((tx) => tx.hash === hash);

      log.debug('Checking if transaction is YAKKL initiated', false, {
        hash,
        isOwn,
        pendingCount: pending.length
      });

      return { success: true, data: isOwn };
    } catch (error) {
      log.error('Failed to check transaction ownership:', false, error);
      return { success: false, error: (error as Error).message };
    }
  }],

  ['yakkl_getTokenBalance', async (payload): Promise<MessageResponse> => {
    try {
      const { tokenAddress, walletAddress, chainId } = payload || {};

      if (!tokenAddress || !walletAddress) {
        return { success: false, error: 'Token address and wallet address are required' };
      }

      log.info('Blockchain handler: Getting token balance', false, {
        tokenAddress,
        walletAddress,
        chainId: chainId || 1
      });

      // Use ProviderRoutingManager to get the best provider with automatic failover
      const providerManager = ProviderRoutingManager.getInstance();

      try {
        // Get provider (it automatically uses the current chain from store)
        const provider = await providerManager.getProvider();

        // Make ERC20 balanceOf call
        const balanceOfData = `0x70a08231000000000000000000000000${walletAddress.slice(2)}` as `0x${string}`; // balanceOf(address)

        const balance = await provider.call({
          to: tokenAddress,
          data: balanceOfData
        });

        log.info('Successfully fetched token balance', false, {
          tokenAddress,
          walletAddress,
          balance
        });

        return { success: true, data: balance };
      } catch (error) {
        log.error('Failed to fetch token balance', false, error);

        // Try failover provider if available
        try {
          const failoverProvider = await providerManager.handleProviderFailure('primary', error);
          const balance = await failoverProvider.call({
            to: tokenAddress,
            data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}` as `0x${string}`
          });

          log.info('Successfully fetched token balance with failover provider', false, {
            tokenAddress,
            walletAddress,
            balance
          });

          return { success: true, data: balance };
        } catch (failoverError) {
          log.error('Failover also failed for token balance', false, failoverError);
          return {
            success: false,
            error: `Failed to fetch token balance: ${failoverError instanceof Error ? failoverError.message : 'Unknown error'}`
          };
        }
      }

    } catch (error) {
      log.error('Token balance handler error:', false, error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to get token balance'
      };
    }
  }],

  ['yakkl_updateTokenBalances', async (payload): Promise<MessageResponse> => {
    try {
      const { address, chainId } = payload || {};

      log.info('Blockchain handler: Updating token balances', false, {
        address,
        chainId
      });

      // Trigger the background interval service to update balances
      const intervalService = BackgroundIntervalService.getInstance();
      await intervalService.updateAllTokenBalances();

      return { success: true, data: true };
    } catch (error) {
      log.error('Failed to update token balances:', false, error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to update token balances'
      };
    }
  }]
]);
