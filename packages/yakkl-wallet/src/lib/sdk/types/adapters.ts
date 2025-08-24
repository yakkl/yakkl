/**
 * Type Adapters - Bridge legacy types with SDK types
 * 
 * This module provides adapters and converters to handle type conflicts
 * between the legacy /lib/common/types and the new SDK types.
 */

import type { 
  BlockTag as LegacyBlockTag
} from '$lib/common/types';

import type {
  BigNumberish as LegacyBigNumberish
} from '$lib/common/bignumber';

import type {
  TransactionResponse as LegacyTransactionResponse,
  TransactionReceipt as LegacyTransactionReceipt
} from '$lib/common/interfaces';

import type {
  Filter as LegacyFilter,
  Log as LegacyLog,
  FeeData as LegacyFeeData
} from '$lib/common/evm';

import type {
  BlockTag as SDKBlockTag,
  BigNumberish as SDKBigNumberish,
  TransactionResponse as SDKTransactionResponse,
  TransactionReceipt as SDKTransactionReceipt,
  Filter as SDKFilter,
  Log as SDKLog,
  FeeData as SDKFeeData
} from '../providers/base/BaseProvider';

// Union types for maximum compatibility
export type CompatibleBlockTag = LegacyBlockTag | SDKBlockTag;
export type CompatibleBigNumberish = LegacyBigNumberish | SDKBigNumberish;
export type CompatibleFilter = LegacyFilter | SDKFilter;
export type CompatibleLog = LegacyLog | SDKLog;

// Unified types that work with both systems
export type UnifiedBigNumberish = string | number | bigint;
export type UnifiedFeeData = {
  gasPrice: bigint;
  lastBaseFeePerGas?: bigint | null;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
};

// Enhanced interfaces that include all required properties
export interface EnhancedTransactionReceipt extends SDKTransactionReceipt {
  // Add missing properties from legacy system
  logsBloom?: string;
  confirmations?: number;
  type?: number;
  byzantium?: boolean;
  root?: string;
}

export interface EnhancedTransactionResponse extends SDKTransactionResponse {
  // Add missing properties
  type?: number;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  accessList?: Array<{
    address: string;
    storageKeys: string[];
  }>;
  chainId?: number;
}

// Type guards
export function isSDKBlockTag(blockTag: CompatibleBlockTag): blockTag is SDKBlockTag {
  return typeof blockTag === 'object' && blockTag !== null && 
    ('blockHash' in blockTag || 'blockNumber' in blockTag);
}

export function isLegacyBlockTag(blockTag: CompatibleBlockTag): blockTag is LegacyBlockTag {
  return typeof blockTag === 'string' || typeof blockTag === 'number' || typeof blockTag === 'bigint';
}

// Converters
export class TypeAdapterUtils {
  /**
   * Convert any BlockTag to a string format suitable for RPC calls
   */
  static normalizeBlockTag(blockTag?: CompatibleBlockTag): string {
    if (!blockTag) return 'latest';
    
    if (typeof blockTag === 'string') {
      return blockTag;
    }
    
    if (typeof blockTag === 'number') {
      return `0x${blockTag.toString(16)}`;
    }
    
    if (typeof blockTag === 'bigint') {
      return `0x${blockTag.toString(16)}`;
    }
    
    // Handle SDK BlockTag object format
    if (typeof blockTag === 'object' && blockTag !== null) {
      if ('blockHash' in blockTag && blockTag.blockHash) {
        return blockTag.blockHash;
      }
      if ('blockNumber' in blockTag && blockTag.blockNumber !== undefined) {
        const num = typeof blockTag.blockNumber === 'string' 
          ? parseInt(blockTag.blockNumber, 16)
          : blockTag.blockNumber;
        return `0x${num.toString(16)}`;
      }
    }
    
    return 'latest';
  }

