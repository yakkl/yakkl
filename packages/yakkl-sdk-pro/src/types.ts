/**
 * YAKKL SDK Pro Type Definitions
 */

export interface ProClientConfig {
  apiKey: string;
  provider?: any;
  analytics?: AnalyticsConfig;
  trading?: TradingConfig;
  defi?: DeFiConfig;
  mev?: MEVConfig;
  portfolio?: PortfolioConfig;
}

export interface AnalyticsConfig {
  enableML?: boolean;
  cacheTimeout?: number;
  dataProviders?: string[];
}

export interface TradingConfig {
  slippageTolerance?: number;
  gasStrategy?: 'slow' | 'standard' | 'fast' | 'custom';
  preferredDEXs?: string[];
  enableMEVProtection?: boolean;
}

export interface DeFiConfig {
  autoCompound?: boolean;
  minYield?: number;
  maxGasForCompound?: bigint;
  protocols?: string[];
}

export interface MEVConfig {
  alwaysUsePrivateMempool?: boolean;
  flashbotsEnabled?: boolean;
  maxBribePercent?: number;
}

export interface PortfolioConfig {
  taxMethod?: 'FIFO' | 'LIFO' | 'HIFO';
  rebalancingThreshold?: number;
  trackingAddresses?: string[];
}