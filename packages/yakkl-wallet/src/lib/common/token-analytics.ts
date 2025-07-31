// token-analytics.ts - Basic vs Pro token data interfaces and utilities

import type { TokenData } from './interfaces';
import { BigNumberishUtils } from './BigNumberishUtils';
import { DecimalMath } from './DecimalMath';

export interface BasicTokenAnalytics {
	symbol: string;
	balance: string | bigint;
	currentPrice: number;
	value: number;
	name: string;
	address: string;
	decimals: number;
	logoURI?: string;
}

export interface ProTokenAnalytics extends BasicTokenAnalytics {
	priceChange24h: number;
	priceChange7d: number;
	priceChange30d: number;
	sparkline: number[];
	marketCap: number;
	volume24h: number;
	circulatingSupply: number;
	totalSupply: number;
	customAlerts: TokenAlert[];
	yieldOpportunities: YieldOpportunity[];
	riskScore: number;
	liquidityScore: number;
	taxImplications: TaxInfo;
	socialSentiment: SocialSentiment;
	technicalIndicators: TechnicalIndicators;
	correlations: TokenCorrelation[];
}

export interface TokenAlert {
	id: string;
	type: 'price_above' | 'price_below' | 'volume_spike' | 'market_cap_change';
	value: number;
	isActive: boolean;
	createdAt: string;
}

export interface YieldOpportunity {
	protocol: string;
	apy: number;
	tvl: number;
	riskLevel: 'low' | 'medium' | 'high';
	description: string;
}

export interface TaxInfo {
	costBasis?: number;
	unrealizedGainLoss?: number;
	holdingPeriod?: number;
	taxLot?: TaxLot[];
}

export interface TaxLot {
	purchaseDate: string;
	amount: number;
	price: number;
	costBasis: number;
}

export interface SocialSentiment {
	score: number; // -1 to 1
	mentions24h: number;
	trendingScore: number;
	newsEvents: NewsEvent[];
}

export interface NewsEvent {
	title: string;
	summary: string;
	sentiment: 'positive' | 'negative' | 'neutral';
	source: string;
	publishedAt: string;
}

export interface TechnicalIndicators {
	rsi: number;
	macd: {
		signal: number;
		histogram: number;
		macd: number;
	};
	movingAverages: {
		ma7: number;
		ma25: number;
		ma50: number;
		ma200: number;
	};
	support: number[];
	resistance: number[];
}

export interface TokenCorrelation {
	symbol: string;
	correlation: number; // -1 to 1
	timeframe: '24h' | '7d' | '30d';
}

export interface FeatureDifferentiation {
	basic: {
		tokenVisibility: 'all';
		priceUpdates: '5min_auto';
		analytics: 'basic_only';
		swapFees: 'standard';
		portfolioRefresh: 'manual';
	};
	pro: {
		tokenVisibility: 'all';
		priceUpdates: 'real_time';
		analytics: 'full_suite';
		swapFees: 'optimized';
		portfolioRefresh: 'auto_and_manual';
		mevProtection: true;
		batchOperations: true;
		customGrouping: true;
		multiCurrency: true;
		advancedCharts: true;
		yieldFarming: true;
		taxReporting: true;
		priceAlerts: true;
		socialSentiment: true;
		riskAnalytics: true;
	};
}

/**
 * Transforms a basic TokenData to BasicTokenAnalytics
 */
export function toBasicAnalytics(token: TokenData): BasicTokenAnalytics {
	return {
		symbol: token.symbol,
		balance: token.balance.toString() || '0',
		currentPrice: BigNumberishUtils.toNumber(token.price?.price || 0),
		value: calculateTokenValue(token),
		name: token.name,
		address: token.address,
		decimals: token.decimals || 18,
		logoURI: token.logoURI
	};
}

/**
 * Transforms a TokenData to ProTokenAnalytics (with mock enhanced data for demo)
 */
export function toProAnalytics(token: TokenData): ProTokenAnalytics {
	const basic = toBasicAnalytics(token);

	// In a real implementation, this data would come from various APIs
	return {
		...basic,
		priceChange24h: generateMockPriceChange(),
		priceChange7d: generateMockPriceChange(),
		priceChange30d: generateMockPriceChange(),
		sparkline: generateMockSparkline(),
		marketCap: generateMockMarketCap(),
		volume24h: generateMockVolume(),
		circulatingSupply: 1000000000,
		totalSupply: 1000000000,
		customAlerts: [],
		yieldOpportunities: generateMockYieldOps(),
		riskScore: Math.random() * 10,
		liquidityScore: Math.random() * 10,
		taxImplications: {},
		socialSentiment: generateMockSentiment(),
		technicalIndicators: generateMockTechnicals(),
		correlations: generateMockCorrelations()
	};
}

/**
 * Calculates the USD value of a token holding
 */
export function calculateTokenValue(token: TokenData): number {
	if (!token.balance || !token.price?.price) return 0;

	let balanceNum: number;
	if (typeof token.balance === 'bigint') {
		balanceNum = Number(token.balance) / Math.pow(10, token.decimals || 18);
	} else {
		balanceNum = Number(token.balance);
	}

	return DecimalMath.of(balanceNum).mul(BigNumberishUtils.toNumber(token.price.price)).toNumber();
}

/**
 * Determines if a user should see Pro features
 */
export function shouldShowProFeatures(userPlan: string): boolean {
	return userPlan !== 'explorer_member';
}

// Mock data generators for demo purposes
function generateMockPriceChange(): number {
	return (Math.random() - 0.5) * 20; // -10% to +10%
}

function generateMockSparkline(): number[] {
	const points = [];
	let current = 100;
	for (let i = 0; i < 24; i++) {
		current += (Math.random() - 0.5) * 5;
		points.push(current);
	}
	return points;
}

function generateMockMarketCap(): number {
	return Math.random() * 10000000000; // Up to 10B
}

function generateMockVolume(): number {
	return Math.random() * 1000000000; // Up to 1B
}

function generateMockYieldOps(): YieldOpportunity[] {
	return [
		{
			protocol: 'Compound',
			apy: 5.2,
			tvl: 1000000,
			riskLevel: 'low',
			description: 'Supply tokens to earn interest'
		},
		{
			protocol: 'Uniswap V3',
			apy: 12.8,
			tvl: 500000,
			riskLevel: 'medium',
			description: 'Provide liquidity in concentrated range'
		}
	];
}

function generateMockSentiment(): SocialSentiment {
	return {
		score: (Math.random() - 0.5) * 2,
		mentions24h: Math.floor(Math.random() * 1000),
		trendingScore: Math.random() * 100,
		newsEvents: []
	};
}

function generateMockTechnicals(): TechnicalIndicators {
	return {
		rsi: Math.random() * 100,
		macd: {
			signal: Math.random() * 2 - 1,
			histogram: Math.random() * 2 - 1,
			macd: Math.random() * 2 - 1
		},
		movingAverages: {
			ma7: Math.random() * 1000,
			ma25: Math.random() * 1000,
			ma50: Math.random() * 1000,
			ma200: Math.random() * 1000
		},
		support: [Math.random() * 1000, Math.random() * 800],
		resistance: [Math.random() * 1200, Math.random() * 1500]
	};
}

function generateMockCorrelations(): TokenCorrelation[] {
	return [
		{ symbol: 'ETH', correlation: 0.8, timeframe: '30d' },
		{ symbol: 'BTC', correlation: 0.6, timeframe: '30d' }
	];
}
