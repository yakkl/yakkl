import { NotificationService } from '$lib/common/notifications';

export interface YakklNotificationOptions {
  message: string; 
  type?: 'success' | 'error' | 'info' | 'warning'; 
  title?: string;
  duration?: number; // Duration in milliseconds before auto-dismiss
}

class NotificationServiceWrapper {
  private static instance: NotificationServiceWrapper;

  private constructor() {}

  static getInstance(): NotificationServiceWrapper {
    if (!NotificationServiceWrapper.instance) {
      NotificationServiceWrapper.instance = new NotificationServiceWrapper();
    }
    return NotificationServiceWrapper.instance;
  }

  async show(options: YakklNotificationOptions) {
    const { message, type = 'info', title = 'YAKKL Wallet', duration } = options;
    
    try {
      // Generate unique ID for this notification
      const notificationId = `yakkl-${type}-${Date.now()}`;
      
      // Use the NotificationService from common/notifications
      await NotificationService.sendBasic(
        title,
        message,
        {
          priority: type === 'error' ? 2 : 1,
          requireInteraction: !duration // If duration is set, don't require interaction
        },
        notificationId
      );
      
      // If duration is specified, auto-dismiss after timeout
      if (duration && duration > 0) {
        setTimeout(async () => {
          try {
            await NotificationService.clear(notificationId);
          } catch (error) {
            console.debug('Failed to clear notification:', error);
          }
        }, duration);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
}

export const notificationService = NotificationServiceWrapper.getInstance();