  /**
   * Convert BigNumberish to bigint
   */
  static toBigInt(value: CompatibleBigNumberish): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'number') {
      return BigInt(value);
    }
    if (typeof value === 'string') {
      // Handle hex strings
      if (value.startsWith('0x')) {
        return BigInt(value);
      }
      return BigInt(value);
    }
    if (value === null || value === undefined) {
      return BigInt(0);
    }
    
    // Handle legacy BigNumber objects if they have toString method
    if (typeof value === 'object' && value !== null && 'toString' in value) {
      return BigInt(value.toString());
    }
    
    return BigInt(0);
  }

  /**
   * Convert FeeData to unified format
   */
  static toUnifiedFeeData(feeData: any): UnifiedFeeData {
    return {
      gasPrice: this.toBigInt(feeData.gasPrice),
      lastBaseFeePerGas: feeData.lastBaseFeePerGas ? this.toBigInt(feeData.lastBaseFeePerGas) : null,
      maxFeePerGas: feeData.maxFeePerGas ? this.toBigInt(feeData.maxFeePerGas) : null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? this.toBigInt(feeData.maxPriorityFeePerGas) : null,
    };
  }

  /**
   * Normalize BigNumberish parameter for method signatures
   */
  static normalizeBigNumberish(value: any): UnifiedBigNumberish {
    if (typeof value === 'bigint' || typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '0';
    }
    if (typeof value === 'object' && 'toString' in value) {
      return value.toString();
    }
    return String(value);
  }

  /**
   * Convert bigint to hex string for RPC calls
   */
  static toHex(value: bigint | number | string): string {
    if (typeof value === 'bigint') {
      return `0x${value.toString(16)}`;
    }
    if (typeof value === 'number') {
      return `0x${value.toString(16)}`;
    }
    if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        return value;
      }
      return `0x${parseInt(value).toString(16)}`;
    }
    return '0x0';
  }

  /**
   * Enhance TransactionReceipt with missing properties
   */
  static enhanceTransactionReceipt(receipt: SDKTransactionReceipt): EnhancedTransactionReceipt {
    return {
      ...receipt,
      logsBloom: receipt.logsBloom || '0x0',
      confirmations: receipt.confirmations || 0,
      type: receipt.type || 0,
      byzantium: true, // Default for modern networks
    };
  }

  /**
   * Enhance TransactionResponse with missing properties
   */
  static enhanceTransactionResponse(response: SDKTransactionResponse): EnhancedTransactionResponse {
    return {
      ...response,
      type: response.type || 2, // Default to type 2 (EIP-1559)
      confirmations: response.confirmations || 0,
      maxFeePerGas: response.maxFeePerGas ? BigInt(response.maxFeePerGas.toString()) : undefined,
      maxPriorityFeePerGas: response.maxPriorityFeePerGas ? BigInt(response.maxPriorityFeePerGas.toString()) : undefined,
    };
  }

  /**
   * Create a compatible Filter object
   */
  static createCompatibleFilter(filter: LegacyFilter | SDKFilter): SDKFilter {
    return {
      address: filter.address,
      topics: filter.topics,
      fromBlock: filter.fromBlock ? TypeAdapterUtils.normalizeBlockTagForSDK(filter.fromBlock) : undefined,
      toBlock: filter.toBlock ? TypeAdapterUtils.normalizeBlockTagForSDK(filter.toBlock) : undefined,
    };
  }

  /**
   * Normalize BlockTag values for SDK compatibility
   */
  private static normalizeBlockTagForSDK(blockTag: any): SDKBlockTag {
    if (typeof blockTag === 'string') {
      return blockTag;
    }
    if (typeof blockTag === 'number') {
      return blockTag;
    }
    if (typeof blockTag === 'bigint') {
      return Number(blockTag);
    }
    // Handle BigNumber or other numeric types
    if (blockTag != null && typeof blockTag.toString === 'function') {
      const str = blockTag.toString();
      const num = parseInt(str, 10);
      return isNaN(num) ? str : num;
    }
    return blockTag;
  }


  /**
   * Safely convert any value to string for logging/display
   */
  static safeToString(value: unknown): string {
    if (value === null || value === undefined) {
      return '0';
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value === 'object' && 'toString' in value) {
      return value.toString();
    }
    return String(value);
  }
}

// Provider config adapter for async/sync compatibility
export interface CompatibleProviderConfig {
  baseURL: string;
  apiKey: string | null;
  network: string;
}

export class ProviderConfigAdapter {
  private static configCache = new Map<string, CompatibleProviderConfig>();

  /**
   * Cache and synchronously return provider config
   */
  static cacheConfig(key: string, config: CompatibleProviderConfig): void {
    this.configCache.set(key, config);
  }

  /**
   * Get cached config synchronously
   */
  static getCachedConfig(provider: string, chainId: number): CompatibleProviderConfig | null {
    const key = `${provider}-${chainId}`;
    return this.configCache.get(key) || null;
  }

  /**
   * Clear config cache
   */
  static clearCache(): void {
    this.configCache.clear();
  }
}