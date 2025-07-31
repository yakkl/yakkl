/**
 * Browser-dependent features that require the extension API
 * This module should be dynamically imported after ensuring the browser API is available
 */

import type { Browser } from 'webextension-polyfill';
import { browser_ext } from '$lib/common/environment';

export class BrowserFeatures {
  private browser: Browser | null;

  constructor() {
    this.browser = browser_ext;
    if (!this.browser) {
      throw new Error('Browser API not available');
    }
  }

  /**
   * Get extension information
   */
  async getExtensionInfo() {
    if (!this.browser?.runtime) {
      return { id: 'unknown', version: 'unknown' };
    }

    const manifest = this.browser.runtime.getManifest();
    return {
      id: this.browser.runtime.id,
      version: manifest.version,
      name: manifest.name
    };
  }

  /**
   * Send message to background script
   */
  async sendToBackground(message: any): Promise<any> {
    if (!this.browser?.runtime?.sendMessage) {
      console.warn('Runtime sendMessage not available');
      return null;
    }

    try {
      return await this.browser.runtime.sendMessage(message);
    } catch (error) {
      console.error('Error sending message to background:', error);
      return null;
    }
  }

  /**
   * Get data from storage
   */
  async getStorageData(keys: string | string[]): Promise<any> {
    if (!this.browser?.storage?.local) {
      console.warn('Storage API not available');
      return {};
    }

    try {
      return await this.browser.storage.local.get(keys);
    } catch (error) {
      console.error('Error getting storage data:', error);
      return {};
    }
  }

  /**
   * Set data in storage
   */
  async setStorageData(data: Record<string, any>): Promise<void> {
    if (!this.browser?.storage?.local) {
      console.warn('Storage API not available');
      return;
    }

    try {
      await this.browser.storage.local.set(data);
    } catch (error) {
      console.error('Error setting storage data:', error);
    }
  }

  /**
   * Open a new tab
   */
  async openTab(url: string): Promise<void> {
    if (!this.browser?.tabs?.create) {
      // Fallback to window.open
      window.open(url, '_blank');
      return;
    }

    try {
      await this.browser.tabs.create({ url });
    } catch (error) {
      console.error('Error opening tab:', error);
      // Fallback to window.open
      window.open(url, '_blank');
    }
  }
}

// Export a factory function to create the instance
export async function createBrowserFeatures(): Promise<BrowserFeatures> {
  const features = new BrowserFeatures();

  // Verify it's working by getting extension info
  const info = await features.getExtensionInfo();
  console.log('Browser features initialized with extension:', info);

  return features;
}
