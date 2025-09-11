// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/types.ts
var CacheError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "CacheError";
  }
};

// src/tiers/MemoryCache.ts
import { LRUCache } from "lru-cache";
var MemoryCache = class {
  constructor(options = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1e3;
    this.cache = new LRUCache({
      max: options.maxSize || 1e3,
      ttl: this.defaultTTL,
      updateAgeOnGet: options.updateAgeOnGet ?? true,
      updateAgeOnHas: options.updateAgeOnHas ?? false,
      // Removed maxEntrySize as it requires sizeCalculation function
      // If size limiting is needed, add sizeCalculation: (entry) => entry.data.length
      dispose: () => {
        this.stats.evictions++;
      }
    });
    this.stats = this.initStats();
  }
  initStats() {
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalSize: 0,
      itemCount: 0,
      evictions: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      costSavings: 0
    };
  }
  async get(key) {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    if (entry) {
      if (entry.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.updateStats("miss", performance.now() - startTime);
        return null;
      }
      entry.hitCount++;
      entry.lastAccessedAt = Date.now();
      this.updateStats("hit", performance.now() - startTime);
      return entry.value;
    }
    this.updateStats("miss", performance.now() - startTime);
    return null;
  }
  async set(key, value, options) {
    const ttl = options?.ttl || this.defaultTTL;
    const now = Date.now();
    const entry = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      hitCount: 0,
      lastAccessedAt: now,
      size: this.estimateSize(value),
      metadata: {
        source: "memory",
        version: 1,
        immutable: options?.strategy === "blockchain" && !options?.ttl
      }
    };
    this.cache.set(key, entry, { ttl });
    this.stats.itemCount = this.cache.size;
    this.stats.totalSize = this.cache.calculatedSize || 0;
  }
  async delete(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.stats.itemCount = this.cache.size;
    return existed;
  }
  async clear() {
    this.cache.clear();
    this.stats = this.initStats();
  }
  async has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  async getMany(keys) {
    return Promise.all(keys.map((key) => this.get(key)));
  }
  async setMany(entries, options) {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }
  async getStats() {
    return {
      ...this.stats,
      itemCount: this.cache.size,
      totalSize: this.cache.calculatedSize || 0
    };
  }
  async keys(pattern) {
    const allKeys = Array.from(this.cache.keys());
    if (!pattern) {
      return allKeys;
    }
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return allKeys.filter((key) => regex.test(key));
  }
  async size() {
    return this.cache.calculatedSize || 0;
  }
  estimateSize(value) {
    try {
      const str = JSON.stringify(value);
      return str.length * 2;
    } catch {
      return 1;
    }
  }
  updateStats(type, responseTime) {
    if (type === "hit") {
      this.stats.hits++;
      this.stats.avgHitTime = (this.stats.avgHitTime * (this.stats.hits - 1) + responseTime) / this.stats.hits;
    } else {
      this.stats.misses++;
      this.stats.avgMissTime = (this.stats.avgMissTime * (this.stats.misses - 1) + responseTime) / this.stats.misses;
    }
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }
  /**
   * Get cache dump for debugging
   */
  dump() {
    const entries = [];
    this.cache.forEach((value, key) => {
      entries.push([key, value]);
    });
    return entries;
  }
  /**
   * Load cache from dump
   */
  load(entries) {
    this.cache.clear();
    for (const [key, entry] of entries) {
      if (entry.expiresAt > Date.now()) {
        this.cache.set(key, entry, {
          ttl: entry.expiresAt - Date.now()
        });
      }
    }
    this.stats.itemCount = this.cache.size;
  }
};

// src/tiers/IndexedDBCache.ts
import { openDB } from "idb";
var IndexedDBCache = class {
  constructor(options = {}) {
    this.db = null;
    this.initPromise = null;
    this.dbName = options.dbName || "yakkl-cache";
    this.storeName = options.storeName || "cache";
    this.maxSize = options.maxSize || 1e4;
    this.defaultTTL = options.ttl || 30 * 60 * 1e3;
    this.stats = this.initStats();
    this.initPromise = this.initializeDB();
  }
  initStats() {
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalSize: 0,
      itemCount: 0,
      evictions: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      costSavings: 0
    };
  }
  async initializeDB() {
    try {
      this.db = await openDB(this.dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("cache")) {
            const store = db.createObjectStore("cache", { keyPath: "key" });
            store.createIndex("by-expiry", "value.expiresAt");
            store.createIndex("by-access", "value.lastAccessedAt");
          }
        }
      });
      await this.cleanupExpired();
    } catch (error) {
      console.error("Failed to initialize IndexedDB:", error);
      throw error;
    }
  }
  async ensureDB() {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    if (!this.db) {
      await this.initializeDB();
    }
    if (!this.db) {
      throw new Error("Failed to initialize IndexedDB");
    }
    return this.db;
  }
  async get(key) {
    const startTime = performance.now();
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const record = await store.get(key);
      if (!record) {
        this.updateStats("miss", performance.now() - startTime);
        return null;
      }
      const entry = record.value;
      if (entry.expiresAt < Date.now()) {
        await this.delete(key);
        this.updateStats("miss", performance.now() - startTime);
        return null;
      }
      entry.hitCount++;
      entry.lastAccessedAt = Date.now();
      const updateTx = db.transaction("cache", "readwrite");
      await updateTx.objectStore("cache").put({ key, value: entry });
      this.updateStats("hit", performance.now() - startTime);
      return entry.value;
    } catch (error) {
      console.error("IndexedDB get error:", error);
      this.updateStats("miss", performance.now() - startTime);
      return null;
    }
  }
  async set(key, value, options) {
    try {
      const db = await this.ensureDB();
      const ttl = options?.ttl || this.defaultTTL;
      const now = Date.now();
      const entry = {
        value,
        createdAt: now,
        expiresAt: now + ttl,
        hitCount: 0,
        lastAccessedAt: now,
        size: this.estimateSize(value),
        metadata: {
          source: "indexeddb",
          version: 1,
          immutable: options?.strategy === "blockchain" && ttl > 24 * 60 * 60 * 1e3
        }
      };
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      await store.put({ key, value: entry });
      await tx.done;
      await this.enforceMaxSize();
      this.stats.itemCount = await this.count();
    } catch (error) {
      console.error("IndexedDB set error:", error);
      throw error;
    }
  }
  async delete(key) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      const existed = await store.get(key) !== void 0;
      if (existed) {
        await store.delete(key);
        await tx.done;
        this.stats.itemCount = await this.count();
      }
      return existed;
    } catch (error) {
      console.error("IndexedDB delete error:", error);
      return false;
    }
  }
  async clear() {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readwrite");
      await tx.objectStore("cache").clear();
      await tx.done;
      this.stats = this.initStats();
    } catch (error) {
      console.error("IndexedDB clear error:", error);
      throw error;
    }
  }
  async has(key) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const record = await store.get(key);
      if (!record) return false;
      if (record.value.expiresAt < Date.now()) {
        await this.delete(key);
        return false;
      }
      return true;
    } catch (error) {
      console.error("IndexedDB has error:", error);
      return false;
    }
  }
  async getMany(keys) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const results = await Promise.all(
        keys.map(async (key) => {
          const record = await store.get(key);
          if (!record || record.value.expiresAt < Date.now()) {
            return null;
          }
          return record.value.value;
        })
      );
      return results;
    } catch (error) {
      console.error("IndexedDB getMany error:", error);
      return keys.map(() => null);
    }
  }
  async setMany(entries, options) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      const ttl = options?.ttl || this.defaultTTL;
      const now = Date.now();
      for (const [key, value] of entries) {
        const entry = {
          value,
          createdAt: now,
          expiresAt: now + ttl,
          hitCount: 0,
          lastAccessedAt: now,
          size: this.estimateSize(value),
          metadata: {
            source: "indexeddb",
            version: 1
          }
        };
        await store.put({ key, value: entry });
      }
      await tx.done;
      await this.enforceMaxSize();
      this.stats.itemCount = await this.count();
    } catch (error) {
      console.error("IndexedDB setMany error:", error);
      throw error;
    }
  }
  async getStats() {
    const itemCount = await this.count();
    const totalSize = await this.size();
    return {
      ...this.stats,
      itemCount,
      totalSize
    };
  }
  async keys(pattern) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const allKeys = await store.getAllKeys();
      if (!pattern) {
        return allKeys;
      }
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return allKeys.filter((key) => regex.test(key));
    } catch (error) {
      console.error("IndexedDB keys error:", error);
      return [];
    }
  }
  async size() {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const allRecords = await store.getAll();
      return allRecords.reduce((total, record) => {
        return total + (record.value.size || 0);
      }, 0);
    } catch (error) {
      console.error("IndexedDB size error:", error);
      return 0;
    }
  }
  async count() {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      return await store.count();
    } catch (error) {
      console.error("IndexedDB count error:", error);
      return 0;
    }
  }
  async cleanupExpired() {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      const index = store.index("by-expiry");
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      for await (const cursor of index.iterate(range)) {
        await cursor.delete();
        this.stats.evictions++;
      }
      await tx.done;
    } catch (error) {
      console.error("IndexedDB cleanup error:", error);
    }
  }
  async enforceMaxSize() {
    try {
      const count = await this.count();
      if (count <= this.maxSize) return;
      const db = await this.ensureDB();
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      const index = store.index("by-access");
      const toDelete = count - this.maxSize;
      let deleted = 0;
      for await (const cursor of index.iterate()) {
        if (deleted >= toDelete) break;
        await cursor.delete();
        deleted++;
        this.stats.evictions++;
      }
      await tx.done;
    } catch (error) {
      console.error("IndexedDB enforce max size error:", error);
    }
  }
  estimateSize(value) {
    try {
      const str = JSON.stringify(value);
      return str.length * 2;
    } catch {
      return 1;
    }
  }
  updateStats(type, responseTime) {
    if (type === "hit") {
      this.stats.hits++;
      this.stats.avgHitTime = (this.stats.avgHitTime * (this.stats.hits - 1) + responseTime) / this.stats.hits;
    } else {
      this.stats.misses++;
      this.stats.avgMissTime = (this.stats.avgMissTime * (this.stats.misses - 1) + responseTime) / this.stats.misses;
    }
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }
};

