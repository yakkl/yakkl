<script lang="ts">
  import '../app.css';
  import TORBlocker from '$lib/components/TORBlocker.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();
</script>

<!-- TOR Detection and Blocking -->
<TORBlocker />

<div class="yakkl-body h-screen flex flex-col overflow-hidden">
  <!-- Main Content Area -->
  <main class="flex-1 overflow-y-auto overflow-x-hidden">
    <div class="min-h-full pb-16">
      {@render children?.()}
    </div>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    background-color: #f8fafc;
  }
  :global(html.dark body) {
    background-color: #0e0e11;
  }
</style>
