/**
 * Advanced Message Bus Implementation
 * Central hub for all messaging with routing, validation, and streaming
 */
import { EventEmitter } from 'eventemitter3';
import type { IAdvancedMessageBus, IMessageChannel, IMessageStream, IMessageRouter, IMessageValidator, MessageEnvelope, MessageMiddleware, MessageMetrics } from '../interfaces/messaging-enhanced.interface';
import type { MessageHandler, UnsubscribeFn } from '../interfaces/messaging.interface';
/**
 * Message bus implementation
 */
export declare class MessageBus extends EventEmitter implements IAdvancedMessageBus {
    private router;
    private validator?;
    private channels;
    private streams;
    private metrics;
    private messageHandlers;
    private messageIdCounter;
    private pendingRequests;
    constructor();
    /**
     * Get or create a message channel
     */
    channel(id: string): IMessageChannel;
    /**
     * Create a message stream
     */
    createStream<T>(id?: string): IMessageStream<T>;
    /**
     * Get existing stream
     */
    getStream<T>(id: string): IMessageStream<T> | undefined;
    /**
     * Request-response with timeout
     */
    request<TRequest, TResponse>(channel: string, data: TRequest, timeout?: number): Promise<TResponse>;
    /**
     * Send a message
     */
    send<T>(channel: string, data: T, envelope?: Partial<MessageEnvelope>): Promise<void>;
    /**
     * Subscribe to messages (renamed to avoid EventEmitter conflict)
     */
    onMessage(event: string, handler: MessageHandler): UnsubscribeFn;
    /**
     * Emit a message (renamed to avoid EventEmitter conflict)
     */
    emitMessage(event: string, data: any): void;
    /**
     * Get message router
     */
    getRouter(): IMessageRouter;
    /**
     * Get message validator
     */
    getValidator(): IMessageValidator;
    /**
     * Set message validator
     */
    setValidator(validator: IMessageValidator): void;
    /**
     * Add global middleware
     */
    use(middleware: MessageMiddleware): void;
    /**
     * Get metrics
     */
    getMetrics(): MessageMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    /**
     * Close a channel
     */
    closeChannel(id: string): void;
    /**
     * Emit to local listeners
     */
    private emitLocal;
    /**
     * Generate message ID
     */
    private generateMessageId;
    /**
     * Setup default routes
     */
    private setupDefaultRoutes;
    /**
     * Destroy the message bus
     */
    destroy(): void;
}
/**
 * Create a new message bus
 */
export declare function createMessageBus(): MessageBus;
/**
 * Global message bus instance
 */
export declare const globalMessageBus: MessageBus;
//# sourceMappingURL=MessageBus.d.ts.map