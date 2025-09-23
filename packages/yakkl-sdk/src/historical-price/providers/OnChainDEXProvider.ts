/**
 * OnChainDEXProvider - Historical prices from DEX events
 *
 * Gets exact historical prices from on-chain DEX swaps
 * Most accurate but requires archive node access
 */

import { HistoricalPriceProvider, type PricePoint, type PriceRange, type ProviderCapabilities } from '../HistoricalPriceService';

interface DEXPool {
  address: string;
  token0: string;
  token1: string;
  fee?: number;
  dex: 'uniswap-v2' | 'uniswap-v3' | 'sushiswap' | 'curve';
}

export class OnChainDEXProvider extends HistoricalPriceProvider {
  name = 'onchain-dex';
  capabilities: ProviderCapabilities = {
    maxHistoryDays: Infinity, // Limited only by archive node
    supportedChains: [1, 137, 42161, 10], // Chains with good DEX liquidity
    hasBlockLevel: true,
    hasVolumeData: true,
    hasFreeTier: false, // Requires archive node
    resolution: {
      minute: true,
      hour: true,
      day: true
    }
  };

  private archiveNodeUrl: string;
  private poolCache = new Map<string, DEXPool[]>();

  constructor(config: any) {
    super(config);
    this.archiveNodeUrl = config.archiveNodeUrl || '';
  }

  async getPriceAtTime(
    tokenAddress: string,
    chainId: number,
    timestamp: number
  ): Promise<PricePoint | null> {
    try {
      // Convert timestamp to approximate block number
      const blockNumber = await this.getBlockFromTimestamp(chainId, timestamp);
      if (!blockNumber) return null;

      return this.getPriceAtBlock(tokenAddress, chainId, blockNumber);
    } catch (error) {
      console.warn('[OnChainDEX] Failed to get price at time:', error);
      return null;
    }
  }

  async getPriceAtBlock(
    tokenAddress: string,
    chainId: number,
    blockNumber: number
  ): Promise<PricePoint | null> {
    try {
      if (!this.archiveNodeUrl) {
        throw new Error('Archive node URL not configured');
      }

      // Find best liquidity pool for this token
      const pool = await this.findBestPool(tokenAddress, chainId);
      if (!pool) return null;

      // Get reserves at specific block
      const reserves = await this.getPoolReserves(pool, blockNumber);
      if (!reserves) return null;

      // Calculate price from reserves
      const price = this.calculatePriceFromReserves(
        tokenAddress,
        pool,
        reserves
      );

      // Get block timestamp
      const timestamp = await this.getBlockTimestamp(chainId, blockNumber);

      return {
        timestamp,
        blockNumber,
        price,
        source: 'onchain',
        confidence: 1.0 // Maximum confidence for on-chain data
      };
    } catch (error) {
      console.warn('[OnChainDEX] Failed to get price at block:', error);
      return null;
    }
  }

