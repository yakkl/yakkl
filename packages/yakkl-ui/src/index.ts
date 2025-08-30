/**
 * @yakkl/ui
 * Shared UI components for YAKKL ecosystem
 */

// Note: Svelte components are exported directly from their source files
// Import them as: import Avatar from '@yakkl/ui/src/components/Avatar.svelte'

// Utilities
export * from './utils/theme';
export { cn } from './utils/cn';

// Types
export * from './types';

// Version
export const VERSION = '0.1.0';

// Component paths for reference
export const components = {
  Avatar: './components/Avatar.svelte',
  Button: './components/Button.svelte',
  Card: './components/Card.svelte',
  Modal: './components/Modal.svelte',
  AddressDisplay: './components/AddressDisplay.svelte',
  TokenBalance: './components/TokenBalance.svelte',
  Loading: './components/Loading.svelte'
};