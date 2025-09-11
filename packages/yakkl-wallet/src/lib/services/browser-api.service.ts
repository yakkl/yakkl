/**
 * Browser API Service
 *
 * Provides a clean, SSR-safe interface to browser extension APIs
 * by using message passing to the background context.
 */

import { BaseService } from './base.service';
import {
  BrowserAPIMessageType,
  type BrowserAPIRequest,
  type BrowserAPIResponse,
  type StorageGetPayload,
  type StorageSetPayload,
  type StorageRemovePayload,
  type TabsQueryPayload,
  type TabsCreatePayload,
  type TabsUpdatePayload,
  type WindowsCreatePayload,
  type NotificationCreatePayload,
  type RuntimeGetURLPayload,
  type RuntimeSendMessagePayload,
  type RuntimeConnectPayload,
  type ActionSetIconPayload,
  type ActionSetBadgeTextPayload,
  type ActionSetBadgeBackgroundColorPayload,
  type ActionGetBadgeTextPayload,
  type ActionSetTitlePayload
} from '$lib/types/browser-api-messages';
import { log } from '$lib/managers/Logger';

class BrowserAPIService extends BaseService {
  private static instance: BrowserAPIService;
  private requestId = 0;

  private constructor() {
    super('BrowserAPIService');
  }

  /**
   * Get singleton instance of BrowserAPIService
   */
  static getInstance(): BrowserAPIService {
    if (!BrowserAPIService.instance) {
      BrowserAPIService.instance = new BrowserAPIService();
    }
    return BrowserAPIService.instance;
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `browser-api-${Date.now()}-${++this.requestId}`;
  }

  /**
   * Send a browser API request to the background
   */
  private async sendBrowserAPIRequest<T = any>(
    type: BrowserAPIMessageType,
    payload?: any
  ): Promise<T> {
    const request: BrowserAPIRequest = {
      id: this.generateRequestId(),
      type,
      payload: payload || {},
      timestamp: Date.now()
    };

    try {
      const serviceResponse = await this.sendMessage(request);

      if (!serviceResponse.success) {
        throw new Error(serviceResponse.error?.message || 'Browser API request failed');
      }

      // The background handler returns the data directly in the service response
      return serviceResponse.data as T;
    } catch (error) {
      log.warn(`[BrowserAPI] Request failed:`, false, {
        type,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // ===============================
  // Storage API Methods
  // ===============================

  /**
   * Get items from local storage
   */
  async storageGet(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_GET,
      { keys } as StorageGetPayload
    );
  }

  /**
   * Set items in local storage
   */
  async storageSet(items: Record<string, any>): Promise<void> {
    await this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_SET,
      { items } as StorageSetPayload
    );
  }

  /**
   * Remove items from local storage
   */
  async storageRemove(keys: string | string[]): Promise<void> {
    await this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_REMOVE,
      { keys } as StorageRemovePayload
    );
  }

  /**
   * Clear all local storage
   */
  async storageClear(): Promise<void> {
    await this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_CLEAR
    );
  }

