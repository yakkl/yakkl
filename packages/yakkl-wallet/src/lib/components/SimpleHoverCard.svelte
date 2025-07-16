<script lang="ts">
  interface Props {
    children: import('svelte').Snippet;
    content: import('svelte').Snippet;
    openDelay?: number;
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
  }

  let {
    children,
    content,
    openDelay = 200,
    side = 'top',
    align = 'center',
    sideOffset = 5
  }: Props = $props();

  let showCard = $state(false);
  let triggerEl: HTMLElement;
  let contentEl: HTMLElement = $state(null) as HTMLElement;
  let timeout: number | null = null;

  function handleMouseEnter() {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      showCard = true;
    }, openDelay);
  }

  function handleMouseLeave() {
    if (timeout) clearTimeout(timeout);
    showCard = false;
  }

  function getPosition() {
    if (!triggerEl || !contentEl) return {};

    const triggerRect = triggerEl.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();

    let top = 0;
    let left = 0;
    let actualSide = side;

    // Calculate vertical position
    switch (side) {
      case 'top':
        top = triggerRect.top - contentRect.height - sideOffset;
        break;
      case 'bottom':
        top = triggerRect.bottom + sideOffset;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        break;
    }

    // Calculate horizontal position
    switch (side) {
      case 'top':
      case 'bottom':
        switch (align) {
          case 'start':
            left = triggerRect.left;
            break;
          case 'center':
            left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
            break;
          case 'end':
            left = triggerRect.right - contentRect.width;
            break;
        }
        break;
      case 'left':
        left = triggerRect.left - contentRect.width - sideOffset;
        break;
      case 'right':
        left = triggerRect.right + sideOffset;
        break;
    }

    // Keep within viewport bounds with better handling for extension popups
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // First check if we need to flip sides due to viewport constraints
    if (side === 'top' && top < padding) {
      // Switch to bottom if not enough room on top
      actualSide = 'bottom';
      top = triggerRect.bottom + sideOffset;
    } else if (side === 'bottom' && top + contentRect.height > viewportHeight - padding) {
      // Switch to top if not enough room on bottom
      actualSide = 'top';
      top = triggerRect.top - contentRect.height - sideOffset;
    } else if (side === 'left' && left < padding) {
      // Switch to right if not enough room on left
      actualSide = 'right';
      left = triggerRect.right + sideOffset;
    } else if (side === 'right' && left + contentRect.width > viewportWidth - padding) {
      // Switch to left if not enough room on right
      actualSide = 'left';
      left = triggerRect.left - contentRect.width - sideOffset;
    }
    
    // Now handle alignment adjustments for horizontal constraints
    if ((actualSide === 'top' || actualSide === 'bottom') && align === 'center') {
      // Check if centered position would overflow
      if (left < padding) {
        // Shift right but keep some alignment with trigger
        left = Math.max(padding, triggerRect.left);
      } else if (left + contentRect.width > viewportWidth - padding) {
        // Shift left but keep some alignment with trigger
        left = Math.min(viewportWidth - contentRect.width - padding, triggerRect.right - contentRect.width);
      }
    }
    
    // Handle edge case where content is wider than viewport
    if (contentRect.width > viewportWidth - 2 * padding) {
      left = padding;
      // Add a class to handle overflow scrolling if needed
    }
    
    // Final bounds check with clamping
    left = Math.max(padding, Math.min(left, viewportWidth - contentRect.width - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - contentRect.height - padding));

    return {
      top: `${top}px`,
      left: `${left}px`
    };
  }

  let position = $derived(showCard ? getPosition() : {});
</script>

<div class="relative inline-block" bind:this={triggerEl}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    {@render children()}
  </div>

  {#if showCard}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={contentEl}
      class="fixed z-[9999] pointer-events-none"
      style="top: {position.top}; left: {position.left};"
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
    >
      <div class="pointer-events-auto">
        {@render content()}
      </div>
    </div>
  {/if}
</div>
