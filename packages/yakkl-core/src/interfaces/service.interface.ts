/**
 * Service-related interfaces for framework-agnostic services
 */

import type { HexString } from '../types';

/**
 * Base service interface that all services should implement
 */
export interface IService {
  readonly name: string;
  readonly version: string;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

/**
 * Service with lifecycle hooks
 */
export interface ILifecycleService extends IService {
  beforeStart?(): Promise<void>;
  afterStart?(): Promise<void>;
  beforeStop?(): Promise<void>;
  afterStop?(): Promise<void>;
  onError?(error: Error): void;
}

/**
 * Configuration for interval-based services
 */
export interface IntervalConfig {
  enabled: boolean;
  intervalMs: number;
  immediateStart?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Notification service interface
 */
export interface NotificationOptions {
  type?: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  title: string;
  message: string;
  contextMessage?: string;
  priority?: 0 | 1 | 2;
  eventTime?: number;
  buttons?: Array<{ title: string }>;
  imageUrl?: string;
  items?: Array<{ title: string; message: string }>;
  progress?: number;
  isClickable?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  persistToStorage?: boolean;
  compressionEnabled?: boolean;
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  hits?: number;
}

/**
 * Data synchronization options
 */
export interface SyncOptions {
  syncInterval?: number;
  batchSize?: number;
  conflictResolution?: 'local' | 'remote' | 'merge';
  retryOnFailure?: boolean;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  uptime?: number;
  errors?: number;
  metrics?: Record<string, any>;
}

/**
 * Service registry interface
 */
export interface IServiceRegistry {
  register(service: IService): void;
  unregister(serviceName: string): void;
  get(serviceName: string): IService | undefined;
  getAll(): IService[];
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
  getHealth(): ServiceHealth[];
}

/**
 * Event emitter for services
 */
export interface IServiceEventEmitter {
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Message passing between services
 */
export interface ServiceMessage<T = any> {
  id: string;
  source: string;
  target?: string;
  type: string;
  payload: T;
  timestamp: number;
  replyTo?: string;
}

/**
 * Service communication interface
 */
export interface IServiceCommunicator {
  send<T>(message: ServiceMessage<T>): Promise<void>;
  sendAndWait<T, R>(message: ServiceMessage<T>, timeoutMs?: number): Promise<R>;
  subscribe(type: string, handler: (message: ServiceMessage) => void): void;
  unsubscribe(type: string, handler: (message: ServiceMessage) => void): void;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  strategy?: 'sliding' | 'fixed';
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}