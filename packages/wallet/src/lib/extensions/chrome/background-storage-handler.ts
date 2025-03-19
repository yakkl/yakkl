// background-storage-handler.ts
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import type { StorageRequest, StorageResponse } from '$lib/common/storage-types';

export class BackgroundStorageHandler {
  private static instance: BackgroundStorageHandler;
  private syncQueue: Set<string> = new Set();
  private syncInProgress = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): BackgroundStorageHandler {
    if (!BackgroundStorageHandler.instance) {
      BackgroundStorageHandler.instance = new BackgroundStorageHandler();
    }
    return BackgroundStorageHandler.instance;
  }

  private initialize() {
    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== 'yakkl-storage-port') return;
      this.handlePortConnection(port);
    });
  }

  private async handlePortConnection(port: Runtime.Port) {
    port.onMessage.addListener(async (message: unknown, _port: Runtime.Port) => {
      try {
        const request = message as StorageRequest & { requestId: string };
        const response = await this.handleStorageRequest(request);
        port.postMessage({ ...response, requestId: request.requestId });
      } catch (error: unknown) {
        port.postMessage({
          success: false,
          error: {
            code: 'STORAGE_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          requestId: (message as { requestId?: string })?.requestId || 'unknown'
        });
      }
    });
  }

  private async handleStorageRequest(request: StorageRequest): Promise<StorageResponse> {
    switch (request.action) {
      case 'get': {
        const local = await this.getLocal(request.key!);
        if (request.storageType === 'both' || request.storageType === 'remote') {
          // Add remote fetch logic here when implementing Cloudflare Workers
          const remote = await this.getRemote(request.key!);
          // Merge logic here
        }
        return {
          success: true,
          data: local,
          source: 'local',
          metadata: {
            timestamp: Date.now()
          }
        };
      }
      case 'set': {
        await this.setLocal(request.key!, request.value);
        if (request.storageType === 'both' || request.storageType === 'remote') {
          this.queueSync(request.key!);
        }
        return {
          success: true,
          metadata: {
            timestamp: Date.now(),
            synced: request.storageType === 'local'
          }
        };
      }
      case 'remove': {
        await this.removeLocal(request.key!);
        if (request.storageType === 'both' || request.storageType === 'remote') {
          this.queueSync(request.key!);
        }
        return {
          success: true,
          metadata: {
            timestamp: Date.now(),
            synced: request.storageType === 'local'
          }
        };
      }
      // Add other actions...
    }
  }

  private async getLocal(key: string): Promise<any> {
    const result = await browser.storage.local.get(key);
    return result[key];
  }

  private async setLocal(key: string, value: any): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  private async getRemote(key: string): Promise<any> {
    // Implement Cloudflare Workers fetch logic here
    return null;
  }

  private queueSync(key: string) {
    this.syncQueue.add(key);
    if (!this.syncInProgress) {
      this.startSync();
    }
  }

  private async startSync() {
    if (this.syncInProgress || this.syncQueue.size === 0) return;

    this.syncInProgress = true;
    try {
      // Implement sync logic with Cloudflare Workers
      // Could include batching, retry logic, etc.
    } finally {
      this.syncInProgress = false;
      if (this.syncQueue.size > 0) {
        this.startSync();
      }
    }
  }

  private async removeLocal(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }
}
