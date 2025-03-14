import { browser_ext } from '$lib/common/environment';
import { log } from '$plugins/Logger';
import type { Runtime } from 'webextension-polyfill';

export interface QueuedMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

export interface StorageData {
  [key: string]: unknown;
}

export enum ConnectionType {
  UI = 'ui-connection',
  POPUP = 'popup-connection',
  CONTENT = 'content-connection'
}

export interface ConnectionInfo {
  type: ConnectionType;
  port: Runtime.Port;
  connectedAt: number;
}

export class BackgroundManager {
  private static instance: BackgroundManager | null = null;
  private connections: Map<string, ConnectionInfo>;
  private messageQueue: QueuedMessage[];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly STORAGE_PREFIX = 'bg_msg_';
  private initialized: boolean = false;

  private constructor() {
    this.connections = new Map();
    this.messageQueue = [];
    this.initialize().catch(error => {
      log.error('Failed to initialize BackgroundManager:', false, error);
    });
  }

  public static getInstance(): BackgroundManager {
    if (!BackgroundManager.instance) {
      BackgroundManager.instance = new BackgroundManager();
    }
    return BackgroundManager.instance;
  }

  private async initialize(): Promise<void> {
    if (!browser_ext) return;
    if (this.initialized) return;

    try {
        browser_ext.runtime.onConnect.addListener((port) => {
          if (this.isValidConnectionType(port.name)) {
            this.handleNewConnection(port);
          }
          // Note: Only handle specific connection types that you have defined and let the rest flow through
            // log.warn('Invalid connection type attempted:', false, { portName: port.name });
            // port.disconnect();
        });

        await this.restoreQueuedMessages();

        this.initialized = true;
        // log.info('BackgroundManager initialized');
    } catch (error) {
      log.error('BackgroundManager initialization failed:', false, error);
      throw error;
    }
  }

  private isValidConnectionType(type: string): type is ConnectionType {
    return Object.values(ConnectionType).includes(type as ConnectionType);
  }

  private handleNewConnection(port: Runtime.Port): void {
    try {
      const connectionInfo: ConnectionInfo = {
        type: port.name as ConnectionType,
        port,
        connectedAt: Date.now()
      };

      this.connections.set(port.name, connectionInfo);
      // log.debug('New connection established:', false, {
      //   type: port.name,
      //   timestamp: connectionInfo.connectedAt
      // });

      port.onDisconnect.addListener(() => {
        this.handleDisconnection(port);
      });

      // Process queued messages for new connection
      this.processQueuedMessages().catch(error => {
        log.error('Failed to process queued messages:', false, error);
      });
    } catch (error) {
      log.error('Error handling new connection:', false, error);
    }
  }

  private handleDisconnection(port: Runtime.Port): void {
    try {
      this.connections.delete(port.name);
      // log.debug('Connection closed:', false, { type: port.name });
    } catch (error) {
      log.error('Error handling disconnection:', false, error);
    }
  }

  public hasConnections(): boolean {
    return this.connections.size > 0;
  }

  public hasUIConnection(): boolean {
    return this.connections.has(ConnectionType.UI);
  }

  public getConnectionInfo(type: ConnectionType): ConnectionInfo | undefined {
    return this.connections.get(type);
  }

  public async sendMessage<T>(type: string, data: T): Promise<void> {
    try {
      if (!this.hasConnections()) {
        await this.handleNoConnections(type, data);
        return;
      }

      const message = { type, data };
      const sendPromises: Promise<void>[] = [];

      this.connections.forEach(({ port }) => {
        sendPromises.push(
          new Promise<void>((resolve, reject) => {
            try {
              port.postMessage(message);
              resolve();
            } catch (error) {
              reject(error);
            }
          })
        );
      });

      await Promise.allSettled(sendPromises);
    } catch (error) {
      log.error('Failed to send message:', false, error);
      await this.handleMessageError(type, data, error);
    }
  }

  private async handleNoConnections<T>(type: string, data: T): Promise<void> {
    try {
      await Promise.all([
        this.queueMessage(type, data),
        this.saveToStorage(type, data)
      ]);
    } catch (error) {
      log.error('Failed to handle no connections case:', false, error);
    }
  }

