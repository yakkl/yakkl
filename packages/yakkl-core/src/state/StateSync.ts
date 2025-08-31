/**
 * State Synchronization
 * Cross-context state synchronization (tabs, workers, etc.)
 */

import type {
  IStateSync,
  IState,
  StateSubscriber,
  StateUnsubscriber
} from '../interfaces/state.interface';
import { WritableState } from './State';

/**
 * Message format for state sync
 */
interface StateSyncMessage<T = any> {
  type: 'state-sync';
  channel: string;
  value: T;
  timestamp: number;
  source: string;
}

/**
 * State synchronization using BroadcastChannel API
 */
export class BroadcastStateSync implements IStateSync {
  private channels: Map<string, BroadcastChannel> = new Map();
  private sourceId: string;

  constructor() {
    this.sourceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create broadcast channel
   */
  private getChannel(name: string): BroadcastChannel {
    if (!this.channels.has(name)) {
      const channel = new BroadcastChannel(name);
      this.channels.set(name, channel);
    }
    return this.channels.get(name)!;
  }

  /**
   * Sync state across contexts
   */
  sync<T>(state: IState<T>, channel: string): StateUnsubscriber {
    const broadcastChannel = this.getChannel(channel);
    
    // Subscribe to local state changes and broadcast
    const localUnsub = state.subscribe(value => {
      this.broadcast(channel, value);
    });

    // Listen for remote changes and update local state
    const messageHandler = (event: MessageEvent) => {
      const message = event.data as StateSyncMessage<T>;
      
      // Ignore our own messages
      if (message.source === this.sourceId) {
        return;
      }

      // Update local state
      if (message.type === 'state-sync' && message.channel === channel) {
        state.set(message.value);
      }
    };

    broadcastChannel.addEventListener('message', messageHandler);

    // Return unsubscribe function
    return () => {
      localUnsub();
      broadcastChannel.removeEventListener('message', messageHandler);
    };
  }

  /**
   * Broadcast state change
   */
  broadcast<T>(channel: string, value: T): void {
    const broadcastChannel = this.getChannel(channel);
    
    const message: StateSyncMessage<T> = {
      type: 'state-sync',
      channel,
      value,
      timestamp: Date.now(),
      source: this.sourceId
    };

    broadcastChannel.postMessage(message);
  }

  /**
   * Listen for state changes
   */
  listen<T>(channel: string, callback: StateSubscriber<T>): StateUnsubscriber {
    const broadcastChannel = this.getChannel(channel);
    
    const messageHandler = (event: MessageEvent) => {
      const message = event.data as StateSyncMessage<T>;
      
      if (message.type === 'state-sync' && message.channel === channel) {
        callback(message.value);
      }
    };

    broadcastChannel.addEventListener('message', messageHandler);

    return () => {
      broadcastChannel.removeEventListener('message', messageHandler);
    };
  }

  /**
   * Close all channels
   */
  close(): void {
    this.channels.forEach(channel => channel.close());
    this.channels.clear();
  }
}

/**
 * State synchronization using storage events (fallback for older browsers)
 */
export class StorageStateSync implements IStateSync {
  private listeners: Map<string, Set<(event: StorageEvent) => void>> = new Map();
  private prefix = '__state_sync__';
  private sourceId: string;

  constructor() {
    this.sourceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage key
   */
  private getKey(channel: string): string {
    return `${this.prefix}${channel}`;
  }

  /**
   * Sync state across contexts
   */
  sync<T>(state: IState<T>, channel: string): StateUnsubscriber {
    const key = this.getKey(channel);
    
    // Subscribe to local state changes and update storage
    const localUnsub = state.subscribe(value => {
      try {
        const message: StateSyncMessage<T> = {
          type: 'state-sync',
          channel,
          value,
          timestamp: Date.now(),
          source: this.sourceId
        };
        localStorage.setItem(key, JSON.stringify(message));
      } catch (error) {
        console.error('Failed to sync state to storage:', error);
      }
    });

    // Listen for storage changes
    const storageHandler = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) {
        return;
      }

      try {
        const message = JSON.parse(event.newValue) as StateSyncMessage<T>;
        
        // Ignore our own messages
        if (message.source === this.sourceId) {
          return;
        }

        // Update local state
        state.set(message.value);
      } catch (error) {
        console.error('Failed to parse storage sync message:', error);
      }
    };

    window.addEventListener('storage', storageHandler);

    // Track listener for cleanup
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(storageHandler);

    // Return unsubscribe function
    return () => {
      localUnsub();
      window.removeEventListener('storage', storageHandler);
      this.listeners.get(channel)?.delete(storageHandler);
    };
  }

  /**
   * Broadcast state change
   */
  broadcast<T>(channel: string, value: T): void {
    const key = this.getKey(channel);
    
    try {
      const message: StateSyncMessage<T> = {
        type: 'state-sync',
        channel,
        value,
        timestamp: Date.now(),
        source: this.sourceId
      };
      localStorage.setItem(key, JSON.stringify(message));
    } catch (error) {
      console.error('Failed to broadcast state:', error);
    }
  }

  /**
   * Listen for state changes
   */
  listen<T>(channel: string, callback: StateSubscriber<T>): StateUnsubscriber {
    const key = this.getKey(channel);
    
    const storageHandler = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) {
        return;
      }

      try {
        const message = JSON.parse(event.newValue) as StateSyncMessage<T>;
        callback(message.value);
      } catch (error) {
        console.error('Failed to parse storage sync message:', error);
      }
    };

    window.addEventListener('storage', storageHandler);

    // Track listener for cleanup
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(storageHandler);

    return () => {
      window.removeEventListener('storage', storageHandler);
      this.listeners.get(channel)?.delete(storageHandler);
    };
  }

  /**
   * Clean up
   */
  close(): void {
    // Remove all listeners
    this.listeners.forEach((handlers, channel) => {
      handlers.forEach(handler => {
        window.removeEventListener('storage', handler);
      });
    });
    this.listeners.clear();
  }
}

/**
 * Create state sync instance based on available APIs
 */
export function createStateSync(): IStateSync {
  // Use BroadcastChannel if available (modern browsers)
  if (typeof BroadcastChannel !== 'undefined') {
    return new BroadcastStateSync();
  }
  
  // Fall back to storage events
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return new StorageStateSync();
  }
  
  // Return no-op sync for non-browser environments
  return {
    sync: () => () => {},
    broadcast: () => {},
    listen: () => () => {}
  };
}

/**
 * Synchronized state wrapper
 */
export class SynchronizedState<T> implements IState<T> {
  private state: IState<T>;
  private sync: IStateSync;
  private unsubscribe?: StateUnsubscriber;

  constructor(
    state: IState<T>,
    channel: string,
    sync?: IStateSync
  ) {
    this.state = state;
    this.sync = sync || createStateSync();
    
    // Start syncing
    this.unsubscribe = this.sync.sync(state, channel);
  }

  get(): T {
    return this.state.get();
  }

  set(value: T | ((prev: T) => T)): void {
    this.state.set(value);
  }

  update(updater: (value: T) => T): void {
    this.state.update(updater);
  }

  subscribe(subscriber: (value: T) => void): StateUnsubscriber {
    return this.state.subscribe(subscriber);
  }

  /**
   * Stop syncing
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}

/**
 * Create a synchronized state
 */
export function synchronized<T>(
  initial: T,
  channel: string,
  options?: {
    sync?: IStateSync;
  }
): SynchronizedState<T> {
  const state = new WritableState(initial);
  return new SynchronizedState(state, channel, options?.sync);
}