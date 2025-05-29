// src/lib/services/ExtensionRSSFeedService.ts

import { VERSION } from "$lib/common/constants";
import { browser_ext } from "$lib/common/environment";

export interface RSSItem {
  title: string;
  subtitle: string;
  content: string;
  imageUrl: string;
  source: string;
  date: string;
  url: string;
  guid?: string;
  categories?: string[];
  author?: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
  lastUpdated: Date;
}

export class ExtensionRSSFeedService {
  private static instance: ExtensionRSSFeedService;
  private feedCache: Map<string, { data: RSSFeed; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): ExtensionRSSFeedService {
    if (!ExtensionRSSFeedService.instance) {
      ExtensionRSSFeedService.instance = new ExtensionRSSFeedService();
    }
    return ExtensionRSSFeedService.instance;
  }

  async fetchFeed(feedUrl: string): Promise<RSSFeed> {
    // Check cache first
    const cached = this.feedCache.get(feedUrl);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Direct fetch - no CORS proxy needed in extension!
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'YAKKL Smart Wallet Extension/' + VERSION,
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
      }

      const text = await response.text();
      const feed = this.parseRSSFeed(text, feedUrl);

      // Cache the feed
      this.feedCache.set(feedUrl, { data: feed, timestamp: Date.now() });

      // Store in extension storage for offline access
      await this.storeFeedInExtensionStorage(feedUrl, feed);

      return feed;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);

      // Try to load from extension storage if fetch fails
      const storedFeed = await this.loadFeedFromExtensionStorage(feedUrl);
      if (storedFeed) {
        return storedFeed;
      }

      throw error;
    }
  }

  private async storeFeedInExtensionStorage(feedUrl: string, feed: RSSFeed) {
    try {
      const key = `rss_feed_${btoa(feedUrl)}`;
      await browser_ext.storage.local.set({ [key]: feed });
    } catch (error) {
      console.error('Failed to store feed in extension storage:', error);
    }
  }

  private async loadFeedFromExtensionStorage(feedUrl: string): Promise<RSSFeed | null> {
    try {
      const key = `rss_feed_${btoa(feedUrl)}`;
      const result = await browser_ext.storage.local.get(key);
      return result[key] as RSSFeed | null;
    } catch (error) {
      console.error('Failed to load feed from extension storage:', error);
      return null;
    }
  }

  // ... rest of the methods remain the same (parseRSSFeed, extractImageFromHTML, etc.)

  private parseRSSFeed(xmlText: string, feedUrl: string): RSSFeed {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid RSS feed format');
    }

    // Get channel information
    const channel = doc.querySelector('channel');
    if (!channel) {
      throw new Error('No channel element found in RSS feed');
    }

    const title = channel.querySelector('title')?.textContent || '';
    const description = channel.querySelector('description')?.textContent || '';
    const link = channel.querySelector('link')?.textContent || '';

    // Parse items
    const items: RSSItem[] = [];
    const itemElements = doc.querySelectorAll('item');

    itemElements.forEach((item) => {
      const itemTitle = item.querySelector('title')?.textContent || '';
      const itemLink = item.querySelector('link')?.textContent || '';
      const itemDescription = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const guid = item.querySelector('guid')?.textContent || '';

      // Extract categories
      const categories: string[] = [];
      item.querySelectorAll('category').forEach((cat) => {
        if (cat.textContent) categories.push(cat.textContent);
      });

      // Extract media content (images)
      let imageUrl = '';

      // Try media:content first
      const mediaContent = item.querySelector('content[url]');
      if (mediaContent) {
        imageUrl = mediaContent.getAttribute('url') || '';
      }

      // Try media:thumbnail
      if (!imageUrl) {
        const mediaThumbnail = item.querySelector('thumbnail[url]');
        if (mediaThumbnail) {
          imageUrl = mediaThumbnail.getAttribute('url') || '';
        }
      }

      // Try enclosure
      if (!imageUrl) {
        const enclosure = item.querySelector('enclosure[type^="image"]');
        if (enclosure) {
          imageUrl = enclosure.getAttribute('url') || '';
        }
      }

      // Extract from content or description if no dedicated image element
      if (!imageUrl) {
        imageUrl = this.extractImageFromHTML(itemDescription);
      }

      // Default image if none found
      if (!imageUrl) {
        imageUrl = 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200';
      }

      // Add UTM parameters to the article URL
      const trackedUrl = this.addUTMParameters(itemLink);

      const rssItem: RSSItem = {
        title: itemTitle,
        subtitle: categories.length > 0 ? categories[0] : 'Crypto News',
        content: this.stripHTML(itemDescription),
        imageUrl,
        source: this.extractSourceFromURL(feedUrl),
        date: this.formatDate(pubDate),
        url: trackedUrl,
        guid,
        categories,
        author: item.querySelector('author')?.textContent || ''
      };

      items.push(rssItem);
    });

    return {
      title,
      description,
      link,
      items,
      lastUpdated: new Date()
    };
  }

  private extractImageFromHTML(html: string): string {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return imgMatch ? imgMatch[1] : '';
  }

  private stripHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  private extractSourceFromURL(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '').split('.')[0];
    } catch {
      return 'RSS Feed';
    }
  }

  private addUTMParameters(url: string): string {
    try {
      const urlObj = new URL(url);
      const hasParams = urlObj.search.length > 0;

      // Add UTM parameters
      urlObj.searchParams.set('utm_source', 'yakkl.com');
      urlObj.searchParams.set('utm_medium', 'wallet');
      urlObj.searchParams.set('utm_campaign', 'news_feed');

      // Add timestamp for time-based analytics
      urlObj.searchParams.set('utm_timestamp', Date.now().toString());

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours === 0) {
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return diffInMinutes === 0 ? 'Just now' : `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
      }
    } catch {
      return dateString;
    }
  }
}