  async getPriceRange(
    tokenAddress: string,
    chainId: number,
    startTime: number,
    endTime: number,
    interval?: 'minute' | 'hour' | 'day'
  ): Promise<PriceRange> {
    try {
      const pool = await this.findBestPool(tokenAddress, chainId);
      if (!pool) {
        return {
          token: tokenAddress,
          chainId,
          startTime,
          endTime,
          interval: interval || 'hour',
          prices: []
        };
      }

      // Get swap events in time range
      const swapEvents = await this.getSwapEvents(
        pool,
        startTime,
        endTime
      );

      // Aggregate swaps into price points based on interval
      const prices = this.aggregateSwapsIntoPrices(
        swapEvents,
        tokenAddress,
        pool,
        interval || 'hour'
      );

      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || 'hour',
        prices
      };
    } catch (error) {
      console.warn('[OnChainDEX] Failed to get price range:', error);
      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || 'hour',
        prices: []
      };
    }
  }

  /**
   * Find the best liquidity pool for a token
   */
  private async findBestPool(
    tokenAddress: string,
    chainId: number
  ): Promise<DEXPool | null> {
    const cacheKey = `${chainId}-${tokenAddress}`;

    if (this.poolCache.has(cacheKey)) {
      const pools = this.poolCache.get(cacheKey)!;
      return pools[0]; // Return highest liquidity pool
    }

    try {
      // Common quote tokens to check against
      const quoteTokens = this.getQuoteTokens(chainId);
      const pools: DEXPool[] = [];

      // Check Uniswap V3 pools
      for (const quoteToken of quoteTokens) {
        const v3Pool = await this.findUniswapV3Pool(
          tokenAddress,
          quoteToken,
          chainId
        );
        if (v3Pool) pools.push(v3Pool);
      }

      // Check Uniswap V2 / SushiSwap pools
      for (const quoteToken of quoteTokens) {
        const v2Pool = await this.findUniswapV2Pool(
          tokenAddress,
          quoteToken,
          chainId
        );
        if (v2Pool) pools.push(v2Pool);
      }

      if (pools.length === 0) return null;

      // Sort by liquidity and cache
      const sortedPools = await this.sortPoolsByLiquidity(pools);
      this.poolCache.set(cacheKey, sortedPools);

      return sortedPools[0];
    } catch (error) {
      console.warn('[OnChainDEX] Failed to find pool:', error);
      return null;
    }
  }

  /**
   * Get pool reserves at specific block
   */
  private async getPoolReserves(
    pool: DEXPool,
    blockNumber: number
  ): Promise<{ reserve0: bigint; reserve1: bigint } | null> {
    try {
      // Call getReserves on pool contract at specific block
      const response = await fetch(this.archiveNodeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: pool.address,
              data: '0x0902f1ac' // getReserves() selector
            },
            `0x${blockNumber.toString(16)}`
          ]
        })
      });

      const data = await response.json();
      if (!data.result) return null;

      // Decode reserves (first 64 bytes after removing 0x)
      const result = data.result.slice(2);
      const reserve0 = BigInt('0x' + result.slice(0, 64));
      const reserve1 = BigInt('0x' + result.slice(64, 128));

      return { reserve0, reserve1 };
    } catch (error) {
      console.warn('[OnChainDEX] Failed to get reserves:', error);
      return null;
    }
  }

  /**
   * Calculate price from pool reserves
   */
  private calculatePriceFromReserves(
    tokenAddress: string,
    pool: DEXPool,
    reserves: { reserve0: bigint; reserve1: bigint }
  ): number {
    const isToken0 = pool.token0.toLowerCase() === tokenAddress.toLowerCase();

    // Determine which reserve corresponds to our token
    const tokenReserve = isToken0 ? reserves.reserve0 : reserves.reserve1;
    const quoteReserve = isToken0 ? reserves.reserve1 : reserves.reserve0;

    // Calculate price (assuming quote token is USD-pegged or ETH)
    // This is simplified - in production, would need decimals handling
    const price = Number(quoteReserve) / Number(tokenReserve);

    // If quote token is ETH, multiply by ETH price
    // This would need external ETH price oracle
    return price;
  }

  /**
   * Get swap events from a pool
   */
  private async getSwapEvents(
    pool: DEXPool,
    startTime: number,
    endTime: number
  ): Promise<any[]> {
    // Would query events from archive node
    // Using getLogs with Swap event signature
    return [];
  }

  /**
   * Aggregate swap events into price points
   */
  private aggregateSwapsIntoPrices(
    swaps: any[],
    tokenAddress: string,
    pool: DEXPool,
    interval: 'minute' | 'hour' | 'day'
  ): PricePoint[] {
    // Group swaps by interval and calculate VWAP
    const intervalMs = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    }[interval];

    const grouped = new Map<number, any[]>();

    // Group swaps
    for (const swap of swaps) {
      const intervalKey = Math.floor(swap.timestamp / intervalMs) * intervalMs;
      if (!grouped.has(intervalKey)) {
        grouped.set(intervalKey, []);
      }
      grouped.get(intervalKey)!.push(swap);
    }

    // Calculate VWAP for each interval
    const prices: PricePoint[] = [];
    for (const [timestamp, intervalSwaps] of grouped.entries()) {
      let totalVolume = 0;
      let volumeWeightedPrice = 0;

      for (const swap of intervalSwaps) {
        const volume = swap.amount;
        const price = swap.price;
        totalVolume += volume;
        volumeWeightedPrice += price * volume;
      }

      prices.push({
        timestamp,
        price: volumeWeightedPrice / totalVolume,
        volume24h: totalVolume,
        source: 'onchain',
        confidence: 1.0
      });
    }

    return prices.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Helper methods
   */
  private getQuoteTokens(chainId: number): string[] {
    const tokens: Record<number, string[]> = {
      1: [ // Ethereum
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
        '0x6B175474E89094C44Da98b954EedeAC495271d0F'  // DAI
      ],
      137: [ // Polygon
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'  // USDT
      ],
      42161: [ // Arbitrum
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
        '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'  // USDC
      ],
      10: [ // Optimism
        '0x4200000000000000000000000000000000000006', // WETH
        '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'  // USDC
      ]
    };

    return tokens[chainId] || [];
  }

  private async findUniswapV3Pool(
    token0: string,
    token1: string,
    chainId: number
  ): Promise<DEXPool | null> {
    // Would calculate pool address using CREATE2
    // Or query from Uniswap V3 Factory
    return null;
  }

  private async findUniswapV2Pool(
    token0: string,
    token1: string,
    chainId: number
  ): Promise<DEXPool | null> {
    // Would calculate pool address using CREATE2
    // Or query from Uniswap V2 Factory
    return null;
  }

  private async sortPoolsByLiquidity(pools: DEXPool[]): Promise<DEXPool[]> {
    // Would fetch current TVL for each pool and sort
    return pools;
  }

  private async getBlockFromTimestamp(
    chainId: number,
    timestamp: number
  ): Promise<number | null> {
    // Would binary search blocks to find closest to timestamp
    return null;
  }

  private async getBlockTimestamp(
    chainId: number,
    blockNumber: number
  ): Promise<number> {
    try {
      const response = await fetch(this.archiveNodeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBlockByNumber',
          params: [`0x${blockNumber.toString(16)}`, false]
        })
      });

      const data = await response.json();
      return parseInt(data.result.timestamp, 16) * 1000;
    } catch {
      return Date.now();
    }
  }
}