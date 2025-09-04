<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MenuItem as MenuItemType, MenuContext } from './types';
  import MenuItem from './MenuItem.svelte';
  import MenuDivider from './MenuDivider.svelte';
  import MenuHeader from './MenuHeader.svelte';
  import { portal } from './portal-action';

  let {
    items = [],
    className = '',
    closeOnClickOutside = true,
    closeOnEscape = true,
    onClose = () => {},
    anchorElement = null as HTMLElement | null,
    open = false
  }: {
    items: MenuItemType[];
    className?: string;
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    onClose?: () => void;
    anchorElement?: HTMLElement | null;
    open?: boolean;
  } = $props();

  let menuElement = $state<HTMLElement>();
  let submenus = new Map<string, () => void>();

  // Create context for child components
  const context: MenuContext = {
    depth: 0,
    onClose: handleClose,
    closeAll: handleCloseAll,
    registerSubmenu: (id: string, closeFunc: () => void) => {
      submenus.set(id, closeFunc);
    },
    unregisterSubmenu: (id: string) => {
      submenus.delete(id);
    },
    closeSubmenus: (exceptId?: string) => {
      submenus.forEach((closeFunc, id) => {
        if (id !== exceptId) {
          closeFunc();
        }
      });
    }
  };

  function handleClose() {
    onClose();
  }

  function handleCloseAll() {
    // Close all submenus first
    submenus.forEach(closeFunc => closeFunc());
    // Then close the main menu
    handleClose();
  }

  function handleClickOutside(e: MouseEvent) {
    if (!closeOnClickOutside || !open) return;

    const target = e.target as Node;
    // Check if click is inside menu or anchor
    if (menuElement && !menuElement.contains(target)) {
      if (anchorElement && anchorElement.contains(target)) {
        // Clicked on the anchor element, let the anchor handle it
        return;
      }
      // Add small delay to allow for menu interaction
      setTimeout(() => {
        if (!menuElement?.matches(':hover')) {
          handleCloseAll();
        }
      }, 100);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'Escape' && closeOnEscape) {
      e.preventDefault();
      e.stopPropagation();
      handleCloseAll();
    } else if (e.key === 'Tab') {
      // Allow tab navigation but close menu when tabbing out
      const focusableElements = menuElement.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (typeof document !== 'undefined') {
        if (e.shiftKey && document.activeElement === firstElement) {
          // Tabbing backwards from first element
          handleCloseAll();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          // Tabbing forward from last element
          handleCloseAll();
        }
      }
    }
  }

  function handleFocusOut(e: FocusEvent) {
    // Check if focus is moving outside the menu
    setTimeout(() => {
      if (typeof document !== 'undefined' && menuElement && !menuElement.contains(document.activeElement)) {
        handleCloseAll();
      }
    }, 0);
  }

  function positionMenu() {
    if (!open || !menuElement || !anchorElement || typeof window === 'undefined') return;

    // Get the anchor's bounding rect (in viewport coordinates for fixed positioning)
    const anchorRect = anchorElement.getBoundingClientRect();

    // Get viewport dimensions
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Get menu dimensions
    const menuWidth = 208; //menuElement.offsetWidth || 200;
    const menuHeight = menuElement.offsetHeight || 300;

    // Calculate position - for 428px wide extension, position menu near right
    // We want menu at x=300 regardless of button position
    let x = 300; // Fixed position for consistent right-side alignment
    let y = anchorRect.bottom - 5; // Move up by 5px instead of gap below

    // Check if menu would go off right edge (428px width)
    if (x + menuWidth > viewport.width) {
      // Align with right edge minus padding
      x = viewport.width - menuWidth - 10;
    }

    // Check if menu would go off bottom edge
    if (y + menuHeight > viewport.height - 10) {
      // Position above anchor if there's room
      if (anchorRect.top - menuHeight - 4 > 10) {
        y = anchorRect.top - menuHeight - 4;
      } else {
        // Keep below but limit height
        menuElement.style.maxHeight = `${viewport.height - y - 10}px`;
        menuElement.style.overflowY = 'auto';
      }
    }

    // Apply all styles directly with important flag
    menuElement.style.cssText = `
      position: fixed !important;
      left: ${x}px !important;
      top: ${y}px !important;
      z-index: 2147483647 !important;
      background: white !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
      min-width: 165px !important;
      max-width: 205px !important;
      padding: 8px 0 !important;
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
    `;
  }

  $effect(() => {
    if (open && anchorElement && menuElement) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        positionMenu();
      });
    }
  });

  onMount(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown, true);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', positionMenu);
      window.addEventListener('scroll', positionMenu, true);
    }

    // Focus the first focusable element when menu opens
    if (open && menuElement) {
      const firstFocusable = menuElement.querySelector(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    }
  });

  // Filter out hidden items
  const visibleItems = $derived(items.filter(item => item.visible !== false));
</script>

{#if open}
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    bind:this={menuElement}
    use:portal
    class={`yakkl-dropdown ${className}`}
    role="menu"
    aria-label="Menu"
    onfocusout={handleFocusOut}
    style="pointer-events: auto;"
    onmouseenter={(e) => {
      e.stopPropagation();
    }}
    onmouseleave={(e) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      // If leaving to go back to anchor, don't close
      if (relatedTarget && anchorElement?.contains(relatedTarget)) {
        return;
      }
      // Otherwise trigger close
      onClose();
    }}
  >
    {#each visibleItems as item (item.id || items.indexOf(item))}
      {#if item.type === 'divider'}
        <MenuDivider {item} />
      {:else if item.type === 'header'}
        {@const headerProps = { item, context }}
        <MenuHeader {...headerProps} />
      {:else if item.type === 'custom'}
        <div class="yakkl-menu-custom {item.className || ''}">
          <item.component {...(item.props || {})} />
        </div>
      {:else if item.type === 'item'}
        <MenuItem
          {item}
          depth={0}
          {context}
        />
      {/if}
    {/each}
  </div>
{/if}

<style>
  @import './menu.css';
</style>
