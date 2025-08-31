// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/kv/providers/DynamoDBProvider.ts
var DynamoDBProvider = class {
  constructor(config) {
  }
  async connect() {
    throw new Error("DynamoDBProvider not yet implemented");
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
export {
  DynamoDBProvider
};
//# sourceMappingURL=DynamoDBProvider-7KXW4QFU.js.map