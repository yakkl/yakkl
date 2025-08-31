/**
 * Enhanced Messaging Interfaces
 * Comprehensive messaging system with routing, validation, and middleware
 */
import type { Message, MessageHandler, UnsubscribeFn } from './messaging.interface';
/**
 * Message types enum
 */
export declare enum MessageType {
    REQUEST = "request",
    RESPONSE = "response",
    ERROR = "error",
    EVENT = "event",
    BROADCAST = "broadcast",
    PING = "ping",
    PONG = "pong",
    SUBSCRIBE = "subscribe",
    UNSUBSCRIBE = "unsubscribe",
    STREAM_START = "stream_start",
    STREAM_DATA = "stream_data",
    STREAM_END = "stream_end",
    STREAM_ERROR = "stream_error"
}
/**
 * Message envelope with metadata
 */
export interface MessageEnvelope<T = any> extends Message<T> {
    /**
     * Message type
     */
    type: MessageType;
    /**
     * Correlation ID for request/response matching
     */
    correlationId?: string;
    /**
     * Reply-to channel for responses
     */
    replyTo?: string;
    /**
     * Message headers for metadata
     */
    headers?: Record<string, any>;
    /**
     * Message expiry time
     */
    expiresAt?: number;
    /**
     * Retry count
     */
    retryCount?: number;
    /**
     * Message priority
     */
    priority?: number;
}
/**
 * Message router interface
 */
export interface IMessageRouter {
    /**
     * Route a message to appropriate handler
     */
    route(message: MessageEnvelope): Promise<void>;
    /**
     * Register a route handler
     */
    registerRoute(pattern: string | RegExp, handler: MessageHandler): void;
    /**
     * Unregister a route
     */
    unregisterRoute(pattern: string | RegExp): void;
    /**
     * Add middleware
     */
    use(middleware: MessageMiddleware): void;
    /**
     * Get all registered routes
     */
    getRoutes(): Map<string | RegExp, MessageHandler>;
}
/**
 * Message middleware
 */
export interface MessageMiddleware {
    /**
     * Middleware name
     */
    name: string;
    /**
     * Process message before routing
     */
    before?(message: MessageEnvelope, next: () => Promise<void>): Promise<void>;
    /**
     * Process message after routing
     */
    after?(message: MessageEnvelope, response: any, next: () => Promise<void>): Promise<void>;
    /**
     * Handle errors
     */
    error?(error: Error, message: MessageEnvelope, next: () => Promise<void>): Promise<void>;
}
/**
 * Message validator interface
 */
export interface IMessageValidator {
    /**
     * Validate a message
     */
    validate(message: MessageEnvelope): MessageValidationResult;
    /**
     * Register a validation schema
     */
    registerSchema(channel: string, schema: MessageSchema): void;
    /**
     * Get schema for channel
     */
    getSchema(channel: string): MessageSchema | undefined;
}
/**
 * Message schema for validation
 */
export interface MessageSchema {
    /**
     * Channel pattern
     */
    channel: string | RegExp;
    /**
     * Data schema
     */
    dataSchema?: {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
    };
    /**
     * Custom validation function
     */
    validate?(message: MessageEnvelope): MessageValidationResult;
    /**
     * Allowed senders
     */
    allowedSenders?: string[];
    /**
     * Required headers
     */
    requiredHeaders?: string[];
    /**
     * Max message size in bytes
     */
    maxSize?: number;
}
/**
 * Message validation result
 */
export interface MessageValidationResult {
    valid: boolean;
    errors?: ValidationError[];
    warnings?: string[];
}
/**
 * Validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}
/**
 * Message channel interface for bidirectional communication
 */
export interface IMessageChannel {
    /**
     * Channel ID
     */
    id: string;
    /**
     * Send message through channel
     */
    send<T>(data: T): Promise<void>;
    /**
     * Receive messages from channel
     */
    onMessage(handler: MessageHandler): UnsubscribeFn;
    /**
     * Close the channel
     */
    close(): void;
    /**
     * Check if channel is open
     */
    isOpen(): boolean;
}
/**
 * Message stream interface for streaming data
 */
