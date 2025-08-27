<script lang="ts">
  import type { MenuItemDivider } from './types';

  let {
    item = {} as MenuItemDivider,
    className = ''
  } = $props();
</script>

<!-- svelte-ignore element_invalid_self_closing_tag -->
<div
  class={`yakkl-menu-divider ${item.className || ''} ${className}`}
  role="separator"
  aria-orientation="horizontal"
/>
