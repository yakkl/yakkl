import { EventEmitter } from "eventemitter3";
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["TRACE"] = 0] = "TRACE";
  LogLevel2[LogLevel2["DEBUG"] = 1] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["FATAL"] = 5] = "FATAL";
  LogLevel2[LogLevel2["SILENT"] = 6] = "SILENT";
  return LogLevel2;
})(LogLevel || {});
function levelToLabel(level) {
  switch (level) {
    case LogLevel.TRACE:
      return "TRACE";
    case LogLevel.DEBUG:
      return "DEBUG";
    case LogLevel.INFO:
      return "INFO";
    case LogLevel.WARN:
      return "WARN";
    case LogLevel.ERROR:
      return "ERROR";
    case LogLevel.FATAL:
      return "FATAL";
    default:
      return String(level);
  }
}
function filterLogs(input, options) {
  if (!options) return input;
  const start = options.startTime ? new Date(options.startTime).getTime() : void 0;
  const end = options.endTime ? new Date(options.endTime).getTime() : void 0;
  const text = options.textIncludes;
  const levelAtLeast = options.levelAtLeast;
  let out = input.filter((e) => {
    const t = e.timestamp instanceof Date ? e.timestamp.getTime() : new Date(e.timestamp).getTime();
    if (start !== void 0 && t < start) return false;
    if (end !== void 0 && t > end) return false;
    if (typeof levelAtLeast === "number" && e.level < levelAtLeast) return false;
    if (text) {
      const hay = `${e.message} ${JSON.stringify(e.args ?? [])} ${e.error ? String(e.error) : ""}`;
      if (typeof text === "string") {
        if (!hay.includes(text)) return false;
      } else if (text instanceof RegExp) {
        if (!text.test(hay)) return false;
      }
    }
    return true;
  });
  out.sort((a, b) => a.timestamp > b.timestamp ? 1 : -1);
  if (options.offset) out = out.slice(options.offset);
  if (options.limit !== void 0) out = out.slice(0, options.limit);
  return out;
}
class ConsoleTransport {
  constructor() {
    this.name = "console";
  }
  write(entry) {
    const ts = entry.timestamp instanceof Date ? entry.timestamp.toISOString() : String(entry.timestamp);
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
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
        console.warn(`[WARN] ${ts}${ctx} - ${entry.message}`, entry.error ?? "", ...args);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`[${levelToLabel(entry.level)}] ${ts}${ctx} - ${entry.message}`, entry.error ?? "", ...args);
        break;
      default:
        console.log(`[${levelToLabel(entry.level)}] ${ts}${ctx} - ${entry.message}`, ...args);
    }
  }
}
class MemoryTransport {
  constructor(limit = 500) {
    this.name = "memory";
    this.buffer = [];
    this.limit = limit;
  }
  write(entry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.limit) {
      this.buffer.shift();
    }
  }
  flush() {
    this.buffer.length = 0;
  }
  read(options) {
    let logs = [...this.buffer];
    logs = filterLogs(logs, options);
    return logs;
  }
}
class LocalStorageTransport {
  constructor(key = "yakklLogs", limit = 500) {
    this.name = "localStorage";
    this.key = key;
    this.limit = limit;
  }
  write(entry) {
    try {
      if (typeof localStorage === "undefined") return;
      const raw = localStorage.getItem(this.key);
      const logs = raw ? JSON.parse(raw) : [];
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
        error: entry.error ? String(entry.error) : void 0
      };
      logs.push(serialized);
      while (logs.length > this.limit) logs.shift();
      localStorage.setItem(this.key, JSON.stringify(logs));
    } catch {
    }
  }
  flush() {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(this.key);
    } catch {
    }
  }
  read(options) {
    try {
      if (typeof localStorage === "undefined") return [];
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : [];
      const logs = parsed.map((e) => ({
        level: typeof e.level === "number" ? e.level : LogLevel[e.level] ?? LogLevel.INFO,
        message: String(e.message ?? ""),
        args: e.args ?? [],
        error: e.error ? new Error(String(e.error)) : void 0,
        timestamp: new Date(e.timestamp ?? Date.now()),
        context: e.context ?? void 0
      }));
      return filterLogs(logs, options);
    } catch {
      return [];
    }
  }
}
class HttpTransport {
  constructor(options) {
    this.name = "http";
    this.endpoint = options.endpoint;
    this.headers = options.headers;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.includeContext = options.includeContext ?? true;
  }
  async write(entry) {
    try {
      if (!this.fetchFn) return;
      const body = {
        level: levelToLabel(entry.level),
        message: entry.message,
        args: entry.args ?? [],
        error: entry.error ? String(entry.error) : void 0,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp
      };
      if (this.includeContext && entry.context) body.context = entry.context;
      await this.fetchFn(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", ...this.headers ?? {} },
        body: JSON.stringify(body)
      }).catch(() => void 0);
    } catch {
    }
  }
}
class D1Transport {
  constructor(db, table = "logs") {
    this.name = "cloudflare-d1";
    this.db = db;
    this.table = table;
  }
  async write(entry) {
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
    }
  }
}
class PostgresTransport {
  constructor(executor, table = "logs") {
    this.name = "postgres";
    this.exec = executor;
    this.table = table;
  }
  async write(entry) {
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
    }
  }
}
class DexieTransport {
  constructor(DexieCtor, dbName = "yakklLogs", tableName = "logs", limit = 500) {
    this.name = "dexie";
    this.Dexie = DexieCtor;
    this.tableName = tableName;
    this.limit = limit;
    this.db = new this.Dexie(dbName);
    this.db.version(1).stores({ [this.tableName]: "++id,timestamp,level,message" });
  }
  async write(entry) {
    try {
      const serial = {
        ...entry,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
        args: entry.args ?? [],
        error: entry.error ? String(entry.error) : void 0
      };
      await this.db.table(this.tableName).add(serial);
      const count = await this.db.table(this.tableName).count();
      if (count > this.limit) {
        const first = await this.db.table(this.tableName).orderBy("id").first();
        if (first?.id) await this.db.table(this.tableName).delete(first.id);
      }
    } catch {
    }
  }
  async flush() {
    try {
      await this.db.table(this.tableName).clear();
    } catch {
    }
  }
  async read(options) {
    try {
      const all = await this.db.table(this.tableName).toArray();
      const logs = all.map((e) => ({
        level: typeof e.level === "number" ? e.level : LogLevel[e.level] ?? LogLevel.INFO,
        message: String(e.message ?? ""),
        args: e.args ?? [],
        error: e.error ? new Error(String(e.error)) : void 0,
        timestamp: new Date(e.timestamp ?? Date.now()),
        context: e.context ?? void 0
      }));
      return filterLogs(logs, options);
    } catch {
      return [];
    }
  }
}
class WebExtensionStorageTransport {
  constructor(key = "yakklLogs", limit = 500) {
    this.name = "webext-storage-local";
    this.key = key;
    this.limit = limit;
  }
  get storageLocal() {
    const g = globalThis;
    return g?.chrome?.storage?.local || g?.browser?.storage?.local;
  }
  async getLogs() {
    try {
      const sl = this.storageLocal;
      if (!sl) return [];
      const result = await new Promise((resolve) => {
        try {
          sl.get(this.key, (res) => resolve(res || {}));
        } catch {
          resolve({});
        }
      });
      return Array.isArray(result?.[this.key]) ? result[this.key] : [];
    } catch {
      return [];
    }
  }
  async setLogs(logs) {
    const sl = this.storageLocal;
    if (!sl) return;
    await new Promise((resolve) => {
      try {
        sl.set({ [this.key]: logs }, () => resolve());
      } catch {
        resolve();
      }
    });
  }
  async write(entry) {
    const logs = await this.getLogs();
    const serial = {
      ...entry,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      args: entry.args ?? [],
      error: entry.error ? String(entry.error) : void 0
    };
    logs.push(serial);
    while (logs.length > this.limit) logs.shift();
    await this.setLogs(logs);
  }
  async flush() {
    await this.setLogs([]);
  }
  async read(options) {
    const parsed = await this.getLogs();
    const logs = parsed.map((e) => ({
      level: typeof e.level === "number" ? e.level : LogLevel[e.level] ?? LogLevel.INFO,
      message: String(e.message ?? ""),
      args: e.args ?? [],
      error: e.error ? new Error(String(e.error)) : void 0,
      timestamp: new Date(e.timestamp ?? Date.now()),
      context: e.context ?? void 0
    }));
    return filterLogs(logs, options);
  }
}
class WebSocketTransport {
  constructor(options) {
    this.name = "websocket";
    this.queue = [];
    this.url = options.url;
    this.ws = options.webSocket;
    this.headers = options.headers;
    if (!this.ws && this.url && globalThis.WebSocket) {
      try {
        const WS = globalThis.WebSocket;
        this.ws = new WS(this.url, this.headers ? { headers: this.headers } : void 0);
        this.ws.onopen = () => {
          const q = [...this.queue];
          this.queue.length = 0;
          for (const payload of q) {
            try {
              this.ws?.send(payload);
            } catch {
            }
          }
        };
      } catch {
      }
    }
  }
  write(entry) {
    const payload = JSON.stringify({
      level: entry.level,
      message: entry.message,
      args: entry.args ?? [],
      error: entry.error ? String(entry.error) : void 0,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      context: entry.context ?? {}
    });
    try {
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(payload);
      } else {
        this.queue.push(payload);
      }
    } catch {
      this.queue.push(payload);
    }
  }
}
const _Logger = class _Logger {
  constructor(arg, levelArg) {
    this.timeLabels = /* @__PURE__ */ new Map();
    if (typeof arg === "string" || typeof arg === "object" && !("level" in (arg ?? {}))) {
      const ctx = arg ?? "yakkl-core";
      this.context = typeof ctx === "string" ? { label: ctx } : ctx;
      this.level = levelArg ?? LogLevel.INFO;
      this.timestamps = true;
      this.stackTraces = true;
      this.transports = [new ConsoleTransport()];
    } else {
      const cfg = arg ?? {};
      const ctx = cfg.context ?? "yakkl-core";
      this.context = typeof ctx === "string" ? { label: ctx } : ctx;
      this.level = cfg.level ?? LogLevel.INFO;
      this.timestamps = cfg.timestamps ?? true;
      this.stackTraces = cfg.stackTraces ?? true;
      this.transports = cfg.transports && cfg.transports.length > 0 ? [...cfg.transports] : [new ConsoleTransport()];
    }
  }
  static getInstance() {
    if (!_Logger.instance) _Logger.instance = new _Logger();
    return _Logger.instance;
  }
  // Transport management
  addTransport(t) {
    this.transports.push(t);
  }
  setTransports(ts) {
    this.transports = [...ts];
  }
  clearTransports() {
    this.transports = [];
  }
  // Flush/clear persisted logs across transports (where supported)
  async flush() {
    for (const t of this.transports) {
      try {
        if (typeof t.flush === "function") {
          await t.flush();
        }
      } catch {
      }
    }
  }
  // Level and context
  setLevel(level) {
    this.level = level;
  }
  getLevel() {
    return this.level;
  }
  child(context) {
    const c = new _Logger({
      level: this.level,
      timestamps: this.timestamps,
      stackTraces: this.stackTraces,
      transports: this.transports,
      context: { ...this.context, ...context }
    });
    return c;
  }
  time(label) {
    this.timeLabels.set(label, Date.now());
  }
  timeEnd(label) {
    const start = this.timeLabels.get(label);
    if (start) {
      const duration = Date.now() - start;
      this.timeLabels.delete(label);
      this.info(`${label}: ${duration}ms`);
    }
  }
  // Console grouping passthrough (no-op for non-console transports)
  group(label) {
    try {
      console.group?.(label);
    } catch {
    }
  }
  groupEnd() {
    try {
      console.groupEnd?.();
    } catch {
    }
  }
  clear() {
    try {
      console.clear?.();
    } catch {
    }
  }
  createEntry(level, message, args, error) {
    return {
      level,
      message,
      args,
      error,
      timestamp: this.timestamps ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(),
      context: this.context
    };
  }
  dispatch(entry) {
    const safe = this.sanitizeEntry(entry);
    for (const t of this.transports) {
      try {
        const res = t.write(safe);
        if (res && typeof res.then === "function") {
          res.catch(() => void 0);
        }
      } catch {
      }
    }
  }
  trace(message, ...args) {
    if (this.level <= LogLevel.TRACE) this.dispatch(this.createEntry(LogLevel.TRACE, message, args));
  }
  debug(message, ...args) {
    if (this.level <= LogLevel.DEBUG) this.dispatch(this.createEntry(LogLevel.DEBUG, message, args));
  }
  info(message, ...args) {
    if (this.level <= LogLevel.INFO) this.dispatch(this.createEntry(LogLevel.INFO, message, args));
  }
  warn(message, error, ...args) {
    if (this.level <= LogLevel.WARN) this.dispatch(this.createEntry(LogLevel.WARN, message, args, error));
  }
  error(message, error, ...args) {
    if (this.level <= LogLevel.ERROR) this.dispatch(this.createEntry(LogLevel.ERROR, message, args, error));
  }
  fatal(message, error, ...args) {
    if (this.level <= LogLevel.FATAL) this.dispatch(this.createEntry(LogLevel.FATAL, message, args, error));
  }
  // Read logs from readable transports
  async getLogs(options, redact = true) {
    const results = [];
    for (const t of this.transports) {
      const reader = t.read;
      if (typeof reader === "function") {
        try {
          const r = await reader.call(t, options);
          if (Array.isArray(r)) results.push(...r);
        } catch {
        }
      }
    }
    results.sort((a, b) => a.timestamp > b.timestamp ? 1 : -1);
    return redact ? results.map((e) => this.sanitizeEntry(e)) : results;
  }
  // Copy logs to a formatted string
  async copyLogs(options) {
    const logs = await this.getLogs(options, true);
    const lines = logs.map((e) => {
      const ts = e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp);
      const lvl = LogLevel[e.level] ?? String(e.level);
      const ctx = e.context?.label ? ` [${e.context.label}]` : "";
      const args = e.args && e.args.length ? ` ${JSON.stringify(e.args)}` : "";
      const err = e.error ? ` Error: ${String(e.error)}` : "";
      return `${ts} [${lvl}]${ctx} ${e.message}${args}${err}`;
    });
    return lines.join("\n");
  }
  // Redaction logic
  sanitizeEntry(entry) {
    const clone = {
      ...entry,
      message: this.sanitizeValue(entry.message),
      args: (entry.args ?? []).map((a) => this.sanitizeValue(a)),
      error: entry.error ? new Error(this.sanitizeValue(String(entry.error))) : void 0,
      context: entry.context ? this.sanitizeValue(entry.context) : void 0
    };
    return clone;
  }
  sanitizeValue(value) {
    if (value == null) return value;
    if (typeof value === "string") return this.sanitizeString(value);
    if (Array.isArray(value)) return value.map((v) => this.sanitizeValue(v));
    if (typeof value === "object") {
      const out = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value)) {
        if (this.isSecretKey(k)) {
          out[k] = "[REDACTED]";
        } else {
          out[k] = this.sanitizeValue(v);
        }
      }
      return out;
    }
    return value;
  }
  isSecretKey(key) {
    const k = key.toLowerCase();
    return k.includes("password") || k.includes("apikey") || k === "api_key" || k.includes("secret") || k.includes("privatekey") || k === "private_key" || k.includes("mnemonic") || k.includes("seed") || k.includes("token") || k === "authorization";
  }
  sanitizeString(str) {
    let s = String(str);
    s = s.replace(/[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, "[JWT-REDACTED]");
    s = s.replace(/Bearer\s+[A-Za-z0-9\._\-\+/=]+/gi, "Bearer [REDACTED]");
    s = s.replace(/0x[a-fA-F0-9]{64}/g, (m) => `${m.slice(0, 8)}…${m.slice(-4)} [REDACTED-64]`);
    s = s.replace(/(?<![a-zA-Z0-9])[a-fA-F0-9]{64}(?![a-zA-Z0-9])/g, (m) => `${m.slice(0, 6)}…${m.slice(-4)} [REDACTED-64]`);
    const words = s.trim().split(/\s+/);
    if (words.length >= 12) {
      const alphaWords = words.filter((w) => /^[a-z]+$/i.test(w));
      if (alphaWords.length >= 12) return "[REDACTED MNEMONIC]";
    }
    return s;
  }
};
_Logger.instance = null;
let Logger = _Logger;
const log = Logger.getInstance();
class ModLoader {
  constructor() {
    this.loadedModules = /* @__PURE__ */ new Map();
    this.systemMods = /* @__PURE__ */ new Map();
    this.logger = new Logger("ModLoader");
    this.registerSystemMods();
  }
  /**
   * Load a mod by ID
   */
  async load(modId) {
    this.logger.info(`Loading mod: ${modId}`);
    try {
      if (this.loadedModules.has(modId)) {
        const module = this.loadedModules.get(modId);
        return this.instantiateMod(module);
      }
      const sources = await this.resolveModSources(modId);
      for (const source of sources) {
        try {
          const module = await this.loadFromSource(modId, source);
          if (module) {
            this.loadedModules.set(modId, module);
            return this.instantiateMod(module);
          }
        } catch (error) {
          this.logger.warn(`Failed to load from ${source.type}: ${source.location}`, error);
          continue;
        }
      }
      throw new Error(`Mod ${modId} not found in any source`);
    } catch (error) {
      this.logger.error(`Failed to load mod ${modId}`, error);
      throw error;
    }
  }
  /**
   * Get list of user-installed mods
   */
  async getUserMods() {
    try {
      const stored = localStorage.getItem("yakkl:userMods");
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      this.logger.warn("Failed to get user mods", error);
      return [];
    }
  }
  /**
   * Install a mod
   */
  async install(modId, source) {
    this.logger.info(`Installing mod: ${modId} from ${source.type}`);
    try {
      const module = await this.loadFromSource(modId, source);
      if (!module) {
        throw new Error("Failed to load mod module");
      }
      await this.validateMod(module);
      const userMods = await this.getUserMods();
      if (!userMods.includes(modId)) {
        userMods.push(modId);
        localStorage.setItem("yakkl:userMods", JSON.stringify(userMods));
      }
      this.loadedModules.set(modId, module);
      this.logger.info(`Mod ${modId} installed successfully`);
    } catch (error) {
      this.logger.error(`Failed to install mod ${modId}`, error);
      throw error;
    }
  }
  /**
   * Uninstall a mod
   */
  async uninstall(modId) {
    this.logger.info(`Uninstalling mod: ${modId}`);
    try {
      const userMods = await this.getUserMods();
      const updated = userMods.filter((id) => id !== modId);
      localStorage.setItem("yakkl:userMods", JSON.stringify(updated));
      this.loadedModules.delete(modId);
      await this.cleanupModStorage(modId);
      this.logger.info(`Mod ${modId} uninstalled successfully`);
    } catch (error) {
      this.logger.error(`Failed to uninstall mod ${modId}`, error);
      throw error;
    }
  }
  /**
   * Check if a mod is available
   */
  async isAvailable(modId) {
    try {
      const sources = await this.resolveModSources(modId);
      return sources.length > 0;
    } catch {
      return false;
    }
  }
  /**
   * Get mod manifest without loading the mod
   */
  async getManifest(modId) {
    try {
      const sources = await this.resolveModSources(modId);
      for (const source of sources) {
        try {
          const manifest = await this.loadManifestFromSource(modId, source);
          if (manifest) {
            return manifest;
          }
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  /**
   * Private methods
   */
  registerSystemMods() {
    this.systemMods.set("basic-portfolio", async () => {
      throw new Error("System mod basic-portfolio not implemented");
    });
    this.systemMods.set("account-manager", async () => {
      throw new Error("System mod account-manager not implemented");
    });
    this.systemMods.set("network-manager", async () => {
      throw new Error("System mod network-manager not implemented");
    });
  }
  async resolveModSources(modId) {
    const sources = [];
    if (this.systemMods.has(modId)) {
      sources.push({
        type: "system",
        location: modId,
        verified: true
      });
    }
    sources.push({
      type: "local",
      location: `/src/routes/preview2/lib/mods/${modId}/index.ts`,
      verified: true
    });
    sources.push({
      type: "npm",
      location: `@yakkl/mod-${modId}`,
      verified: false
    });
    sources.push({
      type: "url",
      location: `https://registry.yakkl.com/mods/${modId}/latest.js`,
      verified: true
    });
    return sources;
  }
  async loadFromSource(modId, source) {
    switch (source.type) {
      case "system":
        return this.loadSystemMod(modId);
      case "local":
        return this.loadLocalMod(source.location);
      case "npm":
        return this.loadNpmMod(source.location);
      case "url":
        return this.loadUrlMod(source.location);
      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }
  }
  async loadSystemMod(modId) {
    const loader = this.systemMods.get(modId);
    if (!loader) {
      throw new Error(`System mod ${modId} not found`);
    }
    try {
      return await loader();
    } catch (error) {
      this.logger.warn(`System mod ${modId} not implemented`, error);
      return null;
    }
  }
  async loadLocalMod(location) {
    try {
      return await import(
        /* @vite-ignore */
        location
      );
    } catch (error) {
      throw new Error(`Failed to load local mod: ${error}`);
    }
  }
  async loadNpmMod(packageName) {
    try {
      return await import(
        /* @vite-ignore */
        packageName
      );
    } catch (error) {
      throw new Error(`Failed to load NPM mod: ${error}`);
    }
  }
  async loadUrlMod(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const code = await response.text();
      if (!code.includes("export")) {
        throw new Error("Invalid mod format - no exports found");
      }
      const blob = new Blob([code], { type: "application/javascript" });
      const moduleUrl = URL.createObjectURL(blob);
      try {
        const module = await import(
          /* @vite-ignore */
          moduleUrl
        );
        return module;
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
    } catch (error) {
      throw new Error(`Failed to load remote mod: ${error}`);
    }
  }
  async loadManifestFromSource(modId, source) {
    try {
      switch (source.type) {
        case "system":
        case "local":
          const manifestUrl = source.location.replace("/index.ts", "/manifest.json");
          const response = await fetch(manifestUrl);
          if (response.ok) {
            return await response.json();
          }
          return null;
        case "npm":
          const module = await this.loadNpmMod(source.location);
          return module?.manifest || null;
        case "url":
          const registryUrl = source.location.replace("/latest.js", "/manifest.json");
          const manifestResponse = await fetch(registryUrl);
          if (manifestResponse.ok) {
            return await manifestResponse.json();
          }
          return null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
  instantiateMod(module) {
    const ModClass = module.default || module.Mod || Object.values(module)[0];
    if (!ModClass || typeof ModClass !== "function") {
      throw new Error("Invalid mod format - no mod class found");
    }
    return new ModClass();
  }
  async validateMod(module) {
    const mod = this.instantiateMod(module);
    if (!mod.manifest) {
      throw new Error("Mod missing manifest");
    }
    if (!mod.manifest.id || !mod.manifest.name || !mod.manifest.version) {
      throw new Error("Mod manifest missing required fields");
    }
    const requiredMethods = ["initialize", "destroy", "isLoaded", "isActive"];
    for (const method of requiredMethods) {
      if (typeof mod[method] !== "function") {
        throw new Error(`Mod missing required method: ${method}`);
      }
    }
    this.logger.debug(`Mod ${mod.manifest.id} validation passed`);
  }
  async cleanupModStorage(modId) {
    try {
      const prefix = `mod:${modId}:`;
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      keys.forEach((k) => localStorage.removeItem(k));
      this.logger.debug(`Cleaned up storage for mod ${modId}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup storage for mod ${modId}`, error);
    }
  }
}
class ModRegistry extends EventEmitter {
  constructor(engine) {
    super();
    this.loadedMods = /* @__PURE__ */ new Map();
    this.manifests = /* @__PURE__ */ new Map();
    this.enhancements = /* @__PURE__ */ new Map();
    this.permissions = /* @__PURE__ */ new Map();
    this.engine = engine;
    this.loader = new ModLoader();
    this.logger = new Logger("ModRegistry");
  }
  /**
   * Initialize the registry
   */
  async initialize() {
    this.logger.info("Initializing mod registry");
    try {
      await this.loadSystemMods();
      await this.loadUserMods();
      await this.detectEnhancements();
      this.logger.info(`Registry initialized with ${this.loadedMods.size} mods`);
    } catch (error) {
      this.logger.error("Failed to initialize registry", error);
      throw error;
    }
  }
  /**
   * Load a mod by ID
   */
  async load(modId) {
    const existing = this.loadedMods.get(modId);
    if (existing) {
      return existing;
    }
    this.logger.info(`Loading mod: ${modId}`);
    try {
      const mod = await this.loader.load(modId);
      await this.validatePermissions(mod);
      await mod.initialize(this.engine);
      this.loadedMods.set(modId, mod);
      this.manifests.set(modId, mod.manifest);
      this.permissions.set(modId, mod.manifest.permissions);
      await this.checkEnhancements(mod);
      this.emit("mod:loaded", mod);
      this.logger.info(`Mod loaded successfully: ${modId}`);
      return mod;
    } catch (error) {
      this.logger.error(`Failed to load mod: ${modId}`, error);
      this.emit("mod:error", modId, error);
      throw error;
    }
  }
  /**
   * Unload a mod
   */
  async unload(modId) {
    const mod = this.loadedMods.get(modId);
    if (!mod) {
      return;
    }
    this.logger.info(`Unloading mod: ${modId}`);
    try {
      this.removeEnhancements(modId);
      await mod.destroy();
      this.loadedMods.delete(modId);
      this.manifests.delete(modId);
      this.permissions.delete(modId);
      this.emit("mod:unloaded", modId);
      this.logger.info(`Mod unloaded: ${modId}`);
    } catch (error) {
      this.logger.error(`Failed to unload mod: ${modId}`, error);
      throw error;
    }
  }
  /**
   * Get all loaded mods
   */
  getLoaded() {
    return Array.from(this.loadedMods.values());
  }
  /**
   * Get mod by ID
   */
  get(modId) {
    return this.loadedMods.get(modId) || null;
  }
  /**
   * Check if mod is loaded
   */
  isLoaded(modId) {
    return this.loadedMods.has(modId);
  }
  /**
   * Get mod manifest
   */
  getManifest(modId) {
    return this.manifests.get(modId) || null;
  }
  /**
   * Get all manifests
   */
  getAllManifests() {
    return Array.from(this.manifests.values());
  }
  /**
   * Get mods by category
   */
  getByCategory(category) {
    return Array.from(this.loadedMods.values()).filter((v) => v.manifest.category === category);
  }
  /**
   * Get mods by tier
   */
  getByTier(tier) {
    return Array.from(this.loadedMods.values()).filter((v) => v.manifest.tier === tier);
  }
  /**
   * Get enhancements for a mod
   */
  getEnhancements(modId) {
    return this.enhancements.get(modId) || [];
  }
  /**
   * Get all enhancements
   */
  getAllEnhancements() {
    const all = [];
    for (const enhancements of this.enhancements.values()) {
      all.push(...enhancements);
    }
    return all;
  }
  /**
   * Destroy the registry
   */
  async destroy() {
    this.logger.info("Destroying mod registry");
    const modIds = Array.from(this.loadedMods.keys());
    await Promise.all(modIds.map((id) => this.unload(id)));
    this.loadedMods.clear();
    this.manifests.clear();
    this.enhancements.clear();
    this.permissions.clear();
    this.removeAllListeners();
  }
  /**
   * Load system mods (built-in)
   */
  async loadSystemMods() {
    const systemMods = [
      "basic-portfolio",
      "send-receive",
      "network-manager",
      "account-manager"
    ];
    for (const modId of systemMods) {
      try {
        await this.load(modId);
      } catch (error) {
        this.logger.warn(`Failed to load system mod: ${modId}`, error);
      }
    }
  }
  /**
   * Load user-installed mods
   */
  async loadUserMods() {
    try {
      const userMods = await this.loader.getUserMods();
      for (const modId of userMods) {
        try {
          await this.load(modId);
        } catch (error) {
          this.logger.warn(`Failed to load user mod: ${modId}`, error);
        }
      }
    } catch (error) {
      this.logger.warn("Failed to load user mods", error);
    }
  }
  /**
   * Validate mod permissions
   */
  async validatePermissions(mod) {
    const manifest = mod.manifest;
    const config = this.engine.getConfig();
    if (config.restrictions.includes("enterprise-only") && manifest.tier !== "enterprise") {
      throw new Error(`Mod ${manifest.id} not allowed in enterprise-only mode`);
    }
    for (const permission of manifest.permissions) {
      if (!this.isPermissionGranted(permission, config)) {
        throw new Error(`Permission ${permission} not granted for mod ${manifest.id}`);
      }
    }
  }
  /**
   * Check if permission is granted
   */
  isPermissionGranted(permission, config) {
    return true;
  }
  /**
   * Detect potential enhancements between mods
   */
  async detectEnhancements() {
    const mods = Array.from(this.loadedMods.values());
    for (const mod of mods) {
      await this.checkEnhancements(mod);
    }
  }
  /**
   * Check enhancements for a specific mod
   */
  async checkEnhancements(mod) {
    const manifest = mod.manifest;
    for (const targetId of manifest.enhances) {
      const targetMod = this.loadedMods.get(targetId);
      if (targetMod) {
        const canEnhance = await mod.enhance(targetMod);
        if (canEnhance) {
          const enhancement = {
            sourceMod: manifest.id,
            targetMod: targetId,
            type: "feature",
            description: `${manifest.name} enhances ${targetMod.manifest.name}`,
            active: true
          };
          this.addEnhancement(enhancement);
        }
      }
    }
  }
  /**
   * Add an enhancement
   */
  addEnhancement(enhancement) {
    const existing = this.enhancements.get(enhancement.targetMod) || [];
    existing.push(enhancement);
    this.enhancements.set(enhancement.targetMod, existing);
    this.emit("enhancement:added", enhancement);
    this.logger.info(`Enhancement added: ${enhancement.sourceMod} → ${enhancement.targetMod}`);
  }
  /**
   * Remove enhancements for a mod
   */
  removeEnhancements(modId) {
    for (const [targetId, enhancements] of this.enhancements.entries()) {
      const filtered = enhancements.filter((e) => e.sourceMod !== modId);
      if (filtered.length !== enhancements.length) {
        this.enhancements.set(targetId, filtered);
        const removed = enhancements.filter((e) => e.sourceMod === modId);
        removed.forEach((e) => this.emit("enhancement:removed", e));
      }
    }
    this.enhancements.delete(modId);
  }
}
class DiscoveryProtocol extends EventEmitter {
  constructor(engine) {
    super();
    this.discoveredMods = /* @__PURE__ */ new Map();
    this.discoveredPeers = /* @__PURE__ */ new Map();
    this.scanInterval = null;
    this.running = false;
    this.engine = engine;
    this.logger = new Logger("DiscoveryProtocol");
  }
  /**
   * Start the discovery protocol
   */
  async start() {
    if (this.running) return;
    this.logger.info("Starting mod discovery protocol");
    try {
      await this.scanEnvironment();
      this.scanInterval = setInterval(() => {
        this.scanEnvironment().catch((error) => {
          this.logger.warn("Discovery scan failed", error);
        });
      }, 3e4);
      await this.setupPeerDetection();
      this.running = true;
    } catch (error) {
      this.logger.error("Failed to start discovery protocol", error);
      throw error;
    }
  }
  /**
   * Stop the discovery protocol
   */
  async stop() {
    if (!this.running) return;
    this.logger.info("Stopping mod discovery protocol");
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    await this.teardownPeerDetection();
    this.discoveredMods.clear();
    this.discoveredPeers.clear();
    this.running = false;
  }
  /**
   * Manually scan for mods
   */
  async scan() {
    return this.scanEnvironment();
  }
  /**
   * Get all discovered mods
   */
  getDiscoveredMods() {
    return Array.from(this.discoveredMods.values());
  }
  /**
   * Get all discovered peers
   */
  getDiscoveredPeers() {
    return Array.from(this.discoveredPeers.values());
  }
  /**
   * Check if a specific mod is available in the environment
   */
  isModAvailable(modId) {
    return this.discoveredMods.has(modId);
  }
  /**
   * Private methods
   */
  async scanEnvironment() {
    const discovered = [];
    try {
      const sources = ["registry", "local", "environment", "peer"];
      for (const source of sources) {
        try {
          const mods = await this.scanSource(source);
          discovered.push(...mods);
        } catch (error) {
          this.logger.debug(`Failed to scan ${source}`, error);
        }
      }
      const newMods = [];
      for (const mod of discovered) {
        if (!this.discoveredMods.has(mod.manifest.id)) {
          newMods.push(mod);
        }
        this.discoveredMods.set(mod.manifest.id, mod);
      }
      if (newMods.length > 0) {
        this.emit("mod:discovered", newMods);
        this.logger.info(`Discovered ${newMods.length} new mods`);
      }
      return discovered;
    } catch (error) {
      this.logger.error("Environment scan failed", error);
      return [];
    }
  }
  async scanSource(source) {
    switch (source) {
      case "registry":
        return this.scanRegistry();
      case "local":
        return this.scanLocal();
      case "environment":
        return this.scanEnvironmentMods();
      case "peer":
        return this.scanPeerMods();
      default:
        return [];
    }
  }
  async scanRegistry() {
    try {
      const response = await fetch("https://registry.yakkl.com/api/mods/featured");
      if (!response.ok) {
        throw new Error(`Registry request failed: ${response.status}`);
      }
      const data = await response.json();
      return data.mods.map((manifest) => ({
        source: "registry",
        manifest,
        verified: true,
        available: true,
        installUrl: `https://registry.yakkl.com/mods/${manifest.id}/install`
      }));
    } catch (error) {
      this.logger.debug("Registry scan failed", error);
      return [];
    }
  }
  async scanLocal() {
    try {
      const localMods = [];
      if (typeof import.meta !== "undefined" && false) ;
      return localMods;
    } catch (error) {
      this.logger.debug("Local scan failed", error);
      return [];
    }
  }
  async scanEnvironmentMods() {
    try {
      const mods = [];
      const modElements = document.querySelectorAll("[data-yakkl-mod]");
      for (let i = 0; i < modElements.length; i++) {
        const element = modElements[i];
        try {
          const modData = element.getAttribute("data-yakkl-mod");
          if (modData) {
            const manifest = JSON.parse(modData);
            mods.push({
              source: "environment",
              manifest,
              verified: false,
              available: true
            });
          }
        } catch {
        }
      }
      this.setupPostMessageListener();
      return mods;
    } catch (error) {
      this.logger.debug("Environment scan failed", error);
      return [];
    }
  }
  async scanPeerMods() {
    const mods = [];
    for (const peer of this.discoveredPeers.values()) {
      for (const modId of peer.mods) {
        mods.push({
          source: "peer",
          manifest: { id: modId, name: modId, version: "1.0.0" },
          verified: false,
          available: true
        });
      }
    }
    return mods;
  }
  async setupPeerDetection() {
    if (typeof window !== "undefined") {
      this.broadcastPresence().catch((error) => {
        this.logger.debug("Failed to broadcast initial presence", error);
      });
      window.addEventListener("message", this.handlePeerMessage.bind(this));
      setInterval(() => {
        this.broadcastPresence().catch((error) => {
          this.logger.debug("Failed to broadcast periodic presence", error);
        });
      }, 6e4);
    }
  }
  async teardownPeerDetection() {
    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.handlePeerMessage.bind(this));
    }
  }
  async broadcastPresence() {
    try {
      const presence = {
        type: "yakkl:presence",
        id: this.generatePeerId(),
        version: "2.0.0",
        mods: (await this.engine.getLoadedMods()).map((m) => m.manifest.id),
        capabilities: ["mod-discovery", "cross-enhancement"],
        timestamp: Date.now()
      };
      if (window.parent !== window) {
        window.parent.postMessage(presence, "*");
      }
      for (let i = 0; i < window.frames.length; i++) {
        try {
          window.frames[i].postMessage(presence, "*");
        } catch {
        }
      }
    } catch (error) {
      this.logger.debug("Failed to broadcast presence", error);
    }
  }
  handlePeerMessage(event) {
    try {
      const data = event.data;
      if (data.type === "yakkl:presence") {
        const peer = {
          id: data.id,
          type: "webapp",
          // Assume webapp for now
          version: data.version,
          mods: data.mods || [],
          capabilities: data.capabilities || []
        };
        this.discoveredPeers.set(peer.id, peer);
        this.emit("peer:detected", peer);
        this.logger.debug(`Discovered peer: ${peer.id} with ${peer.mods.length} mods`);
      }
    } catch (error) {
      this.logger.debug("Failed to handle peer message", error);
    }
  }
  setupPostMessageListener() {
    window.addEventListener("message", (event) => {
      try {
        const data = event.data;
        if (data.type === "yakkl:mod-announcement") {
          const discoveredMod = {
            source: "environment",
            manifest: data.manifest,
            verified: data.verified || false,
            available: true
          };
          this.discoveredMods.set(data.manifest.id, discoveredMod);
          this.emit("mod:discovered", [discoveredMod]);
        }
      } catch {
      }
    });
  }
  generatePeerId() {
    if (!localStorage.getItem("yakkl:peerId")) {
      const id = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("yakkl:peerId", id);
    }
    return localStorage.getItem("yakkl:peerId");
  }
}
export {
  ConsoleTransport as C,
  DiscoveryProtocol as D,
  HttpTransport as H,
  LogLevel as L,
  ModRegistry as M,
  PostgresTransport as P,
  WebExtensionStorageTransport as W,
  ModLoader as a,
  Logger as b,
  MemoryTransport as c,
  LocalStorageTransport as d,
  D1Transport as e,
  DexieTransport as f,
  WebSocketTransport as g,
  log as l
};
//# sourceMappingURL=DiscoveryProtocol-B9ADSwn1.mjs.map
