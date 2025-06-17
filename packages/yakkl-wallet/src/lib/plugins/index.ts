// Plugin Architecture Exports

import { pluginRegistry } from './registry/PluginRegistry';

// Interfaces
export type { ITradingManager, BasicChartData, AdvancedChartData, TechnicalIndicators, TradingAnalysis, SwapQuote } from './interfaces/ITradingManager';
export type { IAccountManager, Account, AccountLimits, CreateAccountOptions, AccountAnalytics, MultiAccountOperations, AccountBackup, AccountToken } from './interfaces/IAccountManager';
export type { INewsManager, NewsItem, RSSFeed, NewsFilter, BookmarkedArticle, NewsLimits, NewsAnalytics, PersonalizedNews, RealTimeNews, NewsExport } from './interfaces/INewsManager';

// Standard Implementations
export { StandardTradingManager } from './standard/StandardTradingManager';
export { StandardAccountManager } from './standard/StandardAccountManager';
export { StandardNewsManager } from './standard/StandardNewsManager';

// Registry System
export { PluginRegistry, pluginRegistry } from './registry/PluginRegistry';
export type { PluginManagerConfig, PluginLoadResult, PluginFeatures } from './registry/PluginRegistry';

// Errors
export { UpgradeRequiredError } from './errors/UpgradeRequiredError';

// Re-export for convenience
export { pluginRegistry as plugins };