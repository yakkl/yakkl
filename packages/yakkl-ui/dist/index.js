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
    // Core components
    Avatar: './components/Avatar.svelte',
    StarRating: './components/StarRating.svelte',
    Button: './components/Button.svelte',
    Card: './components/Card.svelte',
    ErrorDialog: './components/ErrorDialog.svelte',
    FailureDialog: './components/FailureDialog.svelte',
    Modal: './components/Modal.svelte',
    AddressDisplay: './components/AddressDisplay.svelte',
    TokenBalance: './components/TokenBalance.svelte',
    Loading: './components/Loading.svelte',
    LoadingSpinner: './components/LoadingSpinner.svelte',
    Tooltip: './components/Tooltip.svelte',
    Toast: './components/Toast.svelte',
    Input: './components/Input.svelte',
    // New generic components
    Banner: './components/Banner.svelte',
    Placeholder: './components/Placeholder.svelte',
    MoreLess: './components/MoreLess.svelte',
    FilterSortControls: './components/FilterSortControls.svelte',
    ThemeToggle: './components/ThemeToggle.svelte',
    // Icons
    ChevronDownIcon: './components/icons/ChevronDownIcon.svelte',
    ChevronUpIcon: './components/icons/ChevronUpIcon.svelte',
    RefreshIcon: './components/icons/RefreshIcon.svelte'
};
