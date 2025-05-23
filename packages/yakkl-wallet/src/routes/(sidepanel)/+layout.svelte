<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

</script>
<div class="transition-opacity duration-500 animate-fade-in">
  {@render children?.()}
</div>
