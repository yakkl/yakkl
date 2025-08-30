/**
 * Browser Messaging Bridge
 * Implements IMessageBus interface using browser.runtime messaging APIs
 */

import browser from 'webextension-polyfill';
import type { 
  IMessageBus, 
  Message, 
  MessageHandler, 
  MessageOptions, 
  MessageSender, 
  UnsubscribeFn 
} from '@yakkl/core';

export class BrowserMessagingBridge implements IMessageBus {
  private listeners = new Map<string, Set<MessageHandler>>();
  private messageIdCounter = 0;
  private pendingResponses = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();
  
  constructor() {
    // Set up global message listener
    browser.runtime.onMessage.addListener(this.handleIncomingMessage.bind(this));
  }
  
  /**
   * Send a message and wait for response
   */
  async send<TData = any, TResponse = any>(
    channel: string,
    data: TData,
    options: MessageOptions = {}
  ): Promise<TResponse> {
    const messageId = this.generateMessageId();
    const timeout = options.timeout ?? 30000; // Default 30 second timeout
    
    const message: Message<TData> = {
      id: messageId,
      channel,
      data,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new Error(`Message timeout for channel: ${channel}`));
      }, timeout);
      
      // Store pending response handler
      this.pendingResponses.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });
      
      // Send the message
      this.sendMessage(message, options).catch(error => {
        this.pendingResponses.delete(messageId);
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }
  
  /**
   * Send a message without waiting for response
   */
  post<TData = any>(
    channel: string,
    data: TData,
    options: MessageOptions = {}
  ): void {
    const message: Message<TData> = {
      channel,
      data,
      timestamp: Date.now()
    };
    
    this.sendMessage(message, options).catch(error => {
      console.error('[BrowserMessaging] Failed to post message:', error);
    });
  }
  
  /**
   * Listen for messages on a channel
   */
  listen<TData = any>(
    channel: string,
    handler: MessageHandler<TData>
  ): UnsubscribeFn {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    
    this.listeners.get(channel)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.listeners.delete(channel);
        }
      }
    };
  }
  
  /**
   * Listen for one message then unsubscribe
   */
  once<TData = any>(
    channel: string,
    handler: MessageHandler<TData>
  ): UnsubscribeFn {
    const wrappedHandler: MessageHandler<TData> = async (message, sender) => {
      unsubscribe();
      return handler(message, sender);
    };
    
    const unsubscribe = this.listen(channel, wrappedHandler);
    return unsubscribe;
  }
  
  /**
   * Remove all listeners for a channel
   */
  removeAllListeners(channel?: string): void {
    if (channel) {
      this.listeners.delete(channel);
    } else {
      this.listeners.clear();
    }
  }
  
  /**
   * Check if connected (always true for browser extension)
   */
  isConnected(): boolean {
    return true;
  }
  
  // Private methods
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }
  
  private async sendMessage(
    message: Message,
    options: MessageOptions
  ): Promise<void> {
    try {
      if (options.target) {
        // Send to specific tab
        if (typeof options.target === 'number') {
          await browser.tabs.sendMessage(options.target, message);
        }
      } else if (options.broadcast) {
        // Broadcast to all tabs
        const tabs = await browser.tabs.query({});
        await Promise.all(
          tabs.map(tab => {
            if (tab.id) {
              return browser.tabs.sendMessage(tab.id, message).catch(() => {
                // Ignore errors for tabs that can't receive messages
              });
            }
          })
        );
      } else {
        // Send via runtime (background/popup/content script communication)
        await browser.runtime.sendMessage(message);
      }
    } catch (error) {
      // Also try sending to any connected native app
      if (browser.runtime.sendNativeMessage) {
        try {
          await browser.runtime.sendMessage(message);
        } catch {
          throw error; // Re-throw original error
        }
      } else {
        throw error;
      }
    }
  }
  
  private async handleIncomingMessage(
    message: any,
    sender: browser.Runtime.MessageSender
  ): Promise<any> {
    // Check if it's a structured message
    if (!message || typeof message !== 'object' || !message.channel) {
      return;
    }
    
    const typedMessage = message as Message;
    const messageSender: MessageSender = {
      tabId: sender.tab?.id,
      frameId: sender.frameId,
      url: sender.url,
      id: sender.id
    };
    
    // Check if this is a response to a pending request
    if (typedMessage.id && this.pendingResponses.has(typedMessage.id)) {
      const pending = this.pendingResponses.get(typedMessage.id)!;
      this.pendingResponses.delete(typedMessage.id);
      clearTimeout(pending.timeout);
      
      if (typedMessage.error) {
        pending.reject(new Error(typedMessage.error as string));
      } else {
        pending.resolve(typedMessage.data);
      }
      return;
    }
    
    // Handle as incoming message for listeners
    const handlers = this.listeners.get(typedMessage.channel);
    if (handlers && handlers.size > 0) {
      const responses = await Promise.all(
        Array.from(handlers).map(handler => 
          handler(typedMessage, messageSender)
        )
      );
      
      // If message has an ID, it expects a response
      if (typedMessage.id) {
        // Return the first non-undefined response
        const response = responses.find(r => r !== undefined);
        if (response !== undefined) {
          return {
            id: typedMessage.id,
            channel: typedMessage.channel,
            data: response,
            timestamp: Date.now()
          };
        }
      }
    }
  }
}

/**
 * Factory function to create messaging instance
 */
export function createBrowserMessaging(): IMessageBus {
  return new BrowserMessagingBridge();
}

/**
 * Singleton instance for the application
 */
let messagingInstance: BrowserMessagingBridge | null = null;

export function getBrowserMessaging(): IMessageBus {
  if (!messagingInstance) {
    messagingInstance = new BrowserMessagingBridge();
  }
  return messagingInstance;
}