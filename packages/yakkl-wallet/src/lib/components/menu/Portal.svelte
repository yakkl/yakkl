<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { portal } from 'svelte/internal';
  
  let { 
    children,
    target = 'body' 
  } = $props();
  
  let container: HTMLElement | null = $state(null);
  
  onMount(() => {
    container = document.createElement('div');
    container.className = 'yakkl-menu-portal';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';
    
    const targetElement = typeof target === 'string' 
      ? document.querySelector(target) || document.body
      : target;
      
    targetElement.appendChild(container);
  });
  
  onDestroy(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });
</script>

{#if container}
  {@html ''}
  <div use:portal={container} style="pointer-events: auto;">
    {#if children}
      {@render children()}
    {/if}
  </div>
{/if}