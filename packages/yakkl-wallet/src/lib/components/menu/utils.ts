import type { MenuPosition, ViewportBounds, MenuDimensions, AnchorRect } from './types';

export function getViewportBounds(): ViewportBounds {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX || window.pageXOffset,
    scrollY: window.scrollY || window.pageYOffset
  };
}

export function getElementRect(element: HTMLElement): AnchorRect {
  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  
  return {
    top: rect.top + scrollY,
    right: rect.right + scrollX,
    bottom: rect.bottom + scrollY,
    left: rect.left + scrollX,
    width: rect.width,
    height: rect.height
  };
}

export function calculateMenuPosition(
  anchor: AnchorRect,
  menu: MenuDimensions,
  viewport: ViewportBounds,
  preferredPosition: 'left' | 'right' | 'top' | 'bottom' | 'auto' = 'auto',
  offsetX: number = 0,
  offsetY: number = 0,
  viewportPadding: number = 10
): MenuPosition {
  const position: MenuPosition = {
    x: 0,
    y: 0,
    direction: 'right',
    maxHeight: undefined
  };

  // Calculate available space in all directions
  const spaceRight = viewport.width - (anchor.right - viewport.scrollX);
  const spaceLeft = anchor.left - viewport.scrollX;
  const spaceBottom = viewport.height - (anchor.bottom - viewport.scrollY);
  const spaceTop = anchor.top - viewport.scrollY;

  // For dropdown menus (like UserMenu), check if we're near right edge
  const isNearRightEdge = spaceRight < menu.width + viewportPadding;
  const isNearBottomEdge = spaceBottom < menu.height + viewportPadding;

  // Horizontal positioning - prefer aligning with right edge if near right
  if (isNearRightEdge && spaceLeft >= menu.width) {
    // Align menu's right edge with anchor's right edge
    position.x = anchor.right - menu.width;
    position.direction = 'left';
  } else if (spaceRight >= menu.width + viewportPadding) {
    // Default: align left edges
    position.x = anchor.left + offsetX;
    position.direction = 'right';
  } else if (spaceLeft >= menu.width + viewportPadding) {
    // Not enough space on right, align right edges
    position.x = anchor.right - menu.width - offsetX;
    position.direction = 'left';
  } else {
    // Center in available space
    const availableWidth = Math.min(viewport.width - viewportPadding * 2, menu.width);
    position.x = viewport.scrollX + (viewport.width - availableWidth) / 2;
    position.direction = spaceRight > spaceLeft ? 'right' : 'left';
  }

  // Vertical positioning - handle bottom edge cases
  const preferredY = anchor.bottom + offsetY;
  
  if (!isNearBottomEdge && preferredY + menu.height <= viewport.height + viewport.scrollY - viewportPadding) {
    // Menu fits below anchor
    position.y = preferredY;
  } else if (spaceTop >= menu.height + viewportPadding) {
    // Not enough space below, position above anchor
    position.y = anchor.top - menu.height - offsetY;
    position.direction = position.direction === 'right' ? 'right' : 'left'; // Keep horizontal direction
  } else {
    // Not enough space above or below, use available space with scroll
    if (spaceBottom > spaceTop) {
      // More space below
      position.y = preferredY;
      position.maxHeight = spaceBottom - viewportPadding;
    } else {
      // More space above
      position.y = viewport.scrollY + viewportPadding;
      position.maxHeight = viewport.height - viewportPadding * 2;
    }
  }

  // Ensure menu doesn't go off-screen
  position.x = Math.max(viewport.scrollX + viewportPadding, 
                        Math.min(position.x, viewport.width + viewport.scrollX - menu.width - viewportPadding));
  position.y = Math.max(viewport.scrollY + viewportPadding,
                        Math.min(position.y, viewport.height + viewport.scrollY - (position.maxHeight || menu.height) - viewportPadding));

  return position;
}

