import { writable, derived, get } from 'svelte/store';
import type { 
  EnhancedBookmark, 
  BookmarkNote, 
  BookmarkSearchOptions,
  BookmarkStats,
  ContentType,
  ReadStatus,
  NotePriority
} from '$lib/types/bookmark.types';
import { browser_ext } from '$lib/common/environment';
import { generateUniqueId, getFeatureAccess } from '$lib/common/utils';

const STORAGE_KEY = 'yakklEnhancedBookmarks';
const SETTINGS_KEY = 'yakklBookmarkSettings';
const MAX_BOOKMARKS = 500;
const MAX_NOTES_PER_BOOKMARK = 20;
const YAKKL_DEFAULT_IMAGE = '/images/yakkl-logo.png';

// Favicon service configuration - easily switchable
// Note: Google service needs full URL, not just domain
const FAVICON_SERVICES = {
  direct: (domain: string) => `https://${domain}/favicon.ico`,
  google: (url: string, size = 64) => `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=${size}`,
  duckduckgo: (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  clearbit: (domain: string) => `https://logo.clearbit.com/${domain}` // Alternative service
};

// Primary service order (switchable)
const FAVICON_SERVICE_ORDER = ['direct', 'google'] as const;

// Helper function to parse relative date strings like "19 minutes ago"
function parseRelativeDate(dateStr: string): string {
  const now = new Date();
  
  // Check for relative time patterns
  const patterns = [
    { regex: /(\d+)\s+second[s]?\s+ago/i, unit: 'seconds' },
    { regex: /(\d+)\s+minute[s]?\s+ago/i, unit: 'minutes' },
    { regex: /(\d+)\s+hour[s]?\s+ago/i, unit: 'hours' },
    { regex: /(\d+)\s+day[s]?\s+ago/i, unit: 'days' },
    { regex: /(\d+)\s+week[s]?\s+ago/i, unit: 'weeks' },
    { regex: /(\d+)\s+month[s]?\s+ago/i, unit: 'months' },
    { regex: /(\d+)\s+year[s]?\s+ago/i, unit: 'years' }
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern.regex);
    if (match) {
      const value = parseInt(match[1]);
      const date = new Date(now);
      
      switch (pattern.unit) {
        case 'seconds':
          date.setSeconds(date.getSeconds() - value);
          break;
        case 'minutes':
          date.setMinutes(date.getMinutes() - value);
          break;
        case 'hours':
          date.setHours(date.getHours() - value);
          break;
        case 'days':
          date.setDate(date.getDate() - value);
          break;
        case 'weeks':
          date.setDate(date.getDate() - (value * 7));
          break;
        case 'months':
          date.setMonth(date.getMonth() - value);
          break;
        case 'years':
          date.setFullYear(date.getFullYear() - value);
          break;
      }
      
      return date.toISOString();
    }
  }
  
  // If no pattern matches, try to parse as regular date
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

interface BookmarkStoreState {
  bookmarks: EnhancedBookmark[];
  isLoading: boolean;
  lastUpdated: Date | null;
  searchOptions: BookmarkSearchOptions | null;
}

function createEnhancedBookmarkStore() {
  const { subscribe, set, update } = writable<BookmarkStoreState>({
    bookmarks: [],
    isLoading: false,
    lastUpdated: null,
    searchOptions: null
  });

  const searchQuery = writable<string>('');
  const filterContentType = writable<ContentType[]>([]);
  const filterTags = writable<string[]>([]);
  const filterReadStatus = writable<ReadStatus | null>(null);
  const sortBy = writable<'date' | 'title' | 'priority'>('date');
  const sortOrder = writable<'asc' | 'desc'>('desc');

  async function init() {
    update(state => ({ ...state, isLoading: true }));
    
    try {
      // First try to load enhanced bookmarks
      const stored = await browser_ext.storage.local.get(STORAGE_KEY);
      if (stored[STORAGE_KEY]) {
        const bookmarks = stored[STORAGE_KEY] as EnhancedBookmark[];
        set({
          bookmarks,
          isLoading: false,
          lastUpdated: new Date(),
          searchOptions: null
        });
      } else {
        // If no enhanced bookmarks, check for legacy bookmarks and migrate them
        const legacyStored = await browser_ext.storage.local.get('yakklBookmarkedArticles');
        if (legacyStored['yakklBookmarkedArticles']) {
          const legacyBookmarks = legacyStored['yakklBookmarkedArticles'] as any[];
          
          // Migrate legacy bookmarks to enhanced format
          const migratedBookmarks: EnhancedBookmark[] = legacyBookmarks.map(item => {
            // Parse the date properly
            let bookmarkedDate = new Date().toISOString();
            if (item.date) {
              // Check if it's a relative date like "19 minutes ago"
              if (item.date.includes('ago')) {
                bookmarkedDate = new Date().toISOString(); // Use current time for relative dates
              } else {
                // Try to parse the date
                const parsed = new Date(item.date);
                bookmarkedDate = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
              }
            }
            
            return {
              id: generateUniqueId(),
              bookmarkedAt: bookmarkedDate,
              lastModified: new Date().toISOString(),
              title: item.title || 'Untitled',
              subtitle: item.subtitle || '',
              description: item.description || item.content || '',
              imageUrl: item.imageUrl || '/images/logoBull48x48.png',
              source: item.source || '',
              date: bookmarkedDate,
              url: item.url || '',
              guid: item.guid,
              categories: item.categories,
              author: item.author,
              publishedAt: item.publishedAt,
              contentType: item.contentType || 'article',
              notes: [],
              tags: item.categories || [],
              readStatus: 'unread',
              syncStatus: 'local'
            };
          });
          
          // Save migrated bookmarks
          await saveToStorage(migratedBookmarks);
          
          set({
            bookmarks: migratedBookmarks,
            isLoading: false,
            lastUpdated: new Date(),
            searchOptions: null
          });
          
          console.log(`Migrated ${migratedBookmarks.length} bookmarks from legacy storage`);
        } else {
          // No bookmarks at all
          set({
            bookmarks: [],
            isLoading: false,
            lastUpdated: new Date(),
            searchOptions: null
          });
        }
      }
    } catch (error) {
      console.error('Failed to load enhanced bookmarks:', error);
      update(state => ({ ...state, isLoading: false }));
    }
  }

  async function saveToStorage(bookmarks: EnhancedBookmark[]) {
    try {
      await browser_ext.storage.local.set({ 
        [STORAGE_KEY]: bookmarks.slice(0, MAX_BOOKMARKS) 
      });
    } catch (error) {
      console.error('Failed to save bookmarks to storage:', error);
      throw error;
    }
  }

  /**
   * Fetch favicon for a URL using configurable service chain
   * @param url - The URL to fetch favicon for
   * @param primaryService - Override primary service (default: 'direct')
   * @returns Promise<string> - Favicon URL or default logo
   */
  async function fetchFaviconUrl(url: string, primaryService: keyof typeof FAVICON_SERVICES = 'direct'): Promise<string> {
    if (!url) return YAKKL_DEFAULT_IMAGE;
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const origin = urlObj.origin; // Just protocol + domain, no path
      
      // Try services in order
      const services = primaryService === 'direct' 
        ? FAVICON_SERVICE_ORDER 
        : [primaryService, ...FAVICON_SERVICE_ORDER.filter(s => s !== primaryService)];
      
      for (const service of services) {
        // Google service needs origin URL (protocol + domain), others need just domain
        const faviconUrl = service === 'google' 
          ? FAVICON_SERVICES[service](origin) 
          : FAVICON_SERVICES[service](domain);
        
        console.log(`[Favicon] Trying ${service} with URL:`, faviconUrl);
        
        // Skip validation for Google service - it handles fallbacks internally
        if (service === 'google') {
          console.log(`[Favicon] Using Google favicon service (no validation):`, faviconUrl);
          return faviconUrl;
        }
        
        // Test if favicon loads successfully for other services
        const isValid = await testFaviconUrl(faviconUrl);
        if (isValid) {
          console.log(`[Favicon] Successfully fetched from ${service}:`, faviconUrl);
          return faviconUrl;
        }
      }
      
      console.log('[Favicon] All services failed, using default');
      return YAKKL_DEFAULT_IMAGE;
    } catch (error) {
      console.warn('[Favicon] Error fetching favicon:', error);
      return YAKKL_DEFAULT_IMAGE;
    }
  }
  
  /**
   * Test if a favicon URL is valid and loads
   */
  function testFaviconUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Skip test in service worker context
      if (typeof window === 'undefined' || !window.Image) {
        resolve(true); // Assume valid in background context
        return;
      }
      
      const img = new Image();
      const timeout = setTimeout(() => {
        resolve(false); // Timeout after 3 seconds
      }, 3000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      img.src = url;
    });
  }

  async function addBookmark(bookmark: Partial<EnhancedBookmark>): Promise<EnhancedBookmark> {
    // TEMPORARILY DISABLED FOR TESTING
    // Check user's bookmark limit
    // const featureAccess = await getFeatureAccess();
    // const currentCount = get({ subscribe }).bookmarks.length;
    
    // if (featureAccess.bookmarks.maxCount !== -1 && currentCount >= featureAccess.bookmarks.maxCount) {
    //   throw new Error(`Bookmark limit reached. Maximum ${featureAccess.bookmarks.maxCount} bookmarks allowed for your plan.`);
    // }
    
    // Fetch favicon if imageUrl not provided and URL exists
    let imageUrl = bookmark.imageUrl || '';
    if (!imageUrl && bookmark.url) {
      // For dragged URLs, always try to get the site's favicon
      imageUrl = await fetchFaviconUrl(bookmark.url);
    }
    
    const newBookmark: EnhancedBookmark = {
      id: generateUniqueId(),
      bookmarkedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      title: bookmark.title || 'Untitled',
      subtitle: bookmark.subtitle || '',
      description: bookmark.description || '',
      source: bookmark.source || '',
      date: bookmark.date || new Date().toISOString(),
      url: bookmark.url || '',
      contentType: bookmark.contentType || 'webpage',
      notes: [],
      tags: bookmark.tags || [],
      readStatus: 'unread',
      syncStatus: 'local',
      ...bookmark,
      imageUrl // This overrides any imageUrl from ...bookmark spread
    } as EnhancedBookmark;

    return new Promise((resolve, reject) => {
      update(state => {
        // Prepend new bookmark to the beginning
        const updatedBookmarks = [newBookmark, ...state.bookmarks];
        
        // Respect absolute maximum even for Pro users
        if (updatedBookmarks.length > MAX_BOOKMARKS) {
          updatedBookmarks.pop();
        }

        saveToStorage(updatedBookmarks).catch(reject);
        
        return {
          ...state,
          bookmarks: updatedBookmarks,
          lastUpdated: new Date()
        };
      });
      resolve(newBookmark);
    });
  }

  async function updateBookmark(id: string, updates: Partial<EnhancedBookmark>) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => 
        b.id === id 
          ? { ...b, ...updates, lastModified: new Date().toISOString() }
          : b
      );
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function removeBookmark(id: string) {
    update(state => {
      const bookmarks = state.bookmarks.filter(b => b.id !== id);
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }
  
  async function removeBookmarkByUrl(url: string) {
    if (!url) return;
    
    update(state => {
      const bookmarks = state.bookmarks.filter(b => b.url !== url);
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function addNote(bookmarkId: string, note: Partial<BookmarkNote>): Promise<BookmarkNote> {
    const newNote: BookmarkNote = {
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
      type: note.type || 'text',
      content: note.content || '',
      ...note
    };

    return new Promise((resolve, reject) => {
      update(state => {
        const bookmarks = state.bookmarks.map(b => {
          if (b.id === bookmarkId) {
            const notes = [...b.notes, newNote];
            
            if (notes.length > MAX_NOTES_PER_BOOKMARK) {
              notes.shift();
            }
            
            return { ...b, notes, lastModified: new Date().toISOString() };
          }
          return b;
        });
        
        saveToStorage(bookmarks).catch(reject);
        
        return {
          ...state,
          bookmarks,
          lastUpdated: new Date()
        };
      });
      resolve(newNote);
    });
  }

  async function updateNote(bookmarkId: string, noteId: string, updates: Partial<BookmarkNote>) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => {
        if (b.id === bookmarkId) {
          const notes = b.notes.map(n => 
            n.id === noteId 
              ? { ...n, ...updates, updatedAt: new Date().toISOString() }
              : n
          );
          return { ...b, notes, lastModified: new Date().toISOString() };
        }
        return b;
      });
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function removeNote(bookmarkId: string, noteId: string) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => {
        if (b.id === bookmarkId) {
          const notes = b.notes.filter(n => n.id !== noteId);
          return { ...b, notes, lastModified: new Date().toISOString() };
        }
        return b;
      });
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function togglePin(bookmarkId: string) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => 
        b.id === bookmarkId 
          ? { ...b, isPinned: !b.isPinned, lastModified: new Date().toISOString() }
          : b
      );
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function toggleFavorite(bookmarkId: string) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => 
        b.id === bookmarkId 
          ? { ...b, isFavorite: !b.isFavorite, lastModified: new Date().toISOString() }
          : b
      );
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function updateReadStatus(bookmarkId: string, status: ReadStatus) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => 
        b.id === bookmarkId 
          ? { ...b, readStatus: status, lastModified: new Date().toISOString() }
          : b
      );
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function updatePriority(bookmarkId: string, priority: NotePriority) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => 
        b.id === bookmarkId 
          ? { ...b, priority, lastModified: new Date().toISOString() }
          : b
      );
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function addTags(bookmarkId: string, tags: string[]) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => {
        if (b.id === bookmarkId) {
          const uniqueTags = Array.from(new Set([...b.tags, ...tags]));
          return { ...b, tags: uniqueTags, lastModified: new Date().toISOString() };
        }
        return b;
      });
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function removeTags(bookmarkId: string, tags: string[]) {
    update(state => {
      const bookmarks = state.bookmarks.map(b => {
        if (b.id === bookmarkId) {
          const filteredTags = b.tags.filter(t => !tags.includes(t));
          return { ...b, tags: filteredTags, lastModified: new Date().toISOString() };
        }
        return b;
      });
      
      saveToStorage(bookmarks);
      
      return {
        ...state,
        bookmarks,
        lastUpdated: new Date()
      };
    });
  }

  async function clear() {
    try {
      await browser_ext.storage.local.remove(STORAGE_KEY);
      set({
        bookmarks: [],
        isLoading: false,
        lastUpdated: new Date(),
        searchOptions: null
      });
    } catch (error) {
      console.error('Failed to clear bookmarks:', error);
    }
  }

  function getStats(): BookmarkStats {
    const state = get({ subscribe });
    const bookmarks = state.bookmarks;
    
    const tagSet = new Set<string>();
    
    const stats: BookmarkStats = {
      totalBookmarks: bookmarks.length,
      byContentType: {} as Record<ContentType, number>,
      byReadStatus: {} as Record<ReadStatus, number>,
      byPriority: {} as Record<NotePriority, number>,
      totalNotes: 0,
      totalVoiceNotes: 0,
      totalTags: 0,
      storageUsed: 0
    };

    bookmarks.forEach(bookmark => {
      stats.byContentType[bookmark.contentType] = (stats.byContentType[bookmark.contentType] || 0) + 1;
      
      if (bookmark.readStatus) {
        stats.byReadStatus[bookmark.readStatus] = (stats.byReadStatus[bookmark.readStatus] || 0) + 1;
      }
      
      if (bookmark.priority) {
        stats.byPriority[bookmark.priority] = (stats.byPriority[bookmark.priority] || 0) + 1;
      }
      
      stats.totalNotes += bookmark.notes.length;
      stats.totalVoiceNotes += bookmark.notes.filter(n => n.type === 'voice').length;
      
      bookmark.tags.forEach(tag => tagSet.add(tag));
      
      stats.storageUsed += JSON.stringify(bookmark).length;
    });

    stats.totalTags = tagSet.size;
    stats.lastSync = state.lastUpdated?.toISOString();
    
    return stats;
  }

  return {
    subscribe,
    init,
    addBookmark,
    updateBookmark,
    removeBookmark,
    removeBookmarkByUrl,
    addNote,
    updateNote,
    removeNote,
    togglePin,
    toggleFavorite,
    updateReadStatus,
    updatePriority,
    addTags,
    removeTags,
    clear,
    getStats,
    searchQuery,
    filterContentType,
    filterTags,
    filterReadStatus,
    sortBy,
    sortOrder
  };
}

