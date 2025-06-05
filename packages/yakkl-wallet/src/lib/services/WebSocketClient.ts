import { log } from '$lib/common/logger-wrapper';
import { writable, type Writable, get } from 'svelte/store';

// NOTE: This must only go in the background service, not the wallet client!

export type MessageType = 'rss_feed' | 'notification' | 'price_update' | 'system_status';

const WS_URL = 'ws://localhost:8787/ws';

interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
}

interface WebSocketState {
  connected: boolean;
  authenticated: boolean;
  subscriptions: Set<MessageType>;
}

export class WebSocketClient {
  private static instance: WebSocketClient;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<MessageType, ((payload: any) => void)[]> = new Map();
  private state: Writable<WebSocketState> = writable({
    connected: false,
    authenticated: false,
    subscriptions: new Set()
  });

  private constructor() {}

  static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_URL}?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      log.debug('WebSocket connected');
      this.reconnectAttempts = 0;
      this.state.update(s => ({ ...s, connected: true }));

      // Resubscribe to channels
      const { subscriptions } = get(this.state);
      if (subscriptions.size > 0) {
        this.subscribe(Array.from(subscriptions));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (message.type === 'system_status') {
          this.state.update(s => ({
            ...s,
            authenticated: message.payload.authenticated
          }));
        }

        // Call registered handlers
        const handlers = this.messageHandlers.get(message.type) || [];
        handlers.forEach(handler => handler(message.payload));
      } catch (error) {
        log.warn('Failed to parse message:', false, error);
      }
    };

    this.ws.onclose = (event) => {
      log.debug('WebSocket closed:', false, event.code, event.reason);
      this.state.update(s => ({ ...s, connected: false }));

      if (event.code === 1008) {
        // Authentication failed, try to refresh token
        this.refreshToken();
      } else {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      log.warn('WebSocket error:', false, error);
    };
  }

  private async refreshToken() {
    try {
      // Implement your token refresh logic here
      const newToken = await this.getNewToken();
      this.connect(newToken);
    } catch (error) {
      log.warn('Failed to refresh token:', false, error);
      this.reconnect();
    }
  }

  private async getNewToken(): Promise<string> {
    // Implement your token refresh API call here
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data.token;
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.warn('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      log.debug(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect(this.getCurrentToken());
    }, delay);
  }

  private getCurrentToken(): string {
    // Implement your token retrieval logic here
    return localStorage.getItem('token') || '';
  }

  subscribe(channels: MessageType[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channels
    }));

    this.state.update(s => ({
      ...s,
      subscriptions: new Set([...s.subscriptions, ...channels])
    }));
  }

  unsubscribe(channels: MessageType[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      channels
    }));

    this.state.update(s => {
      const newSubscriptions = new Set(s.subscriptions);
      channels.forEach(channel => newSubscriptions.delete(channel));
      return { ...s, subscriptions: newSubscriptions };
    });
  }

  onMessage(type: MessageType, handler: (payload: any) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  offMessage(type: MessageType, handler: (payload: any) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.messageHandlers.set(type, handlers);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.update(s => ({ ...s, connected: false, authenticated: false }));
  }

  getState() {
    return this.state;
  }
}
