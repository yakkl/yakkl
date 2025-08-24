<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { allTags } from '$lib/stores/enhancedBookmark.store';
  import type { EnhancedBookmark } from '$lib/types/bookmark.types';
  
  interface Props {
    bookmark: EnhancedBookmark;
    onClose: () => void;
  }
  
  let {
    bookmark = $bindable(),
    onClose
  }: Props = $props();
  
  let tagInput = $state('');
  let showSuggestions = $state(false);
  let selectedSuggestionIndex = $state(-1);
  
  const existingTags = $derived($allTags);
  
  const suggestions = $derived(() => {
    if (!tagInput) return [];
    
    const input = tagInput.toLowerCase();
    return existingTags
      .filter(tag => 
        tag.toLowerCase().includes(input) && 
        !bookmark.tags.includes(tag)
      )
      .slice(0, 5);
  });
  
  const popularTags = [
    'work', 'personal', 'important', 'reference', 'tutorial',
    'news', 'research', 'project', 'resource', 'tool'
  ];
  
  const unusedPopularTags = $derived(
    popularTags.filter(tag => !bookmark.tags.includes(tag))
  );
  
  function addTag(tag: string) {
    if (!tag || bookmark.tags.includes(tag)) return;
    
    bookmark.tags = [...bookmark.tags, tag];
    tagInput = '';
    showSuggestions = false;
    selectedSuggestionIndex = -1;
  }
  
  function removeTag(tag: string) {
    bookmark.tags = bookmark.tags.filter(t => t !== tag);
  }
  
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (selectedSuggestionIndex >= 0 && suggestions()[selectedSuggestionIndex]) {
        addTag(suggestions()[selectedSuggestionIndex]);
      } else if (tagInput) {
        addTag(tagInput);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedSuggestionIndex = Math.min(
        selectedSuggestionIndex + 1,
        suggestions().length - 1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
    } else if (e.key === 'Escape') {
      showSuggestions = false;
      selectedSuggestionIndex = -1;
    } else if (e.key === 'Backspace' && !tagInput && bookmark.tags.length > 0) {
      removeTag(bookmark.tags[bookmark.tags.length - 1]);
    }
  }
  
  function handleInputFocus() {
    showSuggestions = true;
  }
  
  function handleInputBlur() {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      showSuggestions = false;
      selectedSuggestionIndex = -1;
    }, 200);
  }
</script>

<div class="tags-edit-panel p-4" transition:fly={{ y: -10, duration: 200 }}>
  <div class="flex justify-between items-center mb-4">
    <h3 class="font-semibold flex items-center gap-2">
      <span class="text-xl">🏷️</span>
      Edit Tags
    </h3>
    <button
      class="btn btn-ghost btn-sm btn-circle"
      onclick={onClose}
    >
      ✕
    </button>
  </div>
  
  <div class="space-y-4">
    <!-- Current Tags -->
    <div class="current-tags">
      <label class="label">
        <span class="label-text">Current Tags</span>
        <span class="label-text-alt">{bookmark.tags.length} tags</span>
      </label>
      
      <div class="flex flex-wrap gap-2 min-h-[40px] p-2 bg-base-200 rounded-lg">
        {#each bookmark.tags as tag (tag)}
          <span
            class="badge badge-primary gap-1"
            animate:flip={{ duration: 200 }}
            in:scale={{ duration: 200 }}
            out:fade={{ duration: 150 }}
          >
            {tag}
            <button
              class="btn btn-ghost btn-xs btn-circle"
              onclick={() => removeTag(tag)}
            >
              ✕
            </button>
          </span>
        {:else}
          <span class="text-sm opacity-50">No tags yet</span>
        {/each}
      </div>
    </div>
    
    <!-- Tag Input -->
    <div class="form-control relative">
      <label class="label">
        <span class="label-text">Add New Tag</span>
      </label>
      
      <input
        type="text"
        bind:value={tagInput}
        onkeydown={handleKeyDown}
        onfocus={handleInputFocus}
        onblur={handleInputBlur}
        class="input input-bordered w-full"
        placeholder="Type a tag and press Enter..."
      />
      
      <!-- Suggestions Dropdown -->
      {#if showSuggestions && suggestions().length > 0}
        <div 
          class="suggestions-dropdown"
          transition:fly={{ y: -5, duration: 150 }}
        >
          {#each suggestions() as suggestion, index}
            <button
              class="suggestion-item"
              class:active={index === selectedSuggestionIndex}
              onmousedown={() => addTag(suggestion)}
            >
              {suggestion}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Popular Tags -->
    {#if unusedPopularTags.length > 0}
      <div class="popular-tags">
        <label class="label">
          <span class="label-text">Popular Tags</span>
        </label>
        
        <div class="flex flex-wrap gap-2">
          {#each unusedPopularTags as tag}
            <button
              class="badge badge-outline badge-sm cursor-pointer hover:badge-primary"
              onclick={() => addTag(tag)}
            >
              + {tag}
            </button>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Category -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Category</span>
      </label>
      <input
        type="text"
        bind:value={bookmark.category}
        class="input input-bordered w-full"
        placeholder="e.g., Development, Design, Marketing..."
      />
    </div>
  </div>
</div>

<style>
  .tags-edit-panel {
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .tags-edit-panel::-webkit-scrollbar {
    width: 6px;
  }
  
  .tags-edit-panel::-webkit-scrollbar-track {
    @apply bg-base-200 rounded-full;
  }
  
  .tags-edit-panel::-webkit-scrollbar-thumb {
    @apply bg-base-300 rounded-full;
  }
  
  .suggestions-dropdown {
    @apply absolute top-full left-0 right-0 mt-1;
    @apply bg-base-100 border border-base-300 rounded-lg shadow-lg;
    @apply max-h-40 overflow-y-auto;
    z-index: 100;
  }
  
  .suggestion-item {
    @apply block w-full px-3 py-2 text-left text-sm;
    @apply hover:bg-base-200 transition-colors;
  }
  
  .suggestion-item.active {
    @apply bg-primary text-primary-content;
  }
</style>