/**
 * TransactionManager - Unified transaction fetching service
 *
 * This manager consolidates all transaction fetching logic from:
 * - WalletService (Alchemy)
 * - BlockchainExplorer (Etherscan)
 * - Background handlers
 *
 * Features:
 * - Provider abstraction (Alchemy, Etherscan, Infura, etc.)
 * - Automatic fallback on errors
 * - Built-in caching
 * - Pagination support
 * - Rate limiting
 */

import { log } from '$lib/managers/Logger';
import { BlockchainExplorer } from './providers/explorer/BlockchainExplorer';
import type { TransactionDisplay } from '$lib/types';
import { BigNumberishUtils } from '@yakkl/core';
// Re-enable SDK providers
import {
  AbstractTransactionProvider,
  AlchemyTransactionProvider,
  EtherscanTransactionProvider,
  InfuraTransactionProvider,
  QuickNodeTransactionProvider,
  type TransactionData,
  type TransactionProviderConfig,
  type TransactionFetchOptions as SDKFetchOptions
} from '@yakkl/sdk';

// Provider types
export enum TransactionProvider {
  ALCHEMY = 'alchemy',
  ETHERSCAN = 'etherscan',
  INFURA = 'infura',
  QUICKNODE = 'quicknode',
  CUSTOM = 'custom'
}

// Provider configuration
export interface ProviderConfig {
  provider: TransactionProvider;
  apiKey?: string;
  url?: string;
  priority: number; // Lower number = higher priority
  rateLimit?: number; // Requests per second
}

// Transaction fetch options
export interface TransactionFetchOptions {
  limit?: number;
  pageKey?: string;
  includeInternal?: boolean;
  includeTokenTransfers?: boolean;
  preferredProvider?: TransactionProvider;
  enrichWithFullDetails?: boolean; // If true, makes additional API calls to get gas/nonce data
}

