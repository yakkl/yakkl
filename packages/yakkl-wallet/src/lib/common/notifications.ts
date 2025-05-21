import type { BasicNotificationOptions, CreateNotificationOptions, ImageNotificationOptions, ListNotificationOptions, NotificationOptions, ProgressNotificationOptions } from './types';
import { startLockIconTimer, stopLockIconTimer } from '$lib/extensions/chrome/iconTimer';
import { browser_ext } from './environment';
import { log } from '$lib/common/logger-wrapper';

const DEFAULT_ICON = '/images/logoBullLock48x48.png';

// List of notification IDs that have been used
// Helpful for tracking and cleaning up notifications
const activeNotifications = new Set<string>();

// Flexible notification service class
export class NotificationService {
  private static readonly DEFAULT_ID = 'yakkl-notification';
  private static readonly DEFAULT_ICON = '/images/logoBullLock48x48.png';

  // Notifications that should be shown in-app and as browser notifications
  private static readonly IMPORTANT_NOTIFICATIONS = [
    'security-alert',
    'lockdown-warning',
    'wallet-locked'
  ];

  private static async createNotification(
    options: NotificationOptions,
    id?: string
  ): Promise<string | null> {
    if (!browser_ext) return null;

    try {
      const notificationId = id || this.DEFAULT_ID;
      const notificationOptions: CreateNotificationOptions = {
        ...options,
        iconUrl: browser_ext.runtime.getURL(this.DEFAULT_ICON),
        // Force specific settings for important notifications
        ...(this.IMPORTANT_NOTIFICATIONS.some(prefix => notificationId.startsWith(prefix)) ? {
          requireInteraction: true,
          priority: 2,
          silent: false,
          eventTime: Date.now() // Set event time to now for better visibility
        } : {})
      };

      log.info('createNotification - notificationOptions:', false, notificationOptions);

      // Create the notification
      await browser_ext.notifications.create(
        notificationId,
        notificationOptions
      );

      // Track this notification
      activeNotifications.add(notificationId);

      // For important notifications, also send a message to UI contexts
      if (this.IMPORTANT_NOTIFICATIONS.some(prefix => notificationId.startsWith(prefix))) {
        this.broadcastNotificationToUI(notificationId, notificationOptions);
      }

      return notificationId;
    } catch (error) {
      log.error('Error creating notification:', false, error);
      return null;
    }
  }

  /**
   * Broadcast important notifications to UI contexts
   * This ensures they're visible even when the browser doesn't show the notification
   */
  private static broadcastNotificationToUI(
    id: string,
    options: CreateNotificationOptions
  ): void {
    if (!browser_ext) return;

    try {
      browser_ext.runtime.sendMessage({
        type: 'IMPORTANT_NOTIFICATION',
        notificationId: id,
        title: options.title,
        message: options.message,
        options: {
          requireInteraction: options.requireInteraction,
          priority: options.priority,
          silent: options.silent
        },
        timestamp: Date.now()
      }).catch(error => {
        log.debug('Error broadcasting notification to UI:', false, error);
        // Don't throw - this is just a backup notification channel
      });
    } catch (error) {
      // Ignore errors - this is just a backup notification channel
    }
  }

  /**
   * Clear a notification by ID
   * @param id The notification ID to clear
   * @returns Promise that resolves when the notification is cleared
   */
  static async clear(id: string = this.DEFAULT_ID): Promise<boolean> {
    if (!browser_ext) return false;

    try {
      await browser_ext.notifications.clear(id);
      activeNotifications.delete(id);

      // Also clear from UI contexts
      try {
        browser_ext.runtime.sendMessage({
          type: 'CLEAR_NOTIFICATION',
          notificationId: id,
          timestamp: Date.now()
        }).catch(() => {
          // Ignore errors
        });
      } catch (e) {
        // Ignore errors
      }

      return true;
    } catch (error) {
      log.warn('Error clearing notification:', false, { id, error });
      return false;
    }
  }

  /**
   * Clear all active notifications
   */
  static async clearAll(): Promise<void> {
    if (!browser_ext) return;

    const notifications = [...activeNotifications];
    for (const id of notifications) {
      await this.clear(id);
    }
  }

  /**
   * Send a basic notification
   */
  static async sendBasic(
    title: string,
    message: string,
    options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {},
    id?: string
  ): Promise<string | null> {
    log.info('sendBasic - title:', false, title);

    return await this.createNotification({
      type: 'basic',
      title,
      message,
      ...options,
    } as BasicNotificationOptions, id);
  }

  /**
   * Send a list notification
   */
  static async sendList(
    title: string,
    message: string,
    items: Array<{ title: string; message: string }>,
    options: Partial<Omit<ListNotificationOptions, 'type' | 'title' | 'message' | 'items'>> = {},
    id?: string
  ): Promise<string | null> {
    return await this.createNotification({
      type: 'list',
      title,
      message,
      items,
      ...options,
    } as ListNotificationOptions, id);
  }

  /**
   * Send an image notification
   */
  static async sendImage(
    title: string,
    message: string,
    imageUrl: string,
    options: Partial<Omit<ImageNotificationOptions, 'type' | 'title' | 'message' | 'imageUrl'>> = {},
    id?: string
  ): Promise<string | null> {
    return await this.createNotification({
      type: 'image',
      title,
      message,
      imageUrl,
      ...options,
    } as ImageNotificationOptions, id);
  }

  /**
   * Send a progress notification
   */
  static async sendProgress(
    title: string,
    message: string,
    progress: number,
    options: Partial<Omit<ProgressNotificationOptions, 'type' | 'title' | 'message' | 'progress'>> = {},
    id?: string
  ): Promise<string | null> {
    return await this.createNotification({
      type: 'progress',
      title,
      message,
      progress: Math.max(0, Math.min(100, progress)),
      ...options,
    } as ProgressNotificationOptions, id);
  }

