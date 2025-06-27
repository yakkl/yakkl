import { backgroundAPI } from './BackgroundAPI';

export interface NotificationOptions {
  type?: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  title?: string;
  message?: string;
  contextMessage?: string;
  priority?: 0 | 1 | 2;
  eventTime?: number;
  buttons?: Array<{ title: string; iconUrl?: string }>;
  imageUrl?: string;
  items?: Array<{ title: string; message: string }>;
  progress?: number;
  isClickable?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
}

export class NotificationsAPI {
  async create(notificationId: string = '', options: NotificationOptions): Promise<string> {
    const response = await backgroundAPI.sendMessage<string>('notifications.create', { notificationId, options });
    if (!response.success) {
      throw new Error(response.error || 'Failed to create notification');
    }
    return response.data!;
  }

  async clear(notificationId: string): Promise<boolean> {
    const response = await backgroundAPI.sendMessage<boolean>('notifications.clear', { notificationId });
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear notification');
    }
    return response.data!;
  }

  async getAll(): Promise<{ [key: string]: NotificationOptions }> {
    const response = await backgroundAPI.sendMessage<{ [key: string]: NotificationOptions }>('notifications.getAll');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get all notifications');
    }
    return response.data || {};
  }

  async update(notificationId: string, options: NotificationOptions): Promise<boolean> {
    const response = await backgroundAPI.sendMessage<boolean>('notifications.update', { notificationId, options });
    if (!response.success) {
      throw new Error(response.error || 'Failed to update notification');
    }
    return response.data!;
  }

  onClicked(callback: (notificationId: string) => void): () => void {
    return backgroundAPI.onMessage('notifications.clicked', (response) => {
      if (response.success && response.data) {
        callback(response.data.notificationId);
      }
    });
  }

  onButtonClicked(callback: (notificationId: string, buttonIndex: number) => void): () => void {
    return backgroundAPI.onMessage('notifications.buttonClicked', (response) => {
      if (response.success && response.data) {
        callback(response.data.notificationId, response.data.buttonIndex);
      }
    });
  }

  onClosed(callback: (notificationId: string, byUser: boolean) => void): () => void {
    return backgroundAPI.onMessage('notifications.closed', (response) => {
      if (response.success && response.data) {
        callback(response.data.notificationId, response.data.byUser);
      }
    });
  }
}

export const notificationsAPI = new NotificationsAPI();