export class TransactionManager {
  private static instance: TransactionManager;
  private providers: Map<TransactionProvider, ProviderConfig> = new Map();
  private sdkProviders: Map<TransactionProvider, AbstractTransactionProvider> = new Map();
  private cache: Map<string, { data: TransactionDisplay[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache
  private readonly MAX_PAGES = 10; // Safety limit for pagination

  private constructor() {
    this.initializeProviders();
  }

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Initialize default providers using SDK providers
   */
  private initializeProviders(): void {
    // Prefer environment from either vite or process.env (background)
    const alchemyKey = (import.meta as any)?.env?.VITE_ALCHEMY_API_KEY_PROD_1 || (process as any)?.env?.ALCHEMY_API_KEY_PROD_1;
    const etherscanKey = (import.meta as any)?.env?.VITE_ETHERSCAN_API_KEY || (process as any)?.env?.ETHERSCAN_API_KEY;
    const infuraKey = (import.meta as any)?.env?.VITE_INFURA_API_KEY_PROD || (process as any)?.env?.INFURA_API_KEY_PROD;
    const quicknodeKey = (import.meta as any)?.env?.VITE_QUICKNODE_API_KEY || (process as any)?.env?.QUICKNODE_API_KEY;

    // Initialize SDK-based providers where keys are available
    if (etherscanKey) {
      const etherscanConfig: TransactionProviderConfig = {
        apiKey: etherscanKey,
        rateLimit: 5
      } as any;
      this.sdkProviders.set(TransactionProvider.ETHERSCAN, new EtherscanTransactionProvider(etherscanConfig));
      this.providers.set(TransactionProvider.ETHERSCAN, {
        provider: TransactionProvider.ETHERSCAN,
        apiKey: etherscanKey,
        priority: 1,
        rateLimit: 5
      });
      log.info('[TransactionManager] Etherscan provider initialized (SDK)', false, { hasKey: true });
    } else {
      log.warn('[TransactionManager] Etherscan API key not found');
    }

    // Alchemy as SECONDARY fallback provider
    if (alchemyKey) {
      this.providers.set(TransactionProvider.ALCHEMY, {
        provider: TransactionProvider.ALCHEMY,
        apiKey: alchemyKey,
        priority: 2, // Secondary provider - only used if Etherscan fails
        rateLimit: 30
      });
      try {
        const alchemyConfig: TransactionProviderConfig = { apiKey: alchemyKey } as any;
        this.sdkProviders.set(TransactionProvider.ALCHEMY, new AlchemyTransactionProvider(alchemyConfig));
      } catch (_) { /* optional */ }
      log.info('[TransactionManager] Alchemy provider initialized as FALLBACK', false, { hasKey: true });
    } else {
      log.warn('[TransactionManager] Alchemy API key not found');
    }

    // Infura as additional fallback
    if (infuraKey) {
      try {
        const infuraConfig: TransactionProviderConfig = { apiKey: infuraKey } as any;
        this.sdkProviders.set(TransactionProvider.INFURA, new InfuraTransactionProvider(infuraConfig));
      } catch (_) { /* optional */ }
      this.providers.set(TransactionProvider.INFURA, {
        provider: TransactionProvider.INFURA,
        apiKey: infuraKey,
        priority: 3,
        rateLimit: 10
      });
      log.info('[TransactionManager] Infura provider initialized', false, { hasKey: true });
    } else {
      log.warn('[TransactionManager] Infura API key not found');
    }

    // QuickNode if available
    if (quicknodeKey) {
      try {
        const quicknodeConfig: TransactionProviderConfig = { apiKey: quicknodeKey } as any;
        this.sdkProviders.set(TransactionProvider.QUICKNODE, new QuickNodeTransactionProvider(quicknodeConfig));
      } catch (_) { /* optional */ }
      this.providers.set(TransactionProvider.QUICKNODE, {
        provider: TransactionProvider.QUICKNODE,
        apiKey: quicknodeKey,
        priority: 4,
        rateLimit: 20
      });
      log.info('[TransactionManager] QuickNode provider initialized', false, { hasKey: true });
    }

    log.info('[TransactionManager] Total providers initialized:', false, {
      count: this.providers.size,
      providers: Array.from(this.providers.keys())
    });
  }

  /**
   * Get transactions for an address with automatic provider selection
   */
  async getTransactions(
    address: string,
    chainId: number,
    options: TransactionFetchOptions = {}
  ): Promise<TransactionDisplay[]> {
    const {
      limit = 100,
      preferredProvider,
      includeInternal = true,
      includeTokenTransfers = true
    } = options;

    // Check cache first
    const cacheKey = `${chainId}_${address}_${limit}_${includeInternal}_${includeTokenTransfers}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      log.info('[TransactionManager] Returning cached transactions', false, { count: cached.data.length });
      return cached.data;
    }

    // Get sorted providers by priority
    const sortedProviders = Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority);

    // If preferred provider specified, move it to front
    if (preferredProvider) {
      const preferredIndex = sortedProviders.findIndex(p => p.provider === preferredProvider);
      if (preferredIndex > 0) {
        const [preferred] = sortedProviders.splice(preferredIndex, 1);
        sortedProviders.unshift(preferred);
      }
    }

    // Try each provider until one succeeds
    for (const providerConfig of sortedProviders) {
      try {
        log.info(`[TransactionManager] Trying provider: ${providerConfig.provider}`, false, {
          address,
          chainId,
          limit
        });

        const transactions = await this.fetchFromProvider(
          providerConfig,
          address,
          chainId,
          limit,
          includeInternal,
          includeTokenTransfers,
          options.enrichWithFullDetails
        );

        if (transactions && transactions.length > 0) {
          // Cache the results
          this.cache.set(cacheKey, {
            data: transactions,
            timestamp: Date.now()
          });

          log.info(`[TransactionManager] Successfully fetched ${transactions.length} transactions from ${providerConfig.provider}`);
          return transactions;
        }
      } catch (error: any) {
        log.warn(`[TransactionManager] Provider ${providerConfig.provider} failed:`, false, {
          provider: providerConfig.provider,
          error: error.message,
          stack: error.stack
        });
        // Continue to next provider
      }
    }

    log.error('[TransactionManager] All providers failed to fetch transactions', false, {
      providersAttempted: sortedProviders.length,
      address,
      chainId
    });
    return [];
  }

  /**
   * Fetch transactions from a specific provider using SDK providers
   */
  private async fetchFromProvider(
    config: ProviderConfig,
    address: string,
    chainId: number,
    limit: number,
    includeInternal: boolean,
    includeTokenTransfers: boolean,
    enrichWithFullDetails: boolean = false
  ): Promise<TransactionDisplay[]> {
    // Prefer SDK provider path when available
    const sdkProvider = this.sdkProviders.get(config.provider);
    if (sdkProvider) {
      try {
        const options: SDKFetchOptions = {
          limit,
          includeTokenTransfers,
          includeInternalTransactions: includeInternal,
          sort: 'desc'
        } as any;
        const transactions = await sdkProvider.fetchTransactions(address, chainId, options);
        return transactions.map(tx => this.convertToTransactionDisplay(tx, chainId));
      } catch (error: any) {
        log.error(`[TransactionManager] SDK provider ${config.provider} failed`, false, {
          error: error.message,
          provider: config.provider,
          chainId,
          address
        });
      }
    }

    // Fallback to legacy implementation
    switch (config.provider) {
      case TransactionProvider.ALCHEMY:
        return this.fetchFromAlchemy(config, address, chainId, limit, enrichWithFullDetails);
      case TransactionProvider.ETHERSCAN:
        return this.fetchFromEtherscan(address, chainId, limit);
      case TransactionProvider.INFURA:
        return this.fetchFromInfura(config, address, chainId, limit);
      default:
        throw new Error(`Provider ${config.provider} not implemented`);
    }
  }

  /**
   * Convert SDK TransactionData to wallet TransactionDisplay format
   * Ensures value is in ETH units (not wei) to match UI expectations.
   */
  private convertToTransactionDisplay(tx: TransactionData, chainId: number): TransactionDisplay {
    const timestamp = tx.timestamp || Date.now();

    // tx.value is provider-specific; for Etherscan normal tx it's wei as decimal string
    // Convert from wei (18 decimals) to decimal string in ETH for UI
    let valueEth = '0';
    try {
      valueEth = BigNumberishUtils.format(tx.value || '0', 18);
    } catch {
      valueEth = '0';
    }

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: valueEth,
      gasPrice: tx.gasPrice,
      gas: tx.gasLimit,
      gasUsed: tx.gasUsed,
      nonce: tx.nonce?.toString(),
      blockNumber: tx.blockNumber ? tx.blockNumber.toString() : '0',
      timestamp,
      confirmations: tx.confirmations?.toString(),
      status: tx.status || 'confirmed',
      type: tx.type || 'send',
      chainId,
      symbol: tx.symbol || 'ETH',
      tokenAddress: tx.tokenAddress,
      methodId: tx.methodId,
      functionName: tx.functionName
    } as TransactionDisplay;
  }

  /**
   * Fetch transactions from Alchemy with pagination
   */
  private async fetchFromAlchemy(
    config: ProviderConfig,
    address: string,
    chainId: number,
    limit: number,
    enrichWithFullDetails: boolean = false
  ): Promise<TransactionDisplay[]> {
    const networkUrls: Record<number, string> = {
      1: `https://eth-mainnet.g.alchemy.com/v2/${config.apiKey}`,
      11155111: `https://eth-sepolia.g.alchemy.com/v2/${config.apiKey}`,
      137: `https://polygon-mainnet.g.alchemy.com/v2/${config.apiKey}`,
      42161: `https://arb-mainnet.g.alchemy.com/v2/${config.apiKey}`,
      10: `https://opt-mainnet.g.alchemy.com/v2/${config.apiKey}`,
    };

    const rpcUrl = networkUrls[chainId];
    if (!rpcUrl) {
      throw new Error(`Unsupported chain ID ${chainId} for Alchemy`);
    }

    // Helper function to fetch all pages
    const fetchAllTransfers = async (
      params: any,
      transfers: any[] = [],
      pageCount: number = 0
    ): Promise<any[]> => {
      if (pageCount >= this.MAX_PAGES || transfers.length >= limit) {
        return transfers.slice(0, limit);
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let data;
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [params]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
        if (data.error) {
          throw new Error(`Alchemy API error: ${data.error.message}`);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw error;
      }

      const pageTransfers = data.result?.transfers || [];
      const allTransfers = [...transfers, ...pageTransfers];

      // Check if we need more pages
      if (data.result?.pageKey && pageTransfers.length > 0 && allTransfers.length < limit) {
        return fetchAllTransfers(
          { ...params, pageKey: data.result.pageKey },
          allTransfers,
          pageCount + 1
        );
      }

      return allTransfers.slice(0, limit);
    };

    // Calculate per-direction limit to ensure we get enough total transactions
    // Since we deduplicate later, request the full limit in each direction
    // This ensures we have enough transactions even after deduplication
    const perDirectionLimit = limit; // Request full limit in each direction

    // Fetch outgoing and incoming transactions
    const [outgoing, incoming] = await Promise.all([
      fetchAllTransfers({
        fromAddress: address,
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        withMetadata: true,
        maxCount: `0x${perDirectionLimit.toString(16)}`, // Convert to hex
        order: 'desc'
      }),
      fetchAllTransfers({
        toAddress: address,
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        withMetadata: true,
        maxCount: `0x${perDirectionLimit.toString(16)}`, // Convert to hex
        order: 'desc'
      })
    ]);

    log.info(`[TransactionManager] Fetched from Alchemy`, false, {
      outgoingCount: outgoing.length,
      incomingCount: incoming.length
    });

    // Combine and deduplicate
    const allTransfers = [...outgoing, ...incoming];
    const uniqueTransfers = Array.from(
      new Map(allTransfers.map(t => [t.hash, t])).values()
    );

    // Sort by block number descending (most recent first) and limit to requested amount
    const sortedTransfers = uniqueTransfers
      .sort((a, b) => {
        const blockA = parseInt(a.blockNum || '0', 16);
        const blockB = parseInt(b.blockNum || '0', 16);
        return blockB - blockA; // Most recent first
      })
      .slice(0, limit); // Limit to requested amount

    log.info(`[TransactionManager] After deduplication and limiting`, false, {
      totalTransfers: allTransfers.length,
      uniqueTransfers: uniqueTransfers.length,
      finalTransfers: sortedTransfers.length,
      requestedLimit: limit
    });

    // Convert to TransactionDisplay format
    let transactions = this.convertAlchemyToDisplay(sortedTransfers, address, chainId);

    // Optionally enrich with full transaction details if requested
    // Note: This will make additional API calls and may be slower
    if (enrichWithFullDetails && transactions.length > 0) {
      log.info('[TransactionManager] Enriching transactions with full details', false, {
        transactionCount: transactions.length
      });
      transactions = await this.enrichTransactionsWithFullDetails(transactions, config);
    }

    return transactions;
  }

  /**
   * Fetch transactions from Etherscan
   */
  private async fetchFromEtherscan(
    address: string,
    chainId: number,
    limit: number
  ): Promise<TransactionDisplay[]> {
    const explorer = BlockchainExplorer.getInstance();
    return explorer.getTransactionHistory(address, chainId, limit, false);
  }

  /**
   * Fetch transactions from Infura
   */
  private async fetchFromInfura(
    config: ProviderConfig,
    address: string,
    chainId: number,
    limit: number
  ): Promise<TransactionDisplay[]> {
    // Infura implementation would go here
    // For now, throw not implemented
    throw new Error('Infura provider not yet implemented');
  }

  /**
   * Convert Alchemy format to TransactionDisplay
   */
  private convertAlchemyToDisplay(
    transfers: any[],
    address: string,
    chainId: number
  ): TransactionDisplay[] {
    return transfers.map(transfer => {
      const isOutgoing = transfer.from?.toLowerCase() === address.toLowerCase();

      // Parse value - handle different formats
      let value = '0';
      if (transfer.value) {
        if (typeof transfer.value === 'string') {
          value = transfer.value;
        } else if (typeof transfer.value === 'number') {
          value = transfer.value.toString();
        }
      } else if (transfer.rawContract?.value) {
        // For token transfers
        const rawValue = BigNumberishUtils.toBigInt(transfer.rawContract.value);
        const decimals = transfer.rawContract.decimal || 18;
        value = BigNumberishUtils.format(rawValue, decimals);
      }

      // Parse timestamp - Alchemy returns ISO 8601 string like "2024-03-15T14:30:45.000Z"
      let timestamp = Date.now();
      if (transfer.metadata?.blockTimestamp) {
        // Log the raw timestamp for debugging
        log.info(`[TransactionManager] Raw blockTimestamp: ${transfer.metadata.blockTimestamp}`, false, {
          hash: transfer.hash,
          rawTimestamp: transfer.metadata.blockTimestamp
        });

        // Parse the ISO 8601 string to milliseconds
        timestamp = new Date(transfer.metadata.blockTimestamp).getTime();

        // Validate the timestamp is reasonable (not in future, not too far in past)
        const now = Date.now();
        if (timestamp > now) {
          log.warn(`[TransactionManager] Timestamp in future, using current time`, false, {
            hash: transfer.hash,
            timestamp,
            now
          });
          timestamp = now;
        }
      }

      // Calculate confirmations based on current block if available
      let confirmations = 'unknown';

      // Get block number for confirmations calculation
      let blockNumber = '0';
      if (transfer.blockNum) {
        // Alchemy returns blockNum as hex string
        blockNumber = parseInt(transfer.blockNum, 16).toString();

        // If we have metadata with block confirmation data, use it
        if (transfer.metadata?.blockNumber) {
          // Some responses may include current block info for confirmation calculation
          const currentBlock = transfer.metadata.currentBlock || transfer.metadata.latestBlock;
          if (currentBlock) {
            const confirmationCount = parseInt(currentBlock) - parseInt(blockNumber);
            confirmations = Math.max(0, confirmationCount).toString();
          }
        }
      }

      // Extract available gas data from metadata if present
      let gasPrice = undefined;
      let gasUsed = undefined;
      let nonce = undefined;

      // Some transfers may include transaction metadata
      if (transfer.metadata) {
        gasPrice = transfer.metadata.gasPrice || undefined;
        gasUsed = transfer.metadata.gasUsed || undefined;
        nonce = transfer.metadata.nonce || undefined;
      }

      // Determine transaction type based on available data
      let type: 'send' | 'receive' | 'swap' | 'contract' = isOutgoing ? 'send' : 'receive';

      // Check if this might be a contract interaction
      if (transfer.category === 'erc20' || transfer.category === 'erc721' || transfer.category === 'erc1155') {
        type = isOutgoing ? 'send' : 'receive'; // Token transfer
      } else if (transfer.category === 'internal') {
        type = 'contract'; // Internal transaction usually indicates contract interaction
      }

      return {
        hash: transfer.hash,
        from: transfer.from || '',
        to: transfer.to || '',
        value,
        timestamp,
        type,
        status: 'confirmed', // Alchemy only returns confirmed transactions
        blockNumber,
        gasPrice,
        gasUsed,
        nonce,
        chainId,
        symbol: transfer.asset || 'ETH',
        confirmations
      } as TransactionDisplay;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    log.info('[TransactionManager] Cache cleared');
  }

  /**
   * Force fetch fresh data from Etherscan only (no cache, no fallback)
   */
  async forceEtherscanFetch(address: string, chainId: number): Promise<TransactionDisplay[]> {
    try {
      // Clear cache first
      this.cache.clear();

      const explorer = BlockchainExplorer.getInstance();
      const transactions = await explorer.getTransactionHistory(address, chainId, 100, false);

      log.info('[TransactionManager] Forced Etherscan fetch completed', false, {
        count: transactions.length,
        firstTx: transactions[0]
      });

      return transactions;
    } catch (error) {
      log.error('[TransactionManager] Forced Etherscan fetch failed', false, error);
      return [];
    }
  }

  /**
   * Add a custom provider
   */
  addProvider(config: ProviderConfig): void {
    this.providers.set(config.provider, config);
    log.info(`[TransactionManager] Added provider: ${config.provider}`);
  }

  /**
   * Remove a provider
   */
  removeProvider(provider: TransactionProvider): void {
    this.providers.delete(provider);
    log.info(`[TransactionManager] Removed provider: ${provider}`);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): TransactionProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Enrich transactions with full details by making additional API calls
   * This will fetch gas, nonce, and confirmation data for each transaction
   */
  private async enrichTransactionsWithFullDetails(
    transactions: TransactionDisplay[],
    config: ProviderConfig
  ): Promise<TransactionDisplay[]> {
    const networkUrls: Record<number, string> = {
      1: `https://eth-mainnet.g.alchemy.com/v2/${config.apiKey}`,
      11155111: `https://eth-sepolia.g.alchemy.com/v2/${config.apiKey}`,
      137: `https://polygon-mainnet.g.alchemy.com/v2/${config.apiKey}`,
      42161: `https://arb-mainnet.g.alchemy.com/v2/${config.apiKey}`,
      10: `https://opt-mainnet.g.alchemy.com/v2/${config.apiKey}`,
    };

    const rpcUrl = networkUrls[transactions[0]?.chainId || 1];
    if (!rpcUrl) {
      log.warn('[TransactionManager] Cannot enrich transactions - unsupported chain', false, {
        chainId: transactions[0]?.chainId
      });
      return transactions;
    }

    // Batch request full transaction details
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        try {
          // Get full transaction details
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionByHash',
              params: [tx.hash]
            })
          });

          const data = await response.json();
          if (data.result) {
            const fullTx = data.result;

            // Get transaction receipt for gas used and status
            const receiptResponse = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'eth_getTransactionReceipt',
                params: [tx.hash]
              })
            });

            const receiptData = await receiptResponse.json();
            const receipt = receiptData.result;

            // Get current block number for confirmations
            const blockResponse = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'eth_blockNumber',
                params: []
              })
            });

            const blockData = await blockResponse.json();
            const currentBlock = blockData.result;

            // Calculate confirmations
            let confirmations = '0';
            if (currentBlock && tx.blockNumber && tx.blockNumber !== '0') {
              const confirmationCount = parseInt(currentBlock, 16) - parseInt(tx.blockNumber);
              confirmations = Math.max(0, confirmationCount).toString();
            }

            // Update transaction with enriched data
            return {
              ...tx,
              gasPrice: fullTx.gasPrice ? parseInt(fullTx.gasPrice, 16).toString() : tx.gasPrice,
              gasUsed: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16).toString() : tx.gasUsed,
              nonce: fullTx.nonce ? parseInt(fullTx.nonce, 16).toString() : tx.nonce,
              confirmations,
              status: receipt?.status === '0x1' ? 'confirmed' : (receipt?.status === '0x0' ? 'failed' : tx.status),
              txreceipt_status: receipt?.status
            } as TransactionDisplay;
          }
        } catch (error: any) {
          log.warn(`[TransactionManager] Failed to enrich transaction ${tx.hash}:`, false, error.message);
        }

        return tx; // Return original transaction if enrichment fails
      })
    );

    log.info('[TransactionManager] Transaction enrichment completed', false, {
      originalCount: transactions.length,
      enrichedCount: enrichedTransactions.length
    });

    return enrichedTransactions;
  }
}
