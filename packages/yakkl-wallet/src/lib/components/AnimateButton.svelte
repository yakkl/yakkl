<script lang="ts">
  import { onMount } from 'svelte';
  import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';

  const {
    className = '',
    onClick = () => {},
    children
  } = $props<{
    className?: string;
    onClick?: () => void;
    children?: any;
  }>();

  let animate = $state(false);
  const timerManager = UnifiedTimerManager.getInstance();

  onMount(() => {
    animate = true;
    timerManager.addTimeout('animate-button', () => {
      animate = false;
    }, 1000);
    timerManager.startTimeout('animate-button');
  });
</script>

<button
  class={`transition-transform ${animate ? 'animate-shake' : ''} flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition-all ${className}`}
  onclick={onClick}
>
  {@render children?.()}
</button>
