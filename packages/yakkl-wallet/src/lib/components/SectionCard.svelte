<!-- svelte-ignore non_reactive_update -->
<!-- svelte-ignore non_reactive_update -->
<!-- File: src/lib/components/SectionCard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import ChevronDownIcon from './icons/ChevronDownIcon.svelte';
  import ChevronUpIcon from './icons/ChevronUpIcon.svelte';
  import ResizeIcon from './icons/ResizeIcon.svelte';
  import EyeIcon from './icons/EyeIcon.svelte';
  import { cn } from '$lib/utils';
	import Tooltip from './Tooltip.svelte';

  let { show = $bindable(true), title, icon: Icon = null, className = '', isPinned = false, eye = false, eyeTooltip = 'Toggle visibility of values', minHeight = '200px', maxHeight = '400px', locked = true, footer: Footer = null, footerProps = {}, lockedFooter: LockedFooter = null, lockedFooterProps = {}, children } = $props<{
    show?: boolean;
    title: string;
    icon?: any;
    className?: string;
    isPinned?: boolean;
    eye?: boolean;
    eyeTooltip?: string;
    minHeight?: string;
    maxHeight?: string;
    locked?: boolean;
    footer?: any;
    footerProps?: Record<string, any>;
    lockedFooter?: any;
    lockedFooterProps?: Record<string, any>;
    children: () => any;
  }>();

  let isCollapsed = $state(false);
  let isResizing = $state(false);
  let cardHeight = $state(minHeight);
  let startY = $state(0);
  let startHeight = $state(0);
  let cardElement = $state<HTMLElement | null>(null);
  let contentElement = $state<HTMLElement | null>(null);
  let hasItems = $state(false);
  let calculatedMinHeight = $state('');

  function calculateMinHeight() {
    if (!cardElement || !contentElement) return;

    const headerHeight = (cardElement.querySelector('header') as HTMLElement | null)?.offsetHeight || 0;
    const firstItemHeight = (contentElement.querySelector('.item') as HTMLElement | null)?.offsetHeight || 0;

    // If there are items, min height is header + one item
    // If no items, min height is just the header
    const newMinHeight = hasItems ? headerHeight + firstItemHeight : headerHeight;
    calculatedMinHeight = `${newMinHeight}px`;

    // Update card height if it's currently smaller than the new minimum
    if (parseInt(cardHeight) < newMinHeight) {
      cardHeight = calculatedMinHeight;
    }
  }

  function handleResizeStart(e: MouseEvent) {
    e.preventDefault();
    isResizing = true;
    startY = e.clientY;
    startHeight = cardElement.offsetHeight;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }

  function handleResizeMove(e: MouseEvent) {
    if (!isResizing) return;

    const deltaY = e.clientY - startY;
    const newHeight = Math.max(
      parseInt(calculatedMinHeight || minHeight),
      Math.min(parseInt(maxHeight), startHeight + deltaY)
    );
    cardHeight = `${newHeight}px`;
  }

  function handleResizeEnd() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }

  onMount(() => {
    // Initial calculation
    calculateMinHeight();

    // Observe content changes to recalculate minimum height
    const observer = new MutationObserver(() => {
      hasItems = contentElement.querySelector('.item') !== null;
      calculateMinHeight();
    });

    if (contentElement) {
      observer.observe(contentElement, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      observer.disconnect();
    };
  });
</script>

{#if show}
<div
  bind:this={cardElement}
  class={cn(
    "bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700",
    "transition-all duration-200 ease-in-out",
    "hover:shadow-md",
    "flex flex-col",
    "relative",
    isPinned && "sticky top-0 z-10 scroll-mt-4",
    className
  )}
  style="height: {isCollapsed ? 'auto' : cardHeight}"
>
  <!-- Header -->
  <header class="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
    <div class="flex items-center gap-2">
      {#if Icon}
        <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
      {/if}
      <h2 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {#if eye}
        <Tooltip content={eyeTooltip}>
          <EyeIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </Tooltip>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <button
        class="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
        onclick={toggleCollapse}
        aria-label={isCollapsed ? "Expand section" : "Collapse section"}
      >
        {#if isCollapsed}
          <ChevronDownIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        {:else}
          <ChevronUpIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        {/if}
      </button>
    </div>
  </header>

  <!-- Content -->
  <div
    bind:this={contentElement}
    class="flex-1 overflow-y-auto transition-all duration-200"
    style="height: {isCollapsed ? '0' : 'auto'}"
  >
    <div class="px-4 pb-4 pt-2">
      {@render children()}
    </div>
  </div>

  <!-- Footer -->
  {#if !isCollapsed}
    {#if locked && LockedFooter}
      <div class="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-800/50">
        <LockedFooter {...lockedFooterProps} />
      </div>
    {:else if Footer}
      <div class="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-800/50">
        <Footer {...footerProps} />
      </div>
    {/if}
  {/if}

  <!-- Resize Handle -->
  {#if !isCollapsed}
    <div
      role="button"
      tabindex="0"
      aria-label="Resize section"
      class="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-zinc-100 dark:from-zinc-700 to-transparent"
      onmousedown={handleResizeStart}
    >
      <ResizeIcon className="w-4 h-4 text-zinc-400 rotate-90" />
    </div>
  {/if}
</div>
{/if}
