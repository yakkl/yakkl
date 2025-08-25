<script lang="ts">
  import type { MenuItem as MenuItemType, MenuContext } from './types';
  import MenuItem from './MenuItem.svelte';
  import MenuDivider from './MenuDivider.svelte';
  import MenuHeader from './MenuHeader.svelte';

  let {
    items = [],
    depth = 1,
    context,
    className = ''
  }: {
    items: MenuItemType[];
    depth: number;
    context: MenuContext;
    className?: string;
  } = $props();

  // Filter out hidden items
  const visibleItems = $derived(items.filter(item => item.visible !== false));
</script>

<div class={`yakkl-submenu-content ${className}`}>
  {#each visibleItems as item (item.id || items.indexOf(item))}
    {#if item.type === 'divider'}
      <MenuDivider {item} />
    {:else if item.type === 'header'}
      <MenuHeader {item} {context} />
    {:else if item.type === 'custom'}
      <div class="yakkl-menu-custom {item.className || ''}">
        <item.component {...(item.props || {})} />
      </div>
    {:else if item.type === 'item'}
      <MenuItem 
        {item} 
        {depth} 
        {context}
      />
    {/if}
  {/each}
</div>