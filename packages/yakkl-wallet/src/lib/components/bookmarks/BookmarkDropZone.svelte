<script lang="ts">
  import { enhancedBookmarkStore } from '$lib/stores/enhancedBookmark.store';
  import type { DragDropPayload, ContentType } from '$lib/types/bookmark.types';
  import { fade, scale } from 'svelte/transition';
  import { spring } from 'svelte/motion';
  import BookmarkIcon from '../icons/BookmarkIcon.svelte';
  
  interface Props {
    onDrop?: (payload: DragDropPayload) => void;
    onBookmarkAdded?: (id: string) => void;
    disabled?: boolean;
  }
  
  let { 
    onDrop,
    onBookmarkAdded,
    disabled = false
  }: Props = $props();
  
  let isDragging = $state(false);
  let isProcessing = $state(false);
  let showSuccess = $state(false);
  let showError = $state(false);
  let errorMessage = $state('');
  let dropZone: HTMLDivElement;
  
  const scaleSpring = spring(1, {
    stiffness: 0.2,
    damping: 0.5
  });
  
  $effect(() => {
    if (isDragging) {
      scaleSpring.set(1.05);
    } else {
      scaleSpring.set(1);
    }
  });
  
  function handleDragEnter(e: DragEvent) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }
  
  function handleDragOver(e: DragEvent) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }
  
  function handleDragLeave(e: DragEvent) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (e.target === dropZone) {
      isDragging = false;
    }
  }
  
  async function handleDrop(e: DragEvent) {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    
    if (!e.dataTransfer) return;
    
    isProcessing = true;
    
    try {
      const payload = await extractDragData(e.dataTransfer);
      
      // Check for duplicates
      const existingBookmarks = $enhancedBookmarkStore.bookmarks;
      const isDuplicate = existingBookmarks.some(b => 
        b.url === payload.url || 
        (b.title === payload.title && b.description === payload.description)
      );
      
      if (isDuplicate) {
        console.warn('Bookmark already exists:', payload.url);
        showErrorFeedback('This bookmark already exists!');
        playSound('error');
        return;
      }
      
      if (onDrop) {
        onDrop(payload);
      }
      
      const bookmark = await enhancedBookmarkStore.addBookmark({
        url: payload.url,
        title: payload.title || 'Untitled',
        description: (payload.description || payload.selectedText || '').trim().replace(/^\n+/, ''),
        imageUrl: payload.imageUrl || '',
        contentType: payload.contentType || 'webpage',
        source: new URL(payload.url).hostname,
        tags: [],
        notes: []
      });
      
      if (onBookmarkAdded) {
        onBookmarkAdded(bookmark.id);
      }
      
      showSuccessFeedback();
      playSound('save');
      
    } catch (error) {
      console.error('Failed to process dropped item:', error);
      playSound('error');
    } finally {
      isProcessing = false;
    }
  }
  
  async function extractDragData(dataTransfer: DataTransfer): Promise<DragDropPayload> {
    const url = dataTransfer.getData('text/uri-list') || 
                dataTransfer.getData('text/plain') || 
                '';
    
    const html = dataTransfer.getData('text/html');
    
    let title = '';
    let description = '';
    let imageUrl = '';
    let contentType: ContentType = 'webpage';
    
    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Try to extract link text first (for dragged links)
      const link = doc.querySelector('a');
      if (link) {
        title = link.textContent?.trim() || '';
      }
      
      // Fallback to other title sources
      if (!title) {
        title = doc.querySelector('title')?.textContent || 
                doc.querySelector('h1')?.textContent || 
                '';
      }
      
      const metaDescription = doc.querySelector('meta[name="description"]');
      description = metaDescription?.getAttribute('content') || '';
      
      const firstImage = doc.querySelector('img');
      imageUrl = firstImage?.src || '';
    }
    
    // If still no title, try to get it from the URL
    if (!title && url) {
      try {
        const urlObj = new URL(url);
        title = urlObj.hostname + urlObj.pathname;
      } catch {
        title = url.substring(0, 50);
      }
    }
    
    if (dataTransfer.files.length > 0) {
      const file = dataTransfer.files[0];
      contentType = detectContentTypeFromFile(file);
      
      if (contentType === 'image' && file.type.startsWith('image/')) {
        imageUrl = URL.createObjectURL(file);
      }
    } else {
      contentType = detectContentTypeFromUrl(url);
    }
    
    const selectedText = window.getSelection()?.toString() || '';
    
    return {
      url,
      title,
      description,
      imageUrl,
      contentType,
      selectedText,
      metadata: {
        droppedAt: new Date().toISOString(),
        sourceType: dataTransfer.files.length > 0 ? 'file' : 'url'
      }
    };
  }
  
  function detectContentTypeFromFile(file: File): ContentType {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    
    return 'webpage';
  }
  
  function detectContentTypeFromUrl(url: string): ContentType {
    const urlLower = url.toLowerCase();
    
    if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) return 'image';
    if (urlLower.match(/\.(mp4|webm|ogg|mov)/)) return 'video';
    if (urlLower.match(/\.(mp3|wav|m4a|aac)/)) return 'audio';
    if (urlLower.endsWith('.pdf')) return 'pdf';
    if (urlLower.includes('youtube.com') || urlLower.includes('vimeo.com')) return 'video';
    if (urlLower.includes('soundcloud.com') || urlLower.includes('spotify.com')) return 'podcast';
    
    return 'webpage';
  }
  
  function showSuccessFeedback() {
    showSuccess = true;
    setTimeout(() => {
      showSuccess = false;
    }, 2000);
  }
  
  function showErrorFeedback(message: string) {
    errorMessage = message;
    showError = true;
    setTimeout(() => {
      showError = false;
      errorMessage = '';
    }, 3000);
  }
  
  function playSound(type: 'save' | 'error') {
    try {
      const audio = new Audio(
        type === 'save' 
          ? '/sounds/bookmark-save.mp3' 
          : '/sounds/error.mp3'
      );
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Sound playback not available');
    }
  }