export interface IMessageStream<T = any> {
    /**
     * Stream ID
     */
    id: string;
    /**
     * Write data to stream
     */
    write(data: T): Promise<void>;
    /**
     * End the stream
     */
    end(): Promise<void>;
    /**
     * Abort the stream with error
     */
    abort(error?: Error): void;
    /**
     * Subscribe to stream data
     */
    subscribe(observer: StreamObserver<T>): UnsubscribeFn;
    /**
     * Get stream state
     */
    getState(): StreamState;
}
/**
 * Stream observer
 */
export interface StreamObserver<T = any> {
    /**
     * Handle stream data
     */
    next(data: T): void;
    /**
     * Handle stream error
     */
    error?(error: Error): void;
    /**
     * Handle stream completion
     */
    complete?(): void;
}
/**
 * Stream state
 */
export declare enum StreamState {
    IDLE = "idle",
    ACTIVE = "active",
    PAUSED = "paused",
    COMPLETED = "completed",
    ABORTED = "aborted"
}
/**
 * Message bus with advanced features
 */
export interface IAdvancedMessageBus {
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
     * Subscribe to messages
     */
    onMessage(event: string, handler: MessageHandler): UnsubscribeFn;
    /**
     * Emit a message event
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
     * Add global middleware
     */
    use(middleware: MessageMiddleware): void;
    /**
     * Get metrics
     */
    getMetrics(): MessageMetrics;
}
/**
 * Message metrics
 */
export interface MessageMetrics {
    messagesSent: number;
    messagesReceived: number;
    messagesDropped: number;
    averageLatency: number;
    activeChannels: number;
    activeStreams: number;
    errors: number;
    lastActivity: number;
}
/**
 * Message queue interface for queuing messages
 */
export interface IMessageQueue<T = any> {
    /**
     * Queue name
     */
    name: string;
    /**
     * Enqueue a message
     */
    enqueue(message: T, priority?: number): Promise<void>;
    /**
     * Dequeue a message
     */
    dequeue(): Promise<T | undefined>;
    /**
     * Peek at next message without removing
     */
    peek(): Promise<T | undefined>;
    /**
     * Get queue size
     */
    size(): number;
    /**
     * Clear the queue
     */
    clear(): void;
    /**
     * Process messages with handler
     */
    process(handler: (message: T) => Promise<void>, options?: QueueProcessOptions): void;
    /**
     * Stop processing
     */
    stopProcessing(): void;
}
/**
 * Queue processing options
 */
export interface QueueProcessOptions {
    /**
     * Max concurrent processing
     */
    concurrency?: number;
    /**
     * Retry failed messages
     */
    retryOnError?: boolean;
    /**
     * Max retries
     */
    maxRetries?: number;
    /**
     * Retry delay in ms
     */
    retryDelay?: number;
    /**
     * Dead letter queue for failed messages
     */
    deadLetterQueue?: IMessageQueue;
}
/**
 * Message transport interface for different transport mechanisms
 */
export interface IMessageTransport {
    /**
     * Transport name
     */
    name: string;
    /**
     * Connect to transport
     */
    connect(options?: any): Promise<void>;
    /**
     * Disconnect from transport
     */
    disconnect(): Promise<void>;
    /**
     * Send message via transport
     */
    send(message: MessageEnvelope): Promise<void>;
    /**
     * Receive messages from transport
     */
    onMessage(handler: (message: MessageEnvelope) => void): UnsubscribeFn;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get transport capabilities
     */
    getCapabilities(): TransportCapabilities;
}
/**
 * Transport capabilities
 */
export interface TransportCapabilities {
    reliable: boolean;
    ordered: boolean;
    bidirectional: boolean;
    streaming: boolean;
    maxMessageSize?: number;
    supportedTypes: MessageType[];
}
//# sourceMappingURL=messaging-enhanced.interface.d.ts.map