// BlockchainExplorer.ts - Service to fetch transaction history from blockchain explorers

import { log } from '$lib/managers/Logger';
import type { TransactionDisplay } from '$lib/types';
import { ethers } from 'ethers-v6';
import { etherscanRateLimiter } from '$lib/utils/rateLimiter';

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  chainId: number;
}

export interface ExplorerTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timeStamp: string;
  isError: string;
  txreceipt_status: string;
  gas: string;
  gasPrice: string;
  gasUsed?: string;
  nonce?: string;
  functionName?: string;
  methodId?: string;
  confirmations?: string;
}

import { getExplorerApiConfig } from '$lib/config/chains';

export class BlockchainExplorer {
  private static instance: BlockchainExplorer;
  private cache: Map<string, { data: TransactionDisplay[], timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): BlockchainExplorer {
    if (!BlockchainExplorer.instance) {
      BlockchainExplorer.instance = new BlockchainExplorer();
    }
    return BlockchainExplorer.instance;
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
        log.debug('Returning cached transaction history', false);
        return cached.data;
      }
      
      const config = getExplorerApiConfig(chainId, isBackgroundContext);
      
      if (!config) {
        log.warn('No explorer config found for chain:', false, chainId);
        return [];
      }

      // Fetch transactions with rate limiting to avoid Etherscan's 2/sec limit
      const [normalTxs, internalTxs, tokenTxs] = await Promise.all([
        // Fetch normal transactions
        etherscanRateLimiter.throttle(() =>
          this.fetchTransactions(config, address, 'txlist', limit)
        ),
        
        // Fetch internal transactions (contract interactions)
        etherscanRateLimiter.throttle(() =>
          this.fetchTransactions(config, address, 'txlistinternal', limit)
        ),
        
        // Fetch token transfers
        etherscanRateLimiter.throttle(() =>
          this.fetchTransactions(config, address, 'tokentx', limit)
        )
      ]);

      // Combine and sort all transactions
      const allTransactions = [...normalTxs, ...internalTxs, ...tokenTxs];
      
      // Remove duplicates by hash
      const uniqueTransactions = this.removeDuplicates(allTransactions);
      
      // Sort by timestamp descending
      uniqueTransactions.sort((a, b) => 
        parseInt(b.timeStamp) - parseInt(a.timeStamp)
      );

      // Take only the requested limit
      const limitedTransactions = uniqueTransactions.slice(0, limit);

      // Convert to display format
      const displayTransactions = limitedTransactions.map(tx => 
        this.convertToDisplayFormat(tx, address, chainId)
      );
      
