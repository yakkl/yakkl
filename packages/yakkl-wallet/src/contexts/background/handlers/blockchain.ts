import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { BlockchainExplorer } from '$lib/managers/providers/explorer/BlockchainExplorer';
import { AlchemyTransactionFetcher } from '$lib/managers/providers/explorer/AlchemyTransactionFetcher';
import { getYakklCurrentlySelected } from '$lib/common/stores';
import { log } from '$lib/common/logger-wrapper';
import { sendToExtensionUI } from '$lib/common/safeMessaging';
import browser from 'webextension-polyfill';

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
  }]
]);