// src/tiers/PersistentCache.ts
var PersistentCache = class {
  constructor(options = {}) {
    this.storage = options.storageType === "session" ? sessionStorage : localStorage;
    this.maxSize = options.maxSize || 1e5;
    this.defaultTTL = options.ttl || 24 * 60 * 60 * 1e3;
    this.compress = options.compress ?? true;
    this.compressionThreshold = options.compressionThreshold || 1024;
    this.prefix = options.prefix || "yakkl-cache-cold:";
    this.stats = this.initStats();
    this.cleanupExpired();
  }
  initStats() {
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalSize: 0,
      itemCount: 0,
      evictions: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      costSavings: 0
    };
  }
  async get(key) {
    const startTime = performance.now();
    const fullKey = this.prefix + key;
    try {
      const stored = this.storage.getItem(fullKey);
      if (!stored) {
        this.updateStats("miss", performance.now() - startTime);
        return null;
      }
      const entry = await this.deserialize(stored);
      if (entry.expiresAt < Date.now()) {
        this.storage.removeItem(fullKey);
        this.updateStats("miss", performance.now() - startTime);
        return null;
      }
      entry.hitCount++;
      entry.lastAccessedAt = Date.now();
      const serialized = await this.serialize(entry);
      this.storage.setItem(fullKey, serialized);
      this.updateStats("hit", performance.now() - startTime);
      return entry.value;
    } catch (error) {
      console.error("PersistentCache get error:", error);
      this.updateStats("miss", performance.now() - startTime);
      return null;
    }
  }
  async set(key, value, options) {
    const fullKey = this.prefix + key;
    const ttl = options?.ttl || this.defaultTTL;
    const now = Date.now();
    try {
      const entry = {
        value,
        createdAt: now,
        expiresAt: now + ttl,
        hitCount: 0,
        lastAccessedAt: now,
        size: this.estimateSize(value),
        metadata: {
          source: "persistent",
          version: 1,
          immutable: ttl > 7 * 24 * 60 * 60 * 1e3
          // > 7 days = immutable
        }
      };
      const serialized = await this.serialize(entry);
      if (!this.hasStorageSpace(serialized.length)) {
        await this.evictOldest();
      }
      this.storage.setItem(fullKey, serialized);
      this.stats.itemCount = this.getItemCount();
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        await this.evictOldest();
        try {
          const entry = {
            value,
            createdAt: now,
            expiresAt: now + ttl,
            hitCount: 0,
            lastAccessedAt: now,
            size: this.estimateSize(value),
            metadata: { source: "persistent", version: 1 }
          };
          const serialized = await this.serialize(entry);
          this.storage.setItem(fullKey, serialized);
        } catch (retryError) {
          console.error("PersistentCache set failed after eviction:", retryError);
          throw retryError;
        }
      } else {
        console.error("PersistentCache set error:", error);
        throw error;
      }
    }
  }
  async delete(key) {
    const fullKey = this.prefix + key;
    const existed = this.storage.getItem(fullKey) !== null;
    this.storage.removeItem(fullKey);
    this.stats.itemCount = this.getItemCount();
    return existed;
  }
  async clear() {
    const keys = this.getAllKeys();
    keys.forEach((key) => this.storage.removeItem(key));
    this.stats = this.initStats();
  }
  async has(key) {
    const fullKey = this.prefix + key;
    const stored = this.storage.getItem(fullKey);
    if (!stored) return false;
    try {
      const entry = await this.deserialize(stored);
      if (entry.expiresAt < Date.now()) {
        this.storage.removeItem(fullKey);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  async getMany(keys) {
    return Promise.all(keys.map((key) => this.get(key)));
  }
  async setMany(entries, options) {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }
  async getStats() {
    return {
      ...this.stats,
      itemCount: this.getItemCount(),
      totalSize: this.getTotalSize()
    };
  }
  async keys(pattern) {
    const allKeys = this.getAllKeys();
    const cleanKeys = allKeys.map((key) => key.replace(this.prefix, ""));
    if (!pattern) {
      return cleanKeys;
    }
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return cleanKeys.filter((key) => regex.test(key));
  }
  async size() {
    return this.getTotalSize();
  }
  async serialize(entry) {
    const json = JSON.stringify(entry);
    if (this.compress && json.length > this.compressionThreshold) {
      return await this.compressString(json);
    }
    return json;
  }
  async deserialize(data) {
    if (data.startsWith("COMPRESSED:")) {
      const decompressed = await this.decompressString(data.substring(11));
      return JSON.parse(decompressed);
    }
    return JSON.parse(data);
  }
  async compressString(str) {
    if (typeof CompressionStream !== "undefined") {
      const encoder = new TextEncoder();
      const stream = new Response(
        new Blob([encoder.encode(str)]).stream().pipeThrough(
          new CompressionStream("gzip")
        )
      );
      const compressed = await stream.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
      return "COMPRESSED:" + base64;
    }
    return "COMPRESSED:" + this.simpleLZCompress(str);
  }
  async decompressString(compressed) {
    if (typeof DecompressionStream !== "undefined") {
      try {
        const binary = atob(compressed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const stream = new Response(
          new Blob([bytes]).stream().pipeThrough(
            new DecompressionStream("gzip")
          )
        );
        const decompressed = await stream.arrayBuffer();
        const decoder = new TextDecoder();
        return decoder.decode(decompressed);
      } catch (error) {
        return this.simpleLZDecompress(compressed);
      }
    }
    return this.simpleLZDecompress(compressed);
  }
  // Simple LZ compression fallback
  simpleLZCompress(str) {
    const dict = {};
    const out = [];
    let phrase = str[0];
    let code = 256;
    for (let i = 1; i < str.length; i++) {
      const currChar = str[i];
      if (dict[phrase + currChar] != null) {
        phrase += currChar;
      } else {
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        dict[phrase + currChar] = code;
        code++;
        phrase = currChar;
      }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    return out.map((v) => String.fromCharCode(typeof v === "number" ? v : v.charCodeAt(0))).join("");
  }
  simpleLZDecompress(compressed) {
    const dict = {};
    let currChar = compressed[0];
    let oldPhrase = currChar;
    const out = [currChar];
    let code = 256;
    let phrase;
    for (let i = 1; i < compressed.length; i++) {
      const currCode = compressed.charCodeAt(i);
      if (currCode < 256) {
        phrase = compressed[i];
      } else {
        phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar;
      }
      out.push(phrase);
      currChar = phrase[0];
      dict[code] = oldPhrase + currChar;
      code++;
      oldPhrase = phrase;
    }
    return out.join("");
  }
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }
  getItemCount() {
    return this.getAllKeys().length;
  }
  getTotalSize() {
    let total = 0;
    const keys = this.getAllKeys();
    for (const key of keys) {
      const value = this.storage.getItem(key);
      if (value) {
        total += key.length + value.length;
      }
    }
    return total * 2;
  }
  hasStorageSpace(size) {
    try {
      const used = this.getTotalSize();
      const estimated = used + size;
      const limit = 5 * 1024 * 1024;
      return estimated < limit;
    } catch {
      return true;
    }
  }
  async evictOldest() {
    const keys = this.getAllKeys();
    const entries = [];
    for (const key of keys) {
      const stored = this.storage.getItem(key);
      if (stored) {
        try {
          const entry = await this.deserialize(stored);
          entries.push({ key, entry });
        } catch {
          this.storage.removeItem(key);
        }
      }
    }
    entries.sort((a, b) => a.entry.lastAccessedAt - b.entry.lastAccessedAt);
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.storage.removeItem(entries[i].key);
      this.stats.evictions++;
    }
  }
  cleanupExpired() {
    const keys = this.getAllKeys();
    const now = Date.now();
    keys.forEach(async (key) => {
      const stored = this.storage.getItem(key);
      if (stored) {
        try {
          const entry = await this.deserialize(stored);
          if (entry.expiresAt < now) {
            this.storage.removeItem(key);
          }
        } catch {
          this.storage.removeItem(key);
        }
      }
    });
  }
  estimateSize(value) {
    try {
      const str = JSON.stringify(value);
      return str.length * 2;
    } catch {
      return 1;
    }
  }
  updateStats(type, responseTime) {
    if (type === "hit") {
      this.stats.hits++;
      this.stats.avgHitTime = (this.stats.avgHitTime * (this.stats.hits - 1) + responseTime) / this.stats.hits;
    } else {
      this.stats.misses++;
      this.stats.avgMissTime = (this.stats.avgMissTime * (this.stats.misses - 1) + responseTime) / this.stats.misses;
    }
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }
};

// src/utilities/Deduplicator.ts
var Deduplicator = class {
  constructor(options = {}) {
    this.pending = /* @__PURE__ */ new Map();
    this.results = /* @__PURE__ */ new Map();
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.ttl = options.ttl || 6e4;
    this.keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));
  }
  /**
   * Wrap an async function to deduplicate concurrent calls
   */
  wrap(fn, options) {
    const ttl = options?.ttl || this.ttl;
    const keyGen = options?.keyGenerator || this.keyGenerator;
    return async (...args) => {
      const key = keyGen(...args);
      return this.execute(key, () => fn(...args), ttl, options?.onDeduplicated);
    };
  }
  /**
   * Execute a function with deduplication
   */
  async execute(key, fn, ttl, onDeduplicated) {
    this.stats.totalRequests++;
    const pending = this.pending.get(key);
    if (pending) {
      this.stats.deduplicatedRequests++;
      if (onDeduplicated) {
        onDeduplicated(key);
      }
      return pending;
    }
    const cached = this.results.get(key);
    if (cached && cached.expires > Date.now()) {
      this.stats.cacheHits++;
      return cached.value;
    }
    this.stats.cacheMisses++;
    const promise = fn().then(
      (result) => {
        this.results.set(key, {
          value: result,
          expires: Date.now() + (ttl || this.ttl)
        });
        this.pending.delete(key);
        if (this.results.size > 1e3) {
          this.cleanup();
        }
        return result;
      },
      (error) => {
        this.pending.delete(key);
        throw error;
      }
    );
    this.pending.set(key, promise);
    return promise;
  }
  /**
   * Alias for execute for better readability
   */
  async deduplicate(key, fn, ttl, onDeduplicated) {
    return this.execute(key, fn, ttl, onDeduplicated);
  }
  /**
   * Clear all pending and cached results
   */
  clear() {
    this.pending.clear();
    this.results.clear();
  }
  /**
   * Clear specific key
   */
  clearKey(key) {
    this.pending.delete(key);
    this.results.delete(key);
  }
  /**
   * Get statistics
   */
  getStats() {
    const total = this.stats.totalRequests || 1;
    const cacheTotal = this.stats.cacheHits + this.stats.cacheMisses || 1;
    return {
      ...this.stats,
      deduplicationRatio: this.stats.deduplicatedRequests / total,
      cacheHitRatio: this.stats.cacheHits / cacheTotal,
      pendingRequests: this.pending.size,
      cachedResults: this.results.size
    };
  }
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
  /**
   * Cleanup expired results
   */
  cleanup() {
    const now = Date.now();
    for (const [key, result] of this.results.entries()) {
      if (result.expires < now) {
        this.results.delete(key);
      }
    }
  }
  /**
   * Create a deduplication group with shared state
   */
  static createGroup(options) {
    return new DeduplicatorGroup(options);
  }
};
var DeduplicatorGroup = class {
  constructor(options = {}) {
    this.deduplicators = /* @__PURE__ */ new Map();
    this.defaultOptions = options;
  }
  /**
   * Get or create a deduplicator for a namespace
   */
  get(namespace) {
    let dedup = this.deduplicators.get(namespace);
    if (!dedup) {
      dedup = new Deduplicator(this.defaultOptions);
      this.deduplicators.set(namespace, dedup);
    }
    return dedup;
  }
  /**
   * Clear all deduplicators
   */
  clearAll() {
    for (const dedup of this.deduplicators.values()) {
      dedup.clear();
    }
  }
  /**
   * Get combined statistics
   */
  getStats() {
    const stats = {};
    for (const [namespace, dedup] of this.deduplicators.entries()) {
      stats[namespace] = dedup.getStats();
    }
    return stats;
  }
};

