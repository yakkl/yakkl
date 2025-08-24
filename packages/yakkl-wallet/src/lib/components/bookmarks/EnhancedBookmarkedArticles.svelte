<!-- EnhancedBookmarkedArticles.svelte -->
<script lang="ts">
  import { enhancedBookmarkStore, filteredBookmarks, bookmarkStats } from '$lib/stores/enhancedBookmark.store';
  import BookmarkDropZone from './BookmarkDropZone.svelte';
  import StickyNote from './StickyNote.svelte';
  import VoiceRecorder from './VoiceRecorder.svelte';
  import BookmarkControls from '../BookmarkControls.svelte';
  import BookmarkOrbitalEdit from './orbital/BookmarkOrbitalEdit.svelte';
  import ArticleControls from '../ArticleControls.svelte';
  import BookmarkIcon from '../icons/BookmarkIcon.svelte';
  import NewsFeedLineView from '../NewsFeedLineView.svelte';
  import SearchSortControls from '../SearchSortControls.svelte';
  import LockedSectionCard from '../LockedSectionCard.svelte';
  import Upgrade from '../Upgrade.svelte';
  import { onMount } from 'svelte';
  import { isProLevel } from '$lib/common/utils';
  import type { EnhancedBookmark, BookmarkNote, ContentType } from '$lib/types/bookmark.types';
  import { fade, fly } from 'svelte/transition';

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
  let showDropZone = $state(true);
  let activeNoteBookmark = $state<string | null>(null);
  let activeVoiceBookmark = $state<string | null>(null);
  let activeEditNote = $state<BookmarkNote | null>(null);
  let activeEditBookmark = $state<EnhancedBookmark | null>(null);
  let viewMode = $state<'grid' | 'list'>('list');
  let filterContentTypes = $state<ContentType[]>([]);
  let showStats = $state(false);
  
  // Local state for search and sort
  let searchQuery = $state('');
  let sortBy = $state<'date' | 'title'>('date');
  let sortOrder = $state<'asc' | 'desc'>('desc'); // Latest first by default

  const stats = $derived($bookmarkStats);
  const bookmarks = $derived($filteredBookmarks);

  const contentTypeIcons: Record<ContentType, string> = {
    webpage: '🌐',
    article: '📄',
    pdf: '📑',
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    podcast: '🎙️'
  };

  onMount(async () => {
    locked = (await isProLevel()) ? false : true;
    await enhancedBookmarkStore.init();
  });

  function handleSearch(query: string) {
    searchQuery = query;
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

  function handleContentTypeFilter(type: ContentType) {
    filterContentTypes = filterContentTypes.includes(type)
      ? filterContentTypes.filter(t => t !== type)
      : [...filterContentTypes, type];
    enhancedBookmarkStore.filterContentType.set(filterContentTypes);
  }

  function handleBookmarkAdded(id: string) {
    showNotification('Bookmark saved successfully!');
  }

  function openStickyNote(bookmarkId: string, note?: BookmarkNote) {
    activeNoteBookmark = bookmarkId;
    activeEditNote = note || null;
  }

  function openVoiceRecorder(bookmarkId: string) {
    activeVoiceBookmark = bookmarkId;
  }

  function openOrbitalEdit(bookmark: EnhancedBookmark) {
    console.log('Opening orbital edit for bookmark:', bookmark.id);
    activeEditBookmark = bookmark;
  }

  function handlePlayAudio(note: BookmarkNote) {
    if (note.content) {
      const audio = new Audio(note.content);
      audio.volume = 0.5;
      audio.play().catch(console.error);
    }
  }

  function handleNoteSaved(note: BookmarkNote) {
    activeNoteBookmark = null;
    activeEditNote = null;
    showNotification('Note saved!');
  }

  function handleVoiceSaved(note: BookmarkNote) {
    activeVoiceBookmark = null;
    showNotification('Voice note saved!');
  }

  async function exportBookmarks() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      bookmarks: bookmarks
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yakkl-bookmarks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Bookmarks exported!');
  }

  async function importBookmarks(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        for (const bookmark of data.bookmarks) {
          await enhancedBookmarkStore.addBookmark(bookmark);
        }

        showNotification(`Imported ${data.bookmarks.length} bookmarks!`);
      } catch (error) {
        console.error('Failed to import bookmarks:', error);
        showNotification('Failed to import bookmarks', 'error');
      }
    };
    reader.readAsText(file);
  }

  function showNotification(message: string, type: 'success' | 'error' = 'success') {
    // Implementation would use a toast notification system
    console.log(`${type}: ${message}`);
  }

  let showLockedFooter = $state(false);

  async function updateLockedFooterState() {
    showLockedFooter = !(await isProLevel());
  }

  $effect(() => {
    updateLockedFooterState();
  });

  $effect(() => {
    if (activeEditBookmark) {
      console.log('Active edit bookmark set:', activeEditBookmark.id);
    }
  });
