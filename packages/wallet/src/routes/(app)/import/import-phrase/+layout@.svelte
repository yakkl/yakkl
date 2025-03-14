<script lang="ts">
  
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // onMount(() => {
  //   // +layout.(ts|svelte) gets removed and the new one loaded for each sub layout so the following code is needed to ensure the listeners are added and removed correctly.
  //   // We add a remove then an add to make sure we don't have multiple listeners for windows. removeListener will be ignored if it doesn't exist.
  //   onMessageUnloadAdd(); // Not for background script items. That is handled by another listener in handlersListeners.ts
  //   return () => {
  //     onMessageUnloadRemove();
  //   };
  // });
</script>

<div class="print:hidden overflow-scroll overflow-y-auto bg-base-100 text-base-content bg-center m-2 h-[95%] rounded-xl border border-gray-900">
  {@render children?.()}
</div>
