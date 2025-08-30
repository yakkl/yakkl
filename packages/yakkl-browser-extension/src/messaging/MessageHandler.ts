/**
 * Browser Extension Message Handler
 * Manages communication between different extension contexts
 */

import type { Runtime } from 'webextension-polyfill';

export interface ExtensionMessage<T = any> {
  id: string;
  type: string;
  payload?: T;
  origin?: string;
  timestamp: number;
  context?: MessageContext;
}

export type MessageContext = 
  | 'background'
  | 'popup'
  | 'content-script'
  | 'options'
  | 'devtools'
  | 'sidebar';

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type MessageHandler<T = any, R = any> = (
  message: ExtensionMessage<T>,
  sender: Runtime.MessageSender
) => Promise<MessageResponse<R>> | MessageResponse<R>;

/**
 * Base message handler for browser extensions
 */
export class ExtensionMessageHandler {
  private handlers = new Map<string, MessageHandler>();
  private context: MessageContext;

  constructor(context: MessageContext) {
    this.context = context;
    this.setupListener();
  }

  /**
   * Register a message handler
   */
  register<T = any, R = any>(
    type: string,
    handler: MessageHandler<T, R>
  ): void {
    this.handlers.set(type, handler);
  }

  /**
   * Unregister a message handler
   */
  unregister(type: string): void {
    this.handlers.delete(type);
  }

  /**
   * Send a message to another context
   */
  async send<T = any, R = any>(
    type: string,
    payload?: T,
    tabId?: number
  ): Promise<MessageResponse<R>> {
    const message: ExtensionMessage<T> = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
      context: this.context
    };

    try {
      // Dynamic import to handle browser environment
      const browser = await this.getBrowser();
      
      if (tabId !== undefined) {
        // Send to specific tab
        return await browser.tabs.sendMessage(tabId, message);
      } else {
        // Send to background/extension context
        return await browser.runtime.sendMessage(message);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Broadcast a message to all tabs
   */
  async broadcast<T = any>(type: string, payload?: T): Promise<void> {
    try {
      const browser = await this.getBrowser();
      const tabs = await browser.tabs.query({});
      
      const message: ExtensionMessage<T> = {
        id: this.generateId(),
        type,
        payload,
        timestamp: Date.now(),
        context: this.context
      };

      await Promise.all(
        tabs.map(tab => {
          if (tab.id) {
            return browser.tabs.sendMessage(tab.id, message).catch(() => {
              // Ignore errors for tabs that can't receive messages
            });
          }
        })
      );
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }

  /**
   * Setup message listener
   */
  private setupListener(): void {
    this.getBrowser().then(browser => {
      browser.runtime.onMessage.addListener(
        (message: any, sender: Runtime.MessageSender) => {
          if (!this.isValidMessage(message)) {
            return;
          }

          const handler = this.handlers.get(message.type);
          if (!handler) {
            return;
          }

          const response = handler(message, sender);
          
          // Handle both sync and async responses
          if (response instanceof Promise) {
            return response;
          } else {
            return Promise.resolve(response);
          }
        }
      );
    });
  }

  /**
   * Validate message structure
   */
  private isValidMessage(message: any): message is ExtensionMessage {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'number'
    );
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get browser API (dynamic import for environment compatibility)
   */
  private async getBrowser(): Promise<typeof import('webextension-polyfill')> {
    if (typeof browser !== 'undefined') {
      return browser as any;
    }
    // Dynamic import for non-extension environments
    return await import('webextension-polyfill');
  }
}

/**
 * Create a typed message handler
 */
export function createMessageHandler<T = any, R = any>(
  handler: (payload: T, sender: Runtime.MessageSender) => Promise<R> | R
): MessageHandler<T, R> {
  return async (message, sender) => {
    try {
      const result = await handler(message.payload as T, sender);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Handler error'
      };
    }
  };
}