</script>

<div 
  bind:this={dropZone}
  class="bookmark-drop-zone relative"
  class:dragging={isDragging}
  class:disabled
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  style="transform: scale({$scaleSpring})"
>
  <div class="drop-zone-content">
    {#if isProcessing}
      <div class="processing" transition:fade={{ duration: 200 }}>
        <div class="loading loading-spinner loading-lg text-primary"></div>
        <p class="mt-2 text-sm">Processing...</p>
      </div>
    {:else if showSuccess}
      <div class="success" transition:scale={{ duration: 300, start: 0.5 }}>
        <div class="text-success text-6xl mb-2">✓</div>
        <p class="text-sm font-semibold">Bookmark Saved!</p>
      </div>
    {:else if showError}
      <div class="error" transition:scale={{ duration: 300, start: 0.5 }}>
        <div class="text-error text-6xl mb-2">⚠</div>
        <p class="text-sm font-semibold text-error">{errorMessage}</p>
      </div>
    {:else}
      <div class="idle-state">
        <div class="icon-wrapper mb-3">
          <BookmarkIcon class="w-12 h-12 text-base-content/50" />
        </div>
        
        <h3 class="text-lg font-semibold mb-2">
          Drop to Bookmark
        </h3>
        
        <p class="text-sm text-base-content/60 mb-4">
          Drag any webpage, link, image, or PDF here
        </p>
        
        {#if isDragging}
          <div 
            class="drop-hint"
            transition:fade={{ duration: 150 }}
          >
            <div class="badge badge-primary badge-lg">
              Release to save
            </div>
          </div>
        {:else}
          <div class="supported-types flex flex-wrap gap-2 justify-center">
            <span class="badge badge-ghost badge-sm">Webpages</span>
            <span class="badge badge-ghost badge-sm">Articles</span>
            <span class="badge badge-ghost badge-sm">Images</span>
            <span class="badge badge-ghost badge-sm">PDFs</span>
            <span class="badge badge-ghost badge-sm">Videos</span>
            <span class="badge badge-ghost badge-sm">Podcasts</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  {#if isDragging}
    <div 
      class="drop-overlay"
      transition:fade={{ duration: 150 }}
    ></div>
  {/if}
</div>

<style>
  .bookmark-drop-zone {
    @apply relative rounded-xl border-2 border-dashed border-base-300 
           bg-base-100 p-8 transition-all duration-200 ease-in-out
           hover:border-base-content/20 cursor-pointer;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .bookmark-drop-zone.dragging {
    @apply border-primary bg-primary/5;
    animation: pulse 1.5s infinite;
  }
  
  .bookmark-drop-zone.disabled {
    @apply opacity-50 cursor-not-allowed;
    pointer-events: none;
  }
  
  .drop-zone-content {
    @apply text-center relative z-10;
  }
  
  .drop-overlay {
    @apply absolute inset-0 bg-primary/10 rounded-xl;
    backdrop-filter: blur(2px);
  }
  
  .icon-wrapper {
    @apply inline-flex items-center justify-center w-16 h-16 
           rounded-full bg-base-200;
  }
  
  .processing,
  .success,
  .error,
  .idle-state {
    @apply flex flex-col items-center justify-center;
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.02);
      opacity: 0.9;
    }
  }
  
  .drop-hint {
    @apply mt-4;
    animation: bounce 1s infinite;
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
</style>