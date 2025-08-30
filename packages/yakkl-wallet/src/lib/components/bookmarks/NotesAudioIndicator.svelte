<!-- NotesAudioIndicator.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import type { BookmarkNote } from '$lib/types/bookmark.types';
  
  interface Props {
    notes: BookmarkNote[];
    onNoteClick: (note: BookmarkNote) => void;
    onAudioClick: (note: BookmarkNote) => void;
    onNewNote: () => void;
    onNewAudio: () => void;
    onDeleteNote: (noteId: string) => void;
  }
  
  let {
    notes = [],
    onNoteClick,
    onAudioClick,
    onNewNote,
    onNewAudio,
    onDeleteNote
  }: Props = $props();
  
  let showNotesList = $state(false);
  let showAudioList = $state(false);
  let hoveredCard = $state<'notes' | 'audio' | null>(null);
  let hideTimeout: number | null = null;
  
  const textNotes = $derived(notes.filter(n => n.type === 'text'));
  const audioNotes = $derived(notes.filter(n => n.type === 'voice'));
  
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
  
  function truncateText(text: string, maxLength: number = 50) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
</script>

<div class="notes-audio-indicator">
  <!-- Notes Indicator -->
  {#if textNotes.length > 0}
    <div class="indicator-wrapper">
      <button
        class="indicator-btn notes"
        onmouseenter={() => {
          if (hideTimeout) clearTimeout(hideTimeout);
          showNotesList = true;
          hoveredCard = 'notes';
        }}
        onmouseleave={() => {
          hideTimeout = setTimeout(() => {
            showNotesList = false;
            hoveredCard = null;
          }, 100);
        }}
        title="View and manage {textNotes.length} note{textNotes.length > 1 ? 's' : ''}"
        aria-label="Text notes"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span class="badge">{textNotes.length}</span>
      </button>
      
      {#if showNotesList}
        <div 
          class="hover-card notes-list"
          role="tooltip"
          aria-label="Notes list"
          transition:scale={{ duration: 200, start: 0.95 }}
          onmouseenter={() => {
            if (hideTimeout) clearTimeout(hideTimeout);
            showNotesList = true;
            hoveredCard = 'notes';
          }}
          onmouseleave={() => {
            hideTimeout = setTimeout(() => {
              showNotesList = false;
              hoveredCard = null;
            }, 100);
          }}
        >
          <div class="hover-card-header">
            <h4 class="font-semibold">Notes</h4>
            <button 
              class="btn btn-primary btn-xs"
              onclick={onNewNote}
            >
              + Add Note
            </button>
          </div>
          
          <div class="notes-list-content">
            {#each textNotes as note}
              <div class="note-item group">
                <button
                  class="note-item-btn"
                  onclick={() => onNoteClick(note)}
                  title="Click to edit this note"
                >
                  <div class="note-item-header">
                    <span class="note-title">
                      {note.title || truncateText(note.content || 'Untitled Note')}
                    </span>
                    <span class="note-date">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  {#if note.content && note.title}
                    <div class="note-preview">
                      {truncateText(note.content, 100)}
                    </div>
                  {/if}
                </button>
                <button
                  class="delete-btn"
                  onclick={() => {
                    if (confirm('Delete this note?')) {
                      onDeleteNote(note.id);
                    }
                  }}
                  title="Delete note"
                  aria-label="Delete this note"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <button
      class="indicator-btn notes empty"
      onclick={onNewNote}
      title="Add a text note to this bookmark"
      aria-label="Add text note"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  {/if}
  
  <!-- Audio Indicator -->
  {#if audioNotes.length > 0}
    <div class="indicator-wrapper">
      <button
        class="indicator-btn audio"
        onmouseenter={() => {
          if (hideTimeout) clearTimeout(hideTimeout);
          showAudioList = true;
          hoveredCard = 'audio';
        }}
        onmouseleave={() => {
          hideTimeout = setTimeout(() => {
            showAudioList = false;
            hoveredCard = null;
          }, 100);
        }}
        title="View and manage {audioNotes.length} voice note{audioNotes.length > 1 ? 's' : ''}"
        aria-label="Voice notes"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span class="badge">{audioNotes.length}</span>
      </button>
      
      {#if showAudioList}
        <div 
          class="hover-card audio-list"
          role="tooltip"
          aria-label="Voice notes list"
          transition:scale={{ duration: 200, start: 0.95 }}
          onmouseenter={() => {
            if (hideTimeout) clearTimeout(hideTimeout);
            showAudioList = true;
            hoveredCard = 'audio';
          }}
          onmouseleave={() => {
            hideTimeout = setTimeout(() => {
              showAudioList = false;
              hoveredCard = null;
            }, 100);
          }}
        >
          <div class="hover-card-header">
            <h4 class="font-semibold">Voice Notes</h4>
            <button 
              class="btn btn-primary btn-xs"
              onclick={onNewAudio}
            >
              + Add Voice Note
            </button>
          </div>
          
          <div class="notes-list-content">
            {#each audioNotes as note}
              <div class="note-item">
                <button
                  class="note-item-btn audio"
                  onclick={() => onAudioClick(note)}
                >
                  <div class="note-item-header">
                    <span class="note-title">
                      <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      {note.title || `Voice Note ${audioNotes.indexOf(note) + 1}`}
                    </span>
                    <span class="note-date">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  {#if note.duration}
                    <div class="audio-duration">
                      Duration: {Math.floor(note.duration / 60)}:{String(note.duration % 60).padStart(2, '0')}
                    </div>
                  {/if}
                </button>
                <button
                  class="delete-btn"
                  onclick={() => {
                    if (confirm('Delete this voice note?')) {
                      onDeleteNote(note.id);
                    }
                  }}
                  title="Delete voice note"
                  aria-label="Delete this voice note"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <button
      class="indicator-btn audio empty"
      onclick={onNewAudio}
      title="Record a voice note for this bookmark"
      aria-label="Add voice note"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .notes-audio-indicator {
    @apply flex gap-1 items-center;
  }
  
  .indicator-wrapper {
    @apply relative;
  }
  
  .indicator-btn {
    @apply btn btn-ghost btn-xs btn-circle relative;
    @apply hover:bg-primary/10 transition-colors;
  }
  
  .indicator-btn.notes {
    @apply text-blue-500;
  }
  
  .indicator-btn.audio {
    @apply text-green-500;
  }
  
  .indicator-btn.empty {
    @apply opacity-50 hover:opacity-100;
  }
  
  .indicator-btn .badge {
    @apply absolute -top-1 -right-1 badge-xs;
    @apply bg-primary text-primary-content;
    font-size: 10px;
    padding: 0 4px;
    min-width: 16px;
  }
  
  .hover-card {
    @apply absolute z-50 rounded-lg shadow-xl border;
    @apply w-80 max-h-96 overflow-hidden;
    @apply bg-base-100 border-base-300 text-base-content;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
  }
  
  .hover-card-header {
    @apply flex justify-between items-center p-3 border-b;
    @apply bg-base-200 border-base-300 text-base-content;
  }
  
  .hover-card-header h4 {
    @apply text-base-content font-semibold;
  }
  
  .notes-list-content {
    @apply overflow-y-auto max-h-72 p-2;
  }
  
  .note-item {
    @apply flex items-start gap-2 p-2 rounded-lg;
    @apply hover:bg-base-200 transition-colors mb-1;
  }
  
  .note-item-btn {
    @apply flex-1 text-left cursor-pointer;
    @apply text-base-content hover:text-primary transition-colors;
  }
  
  .note-item-header {
    @apply flex justify-between items-start gap-2 mb-1;
  }
  
  .note-title {
    @apply font-medium text-sm flex-1 text-base-content;
  }
  
  .note-date {
    @apply text-xs opacity-60;
  }
  
  .note-preview {
    @apply text-xs opacity-70 mt-1;
  }
  
  .audio-duration {
    @apply text-xs text-base-content/60 mt-1;
  }
  
  .delete-btn {
    @apply btn btn-ghost btn-xs btn-circle text-error;
    @apply opacity-0 group-hover:opacity-100 transition-opacity;
  }
  
  .note-item:hover .delete-btn {
    @apply opacity-100;
  }
  
</style>