      log.info('BlockchainExplorer: Transaction processing complete', false, {
        totalFetched: allTransactions.length,
        uniqueCount: uniqueTransactions.length,
        limitedCount: limitedTransactions.length,
        displayCount: displayTransactions.length,
        firstTransaction: displayTransactions[0],
        // Show sample of raw transactions before conversion
        sampleRawTransactions: limitedTransactions.slice(0, 2).map(tx => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          timeStamp: tx.timeStamp
        })),
        // Show sample of converted transactions
        sampleDisplayTransactions: displayTransactions.slice(0, 2).map(tx => ({
          hash: tx.hash,
          type: tx.type,
          value: tx.value,
          timestamp: tx.timestamp,
          status: tx.status
        }))
      });
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: displayTransactions,
        timestamp: Date.now()
      });
      
      return displayTransactions;
    } catch (error) {
      log.error('Failed to fetch transaction history:', false, error);
      return [];
    }
  }

  private async fetchTransactions(
    config: ExplorerConfig,
    address: string,
    action: string,
    limit: number
  ): Promise<ExplorerTransaction[]> {
    try {
      const params = new URLSearchParams();
      
      // Add chainid first for v2 API endpoints
      if (config.baseUrl.includes('/v2/api')) {
        params.append('chainid', config.chainId.toString());
      }
      
      // Add other parameters in the correct order
      params.append('module', 'account');
      params.append('action', action);
      params.append('address', address);
      params.append('startblock', '0');
      params.append('endblock', '99999999');
      params.append('page', '1');
      params.append('offset', limit.toString());
      params.append('sort', 'desc');

      // Only add API key if it's not an empty string
      if (config.apiKey && config.apiKey.trim() !== '') {
        params.append('apikey', config.apiKey);
      }

      const url = `${config.baseUrl}?${params.toString()}`;
      
      // Log the API request for debugging (hide API key)
      const debugUrl = config.apiKey ? url.replace(config.apiKey, 'API_KEY_HIDDEN') : url;
      log.debug(`Fetching ${action} from ${config.name}:`, false, {
        url: debugUrl,
        chainId: config.chainId,
        address,
        action
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Log the API response for debugging
      log.debug(`Response from ${config.name} ${action}:`, false, {
        status: data.status,
        message: data.message,
        resultCount: Array.isArray(data.result) ? data.result.length : typeof data.result,
        // Log first few transactions for debugging
        sampleTransactions: Array.isArray(data.result) ? data.result.slice(0, 3).map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          timeStamp: tx.timeStamp,
          blockNumber: tx.blockNumber,
          tokenSymbol: tx.tokenSymbol,
          tokenName: tx.tokenName,
          contractAddress: tx.contractAddress,
          functionName: tx.functionName,
          methodId: tx.methodId,
          isError: tx.isError
        })) : null
      });
      
      if (data.status === '1' && Array.isArray(data.result)) {
        log.info(`Successfully fetched ${data.result.length} ${action} transactions`, false, {
          chainId: config.chainId,
          address,
          firstTxHash: data.result[0]?.hash,
          lastTxHash: data.result[data.result.length - 1]?.hash
        });
        return data.result;
      }

      if (data.status === '0' && data.message === 'No transactions found') {
        return [];
      }

      // Handle rate limit error
      if (data.status === '0' && data.message === 'NOTOK' && 
          data.result?.includes('rate limit')) {
        log.error('Etherscan rate limit exceeded:', false, data.result);
        // Return empty array to avoid breaking the UI
        return [];
      }

      // Handle missing API key
      if (data.status === '0' && data.result === 'Invalid API Key') {
        log.warn('Explorer API key missing or invalid. Transactions will not be shown.');
        return [];
      }

      log.warn('Unexpected response from explorer:', false, {
        status: data.status,
        message: data.message,
        result: typeof data.result === 'string' ? data.result : 'see console',
        fullData: data
      });
      return [];
    } catch (error) {
      log.error(`Failed to fetch ${action} from ${config.name}:`, false, error);
      return [];
    }
  }

  private removeDuplicates(transactions: ExplorerTransaction[]): ExplorerTransaction[] {
    const seen = new Set<string>();
    return transactions.filter(tx => {
      if (seen.has(tx.hash)) {
        return false;
      }
      seen.add(tx.hash);
      return true;
    });
  }

  private convertToDisplayFormat(
    tx: ExplorerTransaction,
    userAddress: string,
    chainId: number
  ): TransactionDisplay {
    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();
    const user = userAddress.toLowerCase();

    let type: 'send' | 'receive' | 'swap' | 'contract' = 'send';
    
    if (from === user && to !== user) {
      type = 'send';
    } else if (from !== user && to === user) {
      type = 'receive';
    } else if (tx.functionName?.includes('swap') || tx.methodId === '0x7ff36ab5') {
      type = 'swap';
    } else if (tx.functionName || tx.methodId) {
      type = 'contract';
    }

    let status: 'pending' | 'confirmed' | 'failed' = 'confirmed';
    
    if (tx.isError === '1' || tx.txreceipt_status === '0') {
      status = 'failed';
    } else if (!tx.confirmations || parseInt(tx.confirmations) < 12) {
      status = 'pending';
    }

    // Convert value from wei to ETH
    let displayValue = '0';
    try {
      const valueInWei = ethers.getBigInt(tx.value || '0');
      displayValue = ethers.formatEther(valueInWei);
    } catch (e) {
      log.warn('Failed to parse transaction value:', false, { value: tx.value, error: e });
    }

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: displayValue,
      timestamp: parseInt(tx.timeStamp) * 1000, // Convert to milliseconds
      status,
      type,
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      blockNumber: tx.blockNumber,
      nonce: tx.nonce,
      confirmations: tx.confirmations,
      functionName: tx.functionName,
      methodId: tx.methodId,
      txreceipt_status: tx.txreceipt_status,
      chainId // Add chainId for multi-chain support
    };
  }

  // Get explorer URL for a transaction
  getTransactionUrl(chainId: number, txHash: string): string {
    const { getExplorerTxUrl } = require('$lib/config/chains');
    return getExplorerTxUrl(chainId, txHash);
  }

  // Get explorer URL for an address
  getAddressUrl(chainId: number, address: string): string {
    const { getExplorerAddressUrl } = require('$lib/config/chains');
    return getExplorerAddressUrl(chainId, address);
  }
}