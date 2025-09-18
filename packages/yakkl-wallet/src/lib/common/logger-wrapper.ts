/**
 * Logger wrapper for YAKKL Wallet
 * Uses @yakkl/core Logger with API compatibility layer
 */

import { Logger } from '@yakkl/core';

// Create a singleton logger instance - use numeric values directly to avoid enum conflicts
const coreLogger = new Logger('YAKKL-Wallet', __DEV__ ? 0 : 3); // 0=DEBUG, 3=ERROR

// Helper function to create no-op
const noop = () => {};

// Helper function to get stack trace
const getStack = () => new Error().stack || '';

// Production-safe logger that tree-shakes debug and info calls
// Modified signature: move persist parameter to end and make all parameters after message truly optional
export const log = {
  // Debug methods (removed in production)
  debug: __DEV__ 
    ? (message: string, ...args: any[]) => {
        // Extract persist flag if it's a boolean in the last position
        const lastArg = args[args.length - 1];
        const persist = typeof lastArg === 'boolean' ? lastArg : false;
        const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
        coreLogger.debug(message, ...actualArgs);
      }
    : noop,
    
  debugStack: __DEV__ 
    ? (message: string, ...args: any[]) => {
        // Extract persist flag if it's a boolean in the last position
        const lastArg = args[args.length - 1];
        const persist = typeof lastArg === 'boolean' ? lastArg : false;
        const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
        coreLogger.debug(`${message}\n${getStack()}`, ...actualArgs);
      }
    : noop,
    
  // Warn method (available in all modes)
  warn: (message: string, ...args: any[]) => {
    if (__DEV__) {
      // Extract persist flag if it's a boolean in the last position
      const lastArg = args[args.length - 1];
      const persist = typeof lastArg === 'boolean' ? lastArg : false;
      const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
      coreLogger.warn(message, actualArgs.length > 0 ? actualArgs[0] : undefined);
    }
  },
    
  // Error methods (available in all modes)
  errorStack: __DEV__ 
    ? (message: string, ...args: any[]) => {
        // Extract persist flag if it's a boolean in the last position
        const lastArg = args[args.length - 1];
        const persist = typeof lastArg === 'boolean' ? lastArg : false;
        const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
        coreLogger.error(`${message}\n${getStack()}`, actualArgs.length > 0 ? actualArgs[0] : undefined);
      }
    : noop,
  
  error: (message: string, ...args: any[]) => {
    // Extract persist flag if it's a boolean in the last position
    const lastArg = args[args.length - 1];
    const persist = typeof lastArg === 'boolean' ? lastArg : false;
    const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
    
    // Suppress specific connection errors
    const errorString = [message, ...actualArgs.map(arg => String(arg))].join(' ');
    if (errorString.includes('Could not establish connection') ||
        errorString.includes('Receiving end does not exist')) {
      // Convert to debug log instead
      if (__DEV__) {
        coreLogger.debug(`[Suppressed Error] ${message}`, ...actualArgs);
      }
      return;
    }
    // Log other errors normally
    coreLogger.error(message, actualArgs.length > 0 ? actualArgs[0] : undefined);
  },
    
  // Info methods (removed in production)
  info: __DEV__ 
    ? (message: string, ...args: any[]) => {
        // Extract persist flag if it's a boolean in the last position
        const lastArg = args[args.length - 1];
        const persist = typeof lastArg === 'boolean' ? lastArg : false;
        const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
        coreLogger.info(message, ...actualArgs);
      }
    : noop,
    
  infoStack: __DEV__ 
    ? (message: string, ...args: any[]) => {
        // Extract persist flag if it's a boolean in the last position
        const lastArg = args[args.length - 1];
        const persist = typeof lastArg === 'boolean' ? lastArg : false;
        const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
        coreLogger.info(`${message}\n${getStack()}`, ...actualArgs);
      }
    : noop,
    
  // Trace method (removed in production)
  trace: __DEV__ 
    ? (message: string, ...args: any[]) => {
        // Extract persist flag if it's a boolean in the last position
        const lastArg = args[args.length - 1];
        const persist = typeof lastArg === 'boolean' ? lastArg : false;
        const actualArgs = typeof lastArg === 'boolean' ? args.slice(0, -1) : args;
        coreLogger.debug(`[TRACE] ${message}`, ...actualArgs);
      }
    : noop,

  // Utility methods
  setLevel: (level: 'debug' | 'info' | 'warn' | 'error') => {
    const levelMap: Record<string, number> = {
      'debug': 0, // DEBUG
      'info': 1,  // INFO
      'warn': 2,  // WARN
      'error': 3  // ERROR
    };
    coreLogger.setLevel(levelMap[level] || 1); // Default to INFO
  },
  
  // These are no-ops for now since @yakkl/core doesn't have these features
  setLogFilterEnabled: (_enabled: boolean) => {
    // TODO: Implement in @yakkl/core
  },
  
  setLogFilterRegex: (_regex: string) => {
    // TODO: Implement in @yakkl/core
  },
  
  setStackIndex: (_index: number) => {
    // TODO: Implement in @yakkl/core
  },
  
  setBackend: (_backend: any) => {
    // TODO: Implement in @yakkl/core
  },
  
  clearPersistedLogs: () => {
    // TODO: Implement in @yakkl/core
  },
  
  getPersistedLogs: () => {
    // TODO: Implement in @yakkl/core
    return [];
  }
} as const;

// Define LogLevel enum for backward compatibility
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  SILENT = 5
}

export const LogLevelDirection = LogLevel; // For compatibility

// Define LogEntry type for compatibility
export interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  args?: any[];
}