// src/utilities/BatchProcessor.ts
import PQueue from "p-queue";
var BatchProcessor = class {
  constructor(options) {
    this.queue = [];
    this.promises = /* @__PURE__ */ new Map();
    this.timer = null;
    this.processing = false;
    this.stats = {
      totalItems: 0,
      totalBatches: 0,
      avgBatchSize: 0,
      errors: 0
    };
    this.options = {
      maxBatchSize: options.maxBatchSize || 100,
      maxWaitTime: options.maxWaitTime || 50,
      concurrency: options.concurrency || 5,
      processor: options.processor,
      keyExtractor: options.keyExtractor || ((item) => JSON.stringify(item)),
      resultMapper: options.resultMapper || this.defaultResultMapper.bind(this)
    };
    this.pQueue = new PQueue({ concurrency: this.options.concurrency });
  }
  /**
   * Add an item to be processed
   */
  async add(item) {
    return new Promise((resolve, reject) => {
      this.queue.push(item);
      this.promises.set(item, { resolve, reject });
      this.stats.totalItems++;
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.options.maxWaitTime);
      }
      if (this.queue.length >= this.options.maxBatchSize) {
        this.flush();
      }
    });
  }
  /**
   * Add multiple items
   */
  async addMany(items) {
    return Promise.all(items.map((item) => this.add(item)));
  }
  /**
   * Process all pending items immediately
   */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) {
      return;
    }
    const batch = this.queue.splice(0, this.options.maxBatchSize);
    const batchPromises = /* @__PURE__ */ new Map();
    for (const item of batch) {
      const promise = this.promises.get(item);
      if (promise) {
        batchPromises.set(item, promise);
        this.promises.delete(item);
      }
    }
    this.stats.totalBatches++;
    this.stats.avgBatchSize = (this.stats.avgBatchSize * (this.stats.totalBatches - 1) + batch.length) / this.stats.totalBatches;
    await this.pQueue.add(async () => {
      try {
        const results = await this.options.processor(batch);
        const resultMap = this.options.resultMapper(batch, results);
        for (const [item, promise] of batchPromises.entries()) {
          const result = resultMap.get(item);
          if (result !== void 0) {
            promise.resolve(result);
          } else {
            promise.reject(new Error("No result for item"));
            this.stats.errors++;
          }
        }
      } catch (error) {
        for (const promise of batchPromises.values()) {
          promise.reject(error);
          this.stats.errors++;
        }
      }
    });
    if (this.queue.length > 0 && !this.timer) {
      this.timer = setTimeout(() => this.flush(), this.options.maxWaitTime);
    }
  }
  /**
   * Wait for all pending items to be processed
   */
  async waitForAll() {
    await this.flush();
    await this.pQueue.onIdle();
  }
  /**
   * Clear all pending items
   */
  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const promise of this.promises.values()) {
      promise.reject(new Error("Batch processor cleared"));
    }
    this.queue = [];
    this.promises.clear();
  }
  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      errorRate: this.stats.totalItems > 0 ? this.stats.errors / this.stats.totalItems : 0,
      pendingItems: this.queue.length,
      activeJobs: this.pQueue.size
    };
  }
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalItems: 0,
      totalBatches: 0,
      avgBatchSize: 0,
      errors: 0
    };
  }
  /**
   * Default result mapper - assumes results are in same order as items
   */
  defaultResultMapper(items, results) {
    const map = /* @__PURE__ */ new Map();
    for (let i = 0; i < items.length && i < results.length; i++) {
      map.set(items[i], results[i]);
    }
    return map;
  }
};
var AutoBatchProcessor = class {
  constructor() {
    this.processors = /* @__PURE__ */ new Map();
  }
  /**
   * Create a batched version of a function
   */
  batch(fn, options) {
    const processorKey = fn.toString();
    let processor = this.processors.get(processorKey);
    if (!processor) {
      processor = new BatchProcessor({
        processor: fn,
        ...options
      });
      this.processors.set(processorKey, processor);
    }
    return async (...args) => {
      return processor.add(args[0]);
    };
  }
  /**
   * Clear all processors
   */
  clearAll() {
    for (const processor of this.processors.values()) {
      processor.clear();
    }
    this.processors.clear();
  }
  /**
   * Get statistics for all processors
   */
  getStats() {
    const stats = {};
    let index = 0;
    for (const processor of this.processors.values()) {
      stats[`processor_${index++}`] = processor.getStats();
    }
    return stats;
  }
};

// src/utilities/CostTracker.ts
var CostTracker = class {
  constructor() {
    this.methods = /* @__PURE__ */ new Map();
    this.metrics = /* @__PURE__ */ new Map();
    this.sessionStartTime = Date.now();
    this.totalSavings = 0;
    this.totalCost = 0;
    this.initializeDefaultMethods();
  }
  /**
   * Initialize with common RPC methods and their costs
   */
  initializeDefaultMethods() {
    this.registerMethod({
      name: "eth_blockNumber",
      computeUnits: 10,
      dollarCost: 4e-6,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getBalance",
      computeUnits: 26,
      dollarCost: 1e-5,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getTransactionCount",
      computeUnits: 26,
      dollarCost: 1e-5,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getBlockByNumber",
      computeUnits: 16,
      dollarCost: 7e-6,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getTransactionByHash",
      computeUnits: 15,
      dollarCost: 6e-6,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getTransactionReceipt",
      computeUnits: 15,
      dollarCost: 6e-6,
      category: "read"
    });
    this.registerMethod({
      name: "eth_call",
      computeUnits: 26,
      dollarCost: 1e-5,
      category: "compute"
    });
    this.registerMethod({
      name: "eth_estimateGas",
      computeUnits: 87,
      dollarCost: 35e-6,
      category: "compute"
    });
    this.registerMethod({
      name: "eth_gasPrice",
      computeUnits: 10,
      dollarCost: 4e-6,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getLogs",
      computeUnits: 75,
      dollarCost: 3e-5,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getCode",
      computeUnits: 26,
      dollarCost: 1e-5,
      category: "read"
    });
    this.registerMethod({
      name: "eth_getStorageAt",
      computeUnits: 17,
      dollarCost: 7e-6,
      category: "storage"
    });
    this.registerMethod({
      name: "eth_sendRawTransaction",
      computeUnits: 250,
      dollarCost: 1e-4,
      category: "write"
    });
    this.registerMethod({
      name: "alchemy_getTokenBalances",
      computeUnits: 100,
      dollarCost: 4e-5,
      category: "read"
    });
    this.registerMethod({
      name: "alchemy_getAssetTransfers",
      computeUnits: 150,
      dollarCost: 6e-5,
      category: "read"
    });
    this.registerMethod({
      name: "getNFTs",
      computeUnits: 100,
      dollarCost: 4e-5,
      category: "read"
    });
    this.registerMethod({
      name: "ipfs_pin",
      computeUnits: 500,
      dollarCost: 2e-4,
      category: "storage"
    });
    this.registerMethod({
      name: "ipfs_get",
      computeUnits: 50,
      dollarCost: 2e-5,
      category: "storage"
    });
  }
  /**
   * Register a new RPC method with its cost
   */
  registerMethod(method) {
    this.methods.set(method.name, method);
  }
  /**
   * Track an RPC call
   */
  trackCall(method, wasCached, responseTime = 0) {
    const rpcMethod = this.methods.get(method);
    if (!rpcMethod) {
      console.warn(`Unknown RPC method: ${method}`);
      return;
    }
    let metric = this.metrics.get(method);
    if (!metric) {
      metric = {
        method,
        calls: 0,
        cachedCalls: 0,
        totalCost: 0,
        savedCost: 0,
        avgResponseTime: 0,
        cacheHitRate: 0
      };
      this.metrics.set(method, metric);
    }
    metric.calls++;
    if (wasCached) {
      metric.cachedCalls++;
      metric.savedCost += rpcMethod.dollarCost;
      this.totalSavings += rpcMethod.dollarCost;
    } else {
      metric.totalCost += rpcMethod.dollarCost;
      this.totalCost += rpcMethod.dollarCost;
    }
    if (responseTime > 0) {
      metric.avgResponseTime = (metric.avgResponseTime * (metric.calls - 1) + responseTime) / metric.calls;
    }
    metric.cacheHitRate = metric.cachedCalls / metric.calls;
  }
  /**
   * Track a batch of calls
   */
  trackBatch(method, count, cachedCount, avgResponseTime = 0) {
    for (let i = 0; i < count; i++) {
      this.trackCall(method, i < cachedCount, avgResponseTime);
    }
  }
  /**
   * Get metrics for a specific method
   */
  getMethodMetrics(method) {
    return this.metrics.get(method);
  }
  /**
   * Get all metrics
   */
  getAllMetrics() {
    return Array.from(this.metrics.values());
  }
  /**
   * Get summary statistics
   */
  getSummary() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    let totalCalls = 0;
    let cachedCalls = 0;
    const costByCategory = {};
    for (const metric of this.metrics.values()) {
      totalCalls += metric.calls;
      cachedCalls += metric.cachedCalls;
      const method = this.methods.get(metric.method);
      if (method) {
        const category = method.category;
        costByCategory[category] = (costByCategory[category] || 0) + metric.totalCost;
      }
    }
    const cacheHitRate = totalCalls > 0 ? cachedCalls / totalCalls : 0;
    const totalSpent = this.totalCost + this.totalSavings;
    const savingsPercentage = totalSpent > 0 ? this.totalSavings / totalSpent * 100 : 0;
    const topMethods = Array.from(this.metrics.values()).sort((a, b) => b.totalCost + b.savedCost - (a.totalCost + a.savedCost)).slice(0, 5).map((m) => ({
      method: m.method,
      calls: m.calls,
      cost: m.totalCost + m.savedCost
    }));
    const hoursElapsed = sessionDuration / (1e3 * 60 * 60);
    const savingsPerHour = hoursElapsed > 0 ? this.totalSavings / hoursElapsed : 0;
    const projectedMonthlySavings = savingsPerHour * 24 * 30;
    return {
      sessionDuration,
      totalCalls,
      cachedCalls,
      cacheHitRate,
      totalCost: this.totalCost,
      totalSavings: this.totalSavings,
      savingsPercentage,
      topMethods,
      costByCategory,
      projectedMonthlySavings
    };
  }
  /**
   * Get cost breakdown by time period
   */
  getCostByPeriod(periodMs = 36e5) {
    return [{
      period: 0,
      cost: this.totalCost,
      savings: this.totalSavings,
      calls: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.calls, 0)
    }];
  }
  /**
   * Export metrics as CSV
   */
  exportCSV() {
    const headers = [
      "Method",
      "Total Calls",
      "Cached Calls",
      "Cache Hit Rate",
      "Total Cost ($)",
      "Saved Cost ($)",
      "Avg Response Time (ms)"
    ].join(",");
    const rows = Array.from(this.metrics.values()).map((m) => [
      m.method,
      m.calls,
      m.cachedCalls,
      (m.cacheHitRate * 100).toFixed(2) + "%",
      m.totalCost.toFixed(6),
      m.savedCost.toFixed(6),
      m.avgResponseTime.toFixed(2)
    ].join(","));
    return [headers, ...rows].join("\n");
  }
  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.totalSavings = 0;
    this.totalCost = 0;
    this.sessionStartTime = Date.now();
  }
  /**
   * Calculate ROI for caching implementation
   */
  calculateROI(implementationCost) {
    const summary = this.getSummary();
    const dailySavings = summary.projectedMonthlySavings / 30;
    return {
      breakEvenDays: dailySavings > 0 ? implementationCost / dailySavings : Infinity,
      monthlyROI: summary.projectedMonthlySavings - implementationCost / 12,
      yearlyROI: summary.projectedMonthlySavings * 12 - implementationCost
    };
  }
};

