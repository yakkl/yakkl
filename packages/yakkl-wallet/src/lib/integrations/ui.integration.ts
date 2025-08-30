/**
 * UI Integration
 * Shared UI components from @yakkl/ui
 * 
 * Note: These are TypeScript utilities and types.
 * Svelte components should be imported directly where used.
 */

import {
  cn,
  type Theme,
  getCurrentTheme,
  setTheme,
  getStoredTheme,
  getSystemTheme,
  initializeTheme,
  themes
} from '@yakkl/ui';

// Re-export utilities for use in wallet
export { 
  cn, 
  getCurrentTheme, 
  setTheme, 
  getStoredTheme, 
  getSystemTheme, 
  initializeTheme,
  themes
};

/**
 * Initialize UI theme
 */
export function initializeUI(): void {
  initializeTheme();
  console.log('[UI] Theme initialized');
}

/**
 * Component import examples (to be used in Svelte files):
 * 
 * import Avatar from '@yakkl/ui/src/components/Avatar.svelte';
 * import Button from '@yakkl/ui/src/components/Button.svelte';
 * import Card from '@yakkl/ui/src/components/Card.svelte';
 * import Modal from '@yakkl/ui/src/components/Modal.svelte';
 * import AddressDisplay from '@yakkl/ui/src/components/AddressDisplay.svelte';
 * import TokenBalance from '@yakkl/ui/src/components/TokenBalance.svelte';
 * import Loading from '@yakkl/ui/src/components/Loading.svelte';
 */

// Export types
export type { Theme } from '@yakkl/ui';