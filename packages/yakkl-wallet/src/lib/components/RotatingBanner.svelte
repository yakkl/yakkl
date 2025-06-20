<!-- File: src/lib/components/RotatingBanner.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import Banner from './Banner.svelte';
  import Ad from './Ad.svelte';
  import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';

  type BannerItem = {
    type: 'banner';
    title?: string;
    message?: string;
    ctaText?: string;
    onCallToAction?: ((index: number) => void) | null;
  };

  type AdItem = {
    type: 'ad';
    useGoogleAd?: boolean;
    customContent?: (index: number) => string;
    onCallToAction?: ((index: number) => void) | null;
  };

  type CustomItem = {
    type: 'custom';
    html: string;
  };

  type RotatingItem = BannerItem | AdItem | CustomItem;

  let {
    show = $bindable(true),
    items = [],
    interval = 0,
    autoRotate = true,
    showControls = true
  } = $props<{
    show?: boolean;
    items: RotatingItem[];
    interval?: number;
    autoRotate?: boolean;
    showControls?: boolean;
  }>();

  let currentIndex = $state(0);
  const timerManager = UnifiedTimerManager.getInstance();
  const timerId = 'rotating-banner';
  let current = $derived(items[currentIndex]);

  function next() {
    currentIndex = (currentIndex + 1) % items.length;
  }

  function previous() {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
  }

  $effect(() => {
    if (autoRotate && interval > 0 && items.length > 1) {
      timerManager.stopInterval(timerId);
      timerManager.removeInterval(timerId);
      timerManager.addInterval(timerId, next, interval);
      timerManager.startInterval(timerId);
    } else {
      timerManager.stopInterval(timerId);
      timerManager.removeInterval(timerId);
    }
  });

  onDestroy(() => {
    timerManager.stopInterval(timerId);
    timerManager.removeInterval(timerId);
  });
</script>

{#if show}
  <div class="relative">
    {#if showControls && items.length > 1}
      <div class="absolute inset-y-0 left-0 flex items-center z-10">
        <button
          class="p-0.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          onclick={previous}
          aria-label="Previous"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <div class="absolute inset-y-0 right-0 flex items-center z-10">
        <button
          class="p-0.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          onclick={next}
          aria-label="Next"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    {/if}

    <div class={showControls && items.length > 1 ? "px-4" : ""}>
      {#if current.type === 'banner'}
        <Banner {...current} onCallToAction={current.onCallToAction ? () => current.onCallToAction?.(currentIndex) : null} />
      {:else if current.type === 'ad'}
        <Ad {...current} customContent={current.customContent ? () => current.customContent?.(currentIndex) : undefined} onCallToAction={current.onCallToAction ? () => current.onCallToAction?.(currentIndex) : null} />
      {:else if current.type === 'custom'}
        {@html current.html}
      {/if}
    </div>

    {#if showControls && items.length > 1}
      <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
        {#each items as _, i}
          <button
            class="w-1.5 h-1.5 rounded-full transition-colors {i === currentIndex ? 'bg-primary' : 'bg-gray-300'}"
            onclick={() => currentIndex = i}
            aria-label="Go to slide {i + 1}"
          >
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