// src/core/CacheManager.ts
var CacheManager = class {
  constructor(config) {
    this.config = this.mergeConfig(config);
    this.tiers = /* @__PURE__ */ new Map();
    this.strategies = /* @__PURE__ */ new Map();
    this.syncListeners = /* @__PURE__ */ new Set();
    this.stats = this.initStats();
    this.initializeTiers();
    this.initializeUtilities();
    if (this.config.enableSync) {
      this.setupSynchronization();
    }
  }
  mergeConfig(partial) {
    return {
      tierTTL: {
        hot: 5 * 60 * 1e3,
        // 5 minutes
        warm: 30 * 60 * 1e3,
        // 30 minutes
        cold: 24 * 60 * 60 * 1e3
        // 24 hours
      },
      tierMaxSize: {
        hot: 1e3,
        warm: 1e4,
        cold: 1e5
      },
      autoTiering: true,
      enableSync: true,
      enableMetrics: true,
      enableCompression: true,
      compressionThreshold: 1024,
      // 1KB
      batch: {
        enabled: true,
        maxSize: 100,
        maxWait: 100
      },
      dedupe: {
        enabled: true,
        ttl: 5e3
      },
      ...partial
    };
  }
  initStats() {
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalSize: 0,
      itemCount: 0,
      evictions: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      costSavings: 0
    };
  }
  initializeTiers() {
    this.tiers.set("hot", new MemoryCache({
      maxSize: this.config.tierMaxSize.hot,
      ttl: this.config.tierTTL.hot
    }));
    if (typeof window !== "undefined") {
      this.tiers.set("warm", new IndexedDBCache({
        maxSize: this.config.tierMaxSize.warm,
        ttl: this.config.tierTTL.warm,
        dbName: "yakkl-cache-warm"
      }));
      this.tiers.set("cold", new PersistentCache({
        maxSize: this.config.tierMaxSize.cold,
        ttl: this.config.tierTTL.cold,
        compress: this.config.enableCompression,
        compressionThreshold: this.config.compressionThreshold
      }));
    }
  }
  initializeUtilities() {
    if (this.config.dedupe.enabled) {
      this.deduplicator = new Deduplicator({
        ttl: this.config.dedupe.ttl
      });
    }
    if (this.config.batch.enabled) {
      this.batchProcessor = new BatchProcessor({
        maxBatchSize: this.config.batch.maxSize,
        maxWaitTime: this.config.batch.maxWait,
        processor: async (batch) => batch
        // Default processor
      });
    }
    if (this.config.enableMetrics) {
      this.costTracker = new CostTracker();
    }
  }
  setupSynchronization() {
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("storage", (event) => {
        if (event.key?.startsWith("yakkl-cache:")) {
          this.handleSyncEvent({
            type: event.newValue ? "set" : "delete",
            key: event.key.replace("yakkl-cache:", ""),
            value: event.newValue ? JSON.parse(event.newValue) : void 0,
            timestamp: Date.now(),
            source: "remote"
          });
        }
      });
    }
  }
  handleSyncEvent(event) {
    this.syncListeners.forEach((listener) => listener(event));
  }
  /**
   * Get value from cache with automatic tier checking
   */
  async get(key, options) {
    const startTime = Date.now();
    if (this.deduplicator && options?.deduplicate) {
      const cached = null;
      if (cached) {
        this.updateStats("hit", Date.now() - startTime);
        return cached;
      }
    }
    const tiers = ["hot", "warm", "cold"];
    for (const tier of tiers) {
      const cache = this.tiers.get(tier);
      if (cache) {
        const value = await cache.get(key);
        if (value !== null) {
          this.updateStats("hit", Date.now() - startTime);
          if (this.config.autoTiering && tier !== "hot") {
            await this.promote(key, value, tier);
          }
          return value;
        }
      }
    }
    this.updateStats("miss", Date.now() - startTime);
    return null;
  }
  /**
   * Set value in cache with automatic tier selection
   */
  async set(key, value, options) {
    const tier = options?.tier || this.selectTier(value, options);
    const cache = this.tiers.get(tier);
    if (!cache) {
      throw new CacheError(`Invalid cache tier: ${tier}`, "INVALID_KEY");
    }
    if (this.deduplicator && options?.deduplicate) {
      await this.deduplicator.deduplicate(`set:${key}`, async () => {
        return value;
      });
    }
    if (this.batchProcessor && options?.batch) {
      await this.batchProcessor.add({
        id: key,
        type: "set",
        keys: key,
        values: value,
        options
      });
      return;
    }
    await cache.set(key, value, options);
    if (this.costTracker && options?.strategy === "blockchain") {
      this.costTracker.trackCall(key, true, 0);
    }
    if (this.config.enableSync) {
      this.handleSyncEvent({
        type: "set",
        key,
        value,
        timestamp: Date.now(),
        source: "local"
      });
    }
  }
  /**
   * Delete value from all tiers
   */
  async delete(key) {
    let deleted = false;
    for (const cache of this.tiers.values()) {
      const result = await cache.delete(key);
      deleted = deleted || result;
    }
    if (this.deduplicator) {
      await this.deduplicator.deduplicate(`delete:${key}`, async () => {
        return true;
      });
    }
    if (deleted && this.config.enableSync) {
      this.handleSyncEvent({
        type: "delete",
        key,
        timestamp: Date.now(),
        source: "local"
      });
    }
    return deleted;
  }
  /**
   * Clear all caches
   */
  async clear() {
    for (const cache of this.tiers.values()) {
      await cache.clear();
    }
    if (this.deduplicator) {
      await this.deduplicator.clear();
    }
    this.stats = this.initStats();
    if (this.config.enableSync) {
      this.handleSyncEvent({
        type: "clear",
        timestamp: Date.now(),
        source: "local"
      });
    }
  }
  /**
   * Check if key exists in any tier
   */
  async has(key) {
    for (const cache of this.tiers.values()) {
      if (await cache.has(key)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Get multiple values efficiently
   */
  async getMany(keys) {
    if (this.batchProcessor) {
      return Promise.all(keys.map((key) => this.get(key)));
    }
    return Promise.all(keys.map((key) => this.get(key)));
  }
  /**
   * Set multiple values efficiently
   */
  async setMany(entries, options) {
    if (this.batchProcessor) {
      await Promise.all(entries.map(([key, value]) => this.set(key, value, options)));
    }
    await Promise.all(
      entries.map(([key, value]) => this.set(key, value, options))
    );
  }
  /**
   * Get cache statistics
   */
  async getStats() {
    const tierStats = await Promise.all(
      Array.from(this.tiers.values()).map((cache) => cache.getStats())
    );
    const aggregated = tierStats.reduce((acc, stats) => ({
      hits: acc.hits + stats.hits,
      misses: acc.misses + stats.misses,
      totalSize: acc.totalSize + stats.totalSize,
      itemCount: acc.itemCount + stats.itemCount,
      evictions: acc.evictions + stats.evictions,
      hitRatio: 0,
      // Calculate below
      avgHitTime: 0,
      // Calculate below
      avgMissTime: 0,
      // Calculate below
      costSavings: (acc.costSavings || 0) + (stats.costSavings || 0)
    }), this.stats);
    const total = aggregated.hits + aggregated.misses;
    aggregated.hitRatio = total > 0 ? aggregated.hits / total : 0;
    return aggregated;
  }
  /**
   * Get all keys matching pattern
   */
  async keys(pattern) {
    const allKeys = /* @__PURE__ */ new Set();
    for (const cache of this.tiers.values()) {
      const keys = await cache.keys(pattern);
      keys.forEach((key) => allKeys.add(key));
    }
    return Array.from(allKeys);
  }
  /**
   * Get total size of cached data
   */
  async size() {
    const sizes = await Promise.all(
      Array.from(this.tiers.values()).map((cache) => cache.size())
    );
    return sizes.reduce((acc, size) => acc + size, 0);
  }
  /**
   * Register a strategy for specific cache operations
   */
  registerStrategy(name, strategy) {
    this.strategies.set(name, strategy);
  }
  /**
   * Add sync event listener
   */
  onSync(listener) {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }
  // Private helper methods
  async getFromTiers(key, options) {
    const tiers = ["hot", "warm", "cold"];
    for (const tier of tiers) {
      const cache = this.tiers.get(tier);
      if (cache) {
        const value = await cache.get(key);
        if (value !== null) {
          return value;
        }
      }
    }
    return null;
  }
  async setInTiers(key, value, options) {
    const tier = this.selectTier(value, options);
    const cache = this.tiers.get(tier);
    if (cache) {
      await cache.set(key, value, options);
    }
  }
  async deleteFromTiers(key) {
    let deleted = false;
    for (const cache of this.tiers.values()) {
      const result = await cache.delete(key);
      if (result) {
        deleted = true;
      }
    }
    return deleted;
  }
  selectTier(value, options) {
    if (options?.tier) {
      return options.tier;
    }
    if (options?.ttl) {
      if (options.ttl <= this.config.tierTTL.hot) {
        return "hot";
      } else if (options.ttl <= this.config.tierTTL.warm) {
        return "warm";
      } else {
        return "cold";
      }
    }
    return "hot";
  }
  async promote(key, value, fromTier) {
    const hotCache = this.tiers.get("hot");
    if (hotCache) {
      await hotCache.set(key, value, { ttl: this.config.tierTTL.hot });
    }
  }
  updateStats(type, responseTime) {
    if (type === "hit") {
      this.stats.hits++;
      this.stats.avgHitTime = (this.stats.avgHitTime * (this.stats.hits - 1) + responseTime) / this.stats.hits;
    } else {
      this.stats.misses++;
      this.stats.avgMissTime = (this.stats.avgMissTime * (this.stats.misses - 1) + responseTime) / this.stats.misses;
    }
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }
};
var cacheManager = new CacheManager();

// src/strategies/BlockchainCache.ts
var BlockchainCache = class {
  constructor(cacheManager2) {
    this.totalSavings = 0;
    this.cacheManager = cacheManager2;
    this.rpcCosts = this.initializeRPCCosts();
  }
  initializeRPCCosts() {
    const costs = /* @__PURE__ */ new Map();
    costs.set("eth_getBalance", { method: "eth_getBalance", computeUnits: 26, dollarCost: 1e-5 });
    costs.set("eth_call", { method: "eth_call", computeUnits: 26, dollarCost: 1e-5 });
    costs.set("eth_getTransactionReceipt", { method: "eth_getTransactionReceipt", computeUnits: 15, dollarCost: 6e-6 });
    costs.set("eth_getBlockByNumber", { method: "eth_getBlockByNumber", computeUnits: 16, dollarCost: 7e-6 });
    costs.set("eth_getLogs", { method: "eth_getLogs", computeUnits: 75, dollarCost: 3e-5 });
    costs.set("eth_gasPrice", { method: "eth_gasPrice", computeUnits: 10, dollarCost: 4e-6 });
    costs.set("eth_estimateGas", { method: "eth_estimateGas", computeUnits: 87, dollarCost: 35e-6 });
    costs.set("alchemy_getAssetTransfers", { method: "alchemy_getAssetTransfers", computeUnits: 150, dollarCost: 6e-5 });
    costs.set("getNFTs", { method: "getNFTs", computeUnits: 100, dollarCost: 4e-5 });
    return costs;
  }
  /**
   * Get cached blockchain data with intelligent TTL
   */
  async get(query) {
    const key = this.buildCacheKey(query);
    const options = this.getCacheOptions(query);
    const cached = await this.cacheManager.get(key, options);
    if (cached) {
      const cost = this.rpcCosts.get(query.method);
      if (cost) {
        this.totalSavings += cost.dollarCost;
      }
    }
    return cached;
  }
  /**
   * Cache blockchain data with appropriate strategy
   */
  async set(query, data) {
    const key = this.buildCacheKey(query);
    const options = this.getCacheOptions(query);
    await this.cacheManager.set(key, data, options);
  }
  /**
   * Batch multiple blockchain queries efficiently
   */
  async batchGet(queries) {
    const keys = queries.map((q) => this.buildCacheKey(q));
    return this.cacheManager.getMany(keys);
  }
  /**
   * Batch set multiple blockchain results
   */
  async batchSet(queries) {
    const entries = queries.map(({ query, data }) => [
      this.buildCacheKey(query),
      data
    ]);
    await this.cacheManager.setMany(entries, {
      strategy: "blockchain"
    });
  }
  /**
   * Invalidate cache for specific block range
   */
  async invalidateBlockRange(chainId, fromBlock, toBlock) {
    const pattern = `blockchain:${chainId}:*`;
    const keys = await this.cacheManager.keys(pattern);
    for (const key of keys) {
      const parts = key.split(":");
      const blockNum = parseInt(parts[3] || "0");
      if (blockNum >= fromBlock && blockNum <= toBlock) {
        await this.cacheManager.delete(key);
      }
    }
  }
  /**
   * Get total cost savings from cache hits
   */
  getTotalSavings() {
    return this.totalSavings;
  }
  /**
   * Build cache key from query parameters
   */
  buildCacheKey(query) {
    const params = JSON.stringify(query.params);
    const blockPart = query.blockNumber ? `:${query.blockNumber}` : "";
    return `blockchain:${query.chainId}:${query.method}${blockPart}:${this.hashString(params)}`;
  }
  /**
   * Determine cache options based on query type
   */
  getCacheOptions(query) {
    const dataType = this.getDataType(query.method);
    const mutability = this.getDataMutability(query);
    if (!mutability.mutable) {
      return {
        tier: "cold",
        ttl: 7 * 24 * 60 * 60 * 1e3,
        // 7 days
        strategy: "blockchain",
        deduplicate: true
      };
    }
    switch (dataType) {
      case "balance":
      case "gas":
        return {
          tier: "hot",
          ttl: 30 * 1e3,
          // 30 seconds
          strategy: "blockchain",
          deduplicate: true
        };
      case "transaction":
        if (!query.blockNumber) {
          return {
            tier: "hot",
            ttl: 15 * 1e3,
            // 15 seconds
            strategy: "blockchain",
            deduplicate: true
          };
        }
        return {
          tier: "warm",
          ttl: 60 * 60 * 1e3,
          // 1 hour
          strategy: "blockchain",
          deduplicate: true
        };
      case "block":
        const isRecent = this.isRecentBlock(query.blockNumber);
        return {
          tier: isRecent ? "warm" : "cold",
          ttl: isRecent ? 5 * 60 * 1e3 : 24 * 60 * 60 * 1e3,
          strategy: "blockchain",
          deduplicate: true
        };
      case "token":
      case "nft":
        return {
          tier: "warm",
          ttl: 5 * 60 * 1e3,
          // 5 minutes
          strategy: "blockchain",
          deduplicate: true,
          batch: true
        };
      case "ens":
        return {
          tier: "cold",
          ttl: 24 * 60 * 60 * 1e3,
          // 24 hours
          strategy: "blockchain",
          deduplicate: true
        };
      default:
        return {
          tier: "warm",
          ttl: 60 * 1e3,
          // 1 minute
          strategy: "blockchain",
          deduplicate: true
        };
    }
  }
  /**
   * Determine data type from RPC method
   */
  getDataType(method) {
    if (method.includes("Balance")) return "balance";
    if (method.includes("Transaction")) return "transaction";
    if (method.includes("Block")) return "block";
    if (method.includes("gas") || method.includes("Gas")) return "gas";
    if (method.includes("NFT") || method.includes("nft")) return "nft";
    if (method.includes("ens") || method.includes("ENS")) return "ens";
    if (method.includes("Token") || method === "eth_call") return "token";
    return "token";
  }
  /**
   * Determine if data is mutable
   */
  getDataMutability(query) {
    if (query.blockNumber && !this.isRecentBlock(query.blockNumber)) {
      return { mutable: false };
    }
    if (query.method === "eth_getTransactionReceipt" && query.params[0]) {
      return { mutable: false };
    }
    if (query.method === "eth_getLogs" && query.params[0]?.toBlock && query.params[0].toBlock !== "latest") {
      return { mutable: false };
    }
    return { mutable: true };
  }
  /**
   * Check if block is recent (might reorg)
   */
  isRecentBlock(blockNumber) {
    if (!blockNumber) return true;
    return true;
  }
  /**
   * Simple string hash for cache keys
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /**
   * Optimize batch queries by deduplicating and caching
   */
  async optimizeBatchQuery(queries, fetcher) {
    const results = new Array(queries.length);
    const uncachedQueries = [];
    for (let i = 0; i < queries.length; i++) {
      const cached = await this.get(queries[i]);
      if (cached !== null) {
        results[i] = cached;
      } else {
        uncachedQueries.push({ index: i, query: queries[i] });
      }
    }
    if (uncachedQueries.length > 0) {
      const fetchQueries = uncachedQueries.map((item) => item.query);
      const fetchedData = await fetcher(fetchQueries);
      for (let i = 0; i < uncachedQueries.length; i++) {
        const { index, query } = uncachedQueries[i];
        const data = fetchedData[i];
        results[index] = data;
        await this.set(query, data);
      }
    }
    return results;
  }
};

// src/strategies/SemanticCache.ts
var SemanticCache = class {
  constructor(cacheManager2, vectorDB, embeddingProvider) {
    this.vectorDB = null;
    this.embeddingProvider = null;
    this.similarityThreshold = 0.85;
    this.stats = {
      queries: 0,
      hits: 0,
      misses: 0,
      learned: 0,
      avgConfidence: 0
    };
    this.cacheManager = cacheManager2;
    this.vectorDB = vectorDB || null;
    this.embeddingProvider = embeddingProvider || null;
  }
  /**
   * Set embedding provider for generating vectors
   */
  setEmbeddingProvider(provider) {
    this.embeddingProvider = provider;
  }
  /**
   * Set vector database for similarity search
   */
  setVectorDB(vectorDB) {
    this.vectorDB = vectorDB;
  }
  /**
   * Find similar questions and return cached answer if available
   */
  async findSimilar(question, options = {}) {
    this.stats.queries++;
    const cacheKey = this.getCacheKey(question);
    const exact = await this.cacheManager.get(cacheKey);
    if (exact) {
      this.stats.hits++;
      return [exact];
    }
    if (!this.vectorDB || !this.embeddingProvider) {
      this.stats.misses++;
      return [];
    }
    const embedding = await this.embeddingProvider.generate(question);
    const threshold = options.threshold || this.similarityThreshold;
    const topK = options.topK || 5;
    const results = await this.vectorDB.search(
      embedding,
      topK,
      options.category ? { category: options.category } : void 0
    );
    const similar = results.filter((r) => r.score >= threshold).map((r) => {
      const query = {
        id: r.id,
        question: r.metadata?.question || "",
        answer: r.text || "",
        confidence: r.score,
        category: r.metadata?.category,
        metadata: r.metadata
      };
      if (options.boostRecent && query.metadata?.timestamp) {
        const age = Date.now() - query.metadata.timestamp;
        const recencyBoost = Math.max(0, 1 - age / (30 * 24 * 60 * 60 * 1e3));
        query.confidence *= 1 + recencyBoost * 0.1;
      }
      if (options.boostHelpful && query.metadata?.helpful) {
        query.confidence *= 1.2;
      }
      return query;
    }).sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (similar.length > 0) {
      this.stats.hits++;
      const totalConfidence = similar.reduce((sum, q) => sum + (q.confidence || 0), 0);
      this.stats.avgConfidence = (this.stats.avgConfidence * (this.stats.hits - 1) + totalConfidence / similar.length) / this.stats.hits;
      if (similar[0].confidence >= 0.95) {
        await this.cacheManager.set(cacheKey, similar[0], {
          ttl: 24 * 60 * 60 * 1e3,
          // 24 hours
          strategy: "semantic"
        });
      }
    } else {
      this.stats.misses++;
    }
    return similar;
  }
  /**
   * Learn from a new question-answer pair
   */
  async learn(query) {
    const cacheKey = this.getCacheKey(query.question);
    await this.cacheManager.set(cacheKey, query, {
      ttl: 7 * 24 * 60 * 60 * 1e3,
      // 7 days
      strategy: "semantic"
    });
    if (this.vectorDB && this.embeddingProvider) {
      if (!query.embedding) {
        query.embedding = await this.embeddingProvider.generate(query.question);
      }
      await this.vectorDB.upsert([{
        id: query.id || this.generateId(),
        vector: query.embedding,
        text: query.answer,
        metadata: {
          question: query.question,
          category: query.category,
          ...query.metadata,
          learnedAt: Date.now()
        }
      }]);
      this.stats.learned++;
    }
  }
  /**
   * Learn from multiple Q&A pairs
   */
  async learnBatch(queries) {
    if (this.embeddingProvider) {
      const questions = queries.filter((q) => !q.embedding).map((q) => q.question);
      if (questions.length > 0) {
        const embeddings = await this.embeddingProvider.generateBatch(questions);
        let embIndex = 0;
        for (const query of queries) {
          if (!query.embedding) {
            query.embedding = embeddings[embIndex++];
          }
        }
      }
    }
    const cachePromises = queries.map(
      (query) => this.cacheManager.set(this.getCacheKey(query.question), query, {
        ttl: 7 * 24 * 60 * 60 * 1e3,
        strategy: "semantic"
      })
    );
    await Promise.all(cachePromises);
    if (this.vectorDB) {
      const documents = queries.map((query) => ({
        id: query.id || this.generateId(),
        vector: query.embedding,
        text: query.answer,
        metadata: {
          question: query.question,
          category: query.category,
          ...query.metadata,
          learnedAt: Date.now()
        }
      }));
      await this.vectorDB.batchUpsert(documents);
      this.stats.learned += queries.length;
    }
  }
  /**
   * Update answer feedback (helpful/not helpful)
   */
  async updateFeedback(questionId, helpful, additionalMetadata) {
    if (!this.vectorDB) return;
    const docs = await this.vectorDB.fetch([questionId]);
    if (docs.length === 0) return;
    const doc = docs[0];
    const metadata = doc.metadata || {};
    metadata.helpful = helpful;
    metadata.votes = (metadata.votes || 0) + 1;
    if (helpful) {
      metadata.helpfulVotes = (metadata.helpfulVotes || 0) + 1;
    }
    if (additionalMetadata) {
      Object.assign(metadata, additionalMetadata);
    }
    await this.vectorDB.upsert([{
      ...doc,
      metadata
    }]);
  }
  /**
   * Get frequently asked questions
   */
  async getFAQs(category, limit = 10) {
    const pattern = category ? `semantic:${category}:*` : "semantic:*";
    const keys = await this.cacheManager.keys(pattern);
    const faqs = [];
    for (const key of keys.slice(0, limit * 2)) {
      const query = await this.cacheManager.get(key);
      if (query && query.metadata?.source === "faq") {
        faqs.push(query);
      }
    }
    faqs.sort((a, b) => {
      const aScore = (a.metadata?.votes || 0) * (a.metadata?.helpful ? 2 : 1);
      const bScore = (b.metadata?.votes || 0) * (b.metadata?.helpful ? 2 : 1);
      return bScore - aScore;
    });
    return faqs.slice(0, limit);
  }
  /**
   * Search by category and tags
   */
  async searchByMetadata(filters, limit = 10) {
    if (!this.vectorDB) return [];
    const results = await this.vectorDB.search(
      new Array(384).fill(0),
      // Dummy vector
      limit * 3,
      filters
    );
    return results.map((r) => ({
      id: r.id,
      question: r.metadata?.question || "",
      answer: r.text || "",
      confidence: r.score,
      category: r.metadata?.category,
      metadata: r.metadata
    })).slice(0, limit);
  }
  /**
   * Clear semantic cache for a category
   */
  async clearCategory(category) {
    const pattern = `semantic:${category}:*`;
    const keys = await this.cacheManager.keys(pattern);
    for (const key of keys) {
      await this.cacheManager.delete(key);
    }
  }
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.queries > 0 ? this.stats.hits / this.stats.queries : 0
    };
  }
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      queries: 0,
      hits: 0,
      misses: 0,
      learned: 0,
      avgConfidence: 0
    };
  }
  getCacheKey(question) {
    const normalized = question.toLowerCase().trim().replace(/[^\w\s]/g, "");
    const hash = this.hashString(normalized);
    return `semantic:${hash}`;
  }
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  generateId() {
    return `sem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
var MockEmbeddingProvider = class {
  async generate(text) {
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < Math.min(text.length, 384); i++) {
      embedding[i] = text.charCodeAt(i) / 255;
    }
    return embedding;
  }
  async generateBatch(texts) {
    return Promise.all(texts.map((text) => this.generate(text)));
  }
};

// src/storage/vector/VectorDBManager.ts
var VectorDBManager = class {
  constructor(config) {
    this.provider = null;
    this.isConnected = false;
    this.config = config;
  }
  async initialize() {
    switch (this.config.provider) {
      case "cloudflare":
        const { CloudflareVectorProvider } = await import("./CloudflareVectorProvider-VO3EOD7S.js");
        this.provider = new CloudflareVectorProvider(this.config);
        break;
      case "postgres":
        const { PostgresVectorProvider } = await import("./PostgresVectorProvider-HFRWK2LJ.js");
        this.provider = new PostgresVectorProvider(this.config);
        break;
      case "pinecone":
        const { PineconeProvider } = await import("./PineconeProvider-AU4NXZXK.js");
        this.provider = new PineconeProvider(this.config);
        break;
      case "weaviate":
        const { WeaviateProvider } = await import("./WeaviateProvider-7LRVRIV4.js");
        this.provider = new WeaviateProvider(this.config);
        break;
      case "qdrant":
        const { QdrantProvider } = await import("./QdrantProvider-3LZWARUV.js");
        this.provider = new QdrantProvider(this.config);
        break;
      case "chroma":
        const { ChromaProvider } = await import("./ChromaProvider-CIGLOF7D.js");
        this.provider = new ChromaProvider(this.config);
        break;
      default:
        throw new Error(`Unsupported vector DB provider: ${this.config.provider}`);
    }
    await this.connect();
  }
  async connect() {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }
    await this.provider.connect();
    this.isConnected = true;
  }
  async disconnect() {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }
  /**
   * Create a new vector index
   */
  async createIndex(name, dimension, metric) {
    this.ensureConnected();
    const dim = dimension || this.config.dimension || 384;
    const m = metric || this.config.metric || "cosine";
    await this.provider.createIndex(name, dim, m);
  }
  /**
   * Delete a vector index
   */
  async deleteIndex(name) {
    this.ensureConnected();
    await this.provider.deleteIndex(name);
  }
  /**
   * List all indexes
   */
  async listIndexes() {
    this.ensureConnected();
    return this.provider.listIndexes();
  }
  /**
   * Upsert documents with vectors
   */
  async upsert(documents) {
    this.ensureConnected();
    documents.forEach((doc) => {
      if (!doc.vector || doc.vector.length === 0) {
        throw new Error(`Document ${doc.id} has invalid vector`);
      }
    });
    await this.provider.upsert(documents);
  }
  /**
   * Delete documents by IDs
   */
  async delete(ids) {
    this.ensureConnected();
    await this.provider.delete(ids);
  }
  /**
   * Fetch documents by IDs
   */
  async fetch(ids) {
    this.ensureConnected();
    return this.provider.fetch(ids);
  }
  /**
   * Search for similar vectors
   */
  async search(vector, topK = 10, filter) {
    this.ensureConnected();
    if (!vector || vector.length === 0) {
      throw new Error("Invalid search vector");
    }
    return this.provider.search(vector, topK, filter);
  }
  /**
   * Search by text (requires embedding generation)
   */
  async searchByText(text, topK = 10, filter) {
    this.ensureConnected();
    if (!text || text.trim().length === 0) {
      throw new Error("Invalid search text");
    }
    return this.provider.searchByText(text, topK, filter);
  }
  /**
   * Get database statistics
   */
  async getStats() {
    this.ensureConnected();
    return this.provider.getStats();
  }
  /**
   * Batch upsert with automatic chunking
   */
  async batchUpsert(documents, chunkSize = 100) {
    this.ensureConnected();
    for (let i = 0; i < documents.length; i += chunkSize) {
      const chunk = documents.slice(i, i + chunkSize);
      await this.upsert(chunk);
      if (i + chunkSize < documents.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
  /**
   * Hybrid search combining vector similarity and metadata filters
   */
  async hybridSearch(vector, filter, topK = 10, vectorWeight = 0.7) {
    this.ensureConnected();
    const vectorResults = await this.search(vector, topK * 2);
    const filtered = vectorResults.filter((result) => {
      if (!result.metadata) return false;
      return Object.entries(filter).every(([key, value]) => {
        return result.metadata[key] === value;
      });
    });
    const rescored = filtered.map((result) => ({
      ...result,
      score: result.score * vectorWeight + (1 - vectorWeight)
    }));
    rescored.sort((a, b) => b.score - a.score);
    return rescored.slice(0, topK);
  }
  /**
   * Find nearest neighbors for multiple vectors
   */
  async batchSearch(vectors, topK = 10, filter) {
    this.ensureConnected();
    const results = await Promise.all(
      vectors.map((vector) => this.search(vector, topK, filter))
    );
    return results;
  }
  ensureConnected() {
    if (!this.isConnected || !this.provider) {
      throw new Error("VectorDB not connected. Call initialize() first.");
    }
  }
  /**
   * Create a collection with automatic index configuration
   */
  async createCollection(name, schema) {
    this.ensureConnected();
    const dimension = schema?.dimension || this.config.dimension || 384;
    const metric = schema?.metric || this.config.metric || "cosine";
    await this.createIndex(name, dimension, metric);
  }
  /**
   * Get similar documents with pagination
   */
  async getSimilar(id, topK = 10, offset = 0) {
    this.ensureConnected();
    const [doc] = await this.fetch([id]);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }
    const results = await this.search(doc.vector, topK + offset + 1);
    const filtered = results.filter((r) => r.id !== id);
    return filtered.slice(offset, offset + topK);
  }
};

// src/storage/sql/SQLManager.ts
var SQLManager = class {
  // 5 seconds default
  constructor(config) {
    this.provider = null;
    this.isConnected = false;
    this.queryCache = /* @__PURE__ */ new Map();
    this.cacheTimeout = 5e3;
    this.config = config;
  }
  async initialize() {
    switch (this.config.provider) {
      case "postgres":
        const { PostgreSQLProvider } = await import("./PostgreSQLProvider-GICDRQWA.js");
        this.provider = new PostgreSQLProvider(this.config);
        break;
      case "cloudflare-d1":
        const { CloudflareD1Provider } = await import("./CloudflareD1Provider-WRM7YDPQ.js");
        this.provider = new CloudflareD1Provider(this.config);
        break;
      case "sqlite":
        const { SQLiteProvider } = await import("./SQLiteProvider-GLFQQUXK.js");
        this.provider = new SQLiteProvider(this.config);
        break;
      case "mysql":
        const { MySQLProvider } = await import("./MySQLProvider-VUVCYABG.js");
        this.provider = new MySQLProvider(this.config);
        break;
      case "cockroachdb":
        const { CockroachDBProvider } = await import("./CockroachDBProvider-AGPXZWSA.js");
        this.provider = new CockroachDBProvider(this.config);
        break;
      default:
        throw new Error(`Unsupported SQL provider: ${this.config.provider}`);
    }
    await this.connect();
  }
  async connect() {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }
    await this.provider.connect();
    this.isConnected = true;
  }
  async disconnect() {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }
  /**
   * Execute a SQL query
   */
  async query(query, useCache = false) {
    this.ensureConnected();
    if (useCache) {
      const cacheKey = this.getCacheKey(query);
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
    }
    const result = await this.provider.query(query);
    if (useCache) {
      const cacheKey = this.getCacheKey(query);
      this.queryCache.set(cacheKey, { result, timestamp: Date.now() });
      if (this.queryCache.size > 100) {
        const entries = Array.from(this.queryCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, 50).forEach(([key]) => this.queryCache.delete(key));
      }
    }
    return result;
  }
  /**
   * Execute a query expecting a single row result
   */
  async queryOne(query, useCache = false) {
    this.ensureConnected();
    if (useCache) {
      const result = await this.query(query, true);
      return result.rows[0] || null;
    }
    return this.provider.queryOne(query);
  }
  /**
   * Execute a query expecting multiple rows
   */
  async queryMany(query, useCache = false) {
    this.ensureConnected();
    if (useCache) {
      const result = await this.query(query, true);
      return result.rows;
    }
    return this.provider.queryMany(query);
  }
  /**
   * Prepare a statement for repeated execution
   */
  async prepare(name, text) {
    this.ensureConnected();
    await this.provider.prepare(name, text);
  }
  /**
   * Execute a prepared statement
   */
  async execute(name, values) {
    this.ensureConnected();
    return this.provider.execute(name, values);
  }
  /**
   * Begin a transaction
   */
  async beginTransaction() {
    this.ensureConnected();
    return this.provider.beginTransaction();
  }
  /**
   * Execute multiple queries in a batch
   */
  async batch(queries) {
    this.ensureConnected();
    return this.provider.batch(queries);
  }
  /**
   * Create a table
   */
  async createTable(name, schema) {
    this.ensureConnected();
    await this.provider.createTable(name, schema);
  }
  /**
   * Drop a table
   */
  async dropTable(name, ifExists = true) {
    this.ensureConnected();
    await this.provider.dropTable(name, ifExists);
  }
  /**
   * Check if a table exists
   */
  async tableExists(name) {
    this.ensureConnected();
    return this.provider.tableExists(name);
  }
  /**
   * Get table schema
   */
  async getTableSchema(name) {
    this.ensureConnected();
    return this.provider.getTableSchema(name);
  }
  /**
   * Test connection
   */
  async ping() {
    this.ensureConnected();
    return this.provider.ping();
  }
  /**
   * Get database version
   */
  async getVersion() {
    this.ensureConnected();
    return this.provider.getVersion();
  }
  /**
   * Get database statistics
   */
  async getStats() {
    this.ensureConnected();
    return this.provider.getStats();
  }
  /**
   * Execute a parameterized query (safe from SQL injection)
   */
  async safeQuery(text, values) {
    return this.query({ text, values });
  }
  /**
   * Insert data into a table
   */
  async insert(table, data, returning) {
    this.ensureConnected();
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    let text = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
    if (returning && returning.length > 0) {
      text += ` RETURNING ${returning.join(", ")}`;
    }
    const result = await this.query({ text, values });
    return result.rows[0] || null;
  }
  /**
   * Update data in a table
   */
  async update(table, data, where, returning) {
    this.ensureConnected();
    const setColumns = Object.keys(data);
    const setValues = Object.values(data);
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    const setClause = setColumns.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const whereClause = whereColumns.map((col, i) => `${col} = $${setValues.length + i + 1}`).join(" AND ");
    let text = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    if (returning && returning.length > 0) {
      text += ` RETURNING ${returning.join(", ")}`;
    }
    const result = await this.query({
      text,
      values: [...setValues, ...whereValues]
    });
    return result.rows;
  }
  /**
   * Delete data from a table
   */
  async delete(table, where, returning) {
    this.ensureConnected();
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereColumns.map((col, i) => `${col} = $${i + 1}`).join(" AND ");
    let text = `DELETE FROM ${table} WHERE ${whereClause}`;
    if (returning && returning.length > 0) {
      text += ` RETURNING ${returning.join(", ")}`;
    }
    const result = await this.query({ text, values: whereValues });
    return result.rows;
  }
  /**
   * Select data from a table with options
   */
  async select(options) {
    this.ensureConnected();
    const columns = options.columns?.join(", ") || "*";
    let text = `SELECT ${columns} FROM ${options.table}`;
    const values = [];
    if (options.where && Object.keys(options.where).length > 0) {
      const whereColumns = Object.keys(options.where);
      const whereValues = Object.values(options.where);
      const whereClause = whereColumns.map((col, i) => `${col} = $${i + 1}`).join(" AND ");
      text += ` WHERE ${whereClause}`;
      values.push(...whereValues);
    }
    if (options.orderBy && options.orderBy.length > 0) {
      const orderClause = options.orderBy.map(({ column, direction }) => `${column} ${direction || "ASC"}`).join(", ");
      text += ` ORDER BY ${orderClause}`;
    }
    if (options.limit) {
      text += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      text += ` OFFSET ${options.offset}`;
    }
    const result = await this.query({ text, values });
    return result.rows;
  }
  ensureConnected() {
    if (!this.isConnected || !this.provider) {
      throw new Error("SQL database not connected. Call initialize() first.");
    }
  }
  getCacheKey(query) {
    return `${query.text}:${JSON.stringify(query.values || [])}`;
  }
  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
  }
  /**
   * Set cache timeout
   */
  setCacheTimeout(ms) {
    this.cacheTimeout = ms;
  }
};

// src/storage/object/ObjectStorageManager.ts
import { Buffer } from "buffer";
var ObjectStorageManager = class {
  constructor(config) {
    this.provider = null;
    this.isConnected = false;
    this.defaultBucket = null;
    this.config = config;
    this.defaultBucket = config.bucket || null;
  }
  async initialize() {
    switch (this.config.provider) {
      case "s3":
        const { S3Provider } = await import("./S3Provider-YTPHQJWQ.js");
        this.provider = new S3Provider(this.config);
        break;
      case "gcs":
        const { GCSProvider } = await import("./GCSProvider-WZAXUQDL.js");
        this.provider = new GCSProvider(this.config);
        break;
      case "azure":
        const { AzureBlobProvider } = await import("./AzureBlobProvider-57H3A57Q.js");
        this.provider = new AzureBlobProvider(this.config);
        break;
      case "cloudflare-r2":
        const { CloudflareR2Provider } = await import("./CloudflareR2Provider-R3MIWLLG.js");
        this.provider = new CloudflareR2Provider(this.config);
        break;
      case "backblaze-b2":
        const { BackblazeB2Provider } = await import("./BackblazeB2Provider-RUK5COSB.js");
        this.provider = new BackblazeB2Provider(this.config);
        break;
      case "minio":
        const { MinioProvider } = await import("./MinioProvider-CZMU336J.js");
        this.provider = new MinioProvider(this.config);
        break;
      default:
        throw new Error(`Unsupported object storage provider: ${this.config.provider}`);
    }
    await this.connect();
  }
  async connect() {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }
    await this.provider.connect();
    this.isConnected = true;
  }
  async disconnect() {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }
  /**
   * Upload an object to storage
   */
  async upload(key, data, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    const result = await this.provider.putObject(bucket, key, data, options);
    const url = await this.getUrl(key, { bucket });
    return { ...result, url };
  }
  /**
   * Download an object from storage
   */
  async download(key, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    return this.provider.getObject(bucket, key, options);
  }
  /**
   * Delete an object
   */
  async delete(key, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    await this.provider.deleteObject(bucket, key, options?.versionId);
  }
  /**
   * Delete multiple objects
   */
  async deleteMany(keys, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    return this.provider.deleteObjects(bucket, keys);
  }
  /**
   * Copy an object
   */
  async copy(sourceKey, destKey, options) {
    this.ensureConnected();
    const sourceBucket = options?.sourceBucket || this.defaultBucket;
    const destBucket = options?.destBucket || this.defaultBucket;
    if (!sourceBucket || !destBucket) {
      throw new Error("No bucket specified");
    }
    return this.provider.copyObject(
      sourceBucket,
      sourceKey,
      destBucket,
      destKey,
      options
    );
  }
  /**
   * Get object metadata without downloading
   */
  async getMetadata(key, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    return this.provider.headObject(bucket, key, options?.versionId);
  }
  /**
   * Check if object exists
   */
  async exists(key, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    return this.provider.objectExists(bucket, key);
  }
  /**
   * List objects in bucket
   */
  async list(options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    return this.provider.listObjects(bucket, options);
  }
  /**
   * Get a signed/presigned URL for an object
   */
  async getSignedUrl(key, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    return this.provider.getSignedUrl(bucket, key, options);
  }
  /**
   * Get public URL for an object (if publicly accessible)
   */
  async getUrl(key, options) {
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    switch (this.config.provider) {
      case "s3":
        const region = this.config.region || "us-east-1";
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      case "gcs":
        return `https://storage.googleapis.com/${bucket}/${key}`;
      case "azure":
        return `https://${this.config.accountName}.blob.core.windows.net/${bucket}/${key}`;
      case "cloudflare-r2":
        return `https://${this.config.accountName}.r2.cloudflarestorage.com/${bucket}/${key}`;
      default:
        return this.getSignedUrl(key, { bucket, expires: 3600 });
    }
  }
  /**
   * Upload large file using multipart upload
   */
  async uploadLarge(key, data, options) {
    this.ensureConnected();
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error("No bucket specified");
    }
    const partSize = options?.partSize || 5 * 1024 * 1024;
    const uploadId = await this.provider.createMultipartUpload(
      bucket,
      key,
      options?.metadata
    );
    try {
      const parts = [];
      let partNumber = 1;
      if (Buffer.isBuffer(data)) {
        for (let i = 0; i < data.length; i += partSize) {
          const end = Math.min(i + partSize, data.length);
          const partData = data.slice(i, end);
          const { etag } = await this.provider.uploadPart(
            bucket,
            key,
            uploadId,
            partNumber,
            partData
          );
          parts.push({ partNumber, etag });
          partNumber++;
          if (options?.progress) {
            options.progress(end, data.length);
          }
        }
      } else {
        throw new Error("ReadableStream multipart upload not yet implemented");
      }
      return await this.provider.completeMultipartUpload(
        bucket,
        key,
        uploadId,
        parts
      );
    } catch (error) {
      await this.provider.abortMultipartUpload(bucket, key, uploadId);
      throw error;
    }
  }
  /**
   * Create a bucket
   */
  async createBucket(name, options) {
    this.ensureConnected();
    await this.provider.createBucket(name, options);
  }
  /**
   * Delete a bucket
   */
  async deleteBucket(name) {
    this.ensureConnected();
    await this.provider.deleteBucket(name);
  }
  /**
   * List all buckets
   */
  async listBuckets() {
    this.ensureConnected();
    return this.provider.listBuckets();
  }
  /**
   * Check if bucket exists
   */
  async bucketExists(name) {
    this.ensureConnected();
    return this.provider.bucketExists(name);
  }
  /**
   * Set default bucket for operations
   */
  setDefaultBucket(bucket) {
    this.defaultBucket = bucket;
  }
  /**
   * Get storage statistics
   */
  async getStats() {
    this.ensureConnected();
    return this.provider.getStats();
  }
  ensureConnected() {
    if (!this.isConnected || !this.provider) {
      throw new Error("Object storage not connected. Call initialize() first.");
    }
  }
};

