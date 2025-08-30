/**
 * Advanced Message Bus Implementation
 * Central hub for all messaging with routing, validation, and streaming
 */

import { EventEmitter } from 'eventemitter3';
import { MessageRouter } from './MessageRouter';
import type {
  IAdvancedMessageBus,
  IMessageChannel,
  IMessageStream,
  IMessageRouter,
  IMessageValidator,
  MessageEnvelope,
  MessageMiddleware,
  MessageMetrics,
  StreamObserver
} from '../interfaces/messaging-enhanced.interface';
import { MessageType, StreamState } from '../interfaces/messaging-enhanced.interface';
import type { MessageHandler, UnsubscribeFn } from '../interfaces/messaging.interface';

/**
 * Message channel implementation
 */
class MessageChannel implements IMessageChannel {
  constructor(
    public readonly id: string,
    private bus: MessageBus
  ) {}

  private _isOpen = true;

  async send<T>(data: T): Promise<void> {
    if (!this._isOpen) {
      throw new Error(`Channel ${this.id} is closed`);
    }
    await this.bus.send(this.id, data);
  }

  onMessage(handler: MessageHandler): UnsubscribeFn {
    return this.bus.onMessage(this.id, handler);
  }

  close(): void {
    this._isOpen = false;
    this.bus.closeChannel(this.id);
  }

  isOpen(): boolean {
    return this._isOpen;
  }
}

/**
 * Message stream implementation
 */
class MessageStream<T = any> implements IMessageStream<T> {
  private observers: Set<StreamObserver<T>> = new Set();
  private state: StreamState = StreamState.IDLE;
  private buffer: T[] = [];
  private error?: Error;

  constructor(
    public readonly id: string,
    private bus: MessageBus
  ) {}

  async write(data: T): Promise<void> {
    if (this.state !== StreamState.ACTIVE && this.state !== StreamState.IDLE) {
      throw new Error(`Stream ${this.id} is not active`);
    }

    this.state = StreamState.ACTIVE;
    this.buffer.push(data);

    // Notify observers
    for (const observer of this.observers) {
      try {
        observer.next(data);
      } catch (error) {
        console.error('Stream observer error:', error);
      }
    }

    // Send via bus
    await this.bus.send(`stream:${this.id}`, {
      type: 'data',
      data
    });
  }

  async end(): Promise<void> {
    if (this.state === StreamState.COMPLETED || this.state === StreamState.ABORTED) {
      return;
    }

    this.state = StreamState.COMPLETED;

    // Notify observers
    for (const observer of this.observers) {
      try {
        observer.complete?.();
      } catch (error) {
        console.error('Stream observer error:', error);
      }
    }

    // Send end signal
    await this.bus.send(`stream:${this.id}`, {
      type: 'end'
    });
  }

  abort(error?: Error): void {
    if (this.state === StreamState.COMPLETED || this.state === StreamState.ABORTED) {
      return;
    }

    this.state = StreamState.ABORTED;
    this.error = error;

    // Notify observers
    for (const observer of this.observers) {
      try {
        observer.error?.(error || new Error('Stream aborted'));
      } catch (err) {
        console.error('Stream observer error:', err);
      }
    }

    // Send error signal
    this.bus.send(`stream:${this.id}`, {
      type: 'error',
      error: error?.message
    });
  }

  subscribe(observer: StreamObserver<T>): UnsubscribeFn {
    this.observers.add(observer);
    
    // Send buffered data to new observer
    for (const data of this.buffer) {
      try {
        observer.next(data);
      } catch (error) {
        console.error('Stream observer error:', error);
      }
    }

    // If stream is completed/aborted, notify immediately
    if (this.state === StreamState.COMPLETED) {
      observer.complete?.();
    } else if (this.state === StreamState.ABORTED) {
      observer.error?.(this.error || new Error('Stream aborted'));
    }

    return () => {
      this.observers.delete(observer);
    };
  }

  getState(): StreamState {
    return this.state;
  }
}

/**
 * Message bus implementation
 */
