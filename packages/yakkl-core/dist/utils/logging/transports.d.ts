import type { LogEntry, LogTransport } from '../../interfaces/logger.interface';
export declare function filterLogs(input: LogEntry[], options?: import('../../interfaces/logger.interface').LogReadOptions): LogEntry[];
export declare class ConsoleTransport implements LogTransport {
    name: string;
    write(entry: LogEntry): void;
}
export declare class MemoryTransport implements LogTransport {
    name: string;
    private buffer;
    private limit;
    constructor(limit?: number);
    write(entry: LogEntry): void;
    flush(): void;
    read(options?: import('../../interfaces/logger.interface').LogReadOptions): LogEntry[];
}
export declare class LocalStorageTransport implements LogTransport {
    name: string;
    private key;
    private limit;
    constructor(key?: string, limit?: number);
    write(entry: LogEntry): void;
    flush(): void;
    read(options?: import('../../interfaces/logger.interface').LogReadOptions): LogEntry[] | undefined;
}
export type FetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
export declare class HttpTransport implements LogTransport {
    name: string;
    private endpoint;
    private headers?;
    private fetchFn;
    private includeContext;
    constructor(options: {
        endpoint: string;
        headers?: Record<string, string>;
        fetchFn?: FetchFn;
        includeContext?: boolean;
    });
    write(entry: LogEntry): Promise<void>;
}
export interface D1DatabaseLike {
    prepare(sql: string): {
        bind(...params: any[]): {
            run(): Promise<{
                success: boolean;
            } | unknown>;
        };
    };
}
export declare class D1Transport implements LogTransport {
    name: string;
    private db;
    private table;
    constructor(db: D1DatabaseLike, table?: string);
    write(entry: LogEntry): Promise<void>;
}
export type SqlExecutor = (sql: string, params: any[]) => Promise<unknown>;
export declare class PostgresTransport implements LogTransport {
    name: string;
    private exec;
    private table;
    constructor(executor: SqlExecutor, table?: string);
    write(entry: LogEntry): Promise<void>;
}
type DexieClass = new (dbName: string) => any;
export declare class DexieTransport implements LogTransport {
    name: string;
    private Dexie;
    private db;
    private tableName;
    private limit;
    constructor(DexieCtor: DexieClass, dbName?: string, tableName?: string, limit?: number);
    write(entry: LogEntry): Promise<void>;
    flush(): Promise<void>;
    read(options?: import('../../interfaces/logger.interface').LogReadOptions): Promise<LogEntry[]>;
}
export declare class WebExtensionStorageTransport implements LogTransport {
    name: string;
    private key;
    private limit;
    constructor(key?: string, limit?: number);
    private get storageLocal();
    private getLogs;
    private setLogs;
    write(entry: LogEntry): Promise<void>;
    flush(): Promise<void>;
    read(options?: import('../../interfaces/logger.interface').LogReadOptions): Promise<LogEntry[]>;
}
export declare class WebSocketTransport implements LogTransport {
    name: string;
    private ws?;
    private url?;
    private headers?;
    private queue;
    constructor(options: {
        url?: string;
        webSocket?: any;
        headers?: Record<string, string>;
    });
    write(entry: LogEntry): void;
}
export {};
//# sourceMappingURL=transports.d.ts.map