// src/storage/kv/KVStoreManager.ts
var KVStoreManager = class {
  constructor(config) {
    this.provider = null;
    this.isConnected = false;
    this.defaultTTL = 3600;
    // 1 hour default
    this.cache = /* @__PURE__ */ new Map();
    this.cacheEnabled = false;
    this.config = config;
  }
  async initialize() {
    switch (this.config.provider) {
      case "cloudflare-kv":
        const { CloudflareKVProvider } = await import("./CloudflareKVProvider-NEICGTLI.js");
        this.provider = new CloudflareKVProvider(this.config);
        break;
      case "redis":
        const { RedisProvider } = await import("./RedisProvider-MQYDNJRW.js");
        this.provider = new RedisProvider(this.config);
        break;
      case "upstash":
        const { UpstashProvider } = await import("./UpstashProvider-CNXJ765P.js");
        this.provider = new UpstashProvider(this.config);
        break;
      case "memcached":
        const { MemcachedProvider } = await import("./MemcachedProvider-3BCOX6X6.js");
        this.provider = new MemcachedProvider(this.config);
        break;
      case "dynamodb":
        const { DynamoDBProvider } = await import("./DynamoDBProvider-7KXW4QFU.js");
        this.provider = new DynamoDBProvider(this.config);
        break;
      case "etcd":
        const { EtcdProvider } = await import("./EtcdProvider-BTTY5CIG.js");
        this.provider = new EtcdProvider(this.config);
        break;
      default:
        throw new Error(`Unsupported KV store provider: ${this.config.provider}`);
    }
    await this.connect();
  }
  async connect() {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initialize() first.");
    }
    await this.provider.connect();
    this.isConnected = true;
  }
  async disconnect() {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }
  /**
   * Get a value by key
   */
  async get(key, useCache = false) {
    this.ensureConnected();
    if (useCache && this.cacheEnabled) {
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
    }
    const value = await this.provider.get(key);
    if (useCache && this.cacheEnabled && value !== null) {
      this.cache.set(key, {
        value,
        expires: Date.now() + 6e4
        // 1 minute cache
      });
      if (this.cache.size > 1e3) {
        const now = Date.now();
        for (const [k, v] of this.cache.entries()) {
          if (v.expires < now) {
            this.cache.delete(k);
          }
        }
      }
    }
    return value;
  }
  /**
   * Get value with metadata
   */
  async getWithMetadata(key) {
    this.ensureConnected();
    return this.provider.getWithMetadata(key);
  }
  /**
   * Set a value with optional TTL and metadata
   */
  async set(key, value, options) {
    this.ensureConnected();
    const metadata = {
      expirationTtl: options?.ttl || this.defaultTTL,
      metadata: options?.metadata
    };
    await this.provider.set(key, value, metadata);
    if (this.cacheEnabled) {
      this.cache.set(key, {
        value,
        expires: Date.now() + metadata.expirationTtl * 1e3
      });
    }
  }
  /**
   * Delete a key
   */
  async delete(key) {
    this.ensureConnected();
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    return this.provider.delete(key);
  }
  /**
   * Get multiple values
   */
  async getMany(keys) {
    this.ensureConnected();
    return this.provider.getMany(keys);
  }
  /**
   * Set multiple values
   */
  async setMany(entries) {
    this.ensureConnected();
    const formattedEntries = entries.map((e) => ({
      key: e.key,
      value: e.value,
      metadata: {
        expirationTtl: e.ttl || this.defaultTTL,
        metadata: e.metadata
      }
    }));
    await this.provider.setMany(formattedEntries);
    if (this.cacheEnabled) {
      entries.forEach((e) => {
        this.cache.set(e.key, {
          value: e.value,
          expires: Date.now() + (e.ttl || this.defaultTTL) * 1e3
        });
      });
    }
  }
  /**
   * Delete multiple keys
   */
  async deleteMany(keys) {
    this.ensureConnected();
    if (this.cacheEnabled) {
      keys.forEach((key) => this.cache.delete(key));
    }
    return this.provider.deleteMany(keys);
  }
  /**
   * Increment a numeric value
   */
  async increment(key, amount = 1) {
    this.ensureConnected();
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    return this.provider.increment(key, amount);
  }
  /**
   * Decrement a numeric value
   */
  async decrement(key, amount = 1) {
    this.ensureConnected();
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    return this.provider.decrement(key, amount);
  }
  /**
   * Compare and swap - atomic update if value matches
   */
  async compareAndSwap(key, oldValue, newValue) {
    this.ensureConnected();
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    return this.provider.compareAndSwap(key, oldValue, newValue);
  }
  /**
   * Set if not exists
   */
  async setIfNotExists(key, value, options) {
    this.ensureConnected();
    const metadata = {
      expirationTtl: options?.ttl || this.defaultTTL,
      metadata: options?.metadata
    };
    const result = await this.provider.setIfNotExists(key, value, metadata);
    if (result && this.cacheEnabled) {
      this.cache.set(key, {
        value,
        expires: Date.now() + metadata.expirationTtl * 1e3
      });
    }
    return result;
  }
  /**
   * List keys with optional prefix
   */
  async list(options) {
    this.ensureConnected();
    return this.provider.list(options);
  }
  /**
   * Get all keys matching pattern
   */
  async keys(pattern) {
    this.ensureConnected();
    return this.provider.keys(pattern);
  }
  /**
   * Set expiration on a key
   */
  async expire(key, seconds) {
    this.ensureConnected();
    return this.provider.expire(key, seconds);
  }
  /**
   * Get remaining TTL
   */
  async ttl(key) {
    this.ensureConnected();
    return this.provider.ttl(key);
  }
  /**
   * Remove expiration
   */
  async persist(key) {
    this.ensureConnected();
    return this.provider.persist(key);
  }
  /**
   * Check if key exists
   */
  async exists(key) {
    this.ensureConnected();
    if (this.cacheEnabled) {
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return true;
      }
    }
    return this.provider.exists(key);
  }
  /**
   * Get type of value
   */
  async type(key) {
    this.ensureConnected();
    return this.provider.type(key);
  }
  /**
   * Get size of value in bytes
   */
  async size(key) {
    this.ensureConnected();
    return this.provider.size(key);
  }
  /**
   * Clear all data
   */
  async flush() {
    this.ensureConnected();
    if (this.cacheEnabled) {
      this.cache.clear();
    }
    await this.provider.flush();
  }
  /**
   * Test connection
   */
  async ping() {
    this.ensureConnected();
    return this.provider.ping();
  }
  /**
   * Get statistics
   */
  async getStats() {
    this.ensureConnected();
    return this.provider.getStats();
  }
  /**
   * Begin a transaction (if supported)
   */
  transaction() {
    this.ensureConnected();
    if (!this.provider.transaction) {
      throw new Error(`Provider ${this.config.provider} does not support transactions`);
    }
    return this.provider.transaction();
  }
  /**
   * Enable local caching
   */
  enableCache() {
    this.cacheEnabled = true;
  }
  /**
   * Disable local caching
   */
  disableCache() {
    this.cacheEnabled = false;
    this.cache.clear();
  }
  /**
   * Clear local cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Set default TTL
   */
  setDefaultTTL(seconds) {
    this.defaultTTL = seconds;
  }
  ensureConnected() {
    if (!this.isConnected || !this.provider) {
      throw new Error("KV store not connected. Call initialize() first.");
    }
  }
  /**
   * JSON-safe operations
   */
  async getJSON(key) {
    const value = await this.get(key);
    if (value === null) return null;
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  }
  async setJSON(key, value, options) {
    const jsonValue = JSON.stringify(value);
    await this.set(key, jsonValue, options);
  }
};

