export interface MessageRequest {
  type: string;
  payload?: any;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type MessageHandler = (request: MessageRequest) => Promise<MessageResponse>;

export class BackgroundAPI {
  private port: chrome.runtime.Port | null = null;
  private messageHandlers = new Map<string, ((response: MessageResponse) => void)[]>();
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: MessageResponse) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    // Only connect if in browser environment
    if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && chrome?.runtime?.connect) {
      this.connect();
    }
  }

  private connect(): void {
    try {
      if (typeof chrome === 'undefined' || !chrome?.runtime?.connect) {
        return;
      }
      this.port = chrome.runtime.connect({ name: 'yakkl-client' });
      
      this.port.onMessage.addListener((message) => {
        if (message.requestId && this.pendingRequests.has(message.requestId)) {
          const { resolve } = this.pendingRequests.get(message.requestId)!;
          this.pendingRequests.delete(message.requestId);
          resolve(message.response);
        } else if (message.type) {
          this.notifyHandlers(message.type, message.response);
        }
      });

      this.port.onDisconnect.addListener(() => {
        this.port = null;
        setTimeout(() => this.connect(), 1000);
      });
    } catch (error) {
      console.error('Failed to connect to background:', error);
      setTimeout(() => this.connect(), 1000);
    }
  }

  private notifyHandlers(type: string, response: MessageResponse): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach(handler => handler(response));
  }

  async sendMessage<T = any>(type: string, payload?: any): Promise<MessageResponse<T>> {
    return new Promise((resolve, reject) => {
      // If not in browser environment, return a mock response
      if (typeof chrome === 'undefined' || !chrome?.runtime) {
        resolve({ success: false, error: 'Not in browser environment' });
        return;
      }
      
      if (!this.port) {
        reject(new Error('Not connected to background'));
        return;
      }

      const requestId = ++this.requestId;
      this.pendingRequests.set(requestId, { resolve, reject });

      this.port.postMessage({
        requestId,
        type,
        payload
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  onMessage(type: string, handler: (response: MessageResponse) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    
    this.messageHandlers.get(type)!.push(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  disconnect(): void {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    this.pendingRequests.clear();
    this.messageHandlers.clear();
  }
}

export const backgroundAPI = new BackgroundAPI();