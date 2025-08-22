<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale, fly } from 'svelte/transition';
  import { spring } from 'svelte/motion';
  import { enhancedBookmarkStore } from '$lib/stores/enhancedBookmark.store';
  import type { EnhancedBookmark } from '$lib/types/bookmark.types';
  import OrbitalNode from './OrbitalNode.svelte';
  import InfoEditPanel from '../edit/InfoEditPanel.svelte';
  import MediaEditPanel from '../edit/MediaEditPanel.svelte';
  import TagsEditPanel from '../edit/TagsEditPanel.svelte';
  import ActionsEditPanel from '../edit/ActionsEditPanel.svelte';
  
  interface Props {
    bookmark: EnhancedBookmark;
    onClose: () => void;
    onSave?: (bookmark: EnhancedBookmark) => void;
  }
  
  let {
    bookmark,
    onClose,
    onSave
  }: Props = $props();
  
  // Debug log when component mounts
  $effect(() => {
    console.log('BookmarkOrbitalEdit mounted with bookmark:', bookmark);
  });
  
  type EditMode = 'preview' | 'info' | 'media' | 'tags' | 'actions' | 'meta';
  
  let editMode = $state<EditMode>('preview');
  let editedBookmark = $state({ ...bookmark });
  let hasChanges = $state(false);
  let isSaving = $state(false);
  let activeNode = $state<string | null>(null);
  
  // Orbital configuration with tooltips
  const orbitalNodes = [
    { id: 'info', icon: '📝', label: 'Info', angle: -90, color: 'primary', tooltip: 'Edit title, description, URL and content type' },
    { id: 'media', icon: '🖼️', label: 'Media', angle: -30, color: 'secondary', tooltip: 'Manage thumbnail and favicon images' },
    { id: 'tags', icon: '🏷️', label: 'Tags', angle: 30, color: 'accent', tooltip: 'Add, remove and organize tags' },
    { id: 'actions', icon: '⚡', label: 'Actions', angle: 90, color: 'warning', tooltip: 'Quick toggles for pin, favorite, archive and priority' },
    { id: 'meta', icon: '🔮', label: 'AI Meta', angle: 150, color: 'info', tooltip: 'AI-powered suggestions and auto-tagging (Pro feature)' }
  ];
  
  // Animation springs
  const rotation = spring(0, {
    stiffness: 0.1,
    damping: 0.4
  });
  
  const centralScale = spring(1, {
    stiffness: 0.2,
    damping: 0.5
  });
  
  $effect(() => {
    hasChanges = JSON.stringify(editedBookmark) !== JSON.stringify(bookmark);
  });
  
  function handleNodeClick(nodeId: string) {
    editMode = nodeId as EditMode;
    activeNode = nodeId;
    
    // Rotate orbital to bring active node to top
    const node = orbitalNodes.find(n => n.id === nodeId);
    if (node) {
      rotation.update(r => r - node.angle - 90);
    }
  }
  
  function handleNodeHover(nodeId: string | null) {
    if (nodeId && editMode === 'preview') {
      centralScale.set(0.95);
    } else {
      centralScale.set(1);
    }
  }
  
  async function handleSave() {
    if (!hasChanges) {
      onClose();
      return;
    }
    
    isSaving = true;
    
    try {
      await enhancedBookmarkStore.updateBookmark(bookmark.id, editedBookmark);
      
      // Save animation
      centralScale.set(1.1);
      setTimeout(() => centralScale.set(1), 200);
      
      onSave?.(editedBookmark);
      
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    } finally {
      isSaving = false;
    }
  }
  
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (editMode !== 'preview') {
        editMode = 'preview';
        activeNode = null;
      } else {
        onClose();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }
  
  onMount(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="orbital-edit-overlay"
  onclick={onClose}
  transition:fade={{ duration: 200 }}
>
  <div 
    class="orbital-edit-container"
    onclick={(e) => e.stopPropagation()}
    in:scale={{ duration: 300, start: 0.8 }}
    out:scale={{ duration: 200, start: 0.9 }}
  >
    <!-- SVG Orbital Interface -->
    <svg 
      width="400" 
      height="400" 
      viewBox="-200 -200 400 400"
      class="orbital-svg"
      style="transform: rotate({$rotation}deg)"
    >
      <!-- Orbital path -->
      <circle
        cx="0"
        cy="0"
        r="120"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        opacity="0.1"
        class="text-base-content"
      />
      
      <!-- Orbital nodes -->
      {#each orbitalNodes as node}
        <OrbitalNode
          icon={node.icon}
          label={node.label}
          angle={node.angle}
          color={node.color}
          tooltip={node.tooltip}
          isActive={activeNode === node.id}
          onClick={() => handleNodeClick(node.id)}
          onHover={(hovering) => handleNodeHover(hovering ? node.id : null)}
        />
      {/each}
      
      <!-- Central bookmark preview -->
      <g transform="scale({$centralScale})">
        <!-- Background circle -->
        <circle
          cx="0"
          cy="0"
          r="70"
          fill="currentColor"
          class="text-base-200"
          stroke="currentColor"
          stroke-width="2"
          class:text-base-300={true}
        />
        
        <!-- Bookmark icon -->
        <text
          x="0"
          y="-20"
          text-anchor="middle"
          font-size="30"
        >
          📑
        </text>
        
        <!-- Title preview -->
        <foreignObject x="-60" y="-5" width="120" height="40">
          <div class="text-center">
            <p class="text-xs font-semibold truncate text-base-content">
              {editedBookmark.title}
            </p>
            <p class="text-xs opacity-60 truncate">
              {editedBookmark.tags.length} tags
            </p>
          </div>
        </foreignObject>
        
        <!-- Save indicator -->
        {#if hasChanges}
          <circle
            cx="50"
            cy="-50"
            r="8"
            fill="currentColor"
            class="text-success"
            in:scale={{ duration: 200 }}
          />
        {/if}
      </g>
    </svg>
    
    <!-- Edit Panels -->
    {#if editMode !== 'preview'}
      <div 
        class="edit-panel"
        transition:fly={{ y: 20, duration: 200 }}
      >
        {#if editMode === 'info'}
          <InfoEditPanel
            bind:bookmark={editedBookmark}
            onClose={() => { editMode = 'preview'; activeNode = null; }}
          />
        {:else if editMode === 'media'}
          <MediaEditPanel
            bind:bookmark={editedBookmark}
            onClose={() => { editMode = 'preview'; activeNode = null; }}
          />
        {:else if editMode === 'tags'}
          <TagsEditPanel
            bind:bookmark={editedBookmark}
            onClose={() => { editMode = 'preview'; activeNode = null; }}
          />
        {:else if editMode === 'actions'}
          <ActionsEditPanel
            bind:bookmark={editedBookmark}
            onClose={() => { editMode = 'preview'; activeNode = null; }}
          />
        {:else if editMode === 'meta'}
          <div class="p-4 bg-base-100 rounded-lg">
            <h3 class="font-semibold mb-2">AI Meta (Pro Feature)</h3>
            <p class="text-sm opacity-60">Auto-generate tags and summaries with AI</p>
            <button 
              class="btn btn-sm btn-ghost mt-2"
              onclick={() => { editMode = 'preview'; activeNode = null; }}
            >
              Close
            </button>
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Action buttons -->
    <div class="orbital-actions">
      <button
        class="btn btn-ghost btn-sm"
        onclick={onClose}
        disabled={isSaving}
      >
        Cancel
      </button>
      
      {#if hasChanges}
        <button
          class="btn btn-primary btn-sm"
          onclick={handleSave}
          disabled={isSaving}
        >
          {#if isSaving}
            <span class="loading loading-spinner loading-xs"></span>
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      {/if}
    </div>
    
    <!-- Instructions -->
    <div class="orbital-instructions">
      <p class="text-xs opacity-60">
        Click nodes to edit • {#if editMode !== 'preview'}Esc to go back • {/if}Ctrl+S to save
      </p>
    </div>
  </div>
</div>

<style>
  .orbital-edit-overlay {
    @apply fixed inset-0 flex items-center justify-center;
    @apply bg-black/50 backdrop-blur-sm;
    z-index: 9999;
  }
  
  .orbital-edit-container {
    @apply relative;
    @apply bg-base-100/95 backdrop-blur-md;
    @apply rounded-2xl shadow-2xl;
    @apply p-8;
    max-width: 90vw;
    max-height: 90vh;
  }
  
  .orbital-svg {
    @apply transition-transform duration-500 ease-out;
  }
  
  .edit-panel {
    @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2;
    @apply bg-base-100 rounded-lg shadow-xl;
    @apply border border-base-300;
    @apply max-w-md w-full;
    z-index: 10;
  }
  
  .orbital-actions {
    @apply absolute bottom-4 right-4 flex gap-2;
  }
  
  .orbital-instructions {
    @apply absolute bottom-4 left-4;
  }
  
  :global(.dark) .orbital-edit-container {
    @apply bg-zinc-900/95;
  }
</style>