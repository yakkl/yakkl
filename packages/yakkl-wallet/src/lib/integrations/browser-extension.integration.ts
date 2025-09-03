/**
 * Browser Extension Integration
 * Utilities from @yakkl/browser-extension
 */

import {
  ManifestBuilder,
  createMessageHandler,
  getBrowserAPI,
  isExtensionContext,
  getExtensionId,
  getExtensionVersion,
  type ManifestV3
} from '@yakkl/browser-extension';

/**
 * Initialize browser extension utilities
 */
export function initializeBrowserExtension(): void {
  // Browser extension initialization
  // Message handlers would be set up in the background service worker
  console.log('[BrowserExtension] Initialized');
}

/**
 * Get current context
 */
export function getCurrentContext(): string {
  if (isExtensionContext()) {
    if (typeof window !== 'undefined') {
      return 'content';
    }
    return 'background';
  }
  return 'web';
}

/**
 * Check if running in extension
 */
export function isRunningInExtension(): boolean {
  return isExtensionContext();
}

/**
 * Build manifest for production
 */
export function buildManifest(): ManifestV3 {
  const builder = new ManifestBuilder('YAKKL Smart Wallet', '2.0.2');
  
  builder
    .setDescription('The most secure and user-friendly crypto wallet')
    .addPermission('storage')
    .addPermission('activeTab')
    .addContentScript({
      matches: ['<all_urls>'],
      js: ['content.js']
    })
    .setBackground('background.js');
    
  return builder.build();
}

// Re-export utilities
export {
  ManifestBuilder,
  createMessageHandler,
  getBrowserAPI,
  isExtensionContext,
  getExtensionId,
  getExtensionVersion,
  type ManifestV3
};