"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/kv/providers/CloudflareKVProvider.ts
var CloudflareKVProvider = class {
  constructor(config) {
    this.kv = null;
    this.useWorkerBinding = false;
    this.config = config;
    this.accountId = config.accountId || "";
    this.namespaceId = config.namespace || "";
    this.apiToken = config.apiToken || "";
    if (typeof globalThis !== "undefined" && config.bindingName) {
      const binding = globalThis[config.bindingName];
      if (binding) {
        this.kv = binding;
        this.useWorkerBinding = true;
      }
    }
  }
  async connect() {
    if (this.useWorkerBinding) {
      return;
    }
    this.kv = this.createRESTClient();
  }
  async disconnect() {
    this.kv = null;
  }
  async get(key) {
    if (!this.kv) {
      throw new Error("Not connected to Cloudflare KV");
    }
    if (this.useWorkerBinding) {
      const value = await this.kv.get(key, { type: "json" });
      return value;
    }
    const response = await this.restGet(key);
    return response;
  }
  async getWithMetadata(key) {
    if (!this.kv) {
      throw new Error("Not connected to Cloudflare KV");
    }
    if (this.useWorkerBinding) {
      const result = await this.kv.getWithMetadata(key, { type: "json" });
      return {
        value: _optionalChain([result, 'optionalAccess', _ => _.value]) || null,
        metadata: _optionalChain([result, 'optionalAccess', _2 => _2.metadata]) ? {
          metadata: result.metadata,
          expiration: result.expiration
        } : void 0
      };
    }
    const response = await this.restGetWithMetadata(key);
    return response;
  }
  async set(key, value, metadata) {
    if (!this.kv) {
      throw new Error("Not connected to Cloudflare KV");
    }
    const options = {};
    if (_optionalChain([metadata, 'optionalAccess', _3 => _3.expiration])) {
      options.expiration = metadata.expiration;
    } else if (_optionalChain([metadata, 'optionalAccess', _4 => _4.expirationTtl])) {
      options.expirationTtl = metadata.expirationTtl;
    }
    if (_optionalChain([metadata, 'optionalAccess', _5 => _5.metadata])) {
      options.metadata = metadata.metadata;
    }
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    if (this.useWorkerBinding) {
      await this.kv.put(key, stringValue, options);
    } else {
      await this.restPut(key, stringValue, options);
    }
  }
  async delete(key) {
    if (!this.kv) {
      throw new Error("Not connected to Cloudflare KV");
    }
    try {
      if (this.useWorkerBinding) {
        await this.kv.delete(key);
      } else {
        await this.restDelete(key);
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  async getMany(keys) {
    const results = /* @__PURE__ */ new Map();
    const promises = keys.map(async (key) => {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    });
    await Promise.all(promises);
    return results;
  }
  async setMany(entries) {
    const promises = entries.map(
      (entry) => this.set(entry.key, entry.value, entry.metadata)
    );
    await Promise.all(promises);
  }
  async deleteMany(keys) {
    let deleted = 0;
    const promises = keys.map(async (key) => {
      const result = await this.delete(key);
      if (result) deleted++;
    });
    await Promise.all(promises);
    return deleted;
  }
  async increment(key, amount = 1) {
    const current = await this.get(key);
    const newValue = (current || 0) + amount;
    await this.set(key, newValue);
    return newValue;
  }
  async decrement(key, amount = 1) {
    return this.increment(key, -amount);
  }
  async compareAndSwap(key, oldValue, newValue) {
    const current = await this.get(key);
    if (JSON.stringify(current) === JSON.stringify(oldValue)) {
      await this.set(key, newValue);
      return true;
    }
    return false;
  }
  async setIfNotExists(key, value, metadata) {
    const exists = await this.exists(key);
    if (!exists) {
      await this.set(key, value, metadata);
      return true;
    }
    return false;
  }
  async list(options) {
    if (!this.kv) {
      throw new Error("Not connected to Cloudflare KV");
    }
    const listOptions = {
      limit: _optionalChain([options, 'optionalAccess', _6 => _6.limit]) || 1e3,
      prefix: _optionalChain([options, 'optionalAccess', _7 => _7.prefix]),
      cursor: _optionalChain([options, 'optionalAccess', _8 => _8.cursor])
    };
    let result;
    if (this.useWorkerBinding) {
      result = await this.kv.list(listOptions);
    } else {
      result = await this.restList(listOptions);
    }
    return {
      keys: result.keys.map((k) => ({
        name: k.name,
        expiration: k.expiration,
        metadata: k.metadata
      })),
      list_complete: result.list_complete,
      cursor: result.cursor
    };
  }
  async keys(pattern) {
    const allKeys = [];
    let cursor;
    do {
      const result = await this.list({
        prefix: pattern,
        limit: 1e3,
        cursor
      });
      allKeys.push(...result.keys.map((k) => k.name));
      cursor = result.cursor;
    } while (cursor);
    return allKeys;
  }
  async expire(key, seconds) {
    const { value, metadata } = await this.getWithMetadata(key);
    if (value === null) {
      return false;
    }
    await this.set(key, value, {
      ...metadata,
      expirationTtl: seconds
    });
    return true;
  }
  async ttl(key) {
    const { value, metadata } = await this.getWithMetadata(key);
    if (value === null) {
      return -2;
    }
    if (!_optionalChain([metadata, 'optionalAccess', _9 => _9.expiration])) {
      return -1;
    }
    const remaining = Math.floor((metadata.expiration - Date.now()) / 1e3);
    return Math.max(0, remaining);
  }
  async persist(key) {
    const { value, metadata } = await this.getWithMetadata(key);
    if (value === null) {
      return false;
    }
    await this.set(key, value, {
      metadata: _optionalChain([metadata, 'optionalAccess', _10 => _10.metadata])
      // Omit expiration fields
    });
    return true;
  }
  async exists(key) {
    const value = await this.get(key);
    return value !== null;
  }
  async type(key) {
    const value = await this.get(key);
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }
  async size(key) {
    const value = await this.get(key);
    if (value === null) return 0;
    const str = typeof value === "string" ? value : JSON.stringify(value);
    return new TextEncoder().encode(str).length;
  }
  async flush() {
    const allKeys = await this.keys();
    await this.deleteMany(allKeys);
  }
  async ping() {
    try {
      await this.list({ limit: 1 });
      return true;
    } catch (e2) {
      return false;
    }
  }
  async getStats() {
    const allKeys = await this.keys();
    let totalSize = 0;
    for (const key of allKeys.slice(0, 100)) {
      totalSize += await this.size(key);
    }
    const avgSize = allKeys.length > 0 ? totalSize / Math.min(100, allKeys.length) : 0;
    return {
      keys: allKeys.length,
      size: Math.floor(avgSize * allKeys.length)
    };
  }
  // REST API implementation
  createRESTClient() {
    const baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}`;
    return {
      get: async (key) => {
        const response = await fetch(`${baseURL}/values/${key}`, {
          headers: {
            "Authorization": `Bearer ${this.apiToken}`
          }
        });
        if (response.status === 404) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`KV get failed: ${response.statusText}`);
        }
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e3) {
          return text;
        }
      },
      getWithMetadata: async (key) => {
        const response = await fetch(`${baseURL}/values/${key}?include_metadata=true`, {
          headers: {
            "Authorization": `Bearer ${this.apiToken}`
          }
        });
        if (response.status === 404) {
          return { value: null };
        }
        if (!response.ok) {
          throw new Error(`KV get with metadata failed: ${response.statusText}`);
        }
        return response.json();
      },
      put: async (key, value, options) => {
        const body = new FormData();
        body.append("value", value);
        if (_optionalChain([options, 'optionalAccess', _11 => _11.metadata])) {
          body.append("metadata", JSON.stringify(options.metadata));
        }
        const params = new URLSearchParams();
        if (_optionalChain([options, 'optionalAccess', _12 => _12.expiration])) {
          params.append("expiration", options.expiration.toString());
        } else if (_optionalChain([options, 'optionalAccess', _13 => _13.expirationTtl])) {
          params.append("expiration_ttl", options.expirationTtl.toString());
        }
        const url = params.toString() ? `${baseURL}/values/${key}?${params}` : `${baseURL}/values/${key}`;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`
          },
          body
        });
        if (!response.ok) {
          throw new Error(`KV put failed: ${response.statusText}`);
        }
      },
      delete: async (key) => {
        const response = await fetch(`${baseURL}/values/${key}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`
          }
        });
        if (!response.ok) {
          throw new Error(`KV delete failed: ${response.statusText}`);
        }
      },
      list: async (options) => {
        const params = new URLSearchParams();
        if (_optionalChain([options, 'optionalAccess', _14 => _14.prefix])) params.append("prefix", options.prefix);
        if (_optionalChain([options, 'optionalAccess', _15 => _15.limit])) params.append("limit", options.limit.toString());
        if (_optionalChain([options, 'optionalAccess', _16 => _16.cursor])) params.append("cursor", options.cursor);
        const response = await fetch(`${baseURL}/keys?${params}`, {
          headers: {
            "Authorization": `Bearer ${this.apiToken}`
          }
        });
        if (!response.ok) {
          throw new Error(`KV list failed: ${response.statusText}`);
        }
        const data = await response.json();
        return data.result;
      }
    };
  }
  async restGet(key) {
    return this.kv.get(key);
  }
  async restGetWithMetadata(key) {
    return this.kv.getWithMetadata(key);
  }
  async restPut(key, value, options) {
    return this.kv.put(key, value, options);
  }
  async restDelete(key) {
    return this.kv.delete(key);
  }
  async restList(options) {
    return this.kv.list(options);
  }
};


exports.CloudflareKVProvider = CloudflareKVProvider;
//# sourceMappingURL=CloudflareKVProvider-OHABQS4R.cjs.map