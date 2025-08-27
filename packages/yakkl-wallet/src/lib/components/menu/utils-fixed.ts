// Fixed positioning utilities for menu system
export function calculateSubmenuPositionFixed(
  parentItem: HTMLElement,
  submenu: HTMLElement,
  viewportPadding: number = 10
) {
  // Get viewport coordinates for fixed positioning
  const itemRect = parentItem.getBoundingClientRect();
  const parentMenuRect = parentItem.closest('.yakkl-dropdown, .yakkl-submenu')?.getBoundingClientRect();

  if (!parentMenuRect) {
    return { x: itemRect.right, y: itemRect.top, direction: 'right' };
  }

  const menuWidth = submenu.offsetWidth || 200;
  const menuHeight = submenu.offsetHeight || 300;
  const viewport = { width: window.innerWidth, height: window.innerHeight };

  let x = parentMenuRect.right - 4; // Small overlap
  let y = itemRect.top - 4; // Align with item
  let direction = 'right';

  // Check if submenu would go off right edge
  if (x + menuWidth > viewport.width - viewportPadding) {
    // Open to left instead
    x = parentMenuRect.left - menuWidth + 4;
    direction = 'left';
  }

  // Check if submenu would go off bottom edge
  if (y + menuHeight > viewport.height - viewportPadding) {
    // Adjust upward
    y = Math.max(viewportPadding, viewport.height - menuHeight - viewportPadding);
  }

  return { x, y, direction };
}
