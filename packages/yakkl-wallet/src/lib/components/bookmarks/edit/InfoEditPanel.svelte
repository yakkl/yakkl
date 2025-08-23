<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { EnhancedBookmark, ContentType } from '$lib/types/bookmark.types';
  
  interface Props {
    bookmark: EnhancedBookmark;
    onClose: () => void;
  }
  
  let {
    bookmark = $bindable(),
    onClose
  }: Props = $props();
  
  const contentTypes: ContentType[] = [
    'article', 'video', 'podcast', 'pdf', 'webpage', 'image', 'audio'
  ];
  
  const contentTypeIcons: Record<ContentType, string> = {
    article: '📄',
    video: '🎬',
    podcast: '🎙️',
    pdf: '📑',
    webpage: '🌐',
    image: '🖼️',
    audio: '🎵'
  };
</script>

<div class="info-edit-panel p-4" transition:fly={{ y: -10, duration: 200 }}>
  <div class="flex justify-between items-center mb-4">
    <h3 class="font-semibold flex items-center gap-2">
      <span class="text-xl">📝</span>
      Edit Information
    </h3>
    <button
      class="btn btn-ghost btn-sm btn-circle"
      onclick={onClose}
    >
      ✕
    </button>
  </div>
  
  <div class="space-y-4">
    <!-- Title -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Title</span>
      </label>
      <input
        type="text"
        bind:value={bookmark.title}
        class="input input-bordered w-full"
        placeholder="Enter bookmark title..."
      />
    </div>
    
    <!-- Description -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Description</span>
      </label>
      <textarea
        bind:value={bookmark.description}
        class="textarea textarea-bordered w-full"
        rows="3"
        placeholder="Enter description..."
      ></textarea>
    </div>
    
    <!-- URL -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">URL</span>
      </label>
      <input
        type="url"
        bind:value={bookmark.url}
        class="input input-bordered w-full"
        placeholder="https://..."
      />
    </div>
    
    <!-- Content Type -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Content Type</span>
      </label>
      <select
        bind:value={bookmark.contentType}
        class="select select-bordered w-full"
      >
        {#each contentTypes as type}
          <option value={type}>
            {contentTypeIcons[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
          </option>
        {/each}
      </select>
    </div>
    
    <!-- Source -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Source</span>
      </label>
      <input
        type="text"
        bind:value={bookmark.source}
        class="input input-bordered w-full"
        placeholder="Website name..."
      />
    </div>
  </div>
</div>

<style>
  .info-edit-panel {
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .info-edit-panel::-webkit-scrollbar {
    width: 6px;
  }
  
  .info-edit-panel::-webkit-scrollbar-track {
    @apply bg-base-200 rounded-full;
  }
  
  .info-edit-panel::-webkit-scrollbar-thumb {
    @apply bg-base-300 rounded-full;
  }
</style>