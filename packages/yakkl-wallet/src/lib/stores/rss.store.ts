import { writable, derived } from 'svelte/store';
import type { RSSItem } from '$lib/managers/ExtensionRSSFeedService';
import { browser_ext } from '$lib/common/environment';

// Define the number of articles to keep in cache
const MAX_CACHED_ARTICLES = 50;
const STORAGE_KEY = 'yakkl_rss_articles_cache';

interface RSSCacheData {
  articles: RSSItem[];
  lastUpdated: string;
}

// Create the store
function createRSSStore() {
  const { subscribe, set, update } = writable<RSSItem[]>([]);
  const isLoading = writable(false);
  const isUpdating = writable(false);
  const lastUpdateTime = writable<Date | null>(null);
  
  return {
    subscribe,
    isLoading,
    isUpdating,
    lastUpdateTime,
    
    // Initialize from storage
    async init() {
      try {
        const stored = await browser_ext.storage.local.get(STORAGE_KEY);
        if (stored[STORAGE_KEY]) {
          const cacheData = stored[STORAGE_KEY] as RSSCacheData;
          set(cacheData.articles);
          lastUpdateTime.set(new Date(cacheData.lastUpdated));
        }
      } catch (error) {
        console.error('Failed to load RSS cache from storage:', error);
      }
    },
    
    // Add new articles and maintain cache size
    async addArticles(newArticles: RSSItem[]) {
      update(currentArticles => {
        // Combine new and existing articles
        const allArticles = [...newArticles, ...currentArticles];
        
        // Remove duplicates based on GUID or URL
        const uniqueArticles = allArticles.reduce((acc, article) => {
          const key = article.guid || article.url;
          const exists = acc.find(a => (a.guid || a.url) === key);
          if (!exists) {
            acc.push(article);
          }
          return acc;
        }, [] as RSSItem[]);
        
        // Sort by date
        uniqueArticles.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt) : new Date();
          const dateB = b.publishedAt ? new Date(b.publishedAt) : new Date();
          return dateB.getTime() - dateA.getTime();
        });
        
        // Keep only the most recent articles
        const trimmedArticles = uniqueArticles.slice(0, MAX_CACHED_ARTICLES);
        
        // Save to storage
        this.saveToStorage(trimmedArticles);
        
        return trimmedArticles;
      });
      
      lastUpdateTime.set(new Date());
    },
    
    // Replace all articles (for full refresh)
    async setArticles(articles: RSSItem[]) {
      set(articles);
      lastUpdateTime.set(new Date());
      await this.saveToStorage(articles);
    },
    
    // Clear all articles
    async clear() {
      set([]);
      lastUpdateTime.set(null);
      try {
        await browser_ext.storage.local.remove(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear RSS cache:', error);
      }
    },
    
    // Save to persistent storage
    async saveToStorage(articles: RSSItem[]) {
      try {
        const cacheData: RSSCacheData = {
          articles: articles.slice(0, MAX_CACHED_ARTICLES),
          lastUpdated: new Date().toISOString()
        };
        await browser_ext.storage.local.set({ [STORAGE_KEY]: cacheData });
      } catch (error) {
        console.error('Failed to save RSS cache to storage:', error);
      }
    },
    
    // Set loading state
    setLoading(loading: boolean) {
      isLoading.set(loading);
    },
    
    // Set updating state
    setUpdating(updating: boolean) {
      isUpdating.set(updating);
    }
  };
}

// Create and export the store
export const rssStore = createRSSStore();

// Derived store for visible items (can be configured)
export const visibleRSSItems = derived(
  rssStore,
  $rssStore => $rssStore // Can add filtering logic here if needed
);

// Initialize the store when module loads
if (browser_ext?.storage) {
  rssStore.init();
}