import { browser_ext, browserSvelte } from './environment';
import { log } from './logger-wrapper';

/**
 * Connection states for extension messaging
 */
export enum ConnectionState {
  UNKNOWN = 'unknown',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  INVALID_CONTEXT = 'invalid_context'
}

/**
 * Cache for connection state to avoid repeated checks
 */
let connectionStateCache: {
  state: ConnectionState;
  lastChecked: number;
} = {
  state: ConnectionState.UNKNOWN,
  lastChecked: 0
};

const CONNECTION_CHECK_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // ms

/**
 * Checks if the extension context is valid and can send messages
 */
export async function checkExtensionConnection(): Promise<ConnectionState> {
  if (!browserSvelte || !browser_ext?.runtime) {
    return ConnectionState.INVALID_CONTEXT;
  }

  // Use cached state if recent
  const now = Date.now();
  if (now - connectionStateCache.lastChecked < CONNECTION_CHECK_INTERVAL && 
      connectionStateCache.state !== ConnectionState.UNKNOWN) {
    return connectionStateCache.state;
  }

  try {
    // Quick check if runtime is available
    if (!browser_ext.runtime.id) {
      connectionStateCache = {
        state: ConnectionState.INVALID_CONTEXT,
        lastChecked: now
      };
      return ConnectionState.INVALID_CONTEXT;
    }

    // Try to get manifest to verify connection
    const manifest = browser_ext.runtime.getManifest();
    if (manifest) {
      connectionStateCache = {
        state: ConnectionState.CONNECTED,
        lastChecked: now
      };
      return ConnectionState.CONNECTED;
    }
  } catch (error) {
    log.debug('Extension connection check failed:', false, error);
    connectionStateCache = {
      state: ConnectionState.DISCONNECTED,
      lastChecked: now
    };
    return ConnectionState.DISCONNECTED;
  }

  return ConnectionState.DISCONNECTED;
}

/**
 * Safely sends a message with connection verification and retry logic
 */
export async function safeSendMessage<T = any>(
  message: any,
  options?: {
    retries?: number;
    retryDelay?: number;
    critical?: boolean;
  }
): Promise<T | null> {
  const {
    retries = MAX_RETRIES,
    retryDelay = RETRY_DELAY,
    critical = false
  } = options || {};

  // Check connection before attempting to send
  const connectionState = await checkExtensionConnection();
  
  if (connectionState === ConnectionState.INVALID_CONTEXT) {
    log.debug('Extension context is invalid, skipping message send');
    return null;
  }

  if (connectionState === ConnectionState.DISCONNECTED) {
    log.debug('Extension is disconnected, skipping message send');
    return null;
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Attempt to send the message
      const response = await browser_ext.runtime.sendMessage(message);
      
      // Clear cache on successful send
      connectionStateCache.state = ConnectionState.CONNECTED;
      connectionStateCache.lastChecked = Date.now();
      
      return response as T;
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a connection error
      const errorMessage = (error as any)?.message || '';
      if (errorMessage.includes('Could not establish connection') ||
          errorMessage.includes('Receiving end does not exist')) {
        // Update cache to reflect disconnected state
        connectionStateCache.state = ConnectionState.DISCONNECTED;
        connectionStateCache.lastChecked = Date.now();
        
        // Don't retry for connection errors
        break;
      }
      
      // For other errors, retry if we have attempts left
      if (attempt < retries) {
        log.debug(`Message send attempt ${attempt + 1} failed, retrying...`, false, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }
  
  // Handle final failure
  if (critical && lastError) {
    log.error('Critical message send failed after all retries:', false, lastError);
    throw lastError;
  } else if (lastError) {
    log.warn('Non-critical message send failed:', false, lastError);
  }
  
  return null;
}

/**
 * Creates a connection-aware wrapper for any async function that uses browser APIs
 */
export function withConnectionCheck<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    critical?: boolean;
    fallback?: (...args: Parameters<T>) => ReturnType<T>;
  }
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const connectionState = await checkExtensionConnection();
    
    if (connectionState === ConnectionState.CONNECTED) {
      try {
        return await fn(...args);
      } catch (error) {
        if (options?.critical) {
          throw error;
        }
        log.warn('Function execution failed:', false, error);
        if (options?.fallback) {
          return options.fallback(...args);
        }
        return null as any;
      }
    }
    
    log.debug('Skipping function execution due to invalid connection state:', false, connectionState);
    if (options?.fallback) {
      return options.fallback(...args);
    }
    return null as any;
  }) as T;
}

/**
 * Resets the connection state cache
 */
export function resetConnectionCache(): void {
  connectionStateCache = {
    state: ConnectionState.UNKNOWN,
    lastChecked: 0
  };
}

// Listen for extension suspend/resume events
if (browserSvelte && browser_ext?.runtime) {
  // Reset cache when extension suspends
  browser_ext.runtime.onSuspend?.addListener?.(() => {
    resetConnectionCache();
  });
  
  // Reset cache when extension starts
  browser_ext.runtime.onStartup?.addListener?.(() => {
    resetConnectionCache();
  });
}