  /**
   * Get items from sync storage
   */
  async storageSyncGet(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_GET,
      { keys } as StorageGetPayload
    );
  }

  /**
   * Set items in sync storage
   */
  async storageSyncSet(items: Record<string, any>): Promise<void> {
    await this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_SET,
      { items } as StorageSetPayload
    );
  }

  // ===============================
  // Tabs API Methods
  // ===============================

  /**
   * Query tabs
   */
  async tabsQuery(queryInfo: TabsQueryPayload): Promise<any[]> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_TABS_QUERY,
      queryInfo
    );
  }

  /**
   * Create a new tab
   */
  async tabsCreate(createProperties: TabsCreatePayload): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_TABS_CREATE,
      createProperties
    );
  }

  /**
   * Update a tab
   */
  async tabsUpdate(tabId: number, updateProperties: any): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_TABS_UPDATE,
      { tabId, updateProperties } as TabsUpdatePayload
    );
  }

  /**
   * Get the current tab
   */
  async tabsGetCurrent(): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_TABS_GET_CURRENT
    );
  }

  // ===============================
  // Windows API Methods
  // ===============================

  /**
   * Create a new window
   */
  async windowsCreate(createData: WindowsCreatePayload): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_WINDOWS_CREATE,
      createData
    );
  }

  /**
   * Get the current window
   */
  async windowsGetCurrent(): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_CURRENT
    );
  }

  /**
   * Get all windows
   */
  async windowsGetAll(): Promise<any[]> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_ALL
    );
  }

  // ===============================
  // Runtime API Methods
  // ===============================

  /**
   * Get the extension manifest
   */
  async runtimeGetManifest(): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_MANIFEST
    );
  }

  /**
   * Get a URL relative to the extension
   */
  async runtimeGetURL(path: string): Promise<string> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_URL,
      { path } as RuntimeGetURLPayload
    );
  }

  /**
   * Get platform info
   */
  async runtimeGetPlatformInfo(): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_PLATFORM_INFO
    );
  }

  /**
   * Send a message to the extension background or other parts
   * Critical for client-background communication
   */
  async runtimeSendMessage(message: any, extensionId?: string): Promise<any> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_SEND_MESSAGE,
      { message, extensionId } as RuntimeSendMessagePayload
    );
  }

  /**
   * Establish a persistent connection (port)
   * Used for long-lived communication channels
   */
  async runtimeConnect(extensionId?: string, connectInfo?: { name?: string; includeTlsChannelId?: boolean }): Promise<any> {
    // Note: This will return port details, but the actual port
    // object can't cross the execution boundary. The background
    // will maintain the port and route messages appropriately.
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_CONNECT,
      { extensionId, connectInfo } as RuntimeConnectPayload
    );
  }

  /**
   * Reload the extension
   */
  async runtimeReload(): Promise<void> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_RELOAD
    );
  }

  /**
   * Open the options page
   */
  async runtimeOpenOptionsPage(): Promise<void> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_OPEN_OPTIONS_PAGE
    );
  }

  /**
   * Get the last runtime error
   */
  async runtimeGetLastError(): Promise<{ message: string } | null> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_LAST_ERROR
    );
  }

  /**
   * Note: Event listeners like runtime.onMessage are handled differently
   * Since we can't directly attach listeners from the client context,
   * messages are routed through the existing BaseService messaging system.
   *
   * To listen for messages in your component:
   * - Use the existing message handling in BaseService
   * - Or create a dedicated listener service that extends BaseService
   *
   * Example:
   * ```typescript
   * class MyMessageListener extends BaseService {
   *   constructor() {
   *     super('MyMessageListener');
   *     // Messages will be automatically routed to handleMessage
   *   }
   *
   *   protected async handleMessage(message: any): Promise<any> {
   *     // Handle incoming messages here
   *   }
   * }
   * ```
   */

  // ===============================
  // Action API Methods
  // ===============================

  /**
   * Set the extension action icon
   */
  async actionSetIcon(details: ActionSetIconPayload['details']): Promise<void> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_ACTION_SET_ICON,
      { details } as ActionSetIconPayload
    );
  }

  /**
   * Set the badge text on the extension action
   */
  async actionSetBadgeText(details: ActionSetBadgeTextPayload['details']): Promise<void> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_ACTION_SET_BADGE_TEXT,
      { details } as ActionSetBadgeTextPayload
    );
  }

  /**
   * Set the badge background color
   */
  async actionSetBadgeBackgroundColor(details: ActionSetBadgeBackgroundColorPayload['details']): Promise<void> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_ACTION_SET_BADGE_BACKGROUND_COLOR,
      { details } as ActionSetBadgeBackgroundColorPayload
    );
  }

  /**
   * Get the badge text
   */
  async actionGetBadgeText(details?: ActionGetBadgeTextPayload['details']): Promise<string> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_ACTION_GET_BADGE_TEXT,
      { details: details || {} } as ActionGetBadgeTextPayload
    );
  }

  /**
   * Set the action title (tooltip)
   */
  async actionSetTitle(details: ActionSetTitlePayload['details']): Promise<void> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_ACTION_SET_TITLE,
      { details } as ActionSetTitlePayload
    );
  }

  // ===============================
  // Notifications API Methods
  // ===============================

  /**
   * Create a notification
   */
  async notificationsCreate(
    notificationId: string,
    options: NotificationCreatePayload['options']
  ): Promise<string> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_NOTIFICATIONS_CREATE,
      { notificationId, options } as NotificationCreatePayload
    );
  }

  // ===============================
  // Idle API Methods
  // ===============================

  /**
   * Query the idle state
   */
  async idleQueryState(): Promise<'active' | 'idle' | 'locked'> {
    return this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_IDLE_QUERY_STATE
    );
  }

  // ===============================
  // Convenience Methods
  // ===============================

  /**
   * Get a single storage item
   */
  async getStorageItem<T = any>(key: string): Promise<T | undefined> {
    const result = await this.storageGet(key);
    return result[key];
  }

  /**
   * Set a single storage item
   */
  async setStorageItem(key: string, value: any): Promise<void> {
    await this.storageSet({ [key]: value });
  }

  /**
   * Remove a single storage item
   */
  async removeStorageItem(key: string): Promise<void> {
    await this.storageRemove(key);
  }

  /**
   * Check if we're in a popup window
   */
  async isPopupWindow(): Promise<boolean> {
    try {
      const currentWindow = await this.windowsGetCurrent();
      return currentWindow.type === 'popup';
    } catch {
      return false;
    }
  }

  /**
   * Open the extension options page
   */
  async openOptionsPage(): Promise<void> {
    await this.sendBrowserAPIRequest(
      BrowserAPIMessageType.BROWSER_API_RUNTIME_OPEN_OPTIONS_PAGE
    );
  }
}

// Export singleton instance
export const browserAPI = BrowserAPIService.getInstance();

// Also export the class for testing
export { BrowserAPIService };
