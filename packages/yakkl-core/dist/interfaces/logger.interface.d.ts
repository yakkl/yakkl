/**
 * Logger Interface
 * Platform-agnostic logging abstraction
 * Can be implemented with console, remote logging, file logging, etc.
 */
export interface ILogger {
    /**
     * Debug level logging
     */
    debug(message: string, ...args: any[]): void;
    /**
     * Info level logging
     */
    info(message: string, ...args: any[]): void;
    /**
     * Warning level logging
     */
    warn(message: string, ...args: any[]): void;
    /**
     * Error level logging
     */
    error(message: string, error?: any, ...args: any[]): void;
    /**
     * Fatal/Critical level logging
     */
    fatal?(message: string, error?: any, ...args: any[]): void;
    /**
     * Trace level logging (most verbose)
     */
    trace?(message: string, ...args: any[]): void;
    /**
     * Create a child logger with additional context
     */
    child?(context: Record<string, any>): ILogger;
    /**
     * Set logging level
     */
    setLevel?(level: LogLevel): void;
    /**
     * Get current logging level
     */
    getLevel?(): LogLevel;
    /**
     * Measure time for an operation
     */
    time?(label: string): void;
    timeEnd?(label: string): void;
    /**
     * Group related logs
     */
    group?(label: string): void;
    groupEnd?(): void;
    /**
     * Clear logs (if supported)
     */
    clear?(): void;
}
export declare enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5,
    SILENT = 6
}
/**
 * Logger configuration options
 */
export interface LoggerConfig {
    /**
     * Minimum log level to output
     */
    level?: LogLevel;
    /**
     * Whether to include timestamps
     */
    timestamps?: boolean;
    /**
     * Whether to include stack traces for errors
     */
    stackTraces?: boolean;
    /**
     * Custom formatter function
     */
    formatter?: (level: string, message: string, ...args: any[]) => string;
    /**
     * Transport destinations (console, file, remote, etc.)
     */
    transports?: LogTransport[];
    /**
     * Context to include with all logs
     */
    context?: Record<string, any>;
}
/**
 * Log transport interface for sending logs to different destinations
 */
export interface LogTransport {
    /**
     * Name of the transport
     */
    name: string;
    /**
     * Write a log entry
     */
    write(entry: LogEntry): void | Promise<void>;
    /**
     * Optionally read log entries from this transport
     */
    read?(options?: LogReadOptions): Promise<LogEntry[]> | LogEntry[] | undefined;
    /**
     * Flush any buffered logs
     */
    flush?(): void | Promise<void>;
    /**
     * Close the transport
     */
    close?(): void | Promise<void>;
}
/**
 * A single log entry
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    args?: any[];
    error?: Error;
    timestamp: Date;
    context?: Record<string, any>;
}
/**
 * Options for reading logs from transports
 */
export interface LogReadOptions {
    startTime?: Date | number;
    endTime?: Date | number;
    levelAtLeast?: LogLevel;
    textIncludes?: string | RegExp;
    limit?: number;
    offset?: number;
}
//# sourceMappingURL=logger.interface.d.ts.map