"use strict";Object.defineProperty(exports, "__esModule", {value: true});// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/kv/providers/EtcdProvider.ts
var EtcdProvider = class {
  constructor(config) {
  }
  async connect() {
    throw new Error("EtcdProvider not yet implemented");
  }
  async disconnect() {
  }
  async get() {
    return null;
  }
  async getWithMetadata() {
    return { value: null };
  }
  async set() {
  }
  async delete() {
    return false;
  }
  async getMany() {
    return /* @__PURE__ */ new Map();
  }
  async setMany() {
  }
  async deleteMany() {
    return 0;
  }
  async increment() {
    return 0;
  }
  async decrement() {
    return 0;
  }
  async compareAndSwap() {
    return false;
  }
  async setIfNotExists() {
    return false;
  }
  async list() {
    return { keys: [], list_complete: true };
  }
  async keys() {
    return [];
  }
  async expire() {
    return false;
  }
  async ttl() {
    return -2;
  }
  async persist() {
    return false;
  }
  async exists() {
    return false;
  }
  async type() {
    return "null";
  }
  async size() {
    return 0;
  }
  async flush() {
  }
  async ping() {
    return false;
  }
  async getStats() {
    return { keys: 0, size: 0 };
  }
};


exports.EtcdProvider = EtcdProvider;
//# sourceMappingURL=EtcdProvider-6U7IBFR7.cjs.map