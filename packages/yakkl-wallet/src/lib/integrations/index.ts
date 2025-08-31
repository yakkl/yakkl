/**
 * Package Integrations
 * Main entry point for all @yakkl/* package integrations
 */

import { initializeSDK } from './sdk.integration';
import { initializeAnalytics } from './analytics.integration';
import { initializeBlockchain } from './blockchain.integration';
import { initializeBrowserExtension } from './browser-extension.integration';
import { initializeSecurity } from './security.integration';
import { initializeUI } from './ui.integration';

/**
 * Initialize all package integrations
 */
export async function initializePackages(): Promise<void> {
  try {
    // Initialize in dependency order
    initializeUI();
    await initializeSecurity();
    await initializeBlockchain();
    initializeBrowserExtension();
    await initializeSDK();
    initializeAnalytics();
    
    console.log('[Packages] All @yakkl/* packages initialized successfully');
  } catch (error) {
    console.error('[Packages] Failed to initialize packages:', error);
    throw error;
  }
}

// Re-export all integrations
export * from './sdk.integration';
export * from './analytics.integration';
export * from './blockchain.integration';
export * from './browser-extension.integration';
export * from './security.integration';
export * from './ui.integration';