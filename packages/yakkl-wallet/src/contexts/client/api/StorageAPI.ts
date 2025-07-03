import { backgroundAPI, type MessageResponse } from './BackgroundAPI';

export interface StorageData {
  [key: string]: any;
}

export class StorageAPI {
  async get<T = any>(keys: string | string[] | null = null): Promise<T> {
    const response = await backgroundAPI.sendMessage<T>('storage.get', { keys });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get storage data');
    }
    return response.data as T;
  }

  async set(items: StorageData): Promise<void> {
    const response = await backgroundAPI.sendMessage('storage.set', { items });
    if (!response.success) {
      throw new Error(response.error || 'Failed to set storage data');
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    const response = await backgroundAPI.sendMessage('storage.remove', { keys });
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove storage data');
    }
  }

  async clear(): Promise<void> {
    const response = await backgroundAPI.sendMessage('storage.clear');
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear storage');
    }
  }

  onChanged(callback: (changes: any) => void): () => void {
    return backgroundAPI.onMessage('storage.changed', (response: MessageResponse) => {
      if (response.success && response.data) {
        callback(response.data);
      }
    });
  }
}

export const storageAPI = new StorageAPI();