<!-- src/lib/components/ExtensionRSSNewsFeed.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ExtensionRSSFeedService, type RSSItem, type RSSFeed } from '$lib/plugins/ExtensionRSSFeedService';
  import NewsFeed from './NewsFeed.svelte';
	import { log } from '$lib/plugins/Logger';
  import RefreshIcon from './icons/RefreshIcon.svelte';
  import { browser_ext } from '$lib/common/environment';

  const FIVE_MINUTES = 5 * 60 * 1000;  // 5 minutes in milliseconds
  const THIRTY_MINUTES = 30 * 60 * 1000;  // 30 minutes in milliseconds

  interface Props {
    show?: boolean;
    feedUrls: string[];
    maxItemsPerFeed?: number;
    maxVisibleItems?: number;
    className?: string;
    locked?: boolean;
    title?: string;
    interval?: number;
  }

  let {
    show = $bindable(true),
    feedUrls,
    maxVisibleItems = 3,
    className = '',
    locked = true,
    maxItemsPerFeed = locked ? 3 : 0,
    title = 'Crypto News',
    interval = FIVE_MINUTES
  }: Props = $props();

  // Override interval if locked
  const effectiveInterval = locked ? THIRTY_MINUTES : interval;

  let newsItems = $state<RSSItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  const rssService = ExtensionRSSFeedService.getInstance();
  let refreshTimer: number;

  onMount(() => {
    loadFeeds();

    // Set up refresh interval
    refreshTimer = window.setInterval(loadFeeds, effectiveInterval);

    // Listen for updates from background script
    const messageListener = (message: any, sender: any, sendResponse: any) => {
      if (message.type === 'RSS_FEED_UPDATE') {
        loadFeeds();
      }
      return Promise.resolve(true);
    };

    browser_ext.runtime.onMessage.addListener(messageListener);

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      browser_ext.runtime.onMessage.removeListener(messageListener);
    };
  });

  async function loadFeeds() {
    isLoading = true;
    error = null;

    try {
      const allItems: RSSItem[] = [];

      // Try to fetch fresh data
      const feedPromises = feedUrls.map((url: string): Promise<RSSFeed | null> =>
        rssService.fetchFeed(url).catch((err: unknown): null => {
          log.warn(`Failed to fetch feed ${url}:`,false, err);
          return null;
        })
      );

      const feeds = await Promise.all(feedPromises);

      // Combine and sort items from all feeds
      feeds.forEach(feed => {
        if (feed) {
          allItems.push(...feed.items.slice(0, maxItemsPerFeed));
        }
      });

      // Sort by date (assuming the date strings can be parsed)
      allItems.sort((a, b) => {
        const dateA = parseRelativeDate(a.date);
        const dateB = parseRelativeDate(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      newsItems = allItems;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load RSS feeds';
      log.warn('RSS feed error:', false, err);
    } finally {
      isLoading = false;
    }
  }

  async function refreshFeeds() {
    // Send message to background script to refresh feeds
    // chrome.runtime.sendMessage({ action: 'fetchRSSFeeds' }, (response) => {
    //   if (response.success) {
        loadFeeds();
    //   }
    // });
  }

  function parseRelativeDate(dateStr: string): Date {
    const now = new Date();

    if (dateStr === 'Just now') {
      return now;
    }

    const match = dateStr.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'minute':
          return new Date(now.getTime() - value * 60 * 1000);
        case 'hour':
          return new Date(now.getTime() - value * 60 * 60 * 1000);
        case 'day':
          return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      }
    }

    if (dateStr === 'Yesterday') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Default to now if we can't parse
    return now;
  }
</script>

{#if show}
<div class={className}>
  {#if isLoading}
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center p-8 text-red-500">
      <p class="text-sm font-medium">Error loading news</p>
      <p class="text-xs mt-1">{error}</p>
      <button
        onclick={refreshFeeds}
        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
      >
        Retry
      </button>
    </div>
  {:else}
    <div class="flex items-center justify-between mb-0">
      <h2 class="text-lg font-semibold">{title}</h2>
      <button
        onclick={refreshFeeds}
        class="p-1 text-blue-500 hover:text-blue-600 transition-colors"
        aria-label="Refresh feeds"
      >
        <RefreshIcon className="w-4 h-4" />
      </button>
    </div>
    <NewsFeed
      newsItems={newsItems}
      maxVisibleItems={maxVisibleItems}
      className={className}
      locked={locked}
      maxItemsPerFeed={maxItemsPerFeed}
    />
  {/if}
</div>
{/if}

