<!-- File: src/lib/components/NewsFeed.svelte -->
<script lang="ts">
	import ChevronDownIcon from '$lib/components/icons/ChevronDownIcon.svelte';
	import ChevronUpIcon from '$lib/components/icons/ChevronUpIcon.svelte';
  import NewsFeedLineView from './NewsFeedLineView.svelte';

  interface Props {
    maxVisibleItems?: number;
    className?: string;
  }

  let { maxVisibleItems = 3, className = '' }: Props = $props();

  let newsItems = $state([
    {
      title: "Bitcoin ETF Approval Expected This Week",
      subtitle: "Market Analysis",
      content: "The SEC is expected to make a decision on Bitcoin ETF applications this week, potentially opening the door for institutional investment. Analysts predict this could lead to significant market movement.",
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200",
      source: "Crypto Daily",
      date: "2 hours ago",
      url: "https://example.com/news/1"
    },
    {
      title: "Ethereum Layer 2 Solutions See Record Growth",
      subtitle: "Technology",
      content: "Ethereum's Layer 2 scaling solutions have processed over 1 million transactions in the past 24 hours, marking a new milestone in blockchain scalability.",
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200",
      source: "Blockchain Weekly",
      date: "4 hours ago",
      url: "https://example.com/news/2"
    },
    {
      title: "DeFi Protocol Reaches $1B TVL",
      subtitle: "DeFi",
      content: "A leading DeFi protocol has surpassed $1 billion in total value locked, signaling growing confidence in decentralized finance solutions.",
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200",
      source: "DeFi Pulse",
      date: "6 hours ago",
      url: "https://example.com/news/3"
    },
    {
      title: "NFT Market Shows Signs of Recovery",
      subtitle: "NFTs",
      content: "After a prolonged bear market, NFT trading volume has increased by 30% in the past week, with blue-chip collections leading the recovery.",
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200",
      source: "NFT Insider",
      date: "8 hours ago",
      url: "https://example.com/news/4"
    }
  ]);

  let visibleItems = $state(newsItems.slice(0, maxVisibleItems));
  let remainingItems = $state(newsItems.slice(maxVisibleItems));
  let isRemainingSectionCollapsed = $state(true);

  // Check if we have any valid news items
  const hasValidItems = newsItems.length > 0;
</script>

<div class={className}>
  {#if hasValidItems}
    <!-- Visible Items Section -->
    <div class="space-y-0">
      {#each visibleItems as item, index}
        <div class="relative">
          <NewsFeedLineView newsItem={item} />
          {#if index < visibleItems.length - 1}
            <div class="flex justify-center">
              <div class="w-[80%] h-[1px] bg-gray-200 dark:bg-gray-700"></div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Remaining Items Section -->
    {#if remainingItems.length > 0}
      <div class="space-y-0">
        <button
          class="flex items-center justify-between w-full py-2 cursor-pointer"
          onclick={() => (isRemainingSectionCollapsed = !isRemainingSectionCollapsed)}
        >
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">{remainingItems.length} More Stories</h3>
          <div class="text-gray-500 dark:text-gray-400">
            {#if isRemainingSectionCollapsed}
              <ChevronDownIcon className="w-4 h-4" />
            {:else}
              <ChevronUpIcon className="w-4 h-4" />
            {/if}
          </div>
        </button>

        {#if !isRemainingSectionCollapsed}
          <div class="space-y-0">
            {#each remainingItems as item, index}
              <div class="relative">
                <NewsFeedLineView newsItem={item} />
                {#if index < remainingItems.length - 1}
                  <div class="flex justify-center">
                    <div class="w-[80%] h-[1px] bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
      <p class="text-sm">No news items available at this time</p>
    </div>
  {/if}
</div>
