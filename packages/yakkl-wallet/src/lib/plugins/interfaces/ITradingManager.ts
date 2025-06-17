import type { PlanType } from '$lib/common';

/**
 * Trading data interfaces
 */
export interface BasicChartData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  timestamp: number;
}

export interface AdvancedChartData extends BasicChartData {
  technicalIndicators: TechnicalIndicators;
  priceHistory: PricePoint[];
  volumeProfile: VolumeProfile[];
  orderBook?: OrderBookData;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  support: number[];
  resistance: number[];
}

export interface PricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeProfile {
  price: number;
  volume: number;
  percentage: number;
}

export interface OrderBookData {
  bids: Array<[number, number]>; // [price, quantity]
  asks: Array<[number, number]>; // [price, quantity]
  spread: number;
  timestamp: number;
}

export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  route: SwapRoute[];
  fees: SwapFees;
  slippage: number;
  priceImpact: number;
  gasEstimate: string;
  estimatedGas: string;
  deadline: number;
}

export interface SwapRoute {
  protocol: string;
  pool: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  liquidity: string;
}

export interface SwapFees {
  platform: string;
  protocol: string;
  gas: string;
  total: string;
}

export interface TradingAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  signals: TradingSignal[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'buy' | 'sell' | 'hold';
  targetPrice?: number;
  stopLoss?: number;
}

export interface TradingSignal {
  type: 'buy' | 'sell' | 'hold';
  strength: number; // 0-100
  source: string;
  reason: string;
  timestamp: number;
}

/**
 * Trading Manager Interface
 * Defines the contract for both standard and pro trading functionality
 */
export interface ITradingManager {
  /**
   * Get basic chart data (available in standard plan)
   */
  getBasicChartData(symbol: string): Promise<BasicChartData>;

  /**
   * Get advanced chart data with technical indicators (PRO feature)
   */
  getAdvancedChartData(symbol: string): Promise<AdvancedChartData>;

  /**
   * Get technical analysis (PRO feature)
   */
  getTechnicalAnalysis(symbol: string): Promise<TechnicalIndicators>;

  /**
   * Get trading analysis with AI insights (PRO feature)
   */
  getTradingAnalysis(symbol: string): Promise<TradingAnalysis>;

  /**
   * Get enhanced swap quote with advanced routing (PRO feature)
   */
  getAdvancedSwapQuote(
    inputToken: string,
    outputToken: string,
    amount: string,
    slippage?: number
  ): Promise<SwapQuote>;

  /**
   * Get basic swap quote (available in standard plan)
   */
  getBasicSwapQuote(
    inputToken: string,
    outputToken: string,
    amount: string
  ): Promise<Partial<SwapQuote>>;

  /**
   * Initialize the trading manager
   */
  initialize(planType: PlanType): Promise<void>;

  /**
   * Check if advanced features are available
   */
  isAdvancedFeaturesEnabled(): boolean;

  /**
   * Clean up resources
   */
  dispose(): Promise<void>;
}