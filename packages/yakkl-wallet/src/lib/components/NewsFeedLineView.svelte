<script lang="ts">
  interface Props {
    newsItem: {
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
    };
    className?: string;
    locked?: boolean;
  }

  let { newsItem, className = '', locked = true }: Props = $props();

  // Check if the news item has all required properties
  const isValidNewsItem = newsItem &&
    newsItem.title &&
    newsItem.description &&
    newsItem.imageUrl &&
    newsItem.source &&
    newsItem.date &&
    newsItem.url;
</script>

<div class={className}>
  {#if isValidNewsItem}
    <a
      href={newsItem.url}
      target="_blank"
      rel="noopener noreferrer"
      class="block hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div class="flex gap-4 p-3 item">
        <div class="flex-shrink-0">
          <img
            src={newsItem.imageUrl}
            alt={newsItem.title}
            class="w-16 h-16 object-cover rounded-md"
          />
        </div>
        <div class="flex-1 min-w-0 pr-0">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {newsItem.title}
          </h3>
          <div class="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <span>{newsItem.source}</span>
            <span>•</span>
            <span>{newsItem.date}</span>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
            {newsItem.description}
          </p>
        </div>
      </div>
    </a>
  {:else}
    <div class="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
      <p class="text-sm">Unable to display news content</p>
    </div>
  {/if}
</div>