export const enhancedBookmarkStore = createEnhancedBookmarkStore();

/**
 * TEMPORARY MIGRATION FUNCTION - Remove after running once
 * Migrates bookmarkedAt dates to ensure consistency
 * Uses publishedAt or lastModified as fallback
 * Call this function: migrateBookmarkDates()
 */
export async function migrateBookmarkDates() {
  const currentStore = get(enhancedBookmarkStore);
  let migratedCount = 0;
  
  for (const bookmark of currentStore.bookmarks) {
    // If bookmarkedAt is missing or invalid, use fallbacks
    if (!bookmark.bookmarkedAt || isNaN(new Date(bookmark.bookmarkedAt).getTime())) {
      let newDate: string;
      
      // Try publishedAt first
      if (bookmark.publishedAt && !isNaN(new Date(bookmark.publishedAt).getTime())) {
        newDate = bookmark.publishedAt;
      }
      // Then try lastModified
      else if (bookmark.lastModified && !isNaN(new Date(bookmark.lastModified).getTime())) {
        newDate = bookmark.lastModified;
      }
      // Default to current time if nothing else works
      else {
        newDate = new Date().toISOString();
      }
      
      console.log(`Migrating bookmark "${bookmark.title}" - bookmarkedAt: ${newDate}`);
      
      // Update the bookmark using the store's updateBookmark method
      await enhancedBookmarkStore.updateBookmark(bookmark.id, {
        bookmarkedAt: newDate
      });
      
      migratedCount++;
    }
  }
  
  console.log(`Bookmark date migration complete. Migrated ${migratedCount} bookmarks.`);
  return migratedCount;
}

