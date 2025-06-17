<!-- src/lib/components/RSSNewsFeed.svelte -->
<script lang="ts">
  // For non-extension builds, we use the RSSFeedService
  import { onMount } from 'svelte';
  import { RSSFeedService, type RSSItem, type RSSFeed } from '$lib/managers/RSSFeedService';
  import NewsFeed from './NewsFeed.svelte';

  interface Props {
    feedUrls: string[];
    corsProxy?: string;
    refreshInterval?: number;
    maxItemsPerFeed?: number;
    maxVisibleItems?: number;
    className?: string;
  }

  let {
    feedUrls,
    corsProxy = 'https://cors-anywhere.herokuapp.com/',
    refreshInterval = 300000, // 5 minutes
    maxItemsPerFeed = 10,
    maxVisibleItems = 3,
    className = ''
  }: Props = $props();

  let newsItems = $state<RSSItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  const rssService = RSSFeedService.getInstance();
  let refreshTimer: number;

  onMount(() => {
    loadFeeds();

    // Set up refresh interval
    if (refreshInterval > 0) {
      refreshTimer = window.setInterval(loadFeeds, refreshInterval);
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  });

  async function loadFeeds() {
    isLoading = true;
    error = null;

    try {
      const allItems: RSSItem[] = [];

      // Fetch all feeds in parallel
      const feedPromises = feedUrls.map((url: string): Promise<RSSFeed | null> =>
        rssService.fetchFeed(url, corsProxy).catch((err: unknown): null => {
          console.error(`Failed to fetch feed ${url}:`, err);
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
      console.error('RSS feed error:', err);
    } finally {
      isLoading = false;
    }
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
        onclick={loadFeeds}
        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
      >
        Retry
      </button>
    </div>
  {:else}
    <NewsFeed
      newsItems={newsItems}
      maxVisibleItems={maxVisibleItems}
      className={className}
    />
  {/if}
</div>
