/**
 * Browser Logger Bridge
 * Implements ILogger interface with browser console and optional remote logging
 */

// TODO: Import from @yakkl/core when package is properly set up
// import type { ILogger, LogLevel, LogEntry, LoggerConfig } from '@yakkl/core/interfaces';

// Temporary local definitions until @yakkl/core is properly set up
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: any, ...args: any[]): void;
  fatal?(message: string, error?: any, ...args: any[]): void;
  trace?(message: string, ...args: any[]): void;
  child?(context: Record<string, any>): ILogger;
  setLevel?(level: LogLevel): void;
  getLevel?(): LogLevel;
  time?(label: string): void;
  timeEnd?(label: string): void;
  group?(label: string): void;
  groupEnd?(): void;
  clear?(): void;
}

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6
}

export interface LoggerConfig {
  level?: LogLevel;
  timestamps?: boolean;
  stackTraces?: boolean;
  formatter?: (level: string, message: string, ...args: any[]) => string;
  transports?: LogTransport[];
  context?: Record<string, any>;
}

export interface LogTransport {
  name: string;
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  args?: any[];
  error?: Error;
  timestamp: Date;
  context?: Record<string, any>;
}
import { browser_ext } from '$lib/common/environment';

export class BrowserLoggerBridge implements ILogger {
  private level: LogLevel;
  private context: Record<string, any>;
  private config: LoggerConfig;
  
  constructor(config: LoggerConfig = {}) {
    this.config = config;
    this.level = config.level ?? LogLevel.INFO;
    this.context = config.context ?? {};
  }
  
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log('debug', message, args);
    }
  }
  
  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log('info', message, args);
    }
  }
  
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log('warn', message, args);
    }
  }
  
  error(message: string, error?: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log('error', message, [...args, error]);
    }
  }
  
  fatal(message: string, error?: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      this.log('error', `[FATAL] ${message}`, [...args, error]);
      
      // For fatal errors, try to send to background for persistence
      if (browser_ext?.runtime) {
        browser_ext.runtime.sendMessage({
          type: 'FATAL_ERROR',
          message,
          error: error ? String(error) : undefined,
          timestamp: Date.now()
        }).catch(() => {
          // Ignore send errors
        });
      }
    }
  }
  
  trace(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      console.trace(this.formatMessage(message), ...args);
    }
  }
  
  child(additionalContext: Record<string, any>): ILogger {
    return new BrowserLoggerBridge({
      ...this.config,
      context: { ...this.context, ...additionalContext }
    });
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  getLevel(): LogLevel {
    return this.level;
  }
  
  time(label: string): void {
    console.time(label);
  }
  
  timeEnd(label: string): void {
    console.timeEnd(label);
  }
  
  group(label: string): void {
    console.group(label);
  }
  
  groupEnd(): void {
    console.groupEnd();
  }
  
  clear(): void {
    console.clear();
  }
  
  // Private methods
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }
  
  private log(
    method: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    args: any[]
  ): void {
    const formattedMessage = this.formatMessage(message);
    
    // Log to console
    console[method](formattedMessage, ...args);
    
    // Send to transports if configured
    if (this.config.transports) {
      const entry: LogEntry = {
        level: this.getLogLevelFromMethod(method),
        message,
        args: args.length > 0 ? args : undefined,
        timestamp: new Date(),
        context: this.context
      };
      
      for (const transport of this.config.transports) {
        const writeResult = transport.write(entry);
        if (writeResult && typeof writeResult.catch === 'function') {
          writeResult.catch(error => {
            console.error(`Failed to write to transport ${transport.name}:`, error);
          });
        }
      }
    }
  }
  
  private formatMessage(message: string): string {
    const timestamp = this.config.timestamps ? `[${new Date().toISOString()}] ` : '';
    const contextStr = Object.keys(this.context).length > 0 
      ? `[${Object.entries(this.context).map(([k, v]) => `${k}:${v}`).join(',')}] `
      : '';
    
    if (this.config.formatter) {
      return this.config.formatter(this.level.toString(), message);
    }
    
    return `${timestamp}${contextStr}${message}`;
  }
  
  private getLogLevelFromMethod(method: string): LogLevel {
    switch (method) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }
}

/**
 * Background Storage Transport
 * Stores logs in browser.storage for persistence
 */
export class BrowserStorageTransport {
  name = 'browser-storage';
  private maxLogs = 1000;
  private storageKey = 'yakkl_logs';
  
  async write(entry: LogEntry): Promise<void> {
    if (!browser_ext?.storage) return;
    
    try {
      // Get existing logs
      const result = await browser_ext.storage.local.get(this.storageKey);
      const logs: LogEntry[] = (result[this.storageKey] as LogEntry[]) || [];
      
      // Add new entry
      logs.push(entry);
      
      // Trim to max size
      if (logs.length > this.maxLogs) {
        logs.splice(0, logs.length - this.maxLogs);
      }
      
      // Save back
      await browser_ext.storage.local.set({ [this.storageKey]: logs });
    } catch (error) {
      console.error('[BrowserStorageTransport] Failed to write log:', error);
    }
  }
  
  async flush(): Promise<void> {
    // Storage is already persistent
  }
  
  async close(): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Factory functions
 */
export function createBrowserLogger(config?: LoggerConfig): ILogger {
  return new BrowserLoggerBridge(config);
}

// LogLevel is already exported above

/**
 * Default logger instances
 */
export const logger = createBrowserLogger({
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  timestamps: import.meta.env.DEV
});

export const persistentLogger = createBrowserLogger({
  level: LogLevel.INFO,
  timestamps: true,
  transports: [new BrowserStorageTransport()]
});