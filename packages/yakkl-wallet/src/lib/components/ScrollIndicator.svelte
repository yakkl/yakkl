<!-- File: src/lib/components/ScrollIndicator.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import ChevronDownIcon from './icons/ChevronDownIcon.svelte';
  import ChevronUpIcon from './icons/ChevronUpIcon.svelte';
  import { cn } from '$lib/utils';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let show = $state(false);
  let isAtBottom = $state(false);
  let container = $state<HTMLElement | null>(null);
  let button = $state<HTMLElement | null>(null);

  function handleScroll() {
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    // Show button if not at bottom and scrolled down at least 75px
    show = scrollTop > 75;

    // Check if we're at the bottom (within 10px threshold)
    isAtBottom = scrollBottom < 10;
  }

  function scrollToPosition() {
    if (!container) return;

    const targetPosition = isAtBottom ? 0 : container.scrollHeight;
    container.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }

  onMount(() => {
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }
  });

  onDestroy(() => {
    if (container) {
      container.removeEventListener('scroll', handleScroll);
    }
  });
</script>

<div
  bind:this={container}
  class="relative h-full overflow-y-auto overflow-x-hidden"
>
  <div class="w-full">
    {@render children?.()}
  </div>

  {#if show}
    <button
      bind:this={button}
      class={cn(
        "fixed bottom-4 right-4 z-50",
        "w-10 h-10 rounded-full",
        "bg-blue-500 dark:bg-blue-600",
        "shadow-lg hover:shadow-xl",
        "flex items-center justify-center",
        "transition-all duration-300",
        "hover:scale-110 active:scale-95",
        "hover:bg-blue-600 dark:hover:bg-blue-700",
        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
      )}
      onclick={scrollToPosition}
      aria-label={isAtBottom ? "Scroll to top" : "Scroll to bottom"}
      transition:fly={{ y: 20, duration: 300 }}
    >
      {#if isAtBottom}
        <ChevronUpIcon className="w-5 h-5 text-white" />
      {:else}
        <ChevronDownIcon className="w-5 h-5 text-white" />
      {/if}
    </button>
  {/if}
</div>

<style>
  /* Hide scrollbar but keep functionality */
  div::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
</style>
