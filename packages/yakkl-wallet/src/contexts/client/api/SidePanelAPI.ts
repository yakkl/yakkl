import { backgroundAPI } from './BackgroundAPI';

export interface SidePanelOptions {
  tabId?: number;
  windowId?: number;
}

export interface PanelOptions {
  path?: string;
  enabled?: boolean;
}

export interface PanelBehavior {
  openPanelOnActionClick?: boolean;
}

export class SidePanelAPI {
  async open(options?: SidePanelOptions): Promise<void> {
    const response = await backgroundAPI.sendMessage('sidePanel.open', options);
    if (!response.success) {
      throw new Error(response.error || 'Failed to open side panel');
    }
  }

  async setOptions(options: PanelOptions): Promise<void> {
    const response = await backgroundAPI.sendMessage('sidePanel.setOptions', options);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set side panel options');
    }
  }

  async setPanelBehavior(behavior: PanelBehavior): Promise<void> {
    const response = await backgroundAPI.sendMessage('sidePanel.setPanelBehavior', behavior);
    if (!response.success) {
      throw new Error(response.error || 'Failed to set panel behavior');
    }
  }

  async getOptions(options?: { tabId?: number }): Promise<PanelOptions> {
    const response = await backgroundAPI.sendMessage<PanelOptions>('sidePanel.getOptions', options);
    if (!response.success) {
      throw new Error(response.error || 'Failed to get panel options');
    }
    return response.data || {};
  }

  async getPanelBehavior(): Promise<PanelBehavior> {
    const response = await backgroundAPI.sendMessage<PanelBehavior>('sidePanel.getPanelBehavior');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get panel behavior');
    }
    return response.data || {};
  }
}

export const sidePanelAPI = new SidePanelAPI();