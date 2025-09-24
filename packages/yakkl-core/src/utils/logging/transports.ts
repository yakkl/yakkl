/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LogEntry, LogTransport } from '../../interfaces/logger.interface';
import { LogLevel } from '../../interfaces/logger.interface';

function levelToLabel(level: LogLevel): string {
  switch (level) {
    case LogLevel.TRACE:
      return 'TRACE';
    case LogLevel.DEBUG:
      return 'DEBUG';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.WARN:
      return 'WARN';
    case LogLevel.ERROR:
      return 'ERROR';
    case LogLevel.FATAL:
      return 'FATAL';
    default:
      return String(level);
  }
}

// Shared filtering utility for transports
export function filterLogs(
  input: LogEntry[],
  options?: import('../../interfaces/logger.interface').LogReadOptions
): LogEntry[] {
  if (!options) return input;
  const start = options.startTime ? new Date(options.startTime).getTime() : undefined;
  const end = options.endTime ? new Date(options.endTime).getTime() : undefined;
  const text = options.textIncludes;
  const levelAtLeast = options.levelAtLeast;
  let out = input.filter((e) => {
    const t = (e.timestamp instanceof Date ? e.timestamp.getTime() : new Date(e.timestamp as any).getTime());
    if (start !== undefined && t < start) return false;
    if (end !== undefined && t > end) return false;
    if (typeof levelAtLeast === 'number' && e.level < levelAtLeast) return false;
    if (text) {
      const hay = `${e.message} ${JSON.stringify(e.args ?? [])} ${e.error ? String(e.error) : ''}`;
      if (typeof text === 'string') {
        if (!hay.includes(text)) return false;
      } else if (text instanceof RegExp) {
        if (!text.test(hay)) return false;
      }
    }
    return true;
  });
  out.sort((a, b) => (a.timestamp as any) > (b.timestamp as any) ? 1 : -1);
  if (options.offset) out = out.slice(options.offset);
  if (options.limit !== undefined) out = out.slice(0, options.limit);
  return out;
}

export class ConsoleTransport implements LogTransport {
  name = 'console';

  write(entry: LogEntry): void {
    const ts = entry.timestamp instanceof Date ? entry.timestamp.toISOString() : String(entry.timestamp);
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const args = entry.args ?? [];

    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(`[${levelToLabel(entry.level)}] ${ts}${ctx} - ${entry.message}`, ...args);
        break;
      case LogLevel.INFO:
        console.info(`[INFO] ${ts}${ctx} - ${entry.message}`, ...args);
        break;
      case LogLevel.WARN:
        console.warn(`[WARN] ${ts}${ctx} - ${entry.message}`, entry.error ?? '', ...args);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`[${levelToLabel(entry.level)}] ${ts}${ctx} - ${entry.message}`, entry.error ?? '', ...args);
        break;
      default:
        console.log(`[${levelToLabel(entry.level)}] ${ts}${ctx} - ${entry.message}`, ...args);
    }
  }
}

export class MemoryTransport implements LogTransport {
  name = 'memory';
  private buffer: LogEntry[] = [];
  private limit: number;

  constructor(limit = 500) {
    this.limit = limit;
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.limit) {
      this.buffer.shift();
    }
  }

  flush(): void {
    this.buffer.length = 0;
  }

  read(options?: import('../../interfaces/logger.interface').LogReadOptions): LogEntry[] {
    let logs = [...this.buffer];
    logs = filterLogs(logs, options);
    return logs;
  }
}

export class LocalStorageTransport implements LogTransport {
  name = 'localStorage';
  private key: string;
  private limit: number;

  constructor(key = 'yakklLogs', limit = 500) {
    this.key = key;
    this.limit = limit;
  }

  write(entry: LogEntry): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.key);
      const logs: any[] = raw ? JSON.parse(raw) : [];
      const serialized = {
        ...entry,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
        args: (entry.args ?? []).map((a) => {
          try {
            JSON.parse(JSON.stringify(a));
            return a;
          } catch {
            return String(a);
          }
        }),
        error: entry.error ? String(entry.error) : undefined
      };
      logs.push(serialized);
      while (logs.length > this.limit) logs.shift();
      localStorage.setItem(this.key, JSON.stringify(logs));
    } catch {
      // ignore
    }
  }

  flush(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(this.key);
    } catch {
      // ignore
    }
  }

  read(options?: import('../../interfaces/logger.interface').LogReadOptions): LogEntry[] | undefined {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(this.key);
      const parsed: any[] = raw ? JSON.parse(raw) : [];
      const logs: LogEntry[] = parsed.map((e) => ({
        level: typeof e.level === 'number' ? e.level : LogLevel[e.level as keyof typeof LogLevel] ?? LogLevel.INFO,
        message: String(e.message ?? ''),
        args: e.args ?? [],
        error: e.error ? new Error(String(e.error)) : undefined,
        timestamp: new Date(e.timestamp ?? Date.now()),
        context: e.context ?? undefined
      }));
      return filterLogs(logs, options);
    } catch {
      return [];
    }
  }
}

