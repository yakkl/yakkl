// src/lib/services/ExtensionRSSFeedService.ts

import { VERSION } from '$lib/common/constants';
import { browser_ext } from '$lib/common/environment';

export interface RSSItem {
	title: string;
	subtitle: string;
	description: string;
	content?: string;
	imageUrl: string;
	source: string;
	date: string;
	url: string;
	guid?: string;
	categories?: string[];
	author?: string;
	publishedAt?: string;
	contentType?: 'article' | 'video' | 'podcast' | 'unknown';
	contentQuality?: 'complete' | 'partial' | 'minimal';
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
	private readonly ARTICLE_CACHE_KEY = 'yakkl_rss_articles_cache';

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
					Accept: 'application/rss+xml, application/xml, text/xml'
				},
				credentials: 'omit'
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
			}

			const text = await response.text();
			const feed = await this.parseRSSFeed(text, feedUrl);

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

	// Method to clear specific cached feeds
	async clearCachedFeed(feedUrl: string): Promise<void> {
		try {
      if (!browser_ext) return;
			// Clear from memory cache
			this.feedCache.delete(feedUrl);

			// Clear from extension storage
			const key = `rss_feed_${btoa(feedUrl)}`;
			await browser_ext.storage.local.remove(key);

			console.log(`Cleared cached feed for ${feedUrl}`);
		} catch (error) {
			console.error('Failed to clear cached feed:', error);
		}
	}

	// Method to clear all RSS feed caches
	async clearAllCachedFeeds(): Promise<void> {
		try {
      if (!browser_ext) return;
			// Clear memory cache
			this.feedCache.clear();

			// Get all storage keys
			const allData = await browser_ext.storage.local.get(null);
			const rssKeys = Object.keys(allData).filter(key => key.startsWith('rss_feed_'));

			// Remove all RSS feed keys
			if (rssKeys.length > 0) {
				await browser_ext.storage.local.remove(rssKeys);
				console.log(`Cleared ${rssKeys.length} cached RSS feeds`);
			}

			// Also clear the article cache
			await browser_ext.storage.local.remove(this.ARTICLE_CACHE_KEY);
		} catch (error) {
			console.error('Failed to clear all cached feeds:', error);
		}
	}

	// Get all cached articles from central store
	async getCachedArticles(): Promise<RSSItem[]> {
		try {
      if (!browser_ext) return;
			const stored = await browser_ext.storage.local.get(this.ARTICLE_CACHE_KEY);
			if (stored[this.ARTICLE_CACHE_KEY]) {
				const cacheData = stored[this.ARTICLE_CACHE_KEY] as { articles: RSSItem[]; lastUpdated: string };
				return cacheData.articles || [];
			}
		} catch (error) {
			console.error('Failed to get cached articles:', error);
		}
		return [];
	}

	private async storeFeedInExtensionStorage(feedUrl: string, feed: RSSFeed) {
		try {
      if (!browser_ext) return;
			const key = `rss_feed_${btoa(feedUrl)}`;
			await browser_ext.storage.local.set({ [key]: feed });
		} catch (error) {
			console.error('Failed to store feed in extension storage:', error);
		}
	}

	private async loadFeedFromExtensionStorage(feedUrl: string): Promise<RSSFeed | null> {
		try {
      if (!browser_ext) return null;
			const key = `rss_feed_${btoa(feedUrl)}`;
			const result = await browser_ext.storage.local.get(key);
			return result[key] as RSSFeed | null;
		} catch (error) {
			console.error('Failed to load feed from extension storage:', error);
			return null;
		}
	}

	private async fetchArticleContent(
		url: string
	): Promise<{ content: string; quality: 'complete' | 'partial' | 'minimal' }> {
		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'YAKKL Smart Wallet Extension/' + VERSION,
					Accept: 'text/html,application/xhtml+xml'
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch article: ${response.statusText}`);
			}

			const html = await response.text();
			return this.extractArticleContent(html);
		} catch (error) {
			console.error('Error fetching article content:', error);
			return { content: '', quality: 'minimal' };
		}
	}

	private extractArticleContent(html: string): {
		content: string;
		quality: 'complete' | 'partial' | 'minimal';
	} {
		// First, remove problematic tags that cause browser warnings
		// Remove all link preload tags to prevent font preload warnings
		html = html.replace(/<link[^>]*rel=["']?preload["']?[^>]*>/gi, '');
		// Remove prefetch and dns-prefetch as well
		html = html.replace(/<link[^>]*rel=["']?(prefetch|dns-prefetch)["']?[^>]*>/gi, '');

		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		// Check for media content first
		const hasVideo = doc.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
		const hasAudio = doc.querySelector('audio, [class*="podcast"], [class*="audio"]');

		if (hasVideo || hasAudio) {
			return { content: '', quality: 'minimal' };
		}

		// Common article content selectors for different news sites
		const contentSelectors = [
			// Cointelegraph
			'article .post__content',
			// CoinDesk
			'article .article-body',
			// General news sites
			'article .article-content',
			'article .content',
			'article .post-content',
			'article .entry-content',
			// Fallback to any article tag
			'article'
		];

		// Try each selector until we find content
		for (const selector of contentSelectors) {
			const element = doc.querySelector(selector);
			if (element) {
				// Remove unwanted elements
				const unwantedElements = element.querySelectorAll(`
          script, style, iframe,
          .ad, .advertisement, .social-share, .related-posts,
          .comments, .comment-section, .newsletter-signup,
          .recommended, .trending, .popular-posts,
          [class*="ad-"], [class*="banner"], [class*="promo"],
          [class*="sidebar"], [class*="widget"],
          [class*="social"], [class*="share"],
          [class*="related"], [class*="recommended"]
        `);
				unwantedElements.forEach((el) => el.remove());

				// Get clean text content
				let content = element.textContent || '';

				// Clean up the content
				content = content
					.replace(/\s+/g, ' ') // Replace multiple spaces with single space
					.replace(/\n+/g, '\n') // Replace multiple newlines with single newline
					.replace(/\[.*?\]/g, '') // Remove text in square brackets (often ads or notes)
					.replace(/\(.*?\)/g, '') // Remove text in parentheses (often ads or notes)
					.trim();

				// Assess content quality
				const wordCount = content.split(/\s+/).length;
				const quality = this.assessContentQuality(content, wordCount);

				if (quality !== 'minimal') {
					return { content, quality };
				}
			}
		}

		return { content: '', quality: 'minimal' };
	}

	private assessContentQuality(
		content: string,
		wordCount: number
	): 'complete' | 'partial' | 'minimal' {
		// Check for common indicators of complete articles
		const hasParagraphs = content.split('\n').length > 3;
		const hasQuotes = content.includes('"') || content.includes('"');
		const hasReferences = content.includes('said') || content.includes('according to');

		// Quality thresholds
		if (wordCount > 300 && hasParagraphs && (hasQuotes || hasReferences)) {
			return 'complete';
		} else if (wordCount > 100 && hasParagraphs) {
			return 'partial';
		}
		return 'minimal';
	}

	private detectContentType(
		item: Element,
		description: string
	): 'article' | 'video' | 'podcast' | 'unknown' {
		const content = description.toLowerCase();

		// Check for media indicators in description
		if (content.includes('watch') || content.includes('video') || content.includes('youtube')) {
			return 'video';
		}
		if (content.includes('listen') || content.includes('podcast') || content.includes('audio')) {
			return 'podcast';
		}

		// Check for media enclosures
		const hasVideoEnclosure = item.querySelector('enclosure[type^="video"]');
		const hasAudioEnclosure = item.querySelector('enclosure[type^="audio"]');

		if (hasVideoEnclosure) return 'video';
		if (hasAudioEnclosure) return 'podcast';

		// Check for media:content using getElementsByTagName instead of querySelector
		const mediaContent =
			item.getElementsByTagName('media:content')[0] ||
			item.getElementsByTagName('media\\:content')[0];
		if (mediaContent) {
			const type = mediaContent.getAttribute('type')?.toLowerCase() || '';
			if (type.startsWith('video')) return 'video';
			if (type.startsWith('audio')) return 'podcast';
		}

		return 'article';
	}

	async parseRSSFeed(xmlText: string, feedUrl: string): Promise<RSSFeed> {
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

		// Process items in parallel with a concurrency limit
		const processItems = async () => {
			const concurrencyLimit = 3;
			const chunks = Array.from(itemElements).reduce((acc, item, i) => {
				const chunkIndex = Math.floor(i / concurrencyLimit);
				if (!acc[chunkIndex]) acc[chunkIndex] = [];
				acc[chunkIndex].push(item);
				return acc;
			}, [] as Element[][]);

			for (const chunk of chunks) {
				await Promise.all(
					chunk.map(async (item) => {
						const itemTitle =
							item.querySelector('title')?.textContent?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';
						const itemLink = item.querySelector('link')?.textContent || '';
						const itemDescription =
							item.querySelector('description')?.textContent?.replace(/<!\[CDATA\[|\]\]>/g, '') ||
							'';

						// Detect content type
						const contentType = this.detectContentType(item, itemDescription);

						// Initialize content with description as fallback
						let content = this.stripHTML(itemDescription) || itemTitle;
						let contentQuality: 'complete' | 'partial' | 'minimal' = 'minimal';

						if (contentType === 'article') {
							try {
								// Try content:encoded first
								const contentEncodedElement = item.getElementsByTagName('content:encoded')[0];
								const encodedContent =
									contentEncodedElement?.textContent?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';

								if (encodedContent && encodedContent.length > 200) {
									content = encodedContent;
									contentQuality = this.assessContentQuality(content, content.split(/\s+/).length);
								} else if (itemLink) {
									// If no content:encoded or content is too short, try to fetch full article
									const result = await this.fetchArticleContent(itemLink);
									if (result.content) {
										content = result.content;
										contentQuality = result.quality;
									}
								}
							} catch (error) {
								console.error('Error processing article content:', error);
								// Keep the fallback content from description
							}
						}

						const pubDate = item.querySelector('pubDate')?.textContent || '';
						const guid = item.querySelector('guid')?.textContent || '';

						// Extract categories
						const categories: string[] = [];
						item.querySelectorAll('category').forEach((cat) => {
							if (cat.textContent) categories.push(cat.textContent);
						});

						// Extract media content (images)
						let imageUrl = this.extractImageFromItem(item, itemDescription);

						// Add UTM parameters to the article URL
						const trackedUrl = this.addUTMParameters(itemLink);

						const rssItem: RSSItem = {
							title: itemTitle,
							subtitle: categories.length > 0 ? categories[0] : 'Crypto News',
							description: this.stripHTML(itemDescription) || itemTitle,
							content: content,
							imageUrl,
							source: this.extractSourceFromURL(feedUrl),
							date: this.formatDate(pubDate),
							publishedAt: pubDate,
							url: trackedUrl,
							guid,
							categories,
							author:
								item.querySelector('author')?.textContent?.replace(/<!\[CDATA\[|\]\]>/g, '') || '',
							contentType,
							contentQuality
						};

						items.push(rssItem);
					})
				);
			}
		};

		await processItems();

		return {
			title,
			description,
			link,
			items,
			lastUpdated: new Date()
		};
	}

	private extractImageFromItem(item: Element, description: string): string {
		// Try media:content first
		const mediaContent = item.querySelector('content[url]');
		if (mediaContent) {
			return mediaContent.getAttribute('url') || '';
		}

		// Try media:thumbnail
		const mediaThumbnail = item.querySelector('thumbnail[url]');
		if (mediaThumbnail) {
			return mediaThumbnail.getAttribute('url') || '';
		}

		// Try enclosure
		const enclosure = item.querySelector('enclosure[type^="image"]');
		if (enclosure) {
			return enclosure.getAttribute('url') || '';
		}

		// Extract from content or description if no dedicated image element
		const imageFromHTML = this.extractImageFromHTML(description);
		if (imageFromHTML) {
			return imageFromHTML;
		}

		// Default image if none found
		return 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200';
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