export function calculateSubmenuPosition(
  parentItem: HTMLElement,
  submenu: HTMLElement,
  viewport: ViewportBounds,
  depth: number,
  viewportPadding: number = 10
): MenuPosition {
  const parentRect = getElementRect(parentItem);
  const parentMenuRect = parentItem.closest('.yakkl-dropdown, .yakkl-submenu')?.getBoundingClientRect();
  
  if (!parentMenuRect) {
    return {
      x: parentRect.right,
      y: parentRect.top,
      direction: 'right'
    };
  }

  // Use actual dimensions if available, otherwise estimate
  const menuWidth = submenu.offsetWidth || 200;
  const menuHeight = submenu.offsetHeight || 300;

  const parentMenuLeft = parentMenuRect.left + (window.scrollX || window.pageXOffset);
  const parentMenuRight = parentMenuRect.right + (window.scrollX || window.pageXOffset);

  const position: MenuPosition = {
    x: 0,
    y: 0,
    direction: 'right',
    maxHeight: undefined
  };

  // Calculate available space in all directions
  const spaceRight = viewport.width + viewport.scrollX - parentMenuRight;
  const spaceLeft = parentMenuLeft - viewport.scrollX;
  
  // Check if parent menu is closer to right edge (typical for UserMenu)
  const distanceFromRight = viewport.width - parentMenuRect.right;
  const distanceFromLeft = parentMenuRect.left;
  const isNearRightEdge = distanceFromRight < distanceFromLeft;

  // Smart positioning: prefer left if near right edge, otherwise check space
  if (isNearRightEdge && spaceLeft >= menuWidth + viewportPadding) {
    // UserMenu is on the right side, open submenu to the left
    position.x = parentMenuLeft - menuWidth + 4; // Small overlap
    position.direction = 'left';
  } else if (!isNearRightEdge && spaceRight >= menuWidth + viewportPadding) {
    // Menu is on the left side, open submenu to the right
    position.x = parentMenuRight - 4; // Small overlap for visual connection
    position.direction = 'right';
  } else if (spaceLeft >= menuWidth + viewportPadding) {
    // Fallback to left if there's space
    position.x = parentMenuLeft - menuWidth + 4;
    position.direction = 'left';
  } else if (spaceRight >= menuWidth + viewportPadding) {
    // Fallback to right if there's space
    position.x = parentMenuRight - 4;
    position.direction = 'right';
  } else {
    // Not enough space anywhere, choose best available
    if (spaceLeft > spaceRight) {
      position.x = Math.max(
        viewport.scrollX + viewportPadding,
        parentMenuLeft - menuWidth + 4
      );
      position.direction = 'left';
    } else {
      position.x = Math.min(
        parentMenuRight - 4,
        viewport.width + viewport.scrollX - menuWidth - viewportPadding
      );
      position.direction = 'right';
    }
  }

  // Vertical position - align with parent item but adjust if near bottom
  const idealY = parentRect.top - 4; // Small offset for visual alignment
  const spaceBelow = viewport.height + viewport.scrollY - idealY;
  const spaceAbove = idealY - viewport.scrollY;
  
  if (spaceBelow >= menuHeight + viewportPadding) {
    // Enough space below
    position.y = idealY;
  } else if (spaceAbove >= menuHeight + viewportPadding) {
    // Not enough space below, position above
    position.y = idealY - menuHeight + parentRect.height;
    position.direction = position.direction === 'right' ? 'right' : 'left'; // Maintain horizontal direction
  } else {
    // Not enough space above or below, use available space with scroll
    if (spaceBelow > spaceAbove) {
      position.y = idealY;
      position.maxHeight = spaceBelow - viewportPadding;
    } else {
      position.y = viewport.scrollY + viewportPadding;
      position.maxHeight = spaceAbove - viewportPadding;
    }
  }

  return position;
}

export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

export function adjustMenuPosition(
  menu: HTMLElement,
  position: MenuPosition
): void {
  menu.style.position = 'fixed';
  menu.style.left = `${position.x}px`;
  menu.style.top = `${position.y}px`;
  
  if (position.maxHeight) {
    menu.style.maxHeight = `${position.maxHeight}px`;
    menu.style.overflowY = 'auto';
  }
  
  // Add direction class for animations
  menu.classList.remove('menu-left', 'menu-right', 'menu-top', 'menu-bottom');
  menu.classList.add(`menu-${position.direction}`);
}

export function createPortal(element: HTMLElement, target: HTMLElement = document.body): void {
  target.appendChild(element);
}

export function removePortal(element: HTMLElement): void {
  element.remove();
}

export function preventBodyScroll(prevent: boolean): void {
  if (prevent) {
    document.body.style.overflow = 'hidden';
    document.body.dataset.scrollLocked = 'true';
  } else {
    if (document.body.dataset.scrollLocked === 'true') {
      document.body.style.overflow = '';
      delete document.body.dataset.scrollLocked;
    }
  }
}