export class MessageBus extends EventEmitter implements IAdvancedMessageBus {
  private router: MessageRouter;
  private validator?: IMessageValidator;
  private channels: Map<string, MessageChannel> = new Map();
  private streams: Map<string, MessageStream> = new Map();
  private metrics: MessageMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    messagesDropped: 0,
    averageLatency: 0,
    activeChannels: 0,
    activeStreams: 0,
    errors: 0,
    lastActivity: Date.now()
  };
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private messageIdCounter = 0;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor() {
    super();
    this.router = new MessageRouter();
    this.setupDefaultRoutes();
  }

  /**
   * Get or create a message channel
   */
  channel(id: string): IMessageChannel {
    if (!this.channels.has(id)) {
      const channel = new MessageChannel(id, this);
      this.channels.set(id, channel);
      this.metrics.activeChannels++;
    }
    return this.channels.get(id)!;
  }

  /**
   * Create a message stream
   */
  createStream<T>(id?: string): IMessageStream<T> {
    const streamId = id || `stream-${Date.now()}-${Math.random()}`;
    const stream = new MessageStream<T>(streamId, this);
    this.streams.set(streamId, stream);
    this.metrics.activeStreams++;
    return stream;
  }

  /**
   * Get existing stream
   */
  getStream<T>(id: string): IMessageStream<T> | undefined {
    return this.streams.get(id) as IMessageStream<T> | undefined;
  }

  /**
   * Request-response with timeout
   */
  async request<TRequest, TResponse>(
    channel: string,
    data: TRequest,
    timeout: number = 5000
  ): Promise<TResponse> {
    const messageId = this.generateMessageId();
    const correlationId = `req-${messageId}`;

    return new Promise<TResponse>((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout for channel: ${channel}`));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      // Send request
      const message: MessageEnvelope<TRequest> = {
        id: messageId,
        channel,
        data,
        type: MessageType.REQUEST,
        correlationId,
        replyTo: `response:${correlationId}`,
        timestamp: Date.now()
      };

      this.send(channel, data, message).catch(reject);
    });
  }

  /**
   * Send a message
   */
  async send<T>(channel: string, data: T, envelope?: Partial<MessageEnvelope>): Promise<void> {
    const message: MessageEnvelope<T> = {
      id: envelope?.id || this.generateMessageId(),
      channel,
      data,
      type: envelope?.type || MessageType.EVENT,
      timestamp: Date.now(),
      ...envelope
    };

    this.metrics.messagesSent++;
    this.metrics.lastActivity = Date.now();

    // Validate if validator is set
    if (this.validator) {
      const validation = this.validator.validate(message);
      if (!validation.valid) {
        this.metrics.messagesDropped++;
        throw new Error(`Message validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }
    }

    // Route the message
    try {
      await this.router.route(message);
      
      // Emit to local listeners
      this.emitLocal(channel, message);
      
      // Handle response for request-response pattern
      if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
        const pending = this.pendingRequests.get(message.correlationId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(data);
          this.pendingRequests.delete(message.correlationId);
        }
      }
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Subscribe to messages (renamed to avoid EventEmitter conflict)
   */
  onMessage(event: string, handler: MessageHandler): UnsubscribeFn {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    
    const handlers = this.messageHandlers.get(event)!;
    handlers.add(handler);
    
    // Register with router
    this.router.registerRoute(event, handler);
    
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(event);
        this.router.unregisterRoute(event);
      }
    };
  }

  /**
   * Emit a message (renamed to avoid EventEmitter conflict)
   */
  emitMessage(event: string, data: any): void {
    this.send(event, data, { type: MessageType.EVENT });
  }

  /**
   * Get message router
   */
  getRouter(): IMessageRouter {
    return this.router;
  }

  /**
   * Get message validator
   */
  getValidator(): IMessageValidator {
    if (!this.validator) {
      throw new Error('No validator configured');
    }
    return this.validator;
  }

  /**
   * Set message validator
   */
  setValidator(validator: IMessageValidator): void {
    this.validator = validator;
  }

  /**
   * Add global middleware
   */
  use(middleware: MessageMiddleware): void {
    this.router.use(middleware);
  }

  /**
   * Get metrics
   */
  getMetrics(): MessageMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      averageLatency: 0,
      activeChannels: this.channels.size,
      activeStreams: this.streams.size,
      errors: 0,
      lastActivity: Date.now()
    };
  }

  /**
   * Close a channel
   */
  closeChannel(id: string): void {
    if (this.channels.has(id)) {
      this.channels.delete(id);
      this.metrics.activeChannels--;
    }
  }

  /**
   * Emit to local listeners
   */
  private emitLocal(channel: string, message: MessageEnvelope): void {
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          console.error('Handler error:', error);
        }
      }
    }
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${++this.messageIdCounter}`;
  }

  /**
   * Setup default routes
   */
  private setupDefaultRoutes(): void {
    // Handle ping-pong
    this.router.registerRoute('ping', async (message) => {
      const envelope = message as MessageEnvelope;
      await this.send('pong', { timestamp: Date.now() }, {
        correlationId: envelope.correlationId,
        type: MessageType.PONG
      });
    });

    // Handle stream messages
    this.router.registerRoute(/^stream:.*/, async (message) => {
      const streamId = message.channel.replace('stream:', '');
      const stream = this.streams.get(streamId);
      
      if (stream && message.data) {
        const { type, data } = message.data as any;
        
        if (type === 'data') {
          // Stream data received
          this.metrics.messagesReceived++;
        } else if (type === 'end') {
          // Stream ended
          this.streams.delete(streamId);
          this.metrics.activeStreams--;
        } else if (type === 'error') {
          // Stream error
          this.streams.delete(streamId);
          this.metrics.activeStreams--;
          this.metrics.errors++;
        }
      }
    });
  }

  /**
   * Destroy the message bus
   */
  destroy(): void {
    // Clear all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Message bus destroyed'));
    }
    this.pendingRequests.clear();

    // Close all channels
    for (const channel of this.channels.values()) {
      channel.close();
    }
    this.channels.clear();

    // Abort all streams
    for (const stream of this.streams.values()) {
      stream.abort(new Error('Message bus destroyed'));
    }
    this.streams.clear();

    // Clear handlers and router
    this.messageHandlers.clear();
    this.router.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
  }
}

/**
 * Create a new message bus
 */
export function createMessageBus(): MessageBus {
  return new MessageBus();
}

/**
 * Global message bus instance
 */
export const globalMessageBus = createMessageBus();