/**
 * YAKKL Browser Extension Utilities
 *
 * Provides abstractions and utilities for building browser extensions
 * with support for Manifest V3 and cross-browser compatibility
 */
export * from './messaging';
export * from './storage';
export * from './manifest';
export * from './context';
export type { Runtime, Storage, Tabs, Windows } from 'webextension-polyfill';
/**
 * Browser API detection
 */
export declare function getBrowserAPI(): any;
/**
 * Check if running in extension context - simple version
 */
export declare function isExtensionContext(): boolean;
/**
 * Get extension ID
 */
export declare function getExtensionId(): string | null;
/**
 * Get extension version
 */
export declare function getExtensionVersion(): string | null;
/**
 * Execution context detection
 */
export type ExecutionContext = 'background' | 'content' | 'extension-page' | 'web' | 'ssr';
export interface ContextInfo {
    isExtension: boolean;
    context: ExecutionContext;
    hasDOM: boolean;
    canUseSvelteStores: boolean;
}
export declare function getContextInfo(): ContextInfo;
export declare let cachedInfo: ContextInfo | null;
export declare function getContext(): ContextInfo;
export declare function isExtension(): boolean;
export declare function canUseSvelteStores(): boolean;
export declare function isBackground(): boolean;
export declare function isContentScript(): boolean;
export declare function isExtensionPage(): boolean;
export declare function isWeb(): boolean;
export declare function isSSR(): boolean;
