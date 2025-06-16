<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { DynamicRSSFeedService, type RSSFeed } from '$lib/plugins/DynamicRSSFeedService';
  import NewsFeed from './NewsFeed.svelte';
  import { log } from '$lib/plugins/Logger';
  import { browser_ext } from '$lib/common/environment';

  interface Props {
    wsUrl?: string;
    useSampleFeed?: boolean;
    maxItemsPerFeed?: number;
    maxVisibleItems?: number;
    className?: string;
    locked?: boolean;
    show?: boolean;
    title?: string;
  }

  let {
    wsUrl,
    useSampleFeed = false,
    maxVisibleItems = 3,
    className = '',
    locked = true,
    maxItemsPerFeed = locked ? 3 : 0,
    title = 'Crypto News',
    show = $bindable(true)
  }: Props = $props();

  let newsItems = $state<RSSFeed['items']>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isConnected = $state(false);

  const dynamicService = DynamicRSSFeedService.getInstance();
  let unsubscribe: (() => void) | null = null;

  onMount(async () => {
    try {
      if (useSampleFeed) {
        const feed = await dynamicService.loadSampleFeed();
        newsItems = feed.items.slice(0, maxItemsPerFeed);
        isLoading = false;
      } else if (wsUrl) {
        unsubscribe = dynamicService.onFeedUpdate((feed) => {
          newsItems = feed.items.slice(0, maxItemsPerFeed);
          isLoading = false;
          isConnected = true;
        });

        await dynamicService.connect(wsUrl);
      } else {
        throw new Error('Either wsUrl or useSampleFeed must be provided');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load RSS feed';
      log.error('RSS feed error:', false, err);
      isLoading = false;
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (wsUrl) {
      dynamicService.disconnect();
    }
  });

  async function refreshFeed() {
    if (useSampleFeed) {
      try {
        isLoading = true;
        const feed = await dynamicService.loadSampleFeed();
        newsItems = feed.items.slice(0, maxItemsPerFeed);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to refresh feed';
      } finally {
        isLoading = false;
      }
    }
    // For WebSocket feeds, the server should handle refresh requests
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
        onclick={refreshFeed}
        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
      >
        Retry
      </button>
    </div>
  {:else}
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-semibold">{title}</h2>
      <div class="flex items-center gap-2">
        {#if wsUrl}
          <span class="text-xs {isConnected ? 'text-green-500' : 'text-yellow-500'}">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        {/if}
        <button
          onclick={refreshFeed}
          class="text-sm text-blue-500 hover:text-blue-600"
        >
          Refresh
        </button>
      </div>
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
