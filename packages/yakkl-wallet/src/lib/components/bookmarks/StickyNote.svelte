<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { spring } from 'svelte/motion';
  import { enhancedBookmarkStore } from '$lib/stores/enhancedBookmark.store';
  import type { BookmarkNote } from '$lib/types/bookmark.types';

  interface Props {
    bookmarkId: string;
    note?: BookmarkNote;
    onSave?: (note: BookmarkNote) => void;
    onDelete?: (noteId: string) => void;
    onClose?: () => void;
    initialPosition?: { x: number; y: number };
    color?: 'yellow' | 'pink' | 'blue' | 'green' | 'orange';
  }

  let {
    bookmarkId,
    note,
    onSave,
    onDelete,
    onClose,
    initialPosition = { x: 100, y: 100 },
    color = 'yellow'
  }: Props = $props();

  let noteContent = $state(note?.content || '');
  let noteTitle = $state(note?.title || '');
  let noteElement: HTMLDivElement;
  let isDragging = $state(false);
  let isSaving = $state(false);
  let isPeeling = $state(false);
  let position = $state(note?.position || initialPosition);
  let dragStart = { x: 0, y: 0 };

  const rotation = spring(0, {
    stiffness: 0.2,
    damping: 0.4
  });

  const colors = {
    yellow: 'bg-yellow-200 border-yellow-400',
    pink: 'bg-pink-200 border-pink-400',
    blue: 'bg-blue-200 border-blue-400',
    green: 'bg-green-200 border-green-400',
    orange: 'bg-orange-200 border-orange-400'
  };

  const shadowColors = {
    yellow: 'shadow-yellow-400/20',
    pink: 'shadow-pink-400/20',
    blue: 'shadow-blue-400/20',
    green: 'shadow-green-400/20',
    orange: 'shadow-orange-400/20'
  };

  onMount(() => {
    if (noteElement) {
      rotation.set(-2 + Math.random() * 4);
    }
  });

  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.note-controls')) return;

    isDragging = true;
    dragStart = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    position = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
  }

  function handleMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  async function handleSave() {
    console.log('Save clicked', { noteContent, bookmarkId, note });
    if (!noteContent.trim()) return;

    isSaving = true;
    isPeeling = true;

    playSound('note');

    setTimeout(async () => {
      try {
        if (note) {
          console.log('Updating existing note', note.id);
          await enhancedBookmarkStore.updateNote(bookmarkId, note.id, {
            title: noteTitle,
            content: noteContent,
            position,
            color
          });

          if (onSave) {
            onSave({ ...note, title: noteTitle, content: noteContent, position, color });
          }
        } else {
          console.log('Creating new note');
          const newNote = await enhancedBookmarkStore.addNote(bookmarkId, {
            title: noteTitle,
            content: noteContent,
            type: 'text',
            position,
            color,
            isSticky: true
          });
          console.log('New note created', newNote);

          if (onSave) {
            onSave(newNote);
          }
        }

        if (onClose) {
          onClose();
        }
      } catch (error) {
        console.error('Failed to save note:', error);
        alert('Failed to save note. Please try again.');
      } finally {
        isSaving = false;
      }
    }, 600);
  }

  async function handleDelete() {
    if (!note) return;

    isPeeling = true;
    playSound('delete');

    setTimeout(async () => {
      try {
        await enhancedBookmarkStore.removeNote(bookmarkId, note.id);

        if (onDelete) {
          onDelete(note.id);
        }

        if (onClose) {
          onClose();
        }
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }, 600);
  }

  function handleColorChange(newColor: typeof color) {
    color = newColor;
  }

  function playSound(type: 'note' | 'delete') {
    try {
      const audio = new Audio(
        type === 'note'
          ? '/sounds/paper-stick.mp3'
          : '/sounds/paper-crumple.mp3'
      );
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Sound playback not available');
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={noteElement}
  class="modern-note"
  class:dragging={isDragging}
  class:peeling={isPeeling}
  style="
    left: {position.x}px;
    top: {position.y}px;
    --note-color: {colors[color]};
    transform: rotate({$rotation}deg) scale({isDragging ? 1.05 : 1});
  "
  onmousedown={handleMouseDown}
  in:scale={{ duration: 300, start: 0.5 }}
  out:fly={{ y: -200, duration: 600, opacity: 0 }}
>
  <!-- Color accent layer -->
  <div class="note-accent"></div>

  <div class="note-header">
    <div class="color-palette">
      {#each Object.keys(colors) as c}
        <button
          class="color-option"
          class:active={color === c}
          style="--dot-color: {colors[c as typeof color]}"
          onclick={() => handleColorChange(c as typeof color)}
          title="Change to {c}"
        >
          <span class="color-ring"></span>
        </button>
      {/each}
    </div>

    <div class="note-actions">
      {#if note}
        <button
          class="action-btn delete"
          onclick={handleDelete}
          title="Delete note"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      {/if}

      <button
        class="action-btn close"
        onclick={onClose}
        title="Close"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>

  <div class="note-body">
    <input
      type="text"
      bind:value={noteTitle}
      class="note-title"
      placeholder="Title your thoughts..."
      maxlength="100"
      disabled={isSaving}
    />

    <div class="note-divider"></div>

    <textarea
      bind:value={noteContent}
      class="note-content"
      placeholder="Capture your ideas..."
      maxlength="500"
      disabled={isSaving}
    ></textarea>
  </div>

  <div class="note-footer">
    <div class="footer-info">
      <span class="char-indicator">
        <span class="char-current">{noteContent.length}</span>
        <span class="char-separator">/</span>
        <span class="char-max">500</span>
      </span>
      {#if note?.createdAt}
        <span class="note-timestamp">
          {new Date(note.createdAt).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      {/if}
    </div>

    <button
      class="save-btn"
      class:saving={isSaving}
      onclick={handleSave}
      disabled={!noteContent.trim() || isSaving}
    >
      {#if isSaving}
        <span class="loading loading-spinner loading-xs"></span>
        Saving
      {:else}
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
        </svg>
        Save
      {/if}
    </button>
  </div>
</div>

<style>
  /* Professional note design */
  .modern-note {
    @apply absolute w-80 rounded-xl cursor-move z-50;
    @apply bg-base-100 border border-base-300;
    padding: 0;
    min-height: 320px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 10px 25px -5px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .modern-note.dragging {
    @apply cursor-grabbing border-primary;
    box-shadow: 
      0 20px 40px -10px rgba(0, 0, 0, 0.2),
      0 8px 16px -4px rgba(0, 0, 0, 0.1);
  }

  .modern-note.peeling {
    animation: modernPeel 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  /* Color accent strip */
  .note-accent {
    @apply absolute top-0 left-0 right-0 h-1 rounded-t-xl;
    background: var(--note-color);
  }

  /* Header section */
  .note-header {
    @apply flex justify-between items-center p-4 pb-3;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .color-palette {
    @apply flex gap-2;
  }

  .color-option {
    @apply relative w-6 h-6 rounded-full cursor-pointer transition-all duration-200;
    background: var(--dot-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .color-option:hover {
    transform: scale(1.15) translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .color-option.active .color-ring {
    @apply absolute inset-0 rounded-full;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 0 2px var(--dot-color);
    animation: pulse 2s infinite;
  }

  .note-actions {
    @apply flex gap-1;
  }

  .action-btn {
    @apply w-8 h-8 rounded-lg flex items-center justify-center
           transition-all duration-200 cursor-pointer;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .action-btn.delete {
    @apply text-red-500 hover:text-red-600;
  }

  .action-btn.close {
    @apply text-base-content/60 hover:text-base-content;
  }

  /* Body section */
  .note-body {
    @apply p-4 flex flex-col gap-3;
  }

  .note-title {
    @apply w-full bg-transparent border-none outline-none
           text-base-content font-semibold text-lg;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    transition: all 0.2s;
  }

  .note-title:focus {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 2px rgba(var(--note-color), 0.2);
  }

  .note-divider {
    @apply w-full h-px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
  }

  .note-content {
    @apply w-full bg-transparent border-none outline-none resize-none
           text-base-content text-sm leading-relaxed;
    padding: 12px;
    min-height: 120px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    transition: all 0.2s;
  }

  .note-content:focus {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 2px rgba(var(--note-color), 0.15);
  }

  /* Footer section */
  .note-footer {
    @apply flex justify-between items-center p-4 pt-2;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .footer-info {
    @apply flex items-center gap-3 text-xs;
  }

  .char-indicator {
    @apply flex items-center gap-1;
    color: rgba(var(--base-content), 0.5);
  }

  .char-current {
    @apply font-semibold;
    color: var(--note-color);
  }

  .char-separator {
    opacity: 0.3;
  }

  .note-timestamp {
    @apply text-base-content/40;
    font-size: 11px;
  }

  .save-btn {
    @apply px-4 py-2 rounded-lg font-medium text-sm
           flex items-center gap-2 transition-all duration-200;
    background: linear-gradient(
      135deg,
      var(--note-color) 0%,
      color-mix(in srgb, var(--note-color) 80%, black) 100%
    );
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .save-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    filter: brightness(1.1);
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-btn.saving {
    background: rgba(255, 255, 255, 0.1);
    color: var(--base-content);
  }

  /* Animations */
  @keyframes modernPeel {
    0% {
      transform: rotate(var(--rotation, 0deg)) scale(1);
      opacity: 1;
      filter: blur(0);
    }
    30% {
      transform: rotate(calc(var(--rotation, 0deg) + 10deg)) scale(1.05);
    }
    60% {
      transform: rotate(calc(var(--rotation, 0deg) - 20deg)) scale(0.9) translateY(-20px);
      opacity: 0.8;
      filter: blur(1px);
    }
    100% {
      transform: rotate(calc(var(--rotation, 0deg) - 45deg)) scale(0.3) translateY(-100px);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  /* Dark mode adjustments */
  :global(.dark) .modern-note {
    @apply bg-base-100 border-base-300;
    box-shadow: 
      0 10px 30px -5px rgba(0, 0, 0, 0.3),
      0 5px 10px -2px rgba(0, 0, 0, 0.2);
  }

  :global(.dark) .note-title,
  :global(.dark) .note-content {
    @apply text-base-content;
  }

</style>
