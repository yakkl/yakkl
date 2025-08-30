/**
 * YAKKL Browser Extension Utilities
 * 
 * Provides abstractions and utilities for building browser extensions
 * with support for Manifest V3 and cross-browser compatibility
 */

// Messaging
export * from './messaging';

// Storage
export * from './storage';

// Manifest
export * from './manifest';

// Context Management
export * from './context';

// Re-export types
export type { Runtime, Storage, Tabs, Windows } from 'webextension-polyfill';

/**
 * Browser API detection
 */
export function getBrowserAPI(): any {
  if (typeof browser !== 'undefined') {
    return browser;
  }
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  return null;
}

/**
 * Check if running in extension context
 */
export function isExtensionContext(): boolean {
  return !!(getBrowserAPI()?.runtime?.id);
}

/**
 * Get extension ID
 */
export function getExtensionId(): string | null {
  return getBrowserAPI()?.runtime?.id || null;
}

/**
 * Get extension version
 */
export function getExtensionVersion(): string | null {
  return getBrowserAPI()?.runtime?.getManifest?.()?.version || null;
}
