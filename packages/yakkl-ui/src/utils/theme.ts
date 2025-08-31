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
] as const;

export type Theme = typeof themes[number];

/**
 * Get current theme from DOM
 */
export function getCurrentTheme(): Theme | null {
  if (typeof document === 'undefined') return null;
  
  const html = document.documentElement;
  const theme = html.getAttribute('data-theme');
  
  if (theme && themes.includes(theme as Theme)) {
    return theme as Theme;
  }
  
  return null;
}

/**
 * Set theme on DOM
 */
export function setTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  
  document.documentElement.setAttribute('data-theme', theme);
  
  // Store preference
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('yakkl-theme', theme);
  }
}

/**
 * Get stored theme preference
 */
export function getStoredTheme(): Theme | null {
  if (typeof localStorage === 'undefined') return null;
  
  const stored = localStorage.getItem('yakkl-theme');
  
  if (stored && themes.includes(stored as Theme)) {
    return stored as Theme;
  }
  
  return null;
}

/**
 * Get system color scheme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(): void {
  const stored = getStoredTheme();
  
  if (stored) {
    setTheme(stored);
  } else {
    const system = getSystemTheme();
    setTheme(system);
  }
}