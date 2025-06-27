/**
 * Logger utility for YAKKL Core
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export declare class Logger {
    private context;
    private level;
    constructor(context: string, level?: LogLevel);
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, error?: Error | any): void;
    error(message: string, error?: Error | any): void;
    setLevel(level: LogLevel): void;
}
//# sourceMappingURL=Logger.d.ts.map