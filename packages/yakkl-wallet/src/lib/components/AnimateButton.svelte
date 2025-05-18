<script lang="ts">
  import { onMount } from 'svelte';

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

  onMount(() => {
    animate = true;
    setTimeout(() => (animate = false), 1000);
  });
</script>

<button
  class={`transition-transform ${animate ? 'animate-shake' : ''} flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition-all ${className}`}
  onclick={onClick}
>
  {@render children?.()}
</button>
