<script lang="ts">
  import type { MenuItemHeader, MenuContext } from './types';
  
  let {
    item,
    context,
    className = ''
  }: {
    item: MenuItemHeader;
    context?: MenuContext;
    className?: string;
  } = $props();
  
  let collapsed = $state(item.collapsed || false);
  
  function toggleCollapse() {
    if (item.collapsible) {
      collapsed = !collapsed;
    }
  }
</script>

{#if item.collapsible && item.children && item.children.length > 0}
  <button
    class={`yakkl-menu-header-collapsible ${item.className || ''} ${className}`}
    onclick={toggleCollapse}
    aria-expanded={!collapsed}
    type="button"
  >
    <span class="yakkl-menu-header-text">
      {#if typeof item.content === 'string'}
        {item.content}
      {:else if item.content}
        <item.content {...(item.props || {})} />
      {:else}
        Section
      {/if}
    </span>
    <span class="yakkl-menu-header-chevron" class:rotated={!collapsed}>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  </button>
{:else}
  <div class={`yakkl-menu-header ${item.className || ''} ${className}`}>
    {#if typeof item.content === 'string'}
      {item.content}
    {:else if item.content}
      <item.content {...(item.props || {})} />
    {:else}
      Section
    {/if}
  </div>
{/if}

{#if item.children && item.children.length > 0 && (!item.collapsible || !collapsed)}
  <div class="yakkl-menu-group">
    {#if context}
      {#await import('./SubMenu.svelte') then { default: SubMenu }}
        <SubMenu items={item.children} depth={0} {context} />
      {/await}
    {/if}
  </div>
{/if}