// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/sql/providers/MySQLProvider.ts
var MySQLProvider = class {
  constructor(config) {
  }
  async connect() {
    throw new Error("MySQLProvider not yet implemented");
  }
  async disconnect() {
  }
  async query() {
    return { rows: [], rowCount: 0 };
  }
  async queryOne() {
    return null;
  }
  async queryMany() {
    return [];
  }
  async prepare() {
  }
  async execute() {
    return { rows: [], rowCount: 0 };
  }
  async beginTransaction() {
    throw new Error("Not implemented");
  }
  async batch() {
    return [];
  }
  async createTable() {
  }
  async dropTable() {
  }
  async tableExists() {
    return false;
  }
  async getTableSchema() {
    return null;
  }
  async ping() {
    return false;
  }
  async getVersion() {
    return "unknown";
  }
  async getStats() {
    return {};
  }
};
export {
  MySQLProvider
};
//# sourceMappingURL=MySQLProvider-VUVCYABG.js.map