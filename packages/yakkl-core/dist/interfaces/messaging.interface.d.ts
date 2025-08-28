/**
 * Messaging Interface
 * Platform-agnostic messaging abstraction
 * Can be implemented with browser.runtime, MessageChannel, WebSocket, etc.
 */
export interface IMessageBus {
    /**
     * Send a message and optionally wait for a response
     */
    send<TData = any, TResponse = any>(channel: string, data: TData, options?: MessageOptions): Promise<TResponse>;
    /**
     * Send a message without waiting for response
     */
    post<TData = any>(channel: string, data: TData, options?: MessageOptions): void;
    /**
     * Listen for messages on a channel
     * Returns unsubscribe function
     */
    listen<TData = any>(channel: string, handler: MessageHandler<TData>): UnsubscribeFn;
    /**
     * Listen for messages once
     */
    once<TData = any>(channel: string, handler: MessageHandler<TData>): UnsubscribeFn;
    /**
     * Remove all listeners for a channel
     */
    removeAllListeners(channel?: string): void;
    /**
     * Connect to message bus (if needed)
     */
    connect?(): Promise<void>;
    /**
     * Disconnect from message bus
     */
    disconnect?(): Promise<void>;
    /**
     * Check if connected
     */
    isConnected?(): boolean;
}
export interface MessageOptions {
    /**
     * Target for the message (tab ID, frame ID, etc.)
     */
    target?: string | number;
    /**
     * Timeout for response in milliseconds
     */
    timeout?: number;
    /**
     * Priority level
     */
    priority?: 'low' | 'normal' | 'high';
    /**
     * Whether to broadcast to all listeners
     */
    broadcast?: boolean;
}
export interface Message<T = any> {
    /**
     * Message identifier
     */
    id?: string;
    /**
     * Channel/type of message
     */
    channel: string;
    /**
     * Message payload
     */
    data: T;
    /**
     * Sender information
     */
    sender?: MessageSender;
    /**
     * Timestamp
     */
    timestamp?: number;
    /**
     * Error if any
     */
    error?: Error | string;
}
export interface MessageSender {
    /**
     * Tab ID if from tab
     */
    tabId?: number;
    /**
     * Frame ID if from frame
     */
    frameId?: number;
    /**
     * URL of sender
     */
    url?: string;
    /**
     * Origin of sender
     */
    origin?: string;
    /**
     * Custom identifier
     */
    id?: string;
}
export type MessageHandler<T = any> = (message: Message<T>, sender?: MessageSender) => void | Promise<any>;
export type UnsubscribeFn = () => void;
//# sourceMappingURL=messaging.interface.d.ts.map