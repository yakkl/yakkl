/**
 * Theme utilities for YAKKL UI
 */
export declare const themes: readonly ["light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter", "dim", "nord", "sunset"];
export type Theme = typeof themes[number];
/**
 * Get current theme from DOM
 */
export declare function getCurrentTheme(): Theme | null;
/**
 * Set theme on DOM
 */
export declare function setTheme(theme: Theme): void;
/**
 * Get stored theme preference
 */
export declare function getStoredTheme(): Theme | null;
/**
 * Get system color scheme preference
 */
export declare function getSystemTheme(): 'light' | 'dark';
/**
 * Initialize theme on app load
 */
export declare function initializeTheme(): void;
