// AlchemyTransactionFetcher.ts - Fetch transaction history using Alchemy SDK
import { Alchemy, Network, AssetTransfersCategory, SortingOrder } from 'alchemy-sdk';
import type { TransactionDisplay } from '$lib/types';
import { log } from '$lib/managers/Logger';
import { chainIdToAlchemyNetwork } from '$lib/utils/chainMapping';

export class AlchemyTransactionFetcher {
  private static instance: AlchemyTransactionFetcher;
  private alchemyInstances: Map<number, Alchemy> = new Map();
  private cache: Map<string, { data: TransactionDisplay[], timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): AlchemyTransactionFetcher {
    if (!AlchemyTransactionFetcher.instance) {
      AlchemyTransactionFetcher.instance = new AlchemyTransactionFetcher();
    }
    return AlchemyTransactionFetcher.instance;
  }

  private getAlchemyInstance(chainId: number, isBackgroundContext: boolean = false): Alchemy | null {
    if (this.alchemyInstances.has(chainId)) {
      return this.alchemyInstances.get(chainId)!;
    }

    const network = chainIdToAlchemyNetwork(chainId);
    if (!network) {
      log.warn('No Alchemy network mapping for chainId:', false, chainId);
      return null;
    }

    // Get API key based on context and chain
    let apiKey = '';
    if (isBackgroundContext) {
      // In background context, use process.env
      // Use ALCHEMY_API_KEY_PROD for all chains since VITE_ prefixed vars may not be available in webpack
      apiKey = process.env.ALCHEMY_API_KEY_PROD || '';
      
      // Try chain-specific keys if available
      switch (chainId) {
        case 1: // Ethereum mainnet
          apiKey = process.env.ALCHEMY_API_KEY_ETHEREUM || process.env.ALCHEMY_API_KEY_PROD || '';
          break;
        case 137: // Polygon
          apiKey = process.env.ALCHEMY_API_KEY_POLYGON || process.env.ALCHEMY_API_KEY_PROD || '';
          break;
        case 42161: // Arbitrum
          apiKey = process.env.ALCHEMY_API_KEY_ARBITRUM || process.env.ALCHEMY_API_KEY_PROD || '';
          break;
      }
      
      // Debug log to see what's available
      log.info('Alchemy API key check in background:', false, {
        chainId,
        hasApiKey: !!apiKey,
        envVars: {
          ALCHEMY_API_KEY_PROD: !!process.env.ALCHEMY_API_KEY_PROD,
          VITE_ALCHEMY_API_KEY_ETHEREUM: !!process.env.VITE_ALCHEMY_API_KEY_ETHEREUM,
          VITE_ALCHEMY_API_KEY_POLYGON: !!process.env.VITE_ALCHEMY_API_KEY_POLYGON,
          VITE_ALCHEMY_API_KEY_ARBITRUM: !!process.env.VITE_ALCHEMY_API_KEY_ARBITRUM
        }
      });
    }

    if (!apiKey) {
      log.warn('No Alchemy API key found for chainId:', false, chainId);
      return null;
    }

    const settings = {
      apiKey,
      network,
    };

    const alchemy = new Alchemy(settings);
    this.alchemyInstances.set(chainId, alchemy);
    return alchemy;
  }

  async getTransactionHistory(
    address: string,
    chainId: number,
    limit: number = 100,
    isBackgroundContext: boolean = false
  ): Promise<TransactionDisplay[]> {
    try {
      // Check cache first
      const cacheKey = `${chainId}-${address}-${limit}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        log.debug('Returning cached Alchemy transaction history', false);
        return cached.data;
      }

      const alchemy = this.getAlchemyInstance(chainId, isBackgroundContext);
      if (!alchemy) {
        log.error('Failed to get Alchemy instance for chainId:', false, chainId);
        return [];
      }

      log.info('Fetching transaction history from Alchemy', false, { address, chainId, limit });

      // Fetch both sent and received transactions
      const [sentTxs, receivedTxs] = await Promise.all([
        alchemy.core.getAssetTransfers({
          fromAddress: address,
          category: [
            AssetTransfersCategory.EXTERNAL,
            AssetTransfersCategory.INTERNAL,
            AssetTransfersCategory.ERC20,
            AssetTransfersCategory.ERC721,
            AssetTransfersCategory.ERC1155,
          ],
          maxCount: limit,
          order: SortingOrder.DESCENDING,
          excludeZeroValue: false,
        }),
        alchemy.core.getAssetTransfers({
          toAddress: address,
          category: [
            AssetTransfersCategory.EXTERNAL,
            AssetTransfersCategory.INTERNAL,
            AssetTransfersCategory.ERC20,
            AssetTransfersCategory.ERC721,
            AssetTransfersCategory.ERC1155,
          ],
          maxCount: limit,
          order: SortingOrder.DESCENDING,
          excludeZeroValue: false,
        }),
      ]);

      // Combine and convert to display format
      const allTransfers = [...sentTxs.transfers, ...receivedTxs.transfers];
      
      // Remove duplicates by uniqueId
      const uniqueTransfers = Array.from(
        new Map(allTransfers.map(tx => [tx.uniqueId, tx])).values()
      );

      // Sort by block number descending
      uniqueTransfers.sort((a, b) => {
        const blockA = parseInt(a.blockNum, 16);
        const blockB = parseInt(b.blockNum, 16);
        return blockB - blockA;
      });

      // Take only requested limit
      const limitedTransfers = uniqueTransfers.slice(0, limit);

      // Convert to display format
      const displayTransactions: TransactionDisplay[] = await Promise.all(
        limitedTransfers.map(async (transfer) => {
          const isSent = transfer.from.toLowerCase() === address.toLowerCase();
          
          // Get timestamp from block
          let timestamp = Date.now();
          try {
            const block = await alchemy.core.getBlock(parseInt(transfer.blockNum, 16));
            if (block && block.timestamp) {
              timestamp = block.timestamp * 1000;
            }
          } catch (error) {
            log.warn('Failed to get block timestamp', false, error);
          }

          return {
            hash: transfer.hash,
            from: transfer.from,
            to: transfer.to || '',
            value: transfer.value?.toString() || '0',
            timestamp,
            status: 'confirmed' as const, // Asset transfers are always confirmed
            type: isSent ? 'send' as const : 'receive' as const,
            gas: '0', // Not available in asset transfers
            gasPrice: '0', // Not available in asset transfers
            blockNumber: transfer.blockNum, // Keep as string hex
          };
        })
      );

      // Cache the results
      this.cache.set(cacheKey, {
        data: displayTransactions,
        timestamp: Date.now(),
      });

      log.info('Alchemy transaction history fetched successfully', false, {
        count: displayTransactions.length,
        firstTx: displayTransactions[0],
      });

      return displayTransactions;
    } catch (error) {
      log.error('Failed to fetch Alchemy transaction history:', false, error);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
  }
}