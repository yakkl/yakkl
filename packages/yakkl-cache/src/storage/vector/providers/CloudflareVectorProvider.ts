/**
 * CloudflareVectorProvider - Cloudflare Vectorize implementation
 * Provides vector search capabilities using Cloudflare's edge network
 */

import type { 
  VectorDBProvider, 
  VectorDocument, 
  VectorSearchResult,
  VectorDBConfig 
} from '../VectorDBManager';

interface CloudflareVectorizeAPI {
  insert(vectors: Array<{ id: string; values: number[]; metadata?: any }>): Promise<any>;
  query(vector: number[], options?: { topK?: number; filter?: any }): Promise<any>;
  get(ids: string[]): Promise<any>;
  delete(ids: string[]): Promise<any>;
}

export class CloudflareVectorProvider implements VectorDBProvider {
  private config: VectorDBConfig;
  private vectorize: CloudflareVectorizeAPI | null = null;
  private accountId: string;
  private apiToken: string;
  private indexName: string;

  constructor(config: VectorDBConfig) {
    this.config = config;
    this.accountId = config.environment || '';
    this.apiToken = config.apiKey || '';
    this.indexName = config.indexName || 'default';
  }

  async connect(): Promise<void> {
    // In Cloudflare Workers environment, vectorize is available as a binding
    // For external use, we'd use the REST API
    if (typeof globalThis !== 'undefined' && (globalThis as any).VECTORIZE) {
      this.vectorize = (globalThis as any).VECTORIZE;
    } else {
      // Use REST API endpoint
      this.vectorize = this.createRESTClient();
    }
  }

  async disconnect(): Promise<void> {
    this.vectorize = null;
  }

  async createIndex(name: string, dimension: number, metric?: string): Promise<void> {
    // Cloudflare Vectorize indexes are created via dashboard or API
    // This would make an API call to create the index
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          config: {
            dimensions: dimension,
            metric: metric || 'cosine'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create index: ${response.statusText}`);
    }
  }

  async deleteIndex(name: string): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes/${name}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete index: ${response.statusText}`);
    }
  }

  async listIndexes(): Promise<string[]> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list indexes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result.map((index: any) => index.name);
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    if (!this.vectorize) {
      throw new Error('Not connected to Cloudflare Vectorize');
    }

    const vectors = documents.map(doc => ({
      id: doc.id,
      values: doc.vector,
      metadata: {
        ...doc.metadata,
        text: doc.text
      }
    }));

    await this.vectorize.insert(vectors);
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.vectorize) {
      throw new Error('Not connected to Cloudflare Vectorize');
    }

    await this.vectorize.delete(ids);
  }

  async fetch(ids: string[]): Promise<VectorDocument[]> {
    if (!this.vectorize) {
      throw new Error('Not connected to Cloudflare Vectorize');
    }

    const results = await this.vectorize.get(ids);
    
    return results.vectors.map((vec: any) => ({
      id: vec.id,
      vector: vec.values,
      metadata: vec.metadata,
      text: vec.metadata?.text
    }));
  }

  async search(
    vector: number[], 
    topK: number = 10, 
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.vectorize) {
      throw new Error('Not connected to Cloudflare Vectorize');
    }

    const results = await this.vectorize.query(vector, {
      topK,
      filter
    });

    return results.matches.map((match: any) => ({
      id: match.id,
      score: match.score,
      vector: match.values,
      metadata: match.metadata,
      text: match.metadata?.text
    }));
  }

  async searchByText(
    text: string, 
    topK: number = 10, 
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    // This would require an embedding service
    // For now, throw an error indicating embedding is needed
    throw new Error('Text search requires embedding generation. Use search() with pre-computed vectors.');
  }

  async getStats(): Promise<{ documentCount: number; indexSize: number }> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes/${this.indexName}/info`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      documentCount: data.result.vectorsCount || 0,
      indexSize: data.result.dimensions || 0
    };
  }

  private createRESTClient(): CloudflareVectorizeAPI {
    const baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes/${this.indexName}`;
    
    return {
      insert: async (vectors) => {
        const response = await fetch(`${baseURL}/insert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ vectors })
        });
        
        if (!response.ok) {
          throw new Error(`Insert failed: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      query: async (vector, options) => {
        const response = await fetch(`${baseURL}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            vector,
            topK: options?.topK,
            filter: options?.filter
          })
        });
        
        if (!response.ok) {
          throw new Error(`Query failed: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      get: async (ids) => {
        const response = await fetch(`${baseURL}/get`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids })
        });
        
        if (!response.ok) {
          throw new Error(`Get failed: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      delete: async (ids) => {
        const response = await fetch(`${baseURL}/delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids })
        });
        
        if (!response.ok) {
          throw new Error(`Delete failed: ${response.statusText}`);
        }
        
        return response.json();
      }
    };
  }
}