import type { PlanType } from '$lib/common';

/**
 * News data interfaces
 */
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  imageUrl?: string;
  source: string;
  category: NewsCategory;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
  publishedAt: number;
  tags: string[];
  author?: string;
  readTime?: number;
}

export interface RSSFeed {
  id: string;
  title: string;
  url: string;
  description: string;
  items: NewsItem[];
  lastUpdated: number;
  updateInterval: number;
  isActive: boolean;
  category: NewsCategory;
  priority: number;
}

export interface NewsFilter {
  categories?: NewsCategory[];
  sources?: string[];
  tags?: string[];
  sentiment?: ('positive' | 'negative' | 'neutral')[];
  dateRange?: {
    start: number;
    end: number;
  };
  minRelevanceScore?: number;
  searchQuery?: string;
}

export interface BookmarkedArticle {
  id: string;
  newsItem: NewsItem;
  bookmarkedAt: number;
  tags: string[];
  notes?: string;
  isRead: boolean;
  reminder?: {
    date: number;
    message: string;
  };
}

export interface NewsAnalytics {
  totalArticles: number;
  articlesRead: number;
  readingTime: number;
  topSources: SourceStats[];
  topCategories: CategoryStats[];
  sentimentBreakdown: SentimentStats;
  readingStreak: number;
  bookmarkCount: number;
}

export interface SourceStats {
  source: string;
  articleCount: number;
  readCount: number;
  avgRelevanceScore: number;
}

export interface CategoryStats {
  category: NewsCategory;
  articleCount: number;
  readCount: number;
  avgSentiment: number;
}

export interface SentimentStats {
  positive: number;
  negative: number;
  neutral: number;
}

export interface NewsLimits {
  maxFeeds: number;
  currentFeeds: number;
  maxBookmarks: number;
  currentBookmarks: number;
  maxArticlesPerFeed: number;
  refreshInterval: number; // in minutes
  planType: PlanType;
}

export interface PersonalizedNews {
  recommendations: NewsItem[];
  trendingTopics: string[];
  personalizationScore: number;
  interests: string[];
  readingPattern: {
    preferredTime: string;
    avgSessionTime: number;
    preferredCategories: NewsCategory[];
  };
}

export type NewsCategory = 
  | 'cryptocurrency' 
  | 'defi' 
  | 'nft' 
  | 'blockchain' 
  | 'technology' 
  | 'finance' 
  | 'regulation' 
  | 'market' 
  | 'security'
  | 'innovation';

export interface RealTimeNews {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: number;
  queuedUpdates: number;
}

export interface NewsExport {
  bookmarks: BookmarkedArticle[];
  readHistory: NewsItem[];
  preferences: NewsFilter;
  analytics: NewsAnalytics;
  exportedAt: number;
  version: string;
}

/**
 * News Manager Interface
 * Defines the contract for both standard and pro news functionality
 */
export interface INewsManager {
  /**
   * Get news limits based on current plan
   */
  getNewsLimits(): Promise<NewsLimits>;

  /**
   * Get news items with optional filtering
   */
  getNews(filter?: NewsFilter, limit?: number): Promise<NewsItem[]>;

  /**
   * Get available RSS feeds
   */
  getRSSFeeds(): Promise<RSSFeed[]>;

  /**
   * Add custom RSS feed (PRO feature)
   */
  addRSSFeed(url: string, category: NewsCategory): Promise<RSSFeed>;

  /**
   * Remove RSS feed (PRO feature)
   */
  removeRSSFeed(feedId: string): Promise<boolean>;

  /**
   * Get bookmarked articles
   */
  getBookmarkedArticles(): Promise<BookmarkedArticle[]>;

  /**
   * Bookmark an article (limited by plan)
   */
  bookmarkArticle(newsItem: NewsItem, tags?: string[], notes?: string): Promise<BookmarkedArticle>;

  /**
   * Remove bookmark
   */
  removeBookmark(bookmarkId: string): Promise<boolean>;

  /**
   * Update bookmark
   */
  updateBookmark(bookmarkId: string, updates: Partial<BookmarkedArticle>): Promise<BookmarkedArticle>;

  /**
   * Get personalized news recommendations (PRO feature)
   */
  getPersonalizedNews(): Promise<PersonalizedNews>;

  /**
   * Get news analytics (PRO feature)
   */
  getNewsAnalytics(): Promise<NewsAnalytics>;

  /**
   * Search news articles (PRO feature)
   */
  searchNews(query: string, filter?: NewsFilter): Promise<NewsItem[]>;

  /**
   * Get real-time news status (PRO feature)
   */
  getRealTimeNewsStatus(): Promise<RealTimeNews>;

  /**
   * Subscribe to real-time updates (PRO feature)
   */
  subscribeToRealTimeUpdates(callback: (news: NewsItem[]) => void): Promise<() => void>;

  /**
   * Export news data (PRO feature)
   */
  exportNewsData(): Promise<NewsExport>;

  /**
   * Import news data (PRO feature)
   */
  importNewsData(data: NewsExport): Promise<boolean>;

  /**
   * Mark article as read
   */
  markAsRead(newsItemId: string): Promise<boolean>;

  /**
   * Get reading history
   */
  getReadingHistory(limit?: number): Promise<NewsItem[]>;

  /**
   * Refresh feeds manually
   */
  refreshFeeds(feedIds?: string[]): Promise<boolean>;

  /**
   * Initialize the news manager
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