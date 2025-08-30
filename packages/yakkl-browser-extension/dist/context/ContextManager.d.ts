/**
 * Context Manager for Browser Extensions
 * Detects and manages different extension contexts
 */
export type ExtensionContext = 'background' | 'popup' | 'options' | 'content-script' | 'devtools' | 'sidebar' | 'offscreen' | 'unknown';
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
export declare class ExtensionContextManager {
    private static instance;
    private contextInfo;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): ExtensionContextManager;
    /**
     * Get current context info
     */
    getContext(): ContextInfo;
    /**
     * Check if running in specific context
     */
    isContext(context: ExtensionContext): boolean;
    /**
     * Check if running in background
     */
    isBackground(): boolean;
    /**
     * Check if running in popup
     */
    isPopup(): boolean;
    /**
     * Check if running in content script
     */
    isContentScript(): boolean;
    /**
     * Check if running in options page
     */
    isOptions(): boolean;
    /**
     * Check if running in devtools
     */
    isDevtools(): boolean;
    /**
     * Check if running in sidebar
     */
    isSidebar(): boolean;
    /**
     * Check if running in offscreen document
     */
    isOffscreen(): boolean;
    /**
     * Detect current context
     */
    private detectContext;
    /**
     * Get browser API based on context
     */
    getBrowserAPI(): Promise<any>;
    /**
     * Check if API is available in current context
     */
    hasAPI(api: string): boolean;
    /**
     * Execute code in specific context
     */
    executeInContext<T>(targetContext: ExtensionContext, code: () => T | Promise<T>): Promise<T>;
}
/**
 * Get the global context manager instance
 */
export declare const contextManager: ExtensionContextManager;
/**
 * Context-aware decorator
 */
export declare function RequireContext(context: ExtensionContext | ExtensionContext[]): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
