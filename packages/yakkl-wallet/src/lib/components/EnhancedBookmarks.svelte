<!-- EnhancedBookmarks.svelte -->
<script lang="ts">
  import { enhancedBookmarkStore, filteredBookmarks } from '$lib/stores/enhancedBookmark.store';
  import BookmarkControls from './BookmarkControls.svelte';
  import BookmarkIcon from './icons/BookmarkIcon.svelte';
  import NewsFeedLineView from './NewsFeedLineView.svelte';
  import SearchSortControls from './SearchSortControls.svelte';
  import LockedSectionCard from './LockedSectionCard.svelte';
  import StickyNote from './bookmarks/StickyNote.svelte';
  import VoiceRecorder from './bookmarks/VoiceRecorder.svelte';
  import Upgrade from './Upgrade.svelte';
  import { onMount } from 'svelte';
  import { isProLevel } from '$lib/common/utils';
  import type { EnhancedBookmark } from '$lib/types/bookmark.types';
  import { fade } from 'svelte/transition';
  import { browser_ext } from '$lib/common/environment';

  interface Props {
    show?: boolean;
    locked?: boolean;
    onComplete?: () => void;
    footer?: any;
    footerProps?: Record<string, any>;
    lockedFooter?: any;
    lockedFooterProps?: Record<string, any>;
  }

  let {
    show = $bindable(true),
    onComplete = $bindable(() => {}),
    locked = $bindable(true),
    footer = $bindable(null),
    footerProps = $bindable({}),
    lockedFooter = $bindable(null),
    lockedFooterProps = $bindable({})
  }: Props = $props();

  let showUpgradeModal = $state(false);
  let activeNoteBookmark = $state<string | null>(null);
  let activeVoiceBookmark = $state<string | null>(null);
  let isDragging = $state(false);
  let isProcessing = $state(false);
  let dropZone: HTMLDivElement;

  const bookmarks = $derived($filteredBookmarks);
  const bookmarkCount = $derived(bookmarks.length);

  onMount(async () => {
    // Bookmarks are now free for all!
    locked = false;
    await enhancedBookmarkStore.init();
  });

  let searchQuery = $state('');
  let sortBy = $state<'date' | 'title'>('date');
  let sortOrder = $state<'asc' | 'desc'>('desc');

  function handleSearch(query: string) {
    searchQuery = query;
    // Update the search query in the store
    enhancedBookmarkStore.searchQuery.set(query);
  }

  function handleSortOrderChange(order: 'date' | 'title') {
    sortBy = order;
    enhancedBookmarkStore.sortBy.set(order);
  }

  function handleSortDirectionChange() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    enhancedBookmarkStore.sortOrder.set(sortOrder);
  }

  function handleDragEnter(e: DragEvent) {
    if (locked) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }

  function handleDragOver(e: DragEvent) {
    if (locked) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDragLeave(e: DragEvent) {
    if (locked) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZone || !dropZone.contains(e.relatedTarget as Node)) {
      isDragging = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;

    if (!e.dataTransfer) return;

    // TEMPORARILY DISABLED FOR TESTING
    // Check bookmark limit for Explorer members
    // if (featureAccess && featureAccess.bookmarks.maxCount !== -1) {
    //   if (bookmarkCount >= featureAccess.bookmarks.maxCount) {
    //     showLimitWarning = true;
    //     showUpgradeModal = true;
    //     return;
    //   }
    // }

    isProcessing = true;

    try {
      const url = e.dataTransfer.getData('text/uri-list') ||
                  e.dataTransfer.getData('text/plain') || '';

      if (!url) return;

      const html = e.dataTransfer.getData('text/html');
      let title = '';
      let description = '';

      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const link = doc.querySelector('a');
        if (link) {
          title = link.textContent?.trim() || '';
        }
      }

      // Extract title from URL if not found
      if (!title && url) {
        try {
          const urlObj = new URL(url);
          // Try to extract a meaningful title from the pathname
          const pathname = urlObj.pathname.replace(/[_-]/g, ' ').replace(/\.[^/.]+$/, '');
          const segments = pathname.split('/').filter(s => s.length > 0);
          title = segments[segments.length - 1] || urlObj.hostname;
          // Capitalize first letter of each word
          title = title.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        } catch {
          title = url.substring(0, 50);
        }
      }

      // Try to extract better metadata if possible
      let finalTitle = title || 'Untitled';
      let finalImage = '/images/logoBull48x48.png';
      let finalDescription = url;

      // If we have a URL, try to extract better info from it
      if (url && url.startsWith('http')) {
        try {
          // Send message to background to extract metadata
          const response: any = await browser_ext.runtime.sendMessage({
            type: 'EXTRACT_PAGE_METADATA',
            url: url
          });

          if (response?.success) {
            finalTitle = response.title || finalTitle;
            finalImage = response.image || finalImage;
            finalDescription = response.description || finalDescription;
          }
        } catch (err) {
          console.log('Could not extract metadata:', err);
        }
      }

      await enhancedBookmarkStore.addBookmark({
        url,
        title: finalTitle,
        description: finalDescription,
        imageUrl: finalImage,
        contentType: 'webpage',
        source: new URL(url).hostname,
        tags: [],
        notes: []
      });

    } catch (error) {
      console.error('Failed to process dropped item:', error);
    } finally {
      isProcessing = false;
    }
  }

  function openStickyNote(bookmarkId: string) {
    // TEMPORARILY DISABLED FOR TESTING
    // if (!featureAccess?.bookmarks.stickyNotes) {
    //   showUpgradeModal = true;
    //   return;
    // }
    activeNoteBookmark = bookmarkId;
  }

  function openVoiceRecorder(bookmarkId: string) {
    // TEMPORARILY DISABLED FOR TESTING
    // if (!featureAccess?.bookmarks.voiceNotes) {
    //   showUpgradeModal = true;
    //   return;
    // }
    activeVoiceBookmark = bookmarkId;
  }

  function handleBookmarkClick(e: MouseEvent, bookmark: EnhancedBookmark) {
    // Prevent double opening if clicking on controls
    if ((e.target as HTMLElement).closest('.bookmark-controls')) {
      return;
    }

    if (bookmark.url) {
      e.preventDefault();
      e.stopPropagation();
      window.open(bookmark.url, '_blank');
    }
  }

  let showLockedFooter = $state(false);

  async function updateLockedFooterState() {
    showLockedFooter = !(await isProLevel());
  }

  $effect(() => {
    updateLockedFooterState();
  });