export type FetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export class HttpTransport implements LogTransport {
  name = 'http';
  private endpoint: string;
  private headers?: Record<string, string>;
  private fetchFn: FetchFn | undefined;
  private includeContext: boolean;

  constructor(options: { endpoint: string; headers?: Record<string, string>; fetchFn?: FetchFn; includeContext?: boolean }) {
    this.endpoint = options.endpoint;
    this.headers = options.headers;
    this.fetchFn = options.fetchFn ?? (globalThis as any).fetch;
    this.includeContext = options.includeContext ?? true;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      if (!this.fetchFn) return;
      const body: any = {
        level: levelToLabel(entry.level),
        message: entry.message,
        args: entry.args ?? [],
        error: entry.error ? String(entry.error) : undefined,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp
      };
      if (this.includeContext && entry.context) body.context = entry.context;
      await this.fetchFn(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.headers ?? {}) },
        body: JSON.stringify(body)
      }).catch(() => undefined);
    } catch {
      // ignore
    }
  }
}

// Minimal shape of a Cloudflare D1 Database binding
export interface D1DatabaseLike {
  prepare(sql: string): {
    bind(...params: any[]): { run(): Promise<{ success: boolean } | unknown> };
  };
}

export class D1Transport implements LogTransport {
  name = 'cloudflare-d1';
  private db: D1DatabaseLike;
  private table: string;

  constructor(db: D1DatabaseLike, table = 'logs') {
    this.db = db;
    this.table = table;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const sql = `INSERT INTO ${this.table} (timestamp, level, message, args, context, error)
                   VALUES (?, ?, ?, ?, ?, ?)`;
      const args = [
        entry.timestamp instanceof Date ? entry.timestamp.toISOString() : String(entry.timestamp),
        levelToLabel(entry.level),
        entry.message,
        JSON.stringify(entry.args ?? []),
        entry.context ? JSON.stringify(entry.context) : null,
        entry.error ? String(entry.error) : null
      ];
      await this.db.prepare(sql).bind(...args).run();
    } catch {
      // ignore
    }
  }
}

export type SqlExecutor = (sql: string, params: any[]) => Promise<unknown>;

export class PostgresTransport implements LogTransport {
  name = 'postgres';
  private exec: SqlExecutor;
  private table: string;

  constructor(executor: SqlExecutor, table = 'logs') {
    this.exec = executor;
    this.table = table;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const sql = `INSERT INTO ${this.table} (timestamp, level, message, args, context, error)
                   VALUES ($1, $2, $3, $4, $5, $6)`;
      const params = [
        entry.timestamp instanceof Date ? entry.timestamp.toISOString() : String(entry.timestamp),
        levelToLabel(entry.level),
        entry.message,
        JSON.stringify(entry.args ?? []),
        entry.context ? JSON.stringify(entry.context) : null,
        entry.error ? String(entry.error) : null
      ];
      await this.exec(sql, params);
    } catch {
      // ignore
    }
  }
}

// Dexie-based IndexedDB transport (injected Dexie to avoid hard dependency)
type DexieClass = new (dbName: string) => any;

export class DexieTransport implements LogTransport {
  name = 'dexie';
  private Dexie: DexieClass;
  private db: any;
  private tableName: string;
  private limit: number;