// src/index.ts
var CachePresets = {
  // For browser extension (yakkl-wallet)
  browserExtension: {
    hot: { provider: "memory", maxSize: 500, ttl: 6e4 },
    warm: { provider: "indexeddb", maxSize: 5e3, ttl: 3e5 },
    cold: { provider: "persistent", compress: true, ttl: 864e5 },
    autoTiering: true,
    deduplication: true
  },
  // For MCP server (yakkl-mcp)
  mcpServer: {
    hot: { provider: "memory", maxSize: 2e3, ttl: 3e4 },
    warm: { provider: "memory", maxSize: 1e4, ttl: 3e5 },
    autoTiering: true,
    deduplication: true,
    costTracking: true
  },
  // For support agent
  supportAgent: {
    hot: { provider: "memory", maxSize: 100, ttl: 3e5 },
    warm: { provider: "indexeddb", maxSize: 1e3, ttl: 36e5 },
    cold: { provider: "persistent", compress: true },
    autoTiering: false,
    strategies: ["semantic"]
  },
  // For high-performance scenarios
  performance: {
    hot: { provider: "memory", maxSize: 5e3, ttl: 1e4 },
    autoTiering: false,
    deduplication: true
  },
  // For cost optimization
  costOptimized: {
    hot: { provider: "memory", maxSize: 100, ttl: 5e3 },
    warm: { provider: "indexeddb", maxSize: 1e3, ttl: 6e4 },
    cold: { provider: "persistent", compress: true, ttl: 36e5 },
    autoTiering: true,
    deduplication: true,
    costTracking: true
  }
};
function createCache(config) {
  return new CacheManager(config);
}
export {
  AutoBatchProcessor,
  BatchProcessor,
  BlockchainCache,
  CacheError,
  CacheManager,
  CachePresets,
  CostTracker,
  Deduplicator,
  DeduplicatorGroup,
  IndexedDBCache,
  KVStoreManager,
  MemoryCache,
  MockEmbeddingProvider,
  ObjectStorageManager,
  PersistentCache,
  SQLManager,
  SemanticCache,
  VectorDBManager,
  createCache
};
//# sourceMappingURL=index.js.map