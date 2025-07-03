import { backgroundAPI } from './BackgroundAPI';

export interface WindowInfo {
  id?: number;
  focused?: boolean;
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  tabs?: any[];
  type?: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
  state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
}

export interface WindowCreateData {
  url?: string | string[];
  tabId?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  focused?: boolean;
  type?: 'normal' | 'popup' | 'panel' | 'detached_panel';
  state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
}

export class WindowsAPI {
  async get(windowId: number, getInfo?: { populate?: boolean }): Promise<WindowInfo> {
    const response = await backgroundAPI.sendMessage<WindowInfo>('windows.get', { windowId, getInfo });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get window');
    }
    return response.data!;
  }

  async getCurrent(getInfo?: { populate?: boolean }): Promise<WindowInfo> {
    const response = await backgroundAPI.sendMessage<WindowInfo>('windows.getCurrent', { getInfo });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get current window');
    }
    return response.data!;
  }

  async getAll(getInfo?: { populate?: boolean; windowTypes?: string[] }): Promise<WindowInfo[]> {
    const response = await backgroundAPI.sendMessage<WindowInfo[]>('windows.getAll', { getInfo });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get all windows');
    }
    return response.data || [];
  }

  async create(createData?: WindowCreateData): Promise<WindowInfo> {
    const response = await backgroundAPI.sendMessage<WindowInfo>('windows.create', createData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create window');
    }
    return response.data!;
  }

  async update(windowId: number, updateInfo: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    focused?: boolean;
    drawAttention?: boolean;
    state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
  }): Promise<WindowInfo> {
    const response = await backgroundAPI.sendMessage<WindowInfo>('windows.update', { windowId, updateInfo });
    if (!response.success) {
      throw new Error(response.error || 'Failed to update window');
    }
    return response.data!;
  }

  async remove(windowId: number): Promise<void> {
    const response = await backgroundAPI.sendMessage('windows.remove', { windowId });
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove window');
    }
  }
}

export const windowsAPI = new WindowsAPI();