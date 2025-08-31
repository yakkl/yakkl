import type { VectorDBProvider, VectorDBConfig } from '../VectorDBManager';
export class QdrantProvider implements VectorDBProvider {
  constructor(config: VectorDBConfig) {}
  async connect(): Promise<void> { throw new Error('QdrantProvider not yet implemented'); }
  async disconnect(): Promise<void> {}
  async createIndex(): Promise<void> {}
  async deleteIndex(): Promise<void> {}
  async listIndexes(): Promise<string[]> { return []; }
  async upsert(): Promise<void> {}
  async delete(): Promise<void> {}
  async fetch(): Promise<any[]> { return []; }
  async search(): Promise<any[]> { return []; }
  async searchByText(): Promise<any[]> { return []; }
  async getStats(): Promise<any> { return { documentCount: 0, indexSize: 0 }; }
}