</script>

<Upgrade bind:show={showUpgradeModal} {onComplete} />

<LockedSectionCard
  bind:show
  title="Bookmarked Articles"
  icon={BookmarkIcon}
  minHeight="300px"
  maxHeight="750px"
  locked={false}
  lockMessage=""
  showButton={false}
  onComplete={() => {
    showUpgradeModal = true;
  }}
  {footer}
  {footerProps}
  lockedFooter={showLockedFooter ? lockedFooter : null}
  lockedFooterProps={showLockedFooter ? lockedFooterProps : {}}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={dropZone}
    class="enhanced-bookmarks"
    class:dragging={isDragging}
    ondragenter={handleDragEnter}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <!-- Bookmark counter - TEMPORARILY SHOWING ALL FOR TESTING -->
    <div class="flex justify-between items-center mb-2">
      <div class="text-sm text-base-content/60">
        <span class="badge badge-primary badge-sm">Testing Mode</span>
        <span class="ml-2">{bookmarkCount} bookmarks</span>
      </div>
    </div>

    <SearchSortControls
      {searchQuery}
      sortOrder={sortBy}
      sortDirection={sortOrder}
      onSearch={handleSearch}
      onSortOrderChange={handleSortOrderChange}
      onSortDirectionChange={handleSortDirectionChange}
    />

    {#if isProcessing}
      <div class="flex items-center justify-center py-4">
        <div class="loading loading-spinner loading-md text-primary"></div>
        <span class="ml-2">Processing...</span>
      </div>
    {:else if bookmarks.length === 0}
      <div class="flex items-center justify-center h-32 text-gray-500">
        <p>{searchQuery
          ? 'No matching articles found'
          : isDragging
            ? 'Drop here to bookmark'
            : 'No bookmarked articles yet. Drag items here or right-click on pages to bookmark.'}</p>
      </div>
    {:else}
      <div class="space-y-0">
        {#each bookmarks as bookmark, index}
          <div class="relative group">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              class="bookmark-item relative group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/50 transition-colors duration-200 cursor-pointer"
              onclick={(e) => handleBookmarkClick(e, bookmark)}
            >
              <NewsFeedLineView
                newsItem={{
                  title: bookmark.title,
                  subtitle: bookmark.subtitle || '',
                  description: bookmark.description || bookmark.url,
                  content: bookmark.extractedText || '',
                  imageUrl: bookmark.imageUrl || '/images/logoBull48x48.png',
                  source: bookmark.source,
                  date: bookmark.bookmarkedAt,
                  url: bookmark.url
                }}
                showDate={true}
              />
              <BookmarkControls
                {bookmark}
                onNote={() => openStickyNote(bookmark.id)}
                onVoice={() => openVoiceRecorder(bookmark.id)}
                className=""
              />
            </div>
            {#if index < bookmarks.length - 1}
              <div class="flex justify-center">
                <div class="w-[80%] h-[1px] bg-gray-200 dark:bg-gray-700"></div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if isDragging}
      <div
        class="drag-overlay"
        transition:fade={{ duration: 150 }}
      >
        <div class="drag-message">
          <svg class="w-12 h-12 text-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-lg font-semibold">Drop to bookmark</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Sticky Note Modal -->
  {#if activeNoteBookmark}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onclick={() => activeNoteBookmark = null}>
      <div onclick={(e) => e.stopPropagation()}>
        <StickyNote
          bookmarkId={activeNoteBookmark}
          onClose={() => activeNoteBookmark = null}
        />
      </div>
    </div>
  {/if}

  <!-- Voice Recorder Modal -->
  {#if activeVoiceBookmark}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onclick={() => activeVoiceBookmark = null}>
      <div onclick={(e) => e.stopPropagation()}>
        <VoiceRecorder
          bookmarkId={activeVoiceBookmark}
          onCancel={() => activeVoiceBookmark = null}
        />
      </div>
    </div>
  {/if}
</LockedSectionCard>

<style>
  .enhanced-bookmarks {
    @apply relative transition-all duration-200;
    min-height: 200px;
  }

  .enhanced-bookmarks.dragging {
    @apply bg-primary/5 border-2 border-dashed border-primary rounded-lg;
  }

  .bookmark-item {
    @apply px-3 py-2;
  }

  .drag-overlay {
    @apply absolute inset-0 bg-white/90 dark:bg-zinc-900/90 rounded-lg flex items-center justify-center z-40;
  }

  .drag-message {
    @apply text-center;
  }
</style>
