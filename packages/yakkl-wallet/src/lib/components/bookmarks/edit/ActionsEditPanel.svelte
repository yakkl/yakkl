<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { EnhancedBookmark, NotePriority, ReadStatus } from '$lib/types/bookmark.types';
  
  interface Props {
    bookmark: EnhancedBookmark;
    onClose: () => void;
  }
  
  let {
    bookmark = $bindable(),
    onClose
  }: Props = $props();
  
  const priorities: NotePriority[] = ['high', 'medium', 'low'];
  const readStatuses: ReadStatus[] = ['unread', 'reading', 'read'];
  
  const priorityIcons = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  };
  
  const readStatusIcons = {
    unread: '📕',
    reading: '📖',
    read: '✅'
  };
</script>

<div class="actions-edit-panel p-4" transition:fly={{ y: -10, duration: 200 }}>
  <div class="flex justify-between items-center mb-4">
    <h3 class="font-semibold flex items-center gap-2">
      <span class="text-xl">⚡</span>
      Quick Actions
    </h3>
    <button
      class="btn btn-ghost btn-sm btn-circle"
      onclick={onClose}
    >
      ✕
    </button>
  </div>
  
  <div class="space-y-4">
    <!-- Quick Toggles -->
    <div class="quick-toggles space-y-3">
      <!-- Pin Toggle -->
      <label class="flex items-center justify-between cursor-pointer p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
        <span class="flex items-center gap-2">
          <span class="text-xl">📌</span>
          <div>
            <span class="font-medium">Pin Bookmark</span>
            <p class="text-xs opacity-60">Keep at the top of your list</p>
          </div>
        </span>
        <input
          type="checkbox"
          bind:checked={bookmark.isPinned}
          class="toggle toggle-primary"
        />
      </label>
      
      <!-- Favorite Toggle -->
      <label class="flex items-center justify-between cursor-pointer p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
        <span class="flex items-center gap-2">
          <span class="text-xl">❤️</span>
          <div>
            <span class="font-medium">Favorite</span>
            <p class="text-xs opacity-60">Mark as favorite</p>
          </div>
        </span>
        <input
          type="checkbox"
          bind:checked={bookmark.isFavorite}
          class="toggle toggle-error"
        />
      </label>
      
      <!-- Archive Toggle -->
      <label class="flex items-center justify-between cursor-pointer p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
        <span class="flex items-center gap-2">
          <span class="text-xl">📦</span>
          <div>
            <span class="font-medium">Archive</span>
            <p class="text-xs opacity-60">Move to archive</p>
          </div>
        </span>
        <input
          type="checkbox"
          bind:checked={bookmark.isArchived}
          class="toggle toggle-warning"
        />
      </label>
    </div>
    
    <!-- Priority -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Priority</span>
      </label>
      <div class="btn-group w-full">
        {#each priorities as priority}
          <button
            class="btn btn-sm flex-1"
            class:btn-active={bookmark.priority === priority}
            onclick={() => bookmark.priority = priority}
          >
            {priorityIcons[priority]} {priority}
          </button>
        {/each}
      </div>
    </div>
    
    <!-- Read Status -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Read Status</span>
      </label>
      <div class="btn-group w-full">
        {#each readStatuses as status}
          <button
            class="btn btn-sm flex-1"
            class:btn-active={bookmark.readStatus === status}
            onclick={() => bookmark.readStatus = status}
          >
            <span class="hidden sm:inline">{readStatusIcons[status]}</span>
            <span class="capitalize">{status}</span>
          </button>
        {/each}
      </div>
    </div>
    
    <!-- Read Progress (if reading or read) -->
    {#if bookmark.readStatus === 'reading' || bookmark.readStatus === 'read'}
      <div class="form-control">
        <label class="label">
          <span class="label-text">Read Progress</span>
          <span class="label-text-alt">{bookmark.readProgress || 0}%</span>
        </label>
        <input
          type="range"
          bind:value={bookmark.readProgress}
          min="0"
          max="100"
          class="range range-primary"
        />
        <div class="w-full flex justify-between text-xs px-2 mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .actions-edit-panel {
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .actions-edit-panel::-webkit-scrollbar {
    width: 6px;
  }
  
  .actions-edit-panel::-webkit-scrollbar-track {
    @apply bg-base-200 rounded-full;
  }
  
  .actions-edit-panel::-webkit-scrollbar-thumb {
    @apply bg-base-300 rounded-full;
  }
</style>