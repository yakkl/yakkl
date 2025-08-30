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
export type MessageContext = 'background' | 'popup' | 'content-script' | 'options' | 'devtools' | 'sidebar';
export interface MessageResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export type MessageHandler<T = any, R = any> = (message: ExtensionMessage<T>, sender: Runtime.MessageSender) => Promise<MessageResponse<R>> | MessageResponse<R>;
/**
 * Base message handler for browser extensions
 */
export declare class ExtensionMessageHandler {
    private handlers;
    private context;
    constructor(context: MessageContext);
    /**
     * Register a message handler
     */
    register<T = any, R = any>(type: string, handler: MessageHandler<T, R>): void;
    /**
     * Unregister a message handler
     */
    unregister(type: string): void;
    /**
     * Send a message to another context
     */
    send<T = any, R = any>(type: string, payload?: T, tabId?: number): Promise<MessageResponse<R>>;
    /**
     * Broadcast a message to all tabs
     */
    broadcast<T = any>(type: string, payload?: T): Promise<void>;
    /**
     * Setup message listener
     */
    private setupListener;
    /**
     * Validate message structure
     */
    private isValidMessage;
    /**
     * Generate unique message ID
     */
    private generateId;
    /**
     * Get browser API (dynamic import for environment compatibility)
     */
    private getBrowser;
}
/**
 * Create a typed message handler
 */
export declare function createMessageHandler<T = any, R = any>(handler: (payload: T, sender: Runtime.MessageSender) => Promise<R> | R): MessageHandler<T, R>;
