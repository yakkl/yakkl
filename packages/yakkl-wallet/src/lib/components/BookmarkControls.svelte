<script lang="ts">
  import { enhancedBookmarkStore } from '$lib/stores/enhancedBookmark.store';
  import NotesAudioIndicator from './bookmarks/NotesAudioIndicator.svelte';
  import type { EnhancedBookmark, BookmarkNote } from '$lib/types/bookmark.types';

  interface Props {
    bookmark: EnhancedBookmark;
    onNote?: () => void;
    onVoice?: () => void;
    onEdit?: () => void;
    onEditNote?: (note: BookmarkNote) => void;
    onPlayAudio?: (note: BookmarkNote) => void;
    className?: string;
    isPro?: boolean;
  }

  let {
    bookmark,
    onNote,
    onVoice,
    onEdit,
    onEditNote,
    onPlayAudio,
    className = '',
    isPro = false
  }: Props = $props();

  async function handleDelete() {
    if (confirm('Delete this bookmark?')) {
      await enhancedBookmarkStore.removeBookmark(bookmark.id);
    }
  }

  function handlePrint() {
    if (bookmark.url) {
      window.open(bookmark.url, '_blank')?.print();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bookmark-controls {className}" onclick={(e) => e.stopPropagation()}>
  <!-- Notes and Audio Indicators with Hover Cards -->
  <NotesAudioIndicator
    notes={bookmark.notes || []}
    onNoteClick={onEditNote || (() => {})}
    onAudioClick={onPlayAudio || (() => {})}
    onNewNote={onNote || (() => {})}
    onNewAudio={onVoice || (() => {})}
    onDeleteNote={async (noteId) => {
      await enhancedBookmarkStore.removeNote(bookmark.id, noteId);
    }}
  />

  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    class="btn btn-ghost btn-xs btn-circle"
    onclick={() => {
      console.log('Edit button clicked, onEdit:', onEdit);
      if (onEdit) onEdit();
    }}
    title="Edit bookmark details"
    aria-label="Edit bookmark"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  </button>

  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    class="btn btn-ghost btn-xs btn-circle"
    onclick={handlePrint}
    title="Print this bookmark"
    aria-label="Print bookmark"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  </button>

  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    class="btn btn-ghost btn-xs btn-circle text-error"
    onclick={handleDelete}
    title="Delete this bookmark"
    aria-label="Delete bookmark"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>
</div>

<style>
  .bookmark-controls {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
    z-index: 10;
    background-color: white;
    border-radius: 9999px;
    padding: 0.25rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  :global(.dark) .bookmark-controls {
    background-color: rgba(31, 41, 55, 0.95);
  }

  :global(.group:hover) .bookmark-controls {
    opacity: 1;
  }
</style>
