import { backgroundAPI } from './BackgroundAPI';

export interface BadgeTextDetails {
  text: string;
  tabId?: number;
}

export interface BadgeBackgroundColorDetails {
  color: string | [number, number, number, number];
  tabId?: number;
}

export interface IconDetails {
  path?: string | { [size: string]: string };
  tabId?: number;
}

export class ActionAPI {
  async setBadgeText(details: BadgeTextDetails): Promise<void> {
    const response = await backgroundAPI.sendMessage('action.setBadgeText', details);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set badge text');
    }
  }

  async getBadgeText(details?: { tabId?: number }): Promise<string> {
    const response = await backgroundAPI.sendMessage<string>('action.getBadgeText', details);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get badge text');
    }
    return response.data || '';
  }

  async setBadgeBackgroundColor(details: BadgeBackgroundColorDetails): Promise<void> {
    const response = await backgroundAPI.sendMessage('action.setBadgeBackgroundColor', details);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set badge background color');
    }
  }

  async getBadgeBackgroundColor(details?: { tabId?: number }): Promise<[number, number, number, number]> {
    const response = await backgroundAPI.sendMessage<[number, number, number, number]>('action.getBadgeBackgroundColor', details);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get badge background color');
    }
    return response.data || [0, 0, 0, 0];
  }

  async setIcon(details: IconDetails): Promise<void> {
    const response = await backgroundAPI.sendMessage('action.setIcon', details);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set icon');
    }
  }

  async setTitle(details: { title: string; tabId?: number }): Promise<void> {
    const response = await backgroundAPI.sendMessage('action.setTitle', details);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set title');
    }
  }

  async getTitle(details?: { tabId?: number }): Promise<string> {
    const response = await backgroundAPI.sendMessage<string>('action.getTitle', details);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get title');
    }
    return response.data || '';
  }

  async enable(tabId?: number): Promise<void> {
    const response = await backgroundAPI.sendMessage('action.enable', { tabId });
    if (!response.success) {
      throw new Error(response.error || 'Failed to enable action');
    }
  }

  async disable(tabId?: number): Promise<void> {
    const response = await backgroundAPI.sendMessage('action.disable', { tabId });
    if (!response.success) {
      throw new Error(response.error || 'Failed to disable action');
    }
  }

  onClicked(callback: (tab: chrome.tabs.Tab) => void): () => void {
    return backgroundAPI.onMessage('action.clicked', (response) => {
      if (response.success && response.data) {
        callback(response.data.tab);
      }
    });
  }
}

export const actionAPI = new ActionAPI();