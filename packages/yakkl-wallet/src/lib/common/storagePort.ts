import { getBrowserExt } from "$lib/browser-polyfill-wrapper";
import { log } from "$lib/managers/Logger";
import type { Runtime } from "webextension-polyfill";
import type { StorageRequest, StorageResponse } from "./storageTypes";
import { getSafeUUID } from "./uuid";

// storage-port.ts
export class StoragePort {
  private static instance: StoragePort;
  private port: Runtime.Port | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): StoragePort {
    if (!StoragePort.instance) {
      StoragePort.instance = new StoragePort();
    }
    return StoragePort.instance;
  }

  private async connect() {
    if (this.port) return;

    const browserExt = getBrowserExt();
    if (!browserExt) throw new Error('Browser extension API not available');

    this.port = browserExt.runtime.connect({ name: 'yakkl-storage-port' });
    this.setupPortListeners();
  }

  private setupPortListeners() {
    if (!this.port) return;

    this.port.onMessage.addListener((message: unknown, port: Runtime.Port) => {
      const response = message as StorageResponse & { requestId: string };
      const pending = this.pendingRequests.get(response.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.requestId);
        if (response.success) {
          pending.resolve(response.data);
        } else {
          pending.reject(response.error);
        }
      }
    });

    this.port.onDisconnect.addListener(() => {
      this.handleDisconnect();
    });
  }

  private handleDisconnect() {
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Storage port disconnected'));
    }
    this.pendingRequests.clear();
    this.port = null;
  }

  async get<T>(key: string, options?: StorageRequest['options']): Promise<T | null> {
    return this.sendRequest({
      type: 'storage',
      action: 'get',
      key,
      options
    });
  }

  async set(key: string, value: any, options?: StorageRequest['options']): Promise<void> {
    return this.sendRequest({
      type: 'storage',
      action: 'set',
      key,
      value,
      options
    });
  }

  async remove(key: string, options?: StorageRequest['options']): Promise<void> {
    return this.sendRequest({
      type: 'storage',
      action: 'remove',
      key,
      options
    });
  }

  private async sendRequest(request: StorageRequest): Promise<any> {
    try {
      await this.connect();
      if (!this.port) throw new Error('Failed to establish storage port');

      const requestId = getSafeUUID();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error('Storage request timeout'));
        }, 5000);

        this.pendingRequests.set(requestId, { resolve, reject, timeout });
        this.port.postMessage({ ...request, requestId });
      });
    } catch (error) {
      log.error('Storage port error:', false, error);
      return null;
    }
  }
}