  /**
   * Send a security alert with enhanced visibility
   */
  static async sendSecurityAlert(
    message: string,
    options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {},
    id?: string
  ): Promise<string | null> {
    log.info('sendSecurityAlert - message:', false, message);

    const notificationId = id || `security-alert-${Date.now()}`;

    // Ensure specific options for security alerts
    const enhancedOptions = {
      requireInteraction: true, // Keep notification visible until user interacts
      priority: 2 as const, // High priority
      silent: false, // Play sound
      iconUrl: browser_ext?.runtime.getURL('/images/logoBullLock48x48.png'),
      type: 'basic',
      ...options,
      // Critical options that help visibility:
      eventTime: Date.now(), // Set event time to now
    };

    try {
      // First try creating a notification through our standard method
      const result = await this.sendBasic(
        '🔒 Security Alert',
        message,
        enhancedOptions,
        notificationId
      );

      // Double ensure that the UI gets notified about this important message
      // This helps with visibility when the browser notification might be suppressed
      if (browser_ext && this.IMPORTANT_NOTIFICATIONS.some(prefix => notificationId.startsWith(prefix))) {
        try {
          browser_ext.runtime.sendMessage({
            type: 'SECURITY_ALERT',
            message: message,
            options: enhancedOptions,
            id: notificationId,
            timestamp: Date.now()
          }).catch(() => {
            // Ignore errors, this is just a backup
          });
        } catch (e) {
          // Ignore errors in the backup notification method
        }
      }

      return result;
    } catch (error) {
      log.error('Failed to send security alert notification:', false, error);
      return null;
    }
  }

  /**
   * Send an imminent lockdown warning notification
   * @param delayMs Time in ms until lockdown occurs
   */
  static async sendLockdownWarning(
    delayMs: number = 30000,
    options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {},
  ): Promise<string | null> {
    const message = `YAKKL will be locked soon due to inactivity. You have ${Math.round(delayMs/1000)} seconds remaining.`;

    // Create a unique ID for this lockdown warning
    const notificationId = `lockdown-warning-${Date.now()}`;

    // Send notification
    const result = await this.sendSecurityAlert(
      message,
      {
        contextMessage: 'Use YAKKL to prevent automatic lockdown',
        requireInteraction: true,
        priority: 2,
        ...options
      },
      notificationId
    );

    // Also send a special lockdown warning message that the UI can display prominently
    if (browser_ext) {
      try {
        browser_ext.runtime.sendMessage({
          type: 'LOCKDOWN_WARNING',
          message: message,
          timestamp: Date.now(),
          delayMs: delayMs
        }).catch((e) => {
          // Ignore errors
          log.debug('Error sending lockdown warning message:', false, e);
        });
      } catch (e) {
        // Ignore errors
        log.debug('Error sending lockdown warning message:', false, e);
      }
    }

    return result;
  }

  /**
   * Send a wallet locked notification
   */
  static async sendWalletLocked(
    options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {},
  ): Promise<string | null> {
    return await this.sendSecurityAlert(
      'Your YAKKL wallet has been locked due to inactivity.',
      {
        requireInteraction: false, // Don't need interaction for this one
        priority: 2,
        ...options
      },
      'wallet-locked'
    );
  }
}

// Functions to send notifications to the browser extension

/**
 * Sends a ping notification to the runtime.
 */
export async function sendNotificationPing() {
  try {
    if (!browser_ext) return;

    const response = await browser_ext.runtime.sendMessage({
      type: 'ping',
    });

    if (isResponseWithSuccess(response)) {
      log.info('Ping response status:', false, response);
    } else {
      log.error('Unexpected response structure:', false, response);
    }
  } catch (error) {
    log.error('No Pong response:', false, error);
  }
}

/**
 * Sends a notification with a given title and message text.
 * @param {string} title - Notification title.
 * @param {string} messageText - Notification message.
 */
export async function sendNotificationMessage(title: string, messageText: string) {
  try {
    if (!browser_ext) return;

    log.info('sendNotificationMessage - title:', false, title);
    log.info('sendNotificationMessage - messageText:', false, messageText);

    const id = await browser_ext.notifications.create(
      'yakkl-notification',
      {
        type: 'basic',
        iconUrl: browser_ext.runtime.getURL('/images/logoBullLock48x48.png'),
        title: title || 'Notification',
        message: messageText || 'Default message.',
      }
    );

    return id;

  } catch (error) {
    log.error('Error sending notification message:', false, error);
    return null;
  }
}

/**
 * Sends a request to start the lock icon timer.
 */
export async function sendNotificationStartLockIconTimer() {
  try {
    if (!browser_ext) return;

    log.info('sendNotificationStartLockIconTimer - starting lock icon timer:', false);

    startLockIconTimer();
  } catch (error) {
    log.error('Error starting lock icon timer:', false, error);
  }
}

/**
 * Sends a request to stop the lock icon timer.
 */
export async function sendNotificationStopLockIconTimer() {
  try {
    if (!browser_ext) return;
    stopLockIconTimer();
  } catch (error) {
    log.error('Error stopping lock icon timer:', false, error);
  }
}

/**
 * Helper function to check if a response indicates success.
 * @param {unknown} response - The response object.
 * @returns {boolean} True if the response contains a `success` property set to true.
 */
function isResponseWithSuccess(response: unknown): boolean {
  return typeof response === 'object' && response !== null && 'success' in response && (response as any).success === true;
}