</script>

<Upgrade bind:show={showUpgradeModal} {onComplete} />

<LockedSectionCard
  bind:show
  title="Enhanced Bookmarks"
  icon={BookmarkIcon}
  minHeight="400px"
  maxHeight="800px"
  {locked}
  lockMessage="Upgrade to Pro to unlock enhanced bookmarking features"
  showButton={true}
  onComplete={() => {
    showUpgradeModal = true;
  }}
  {footer}
  {footerProps}
  lockedFooter={showLockedFooter ? lockedFooter : null}
  lockedFooterProps={showLockedFooter ? lockedFooterProps : {}}
>
  <div class="enhanced-bookmarks">
    <!-- Drop Zone -->
    {#if showDropZone}
      <div class="mb-4" transition:fade>
        <BookmarkDropZone
          onBookmarkAdded={handleBookmarkAdded}
          disabled={locked}
        />
      </div>
    {/if}

    <!-- Controls Bar -->
    <div class="controls-bar">
      <SearchSortControls
        {searchQuery}
        sortOrder={sortBy}
        sortDirection={sortOrder}
        onSearch={handleSearch}
        onSortOrderChange={handleSortOrderChange}
        onSortDirectionChange={handleSortDirectionChange}
      />

      <!-- View Mode Toggle -->
      <div class="view-toggle btn-group">
        <button
          class="btn btn-sm"
          class:btn-active={viewMode === 'list'}
          onclick={() => viewMode = 'list'}
        >
          List
        </button>
        <button
          class="btn btn-sm"
          class:btn-active={viewMode === 'grid'}
          onclick={() => viewMode = 'grid'}
        >
          Grid
        </button>
      </div>
    </div>

    <!-- Content Type Filters -->
    <div class="content-filters">
      {#each Object.entries(contentTypeIcons) as [type, icon]}
        <button
          class="badge badge-lg cursor-pointer"
          class:badge-primary={filterContentTypes.includes(type as ContentType)}
          onclick={() => handleContentTypeFilter(type as ContentType)}
        >
          {icon} {type}
        </button>
      {/each}
    </div>

    <!-- Stats Panel -->
    {#if showStats}
      <div class="stats-panel" transition:fade>
        <div class="stats stats-vertical lg:stats-horizontal shadow">
          <div class="stat">
            <div class="stat-title">Total</div>
            <div class="stat-value">{stats.totalBookmarks}</div>
            <div class="stat-desc">Bookmarks</div>
          </div>
          <div class="stat">
            <div class="stat-title">Notes</div>
            <div class="stat-value">{stats.totalNotes}</div>
            <div class="stat-desc">{stats.totalVoiceNotes} voice</div>
          </div>
          <div class="stat">
            <div class="stat-title">Tags</div>
            <div class="stat-value">{stats.totalTags}</div>
            <div class="stat-desc">Unique</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Bookmarks Display -->
    {#if bookmarks.length === 0}
      <div class="empty-state">
        <p class="text-gray-500">
          {searchQuery
            ? 'No matching bookmarks found'
            : 'Drop something here to get started!'}
        </p>
      </div>
    {:else if viewMode === 'list'}
      <div class="bookmarks-list">
        {#each bookmarks as bookmark, index}
          <div class="bookmark-item group" draggable="false">
            <div class="bookmark-content" draggable="false">
              <!-- Favicon or Content Type Icon -->
              {#if bookmark.imageUrl && bookmark.url}
                <div class="favicon-container">
                  <img 
                    src={bookmark.imageUrl} 
                    alt={bookmark.title}
                    class="favicon-img"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='/images/yakkl-logo.png';"
                  />
                </div>
              {:else}
                <span class="content-icon text-2xl">
                  {contentTypeIcons[bookmark.contentType]}
                </span>
              {/if}

              <!-- Main Content -->
              <div class="flex-1">
                <h3 class="font-semibold">
                  {bookmark.title}
                  {#if bookmark.isPinned}
                    <span class="badge badge-warning badge-sm">📌</span>
                  {/if}
                  {#if bookmark.isFavorite}
                    <span class="badge badge-error badge-sm">❤️</span>
                  {/if}
                </h3>

                <p class="text-sm text-base-content/60">
                  {bookmark.description || 'No description'}
                </p>

                <!-- Tags -->
                {#if bookmark.tags.length > 0}
                  <div class="tags mt-1">
                    {#each bookmark.tags as tag}
                      <span class="badge badge-sm badge-ghost">{tag}</span>
                    {/each}
                  </div>
                {/if}

                <!-- Notes Indicator -->
                {#if bookmark.notes.length > 0}
                  <div class="notes-indicator mt-1">
                    <span class="badge badge-info badge-sm">
                      {bookmark.notes.length} note{bookmark.notes.length > 1 ? 's' : ''}
                    </span>
                    {#if bookmark.notes.some(n => n.type === 'voice')}
                      <span class="badge badge-secondary badge-sm">🎙️ Voice</span>
                    {/if}
                  </div>
                {/if}
              </div>

              <!-- Actions -->
              <BookmarkControls
                {bookmark}
                onNote={() => openStickyNote(bookmark.id)}
                onVoice={() => openVoiceRecorder(bookmark.id)}
                onEdit={() => openOrbitalEdit(bookmark)}
                onEditNote={(note) => openStickyNote(bookmark.id, note)}
                onPlayAudio={handlePlayAudio}
                className="bookmark-actions"
                isPro={!locked}
              />
            </div>

            {#if index < bookmarks.length - 1}
              <div class="divider"></div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <!-- Grid View -->
      <div class="bookmarks-grid">
        {#each bookmarks as bookmark}
          <div class="bookmark-card" draggable="false">
            <!-- Card content similar to list but in card format -->
            <div class="card bg-base-100 shadow-xl" draggable="false">
              <figure class="px-4 pt-4">
                {#if bookmark.imageUrl}
                  <div class="card-favicon-container">
                    <img 
                      src={bookmark.imageUrl} 
                      alt={bookmark.title} 
                      class="card-favicon-img rounded-xl"
                      loading="lazy"
                      onerror="this.onerror=null; this.src='/images/yakkl-logo.png';"
                    />
                  </div>
                {:else}
                  <div class="placeholder-image">
                    <span class="text-4xl">{contentTypeIcons[bookmark.contentType]}</span>
                  </div>
                {/if}
              </figure>
              <div class="card-body">
                <h2 class="card-title text-sm">{bookmark.title}</h2>
                <p class="text-xs">{bookmark.description?.slice(0, 100)}...</p>
                <div class="card-actions justify-end">
                  <BookmarkControls
                    {bookmark}
                    onNote={() => openStickyNote(bookmark.id)}
                    onVoice={() => openVoiceRecorder(bookmark.id)}
                    onEdit={() => openOrbitalEdit(bookmark)}
                    onEditNote={(note) => openStickyNote(bookmark.id, note)}
                    onPlayAudio={handlePlayAudio}
                    className="compact-controls"
                    isPro={!locked}
                  />
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Action Bar -->
    <div class="action-bar">
      <button
        class="btn btn-sm btn-ghost"
        onclick={() => showDropZone = !showDropZone}
      >
        {showDropZone ? 'Hide' : 'Show'} Drop Zone
      </button>
      <button
        class="btn btn-sm btn-ghost"
        onclick={() => showStats = !showStats}
      >
        {showStats ? 'Hide' : 'Show'} Stats
      </button>
      <button
        class="btn btn-sm btn-primary"
        onclick={exportBookmarks}
      >
        Export
      </button>
      <label class="btn btn-sm btn-secondary">
        Import
        <input
          type="file"
          accept=".json"
          class="hidden"
          onchange={importBookmarks}
        />
      </label>
    </div>
  </div>

  <!-- Sticky Note Modal -->
  {#if activeNoteBookmark}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => { activeNoteBookmark = null; activeEditNote = null; }}>
      <StickyNote
        bookmarkId={activeNoteBookmark}
        note={activeEditNote}
        onSave={handleNoteSaved}
        onClose={() => { activeNoteBookmark = null; activeEditNote = null; }}
      />
    </div>
  {/if}

  <!-- Voice Recorder Modal -->
  {#if activeVoiceBookmark}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => activeVoiceBookmark = null}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <VoiceRecorder
          bookmarkId={activeVoiceBookmark}
          onSave={handleVoiceSaved}
          onCancel={() => activeVoiceBookmark = null}
        />
      </div>
    </div>
  {/if}

</LockedSectionCard>

<!-- Orbital Edit Modal - Outside LockedSectionCard for proper z-index -->
{#if activeEditBookmark}
  <BookmarkOrbitalEdit
    bookmark={activeEditBookmark}
    onClose={() => {
      console.log('Closing orbital edit');
      activeEditBookmark = null;
    }}
    onSave={(updated) => {
      console.log('Saving orbital edit');
      activeEditBookmark = null;
      showNotification('Bookmark updated successfully!');
    }}
  />
{/if}

<style>
  .enhanced-bookmarks {
    @apply space-y-4;
  }

  .controls-bar {
    @apply flex justify-between items-center gap-4;
  }

  .content-filters {
    @apply flex flex-wrap gap-2;
  }

  .empty-state {
    @apply flex items-center justify-center h-32;
  }

  .bookmarks-list {
    @apply space-y-2;
  }

  .bookmark-item {
    @apply relative;
    user-select: none;
    -webkit-user-drag: none;
  }

  .bookmark-content {
    @apply flex items-start gap-3 p-3 rounded-lg
           hover:bg-base-200 transition-colors duration-200;
  }

  .content-icon {
    @apply flex-shrink-0;
  }

  .bookmark-actions {
    @apply flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity;
  }

  .bookmarks-grid {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
  }

  .bookmark-card {
    user-select: none;
    -webkit-user-drag: none;
  }

  .placeholder-image {
    @apply w-full h-32 bg-base-200 rounded-xl flex items-center justify-center;
  }

  .action-bar {
    @apply flex justify-center gap-2 mt-4 pt-4 border-t border-base-300;
  }

  .modal-overlay {
    @apply fixed inset-0 z-50 flex items-center justify-center;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }
  
  :global(.dark) .modal-overlay {
    background-color: rgba(0, 0, 0, 0.7);
  }

  .modal-content {
    @apply relative;
  }

  .tags {
    @apply flex flex-wrap gap-1;
  }

  .notes-indicator {
    @apply flex gap-1;
  }

  /* Favicon styles for crisp, centered rendering */
  .favicon-container {
    @apply flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg overflow-hidden;
    background: transparent;
  }

  .favicon-img {
    @apply max-w-full max-h-full;
    width: auto;
    height: auto;
    object-fit: contain;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }

  .card-favicon-container {
    @apply w-full h-32 flex items-center justify-center bg-base-200 rounded-xl overflow-hidden;
  }

  .card-favicon-img {
    @apply max-w-[80%] max-h-[80%];
    width: auto;
    height: auto;
    object-fit: contain;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
</style>
