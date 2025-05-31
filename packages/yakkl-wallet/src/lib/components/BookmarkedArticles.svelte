<!-- svelte-ignore state_referenced_locally -->
<!-- svelte-ignore state_referenced_locally -->
<!-- BookmarkedArticles.svelte -->
<script lang="ts">
  import SectionCard from './SectionCard.svelte';
  import ArticleControls from './ArticleControls.svelte';
  import BookmarkIcon from './icons/BookmarkIcon.svelte';
  import NewsFeedLineView from './NewsFeedLineView.svelte';
  import SearchSortControls from './SearchSortControls.svelte';
  import type { RSSItem } from '$lib/plugins/ExtensionRSSFeedService';
  import { yakklBookmarkedArticlesStore, setYakklBookmarkedArticles } from '$lib/common/stores';
  import { derived, writable } from 'svelte/store';

  const searchQuery = writable('');
  const sortOrder = writable<'date' | 'title'>('date');
  const sortDirection = writable<'asc' | 'desc'>('desc');

  const filteredArticles = derived(
    [yakklBookmarkedArticlesStore, searchQuery, sortOrder, sortDirection],
    ([articles, query, order, direction]) => {
      let filtered = articles;
      if (query) {
        const searchLower = query.toLowerCase();
        filtered = articles.filter(article =>
          article.title.toLowerCase().includes(searchLower) ||
          article.description?.toLowerCase().includes(searchLower) ||
          article.source.toLowerCase().includes(searchLower)
        );
      }

      return [...filtered].sort((a, b) => {
        if (order === 'date') {
          const dateA = new Date(a.publishedAt || a.date || '').getTime();
          const dateB = new Date(b.publishedAt || b.date || '').getTime();
          return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return direction === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      });
    }
  );

  function handleSearch(query: string) {
    searchQuery.set(query);
  }

  function handleSortOrderChange(order: 'date' | 'title') {
    sortOrder.set(order);
  }

  function handleSortDirectionChange() {
    sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
  }

  async function handleArticleDelete(article: RSSItem) {
    const currentArticles = $yakklBookmarkedArticlesStore;
    const updatedArticles = currentArticles.filter(a =>
      !(a.title === article.title && a.source === article.source)
    );
    await setYakklBookmarkedArticles(updatedArticles);
  }
</script>

<SectionCard
  title="Bookmarked Articles"
  icon={BookmarkIcon}
  minHeight="300px"
  maxHeight="750px"
>
  <SearchSortControls
    searchQuery={$searchQuery}
    sortOrder={$sortOrder}
    sortDirection={$sortDirection}
    onSearch={handleSearch}
    onSortOrderChange={handleSortOrderChange}
    onSortDirectionChange={handleSortDirectionChange}
  />

  {#if $filteredArticles.length === 0}
    <div class="flex items-center justify-center h-32 text-gray-500">
      <p>{$searchQuery ? 'No matching articles found' : 'No bookmarked articles yet'}</p>
    </div>
  {:else}
    <div class="space-y-0">
      {#each $filteredArticles as article, index}
        <div class="relative group">
          <div class="group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/50 transition-colors duration-200">
            <NewsFeedLineView newsItem={article} />
          </div>
          <ArticleControls
            {article}
            bookmarkEnabled={false}
            deleteEnabled={true}
            onDelete={handleArticleDelete}
          />
          {#if index < $filteredArticles.length - 1}
            <div class="flex justify-center">
              <div class="w-[80%] h-[1px] bg-gray-200 dark:bg-gray-700"></div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</SectionCard>
