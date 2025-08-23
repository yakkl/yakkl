<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { EnhancedBookmark } from '$lib/types/bookmark.types';
  
  interface Props {
    bookmark: EnhancedBookmark;
    onClose: () => void;
  }
  
  let {
    bookmark = $bindable(),
    onClose
  }: Props = $props();
  
  let thumbnailInput = $state('');
  let isLoadingThumbnail = $state(false);
  let thumbnailError = $state('');
  
  async function handleThumbnailChange() {
    if (!thumbnailInput) {
      bookmark.thumbnailUrl = '';
      return;
    }
    
    isLoadingThumbnail = true;
    thumbnailError = '';
    
    try {
      // Validate URL
      new URL(thumbnailInput);
      
      // Test if image loads
      const img = new Image();
      img.src = thumbnailInput;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 5000); // 5 second timeout
      });
      
      bookmark.thumbnailUrl = thumbnailInput;
    } catch (error) {
      thumbnailError = 'Invalid image URL or image failed to load';
    } finally {
      isLoadingThumbnail = false;
    }
  }
  
  async function autoFetchThumbnail() {
    if (!bookmark.url) return;
    
    isLoadingThumbnail = true;
    thumbnailError = '';
    
    try {
      // Try to extract domain and use a favicon service
      const url = new URL(bookmark.url);
      const domain = url.hostname;
      
      // Try different favicon/thumbnail services
      const options = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        `https://favicons.githubusercontent.com/${domain}`,
        `https://icon.horse/icon/${domain}`
      ];
      
      for (const option of options) {
        try {
          const img = new Image();
          img.src = option;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(reject, 2000);
          });
          
          bookmark.thumbnailUrl = option;
          thumbnailInput = option;
          break;
        } catch {
          // Try next option
        }
      }
      
      if (!bookmark.thumbnailUrl) {
        thumbnailError = 'Could not auto-fetch thumbnail';
      }
    } catch (error) {
      thumbnailError = 'Failed to auto-fetch thumbnail';
    } finally {
      isLoadingThumbnail = false;
    }
  }
  
  $effect(() => {
    thumbnailInput = bookmark.thumbnailUrl || '';
  });
</script>

<div class="media-edit-panel p-4" transition:fly={{ y: -10, duration: 200 }}>
  <div class="flex justify-between items-center mb-4">
    <h3 class="font-semibold flex items-center gap-2">
      <span class="text-xl">🖼️</span>
      Edit Media
    </h3>
    <button
      class="btn btn-ghost btn-sm btn-circle"
      onclick={onClose}
    >
      ✕
    </button>
  </div>
  
  <div class="space-y-4">
    <!-- Thumbnail Preview -->
    <div class="thumbnail-preview">
      {#if bookmark.thumbnailUrl}
        <img
          src={bookmark.thumbnailUrl}
          alt="Thumbnail"
          class="w-full h-48 object-cover rounded-lg"
          onerror={(e) => {
            e.currentTarget.src = '/images/logoBull48x48.png';
          }}
        />
      {:else}
        <div class="w-full h-48 bg-base-200 rounded-lg flex items-center justify-center">
          <span class="text-4xl opacity-50">🖼️</span>
        </div>
      {/if}
    </div>
    
    <!-- Thumbnail URL Input -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Thumbnail URL</span>
      </label>
      <div class="input-group">
        <input
          type="url"
          bind:value={thumbnailInput}
          onblur={handleThumbnailChange}
          class="input input-bordered flex-1"
          placeholder="https://example.com/image.jpg"
          disabled={isLoadingThumbnail}
        />
      </div>
      
      {#if thumbnailError}
        <label class="label">
          <span class="label-text-alt text-error">{thumbnailError}</span>
        </label>
      {/if}
    </div>
    
    <!-- Action Buttons -->
    <div class="flex gap-2">
      <button
        class="btn btn-sm btn-primary flex-1"
        onclick={autoFetchThumbnail}
        disabled={isLoadingThumbnail || !bookmark.url}
      >
        {#if isLoadingThumbnail}
          <span class="loading loading-spinner loading-xs"></span>
        {:else}
          🔍
        {/if}
        Auto-fetch
      </button>
      
      <button
        class="btn btn-sm btn-ghost flex-1"
        onclick={() => {
          bookmark.thumbnailUrl = '';
          thumbnailInput = '';
        }}
        disabled={isLoadingThumbnail}
      >
        Clear
      </button>
    </div>
    
    <!-- Favicon URL -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Favicon URL</span>
      </label>
      <input
        type="url"
        bind:value={bookmark.faviconUrl}
        class="input input-bordered w-full"
        placeholder="https://example.com/favicon.ico"
      />
    </div>
    
    <!-- Media URL (for video/audio) -->
    {#if bookmark.contentType === 'video' || bookmark.contentType === 'audio' || bookmark.contentType === 'podcast'}
      <div class="form-control">
        <label class="label">
          <span class="label-text">Media URL</span>
        </label>
        <input
          type="url"
          bind:value={bookmark.mediaUrl}
          class="input input-bordered w-full"
          placeholder="Direct media file URL..."
        />
      </div>
    {/if}
  </div>
</div>

<style>
  .media-edit-panel {
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .media-edit-panel::-webkit-scrollbar {
    width: 6px;
  }
  
  .media-edit-panel::-webkit-scrollbar-track {
    @apply bg-base-200 rounded-full;
  }
  
  .media-edit-panel::-webkit-scrollbar-thumb {
    @apply bg-base-300 rounded-full;
  }
</style>