<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();
</script>

<!-- Clean layout for login - no header, no dock launcher -->
<div class="yakkl-body min-h-screen flex items-center justify-center">
  <main class="w-full">
    {@render children?.()}
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