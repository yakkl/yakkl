import { backgroundAPI } from './BackgroundAPI';

export interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
  active?: boolean;
  windowId?: number;
  index?: number;
}

export interface TabQuery {
  active?: boolean;
  currentWindow?: boolean;
  url?: string | string[];
  windowId?: number;
  status?: 'loading' | 'complete';
}

export class TabsAPI {
  async get(tabId: number): Promise<TabInfo> {
    const response = await backgroundAPI.sendMessage<TabInfo>('tabs.get', { tabId });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get tab');
    }
    return response.data!;
  }

  async query(queryInfo: TabQuery): Promise<TabInfo[]> {
    const response = await backgroundAPI.sendMessage<TabInfo[]>('tabs.query', queryInfo);
    if (!response.success) {
      throw new Error(response.error || 'Failed to query tabs');
    }
    return response.data || [];
  }

  async create(createProperties: {
    url?: string;
    active?: boolean;
    windowId?: number;
    index?: number;
  }): Promise<TabInfo> {
    const response = await backgroundAPI.sendMessage<TabInfo>('tabs.create', createProperties);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create tab');
    }
    return response.data!;
  }

  async update(tabId: number, updateProperties: {
    url?: string;
    active?: boolean;
    muted?: boolean;
    pinned?: boolean;
  }): Promise<TabInfo> {
    const response = await backgroundAPI.sendMessage<TabInfo>('tabs.update', { tabId, updateProperties });
    if (!response.success) {
      throw new Error(response.error || 'Failed to update tab');
    }
    return response.data!;
  }

  async remove(tabIds: number | number[]): Promise<void> {
    const response = await backgroundAPI.sendMessage('tabs.remove', { tabIds });
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove tabs');
    }
  }

  async getCurrent(): Promise<TabInfo> {
    const response = await backgroundAPI.sendMessage<TabInfo>('tabs.getCurrent');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get current tab');
    }
    return response.data!;
  }
}

export const tabsAPI = new TabsAPI();