  private async handleMessageError<T>(type: string, data: T, error: unknown): Promise<void> {
    try {
      await this.queueMessage(type, data);
      log.error('Message queued due to error:', false, { type, error });
    } catch (queueError) {
      log.error('Failed to queue message after error:', false, queueError);
    }
  }

  private async queueMessage<T>(type: string, data: T): Promise<void> {
    const queuedMessage: QueuedMessage<T> = {
      type,
      data,
      timestamp: Date.now()
    };

    this.messageQueue.push(queuedMessage);

    if (this.messageQueue.length > this.MAX_QUEUE_SIZE) {
      this.messageQueue.shift();
    }

    await this.persistQueue();
  }

  private async persistQueue(): Promise<void> {
    if (!browser_ext) return;

    try {
        await browser_ext.storage.local.set({
          [`${this.STORAGE_PREFIX}queue`]: this.messageQueue
        });
    } catch (error) {
      log.error('Failed to persist message queue:', false, error);
    }
  }

  private async restoreQueuedMessages(): Promise<void> {
    if (!browser_ext) return;

    try {
        const result = await browser_ext.storage.local.get(`${this.STORAGE_PREFIX}queue`);
        const storedQueue = result[`${this.STORAGE_PREFIX}queue`];

        // Type guard to ensure array of QueuedMessage
        if (Array.isArray(storedQueue)) {
          this.messageQueue = storedQueue.filter((message): message is QueuedMessage => {
            return (
              typeof message === 'object' &&
              message !== null &&
              'type' in message &&
              'data' in message &&
              'timestamp' in message &&
              typeof message.type === 'string' &&
              typeof message.timestamp === 'number'
            );
          });

          // log.debug('Restored queued messages:', false, { count: this.messageQueue.length });
        } else {
          this.messageQueue = [];
          log.debug('No valid queued messages found in storage');
        }
    } catch (error) {
      log.error('Failed to restore queued messages:', false, error);
      this.messageQueue = []; // Ensure valid state on error
    }
  }

  private async saveToStorage<T>(type: string, data: T): Promise<void> {
    if (!browser_ext) return;

    try {
        await browser_ext.storage.local.set({
          [`${this.STORAGE_PREFIX}${type}`]: {
            data,
            timestamp: Date.now()
          }
        });
    } catch (error) {
      log.error('Failed to save to storage:', false, error);
    }
  }

  public async processQueuedMessages(): Promise<void> {
    if (!this.hasConnections()) {
      // log.debug('No connections available to process queue');
      return;
    }

    try {
      const messages = [...this.messageQueue];
      this.messageQueue = [];

      for (const message of messages) {
        await this.sendMessage(message.type, message.data);
      }

      await this.persistQueue();
      // log.debug('Processed queued messages:', false, { count: messages.length });
    } catch (error) {
      log.error('Failed to process queued messages:', false, error);
    }
  }

  public async clearQueue(): Promise<void> {
    try {
      this.messageQueue = [];
      await this.persistQueue();
      // log.debug('Message queue cleared');
    } catch (error) {
      log.error('Failed to clear message queue:', false, error);
    }
  }

  public getQueueSize(): number {
    return this.messageQueue.length;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const backgroundManager = BackgroundManager.getInstance();


// Example how to use:

// +layout.ts
// import { initializeUIConnection } from '$lib/stores/connectionStore';

// export async function load() {
//   try {
//     await initializeUIConnection();
//   } catch (error) {
//     log.error('Failed to initialize UI connection:', false, error);
//   }
// }


// +background.ts
// browser_ext.tabs.onActivated.addListener(async (activeInfo) => {
//   try {
//     const tab = await browser_ext.tabs.get(activeInfo.tabId);
//     const activeTab = {
//       tabId: activeInfo.tabId,
//       url: tab.url
//     };

//     await backgroundManager.sendMessage('ACTIVE_TAB_CHANGED', activeTab);
//     log.debug('Active tab change processed:', false, activeTab);
//   } catch (error) {
//     log.error('Failed to handle tab activation:', false, error);
//   }
// });

