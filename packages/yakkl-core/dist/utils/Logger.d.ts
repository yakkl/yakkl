/**
 * Enhanced Logger for YAKKL Core
 * - Pluggable transports (console, memory, HTTP, SQL)
 * - Works in browser, workers, and server contexts
 */
import type { ILogger, LoggerConfig, LogEntry, LogTransport } from '../interfaces/logger.interface';
import { LogLevel } from '../interfaces/logger.interface';
export declare class Logger implements ILogger {
    private static instance;
    private level;
    private timestamps;
    private stackTraces;
    private context;
    private transports;
    constructor(context: string | Record<string, any>);
    constructor(context: string | Record<string, any>, level: LogLevel);
    constructor(config?: LoggerConfig & {
        context?: Record<string, any> | string;
    });
    static getInstance(): Logger;
    addTransport(t: LogTransport): void;
    setTransports(ts: LogTransport[]): void;
    clearTransports(): void;
    flush(): Promise<void>;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
    child(context: Record<string, any>): ILogger;
    private timeLabels;
    time(label: string): void;
    timeEnd(label: string): void;
    group(label: string): void;
    groupEnd(): void;
    clear(): void;
    private createEntry;
    private dispatch;
    trace(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, error?: any, ...args: any[]): void;
    error(message: string, error?: any, ...args: any[]): void;
    fatal?(message: string, error?: any, ...args: any[]): void;
    getLogs(options?: import('../interfaces/logger.interface').LogReadOptions, redact?: boolean): Promise<LogEntry[]>;
    copyLogs(options?: import('../interfaces/logger.interface').LogReadOptions): Promise<string>;
    private sanitizeEntry;
    private sanitizeValue;
    private isSecretKey;
    private sanitizeString;
}
export declare const log: Logger;
export { LogLevel };
//# sourceMappingURL=Logger.d.ts.map