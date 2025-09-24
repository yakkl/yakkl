/**
 * Enhanced Logger for YAKKL Core
 * - Pluggable transports (console, memory, HTTP, SQL)
 * - Works in browser, workers, and server contexts
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ILogger, LoggerConfig, LogEntry, LogTransport } from '../interfaces/logger.interface';
import { LogLevel } from '../interfaces/logger.interface';
import { ConsoleTransport } from './logging/transports';

export class Logger implements ILogger {
  private static instance: Logger | null = null;

  private level: LogLevel;
  private timestamps: boolean;
  private stackTraces: boolean;
  private context: Record<string, any>;
  private transports: LogTransport[];

  constructor(context: string | Record<string, any>);
  constructor(context: string | Record<string, any>, level: LogLevel);
  constructor(config?: LoggerConfig & { context?: Record<string, any> | string });
  constructor(
    arg?: LoggerConfig & { context?: Record<string, any> | string } | string | Record<string, any>,
    levelArg?: LogLevel
  ) {
    if (typeof arg === 'string' || typeof arg === 'object' && !('level' in (arg ?? {}))) {
      const ctx = arg ?? 'yakkl-core';
      this.context = typeof ctx === 'string' ? { label: ctx } : ctx;
      this.level = levelArg ?? LogLevel.INFO;
      this.timestamps = true;
      this.stackTraces = true;
      this.transports = [new ConsoleTransport()];
    } else {
      const cfg = (arg ?? {}) as LoggerConfig & { context?: Record<string, any> | string };
      const ctx = cfg.context ?? 'yakkl-core';
      this.context = typeof ctx === 'string' ? { label: ctx } : ctx;
      this.level = cfg.level ?? LogLevel.INFO;
      this.timestamps = cfg.timestamps ?? true;
      this.stackTraces = cfg.stackTraces ?? true;
      this.transports = cfg.transports && cfg.transports.length > 0 ? [...cfg.transports] : [new ConsoleTransport()];
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  // Transport management
  addTransport(t: LogTransport): void {
    this.transports.push(t);
  }
  setTransports(ts: LogTransport[]): void {
    this.transports = [...ts];
  }
  clearTransports(): void {
    this.transports = [];
  }

  // Flush/clear persisted logs across transports (where supported)
  async flush(): Promise<void> {
    for (const t of this.transports) {
      try {
        if (typeof (t as any).flush === 'function') {
          await (t as any).flush();
        }
      } catch {
        // ignore
      }
    }
  }

  // Level and context
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  getLevel(): LogLevel {
    return this.level;
  }
  child(context: Record<string, any>): ILogger {
    const c = new Logger({
      level: this.level,
      timestamps: this.timestamps,
      stackTraces: this.stackTraces,
      transports: this.transports,
      context: { ...this.context, ...context }
    });
    return c;
  }

  // Timing helpers
  private timeLabels = new Map<string, number>();
  time(label: string): void {
    this.timeLabels.set(label, Date.now());
  }
  timeEnd(label: string): void {
    const start = this.timeLabels.get(label);
    if (start) {
      const duration = Date.now() - start;
      this.timeLabels.delete(label);
      this.info(`${label}: ${duration}ms`);
    }
  }

  // Console grouping passthrough (no-op for non-console transports)
  group(label: string): void {
    try { console.group?.(label); } catch { /* ignore */ }
  }
  groupEnd(): void {
    try { console.groupEnd?.(); } catch { /* ignore */ }
  }
  clear(): void {
    try { console.clear?.(); } catch { /* ignore */ }
  }

  private createEntry(level: LogLevel, message: string, args?: any[], error?: any): LogEntry {
    return {
      level,
      message,
      args,
      error,
      timestamp: this.timestamps ? new Date() : (new Date()),
      context: this.context
    };
  }

  private dispatch(entry: LogEntry): void {
    const safe = this.sanitizeEntry(entry);
    for (const t of this.transports) {
      try {
        const res = t.write(safe);
        if (res && typeof (res as Promise<void>).then === 'function') {
          (res as Promise<void>).catch(() => undefined);
        }
      } catch {
        // ignore transport errors
      }
    }
  }

  trace(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.TRACE) this.dispatch(this.createEntry(LogLevel.TRACE, message, args));
  }
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) this.dispatch(this.createEntry(LogLevel.DEBUG, message, args));
  }
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) this.dispatch(this.createEntry(LogLevel.INFO, message, args));
  }
  warn(message: string, error?: any, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) this.dispatch(this.createEntry(LogLevel.WARN, message, args, error));
  }
  error(message: string, error?: any, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) this.dispatch(this.createEntry(LogLevel.ERROR, message, args, error));
  }
  fatal?(message: string, error?: any, ...args: any[]): void {
    if (this.level <= LogLevel.FATAL) this.dispatch(this.createEntry(LogLevel.FATAL, message, args, error));
  }

  // Read logs from readable transports
  async getLogs(options?: import('../interfaces/logger.interface').LogReadOptions, redact = true): Promise<LogEntry[]> {
    const results: LogEntry[] = [];
    for (const t of this.transports) {
      const reader = (t as any).read as (opts?: any) => Promise<LogEntry[]> | LogEntry[] | undefined;
      if (typeof reader === 'function') {
        try {
          const r = await reader.call(t, options);
          if (Array.isArray(r)) results.push(...r);
        } catch {
          // ignore
        }
      }
    }
    // Merge and sort
    results.sort((a, b) => (a.timestamp as any) > (b.timestamp as any) ? 1 : -1);
    return redact ? results.map((e) => this.sanitizeEntry(e)) : results;
  }

  // Copy logs to a formatted string
  async copyLogs(options?: import('../interfaces/logger.interface').LogReadOptions): Promise<string> {
    const logs = await this.getLogs(options, true);
    const lines = logs.map((e) => {
      const ts = e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp);
      const lvl = LogLevel[e.level] ?? String(e.level);
      const ctx = e.context?.label ? ` [${e.context.label}]` : '';
      const args = e.args && e.args.length ? ` ${JSON.stringify(e.args)}` : '';
      const err = e.error ? ` Error: ${String(e.error)}` : '';
      return `${ts} [${lvl}]${ctx} ${e.message}${args}${err}`;
    });
    return lines.join('\n');
  }

  // Redaction logic
  private sanitizeEntry(entry: LogEntry): LogEntry {
    const clone = {
      ...entry,
      message: this.sanitizeValue(entry.message),
      args: (entry.args ?? []).map((a) => this.sanitizeValue(a)),
      error: entry.error ? new Error(this.sanitizeValue(String(entry.error))) : undefined,
      context: entry.context ? this.sanitizeValue(entry.context) : undefined
    } as LogEntry;
    return clone;
  }

  private sanitizeValue(value: any): any {
    if (value == null) return value;
    if (typeof value === 'string') return this.sanitizeString(value);
    if (Array.isArray(value)) return value.map((v) => this.sanitizeValue(v));
    if (typeof value === 'object') {
      const out: any = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value)) {
        if (this.isSecretKey(k)) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = this.sanitizeValue(v);
        }
      }
      return out;
    }
    return value;
  }

  private isSecretKey(key: string): boolean {
    const k = key.toLowerCase();
    return (
      k.includes('password') ||
      k.includes('apikey') ||
      k === 'api_key' ||
      k.includes('secret') ||
      k.includes('privatekey') ||
      k === 'private_key' ||
      k.includes('mnemonic') ||
      k.includes('seed') ||
      k.includes('token') ||
      k === 'authorization'
    );
  }

  private sanitizeString(str: string): string {
    let s = String(str);
    // JWT tokens
    s = s.replace(/[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[JWT-REDACTED]');
    // Bearer tokens
    s = s.replace(/Bearer\s+[A-Za-z0-9\._\-\+/=]+/gi, 'Bearer [REDACTED]');
    // 0x + 64-hex (likely private keys or hashes); mask middle
    s = s.replace(/0x[a-fA-F0-9]{64}/g, (m) => `${m.slice(0, 8)}…${m.slice(-4)} [REDACTED-64]`);
    // Long hex without 0x when in a likely key context (handled via keys), but also mask any standalone 64-hex sequences
    s = s.replace(/(?<![a-zA-Z0-9])[a-fA-F0-9]{64}(?![a-zA-Z0-9])/g, (m) => `${m.slice(0, 6)}…${m.slice(-4)} [REDACTED-64]`);
    // Potential mnemonic phrase (12+ words)
    const words = s.trim().split(/\s+/);
    if (words.length >= 12) {
      const alphaWords = words.filter((w) => /^[a-z]+$/i.test(w));
      if (alphaWords.length >= 12) return '[REDACTED MNEMONIC]';
    }
    return s;
  }
}

export const log = Logger.getInstance();
export { LogLevel };
