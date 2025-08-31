/**
 * Theme utilities for YAKKL UI
 */
export const themes = [
    'light',
    'dark',
    'cupcake',
    'bumblebee',
    'emerald',
    'corporate',
    'synthwave',
    'retro',
    'cyberpunk',
    'valentine',
    'halloween',
    'garden',
    'forest',
    'aqua',
    'lofi',
    'pastel',
    'fantasy',
    'wireframe',
    'black',
    'luxury',
    'dracula',
    'cmyk',
    'autumn',
    'business',
    'acid',
    'lemonade',
    'night',
    'coffee',
    'winter',
    'dim',
    'nord',
    'sunset'
];
/**
 * Get current theme from DOM
 */
export function getCurrentTheme() {
    if (typeof document === 'undefined')
        return null;
    const html = document.documentElement;
    const theme = html.getAttribute('data-theme');
    if (theme && themes.includes(theme)) {
        return theme;
    }
    return null;
}
/**
 * Set theme on DOM
 */
export function setTheme(theme) {
    if (typeof document === 'undefined')
        return;
    document.documentElement.setAttribute('data-theme', theme);
    // Store preference
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('yakkl-theme', theme);
    }
}
/**
 * Get stored theme preference
 */
export function getStoredTheme() {
    if (typeof localStorage === 'undefined')
        return null;
    const stored = localStorage.getItem('yakkl-theme');
    if (stored && themes.includes(stored)) {
        return stored;
    }
    return null;
}
/**
 * Get system color scheme preference
 */
export function getSystemTheme() {
    if (typeof window === 'undefined')
        return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}
/**
 * Initialize theme on app load
 */
export function initializeTheme() {
    const stored = getStoredTheme();
    if (stored) {
        setTheme(stored);
    }
    else {
        const system = getSystemTheme();
        setTheme(system);
    }
}
