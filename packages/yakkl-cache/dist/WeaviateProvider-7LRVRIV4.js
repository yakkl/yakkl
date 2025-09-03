// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/vector/providers/WeaviateProvider.ts
var WeaviateProvider = class {
  constructor(config) {
  }
  async connect() {
    throw new Error("WeaviateProvider not yet implemented");
  }
  async disconnect() {
  }
  async createIndex() {
  }
  async deleteIndex() {
  }
  async listIndexes() {
    return [];
  }
  async upsert() {
  }
  async delete() {
  }
  async fetch() {
    return [];
  }
  async search() {
    return [];
  }
  async searchByText() {
    return [];
  }
  async getStats() {
    return { documentCount: 0, indexSize: 0 };
  }
};
export {
  WeaviateProvider
};
//# sourceMappingURL=WeaviateProvider-7LRVRIV4.js.map