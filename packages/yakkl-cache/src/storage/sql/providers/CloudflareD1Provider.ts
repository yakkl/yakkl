import type { SQLProvider, SQLConfig } from '../SQLManager';
export class CloudflareD1Provider implements SQLProvider {
  constructor(config: SQLConfig) {}
  async connect(): Promise<void> { throw new Error('CloudflareD1Provider not yet implemented'); }
  async disconnect(): Promise<void> {}
  async query(): Promise<any> { return { rows: [], rowCount: 0 }; }
  async queryOne(): Promise<any> { return null; }
  async queryMany(): Promise<any[]> { return []; }
  async prepare(): Promise<void> {}
  async execute(): Promise<any> { return { rows: [], rowCount: 0 }; }
  async beginTransaction(): Promise<any> { throw new Error('Not implemented'); }
  async batch(): Promise<any[]> { return []; }
  async createTable(): Promise<void> {}
  async dropTable(): Promise<void> {}
  async tableExists(): Promise<boolean> { return false; }
  async getTableSchema(): Promise<any> { return null; }
  async ping(): Promise<boolean> { return false; }
  async getVersion(): Promise<string> { return 'unknown'; }
  async getStats(): Promise<any> { return {}; }
}
