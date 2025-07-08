import { goto } from '$app/navigation';
import { log } from '$lib/common/logger-wrapper';

/**
 * Debug helper for navigation issues in extension context
 * Created to diagnose why home page doesn't appear after login
 */
export async function debugGoto(url: string, options?: any): Promise<void> {
  try {
    log.info('NavigationDebug: Attempting navigation', false, {
      targetUrl: url,
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      options
    });
    
    // Check if we're in extension context
    const isExtension = window.location.href.includes('chrome-extension://');
    log.info('NavigationDebug: Extension context', false, { isExtension });
    
    // Attempt navigation
    await goto(url, options);
    
    // Check result after a short delay
    setTimeout(() => {
      log.info('NavigationDebug: Post-navigation check', false, {
        newUrl: window.location.href,
        newPathname: window.location.pathname,
        success: window.location.pathname === url
      });
    }, 500);
  } catch (error) {
    log.error('NavigationDebug: Navigation failed', false, {
      error,
      targetUrl: url,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Alternative navigation method using window.location
 * As a fallback if SvelteKit navigation fails in extension context
 */
export function fallbackNavigate(path: string): void {
  try {
    log.info('NavigationDebug: Using fallback navigation', false, { path });
    
    // Build the full URL
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${path}`;
    
    log.info('NavigationDebug: Fallback navigation URL', false, { 
      baseUrl, 
      fullUrl,
      currentUrl: window.location.href 
    });
    
    // Use location.replace to navigate
    window.location.replace(fullUrl);
  } catch (error) {
    log.error('NavigationDebug: Fallback navigation failed', false, error);
  }
}