  constructor(DexieCtor: DexieClass, dbName = 'yakklLogs', tableName = 'logs', limit = 500) {
    this.Dexie = DexieCtor;
    this.tableName = tableName;
    this.limit = limit;
    this.db = new this.Dexie(dbName);
    this.db.version(1).stores({ [this.tableName]: '++id,timestamp,level,message' });
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const serial = {
        ...entry,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
        args: entry.args ?? [],
        error: entry.error ? String(entry.error) : undefined
      };
      await this.db.table(this.tableName).add(serial);
      const count = await this.db.table(this.tableName).count();
      if (count > this.limit) {
        const first = await this.db.table(this.tableName).orderBy('id').first();
        if (first?.id) await this.db.table(this.tableName).delete(first.id);
      }
    } catch {
      // ignore
    }
  }

  async flush(): Promise<void> {
    try {
      await this.db.table(this.tableName).clear();
    } catch {
      // ignore
    }
  }

  async read(options?: import('../../interfaces/logger.interface').LogReadOptions): Promise<LogEntry[]> {
    try {
      const all = await this.db.table(this.tableName).toArray();
      const logs: LogEntry[] = all.map((e: any) => ({
        level: typeof e.level === 'number' ? e.level : LogLevel[e.level as keyof typeof LogLevel] ?? LogLevel.INFO,
        message: String(e.message ?? ''),
        args: e.args ?? [],
        error: e.error ? new Error(String(e.error)) : undefined,
        timestamp: new Date(e.timestamp ?? Date.now()),
        context: e.context ?? undefined
      }));
      return filterLogs(logs, options);
    } catch {
      return [];
    }
  }
}

// WebExtension storage.local transport (chrome or browser)
export class WebExtensionStorageTransport implements LogTransport {
  name = 'webext-storage-local';
  private key: string;
  private limit: number;

  constructor(key = 'yakklLogs', limit = 500) {
    this.key = key;
    this.limit = limit;
  }

  private get storageLocal(): any | undefined {
    const g = globalThis as any;
    return g?.chrome?.storage?.local || g?.browser?.storage?.local;
  }

  private async getLogs(): Promise<any[]> {
    try {
      const sl = this.storageLocal;
      if (!sl) return [];
      const result = await new Promise<any>((resolve) => {
        try {
          sl.get(this.key, (res: any) => resolve(res || {}));
        } catch {
          resolve({});
        }
      });
      return Array.isArray(result?.[this.key]) ? result[this.key] : [];
    } catch {
      return [];
    }
  }

  private async setLogs(logs: any[]): Promise<void> {
    const sl = this.storageLocal;
    if (!sl) return;
    await new Promise<void>((resolve) => {
      try {
        sl.set({ [this.key]: logs }, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  async write(entry: LogEntry): Promise<void> {
    const logs = await this.getLogs();
    const serial = {
      ...entry,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      args: entry.args ?? [],
      error: entry.error ? String(entry.error) : undefined
    };
    logs.push(serial);
    while (logs.length > this.limit) logs.shift();
    await this.setLogs(logs);
  }

  async flush(): Promise<void> {
    await this.setLogs([]);
  }

  async read(options?: import('../../interfaces/logger.interface').LogReadOptions): Promise<LogEntry[]> {
    const parsed = await this.getLogs();
    const logs: LogEntry[] = parsed.map((e) => ({
      level: typeof e.level === 'number' ? e.level : LogLevel[e.level as keyof typeof LogLevel] ?? LogLevel.INFO,
      message: String(e.message ?? ''),
      args: e.args ?? [],
      error: e.error ? new Error(String(e.error)) : undefined,
      timestamp: new Date(e.timestamp ?? Date.now()),
      context: e.context ?? undefined
    }));
    return filterLogs(logs, options);
  }
}

// WebSocket transport (browser or Node global WebSocket)
export class WebSocketTransport implements LogTransport {
  name = 'websocket';
  private ws?: any;
  private url?: string;
  private headers?: Record<string, string>;
  private queue: any[] = [];

  constructor(options: { url?: string; webSocket?: any; headers?: Record<string, string> }) {
    this.url = options.url;
    this.ws = options.webSocket;
    this.headers = options.headers;
    if (!this.ws && this.url && (globalThis as any).WebSocket) {
      try {
        const WS = (globalThis as any).WebSocket;
        this.ws = new WS(this.url, this.headers ? { headers: this.headers } as any : undefined);
        this.ws.onopen = () => {
          const q = [...this.queue];
          this.queue.length = 0;
          for (const payload of q) {
            try { this.ws?.send(payload); } catch { /* ignore */ }
          }
        };
      } catch {
        // ignore
      }
    }
  }

  write(entry: LogEntry): void {
    const payload = JSON.stringify({
      level: entry.level,
      message: entry.message,
      args: entry.args ?? [],
      error: entry.error ? String(entry.error) : undefined,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      context: entry.context ?? {}
    });
    try {
      if (this.ws && this.ws.readyState === 1 /* OPEN */) {
        this.ws.send(payload);
      } else {
        this.queue.push(payload);
      }
    } catch {
      this.queue.push(payload);
    }
  }
}
