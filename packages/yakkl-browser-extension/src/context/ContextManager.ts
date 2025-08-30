/**
 * Context Manager for Browser Extensions
 * Detects and manages different extension contexts
 */

export type ExtensionContext = 
  | 'background'
  | 'popup'
  | 'options'
  | 'content-script'
  | 'devtools'
  | 'sidebar'
  | 'offscreen'
  | 'unknown';

export interface ContextInfo {
  type: ExtensionContext;
  url?: string;
  tabId?: number;
  windowId?: number;
  frameId?: number;
}

/**
 * Manages extension context detection and utilities
 */
export class ExtensionContextManager {
  private static instance: ExtensionContextManager;
  private contextInfo: ContextInfo | null = null;

  private constructor() {
    this.detectContext();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ExtensionContextManager {
    if (!ExtensionContextManager.instance) {
      ExtensionContextManager.instance = new ExtensionContextManager();
    }
    return ExtensionContextManager.instance;
  }

  /**
   * Get current context info
   */
  getContext(): ContextInfo {
    if (!this.contextInfo) {
      this.detectContext();
    }
    return this.contextInfo!;
  }

  /**
   * Check if running in specific context
   */
  isContext(context: ExtensionContext): boolean {
    return this.getContext().type === context;
  }

  /**
   * Check if running in background
   */
  isBackground(): boolean {
    return this.isContext('background');
  }

  /**
   * Check if running in popup
   */
  isPopup(): boolean {
    return this.isContext('popup');
  }

  /**
   * Check if running in content script
   */
  isContentScript(): boolean {
    return this.isContext('content-script');
  }

  /**
   * Check if running in options page
   */
  isOptions(): boolean {
    return this.isContext('options');
  }

  /**
   * Check if running in devtools
   */
  isDevtools(): boolean {
    return this.isContext('devtools');
  }

  /**
   * Check if running in sidebar
   */
  isSidebar(): boolean {
    return this.isContext('sidebar');
  }

  /**
   * Check if running in offscreen document
   */
  isOffscreen(): boolean {
    return this.isContext('offscreen');
  }

  /**
   * Detect current context
   */
  private detectContext(): void {
    // Check if we're in a browser extension environment
    const hasChrome = typeof chrome !== 'undefined';
    const hasBrowser = typeof browser !== 'undefined';
    
    if (!hasChrome && !hasBrowser) {
      this.contextInfo = { type: 'unknown' };
      return;
    }

    const runtime = (globalThis as any).chrome?.runtime || (globalThis as any).browser?.runtime;
    const extension = (globalThis as any).chrome?.extension || (globalThis as any).browser?.extension;

    // Check for service worker (background)
    if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
      this.contextInfo = { type: 'background' };
      return;
    }

    // Check for background page (legacy)
    if (extension?.getBackgroundPage && extension.getBackgroundPage() === window) {
      this.contextInfo = { type: 'background' };
      return;
    }

    // Check if we have access to DOM
    if (typeof document !== 'undefined') {
      const url = document.location?.href || '';

      // Check for popup
      if (url.includes('popup.html') || document.body?.classList.contains('popup')) {
        this.contextInfo = {
          type: 'popup',
          url
        };
        return;
      }

      // Check for options
      if (url.includes('options.html') || url.includes('options.html')) {
        this.contextInfo = {
          type: 'options',
          url
        };
        return;
      }

      // Check for devtools
      if (url.includes('devtools.html')) {
        this.contextInfo = {
          type: 'devtools',
          url
        };
        return;
      }

      // Check for sidebar
      if (url.includes('sidebar.html') || url.includes('side_panel.html')) {
        this.contextInfo = {
          type: 'sidebar',
          url
        };
        return;
      }

      // Check for offscreen
      if (url.includes('offscreen.html')) {
        this.contextInfo = {
          type: 'offscreen',
          url
        };
        return;
      }

      // Check for content script
      if (runtime && !runtime.getBackgroundPage) {
        this.contextInfo = {
          type: 'content-script',
          url: window.location.href
        };
        return;
      }
    }

    // Default to unknown
    this.contextInfo = { type: 'unknown' };
  }

  /**
   * Get browser API based on context
   */
  async getBrowserAPI(): Promise<any> {
    if (typeof browser !== 'undefined') {
      return browser;
    }
    if (typeof chrome !== 'undefined') {
      return chrome;
    }
    
    // Try dynamic import for non-extension environments
    try {
      const webExtPolyfill = await import('webextension-polyfill');
      return webExtPolyfill.default;
    } catch {
      throw new Error('No browser API available');
    }
  }

  /**
   * Check if API is available in current context
   */
  hasAPI(api: string): boolean {
    try {
      const browserAPI = (globalThis as any).chrome || (globalThis as any).browser;
      const parts = api.split('.');
      let current = browserAPI;
      
      for (const part of parts) {
        if (!current || typeof current[part] === 'undefined') {
          return false;
        }
        current = current[part];
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute code in specific context
   */
  async executeInContext<T>(
    targetContext: ExtensionContext,
    code: () => T | Promise<T>
  ): Promise<T> {
    const currentContext = this.getContext();
    
    if (currentContext.type === targetContext) {
      // Already in target context
      return await code();
    }

    // Need to send message to target context
    throw new Error(`Cannot execute code in ${targetContext} from ${currentContext.type}`);
  }
}

/**
 * Get the global context manager instance
 */
export const contextManager = ExtensionContextManager.getInstance();

/**
 * Context-aware decorator
 */
export function RequireContext(context: ExtensionContext | ExtensionContext[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const manager = ExtensionContextManager.getInstance();
      const currentContext = manager.getContext().type;
      const allowedContexts = Array.isArray(context) ? context : [context];
      
      if (!allowedContexts.includes(currentContext)) {
        throw new Error(
          `Method ${propertyKey} can only be called from ${allowedContexts.join(' or ')} context, ` +
          `but was called from ${currentContext}`
        );
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}