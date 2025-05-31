<!-- src/lib/components/NewsFeed.svelte -->
<script lang="ts">
  import ChevronDownIcon from '$lib/components/icons/ChevronDownIcon.svelte';
  import ChevronUpIcon from '$lib/components/icons/ChevronUpIcon.svelte';
  import NewsFeedLineView from './NewsFeedLineView.svelte';
  import ArticleControls from './ArticleControls.svelte';
	import { yakklBookmarkedArticlesStore } from '$lib/common/stores';

  interface NewsItem {
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
  }

  interface Props {
    newsItems?: NewsItem[];
    maxVisibleItems?: number;
    className?: string;
  }

  let {
    newsItems = [],
    maxVisibleItems = 3,
    className = ''
  }: Props = $props();

  let visibleItems = $state(newsItems.slice(0, maxVisibleItems));
  let remainingItems = $state(newsItems.slice(maxVisibleItems));
  let isRemainingSectionCollapsed = $state(true);

  // Update when newsItems prop changes
  $effect(() => {
    visibleItems = newsItems.slice(0, maxVisibleItems);
    remainingItems = newsItems.slice(maxVisibleItems);
  });

  // Check if we have any valid news items
  const hasValidItems = newsItems.length > 0;
</script>

<div class={className}>
  {#if hasValidItems}
    <!-- Visible Items Section -->
    <div class="space-y-0">
      {#each visibleItems as item, index}
        <div class="relative group">
          <div class="group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/50 transition-colors duration-200">
            <NewsFeedLineView newsItem={item} />
          </div>
          <ArticleControls article={item} />
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
              <div class="relative group">
                <div class="group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/50 transition-colors duration-200">
                  <NewsFeedLineView newsItem={item} />
                </div>
                <ArticleControls article={item} />
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