export const filteredBookmarks = derived(
  [
    enhancedBookmarkStore,
    enhancedBookmarkStore.searchQuery,
    enhancedBookmarkStore.filterContentType,
    enhancedBookmarkStore.filterTags,
    enhancedBookmarkStore.filterReadStatus,
    enhancedBookmarkStore.sortBy,
    enhancedBookmarkStore.sortOrder
  ],
  ([
    state,
    query,
    contentTypes,
    tags,
    readStatus,
    sortBy,
    sortOrder
  ]) => {
    let bookmarks = [...state.bookmarks];
    
    if (query) {
      const searchLower = query.toLowerCase();
      bookmarks = bookmarks.filter(b => 
        b.title.toLowerCase().includes(searchLower) ||
        b.description?.toLowerCase().includes(searchLower) ||
        b.source.toLowerCase().includes(searchLower) ||
        b.tags.some(t => t.toLowerCase().includes(searchLower)) ||
        b.notes.some(n => n.content.toLowerCase().includes(searchLower))
      );
    }
    
    if (contentTypes.length > 0) {
      bookmarks = bookmarks.filter(b => contentTypes.includes(b.contentType));
    }
    
    if (tags.length > 0) {
      bookmarks = bookmarks.filter(b => 
        tags.some(tag => b.tags.includes(tag))
      );
    }
    
    if (readStatus) {
      bookmarks = bookmarks.filter(b => b.readStatus === readStatus);
    }
    
    bookmarks.sort((a, b) => {
      let result = 0;
      
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      switch (sortBy) {
        case 'date':
          result = new Date(a.bookmarkedAt).getTime() - new Date(b.bookmarkedAt).getTime();
          break;
        case 'title':
          result = a.title.localeCompare(b.title);
          break;
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          result = (priorityOrder[a.priority || 'low'] || 2) - (priorityOrder[b.priority || 'low'] || 2);
          break;
      }
      
      return sortOrder === 'asc' ? result : -result;
    });
    
    return bookmarks;
  }
);

export const allTags = derived(
  enhancedBookmarkStore,
  $store => {
    const tags = new Set<string>();
    $store.bookmarks.forEach(b => {
      b.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }
);

export const bookmarkStats = derived(
  enhancedBookmarkStore,
  () => enhancedBookmarkStore.getStats()
);

if (browser_ext?.storage) {
  enhancedBookmarkStore.init();
}