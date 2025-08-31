/**
 * VectorDBManager - Unified interface for vector database operations
 * Supports multiple vector database providers with consistent API
 */

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  text?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: Record<string, any>;
  text?: string;
}

export interface VectorDBConfig {
  provider: 'cloudflare' | 'postgres' | 'pinecone' | 'weaviate' | 'qdrant' | 'chroma';
  connectionString?: string;
  apiKey?: string;
  environment?: string;
  namespace?: string;
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
  indexName?: string;
}

export interface VectorDBProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Index operations
  createIndex(name: string, dimension: number, metric?: string): Promise<void>;
  deleteIndex(name: string): Promise<void>;
  listIndexes(): Promise<string[]>;
  
  // Document operations
  upsert(documents: VectorDocument[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
  fetch(ids: string[]): Promise<VectorDocument[]>;
  
  // Search operations
  search(vector: number[], topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
  searchByText(text: string, topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
  
  // Utility
  getStats(): Promise<{ documentCount: number; indexSize: number }>;
}

export class VectorDBManager {
  private provider: VectorDBProvider | null = null;
  private config: VectorDBConfig;
  private isConnected: boolean = false;

  constructor(config: VectorDBConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Dynamically import the appropriate provider
    switch (this.config.provider) {
      case 'cloudflare':
        const { CloudflareVectorProvider } = await import('./providers/CloudflareVectorProvider');
        this.provider = new CloudflareVectorProvider(this.config);
        break;
        
      case 'postgres':
        const { PostgresVectorProvider } = await import('./providers/PostgresVectorProvider');
        this.provider = new PostgresVectorProvider(this.config);
        break;
        
      case 'pinecone':
        const { PineconeProvider } = await import('./providers/PineconeProvider');
        this.provider = new PineconeProvider(this.config);
        break;
        
      case 'weaviate':
        const { WeaviateProvider } = await import('./providers/WeaviateProvider');
        this.provider = new WeaviateProvider(this.config);
        break;
        
      case 'qdrant':
        const { QdrantProvider } = await import('./providers/QdrantProvider');
        this.provider = new QdrantProvider(this.config);
        break;
        
      case 'chroma':
        const { ChromaProvider } = await import('./providers/ChromaProvider');
        this.provider = new ChromaProvider(this.config);
        break;
        
      default:
        throw new Error(`Unsupported vector DB provider: ${this.config.provider}`);
    }

    await this.connect();
  }

  async connect(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
    
    await this.provider.connect();
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Create a new vector index
   */
  async createIndex(name: string, dimension?: number, metric?: string): Promise<void> {
    this.ensureConnected();
    const dim = dimension || this.config.dimension || 384; // Default to all-MiniLM-L6-v2 dimension
    const m = metric || this.config.metric || 'cosine';
    
    await this.provider!.createIndex(name, dim, m);
  }

  /**
   * Delete a vector index
   */
  async deleteIndex(name: string): Promise<void> {
    this.ensureConnected();
    await this.provider!.deleteIndex(name);
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureConnected();
    return this.provider!.listIndexes();
  }

  /**
   * Upsert documents with vectors
   */
  async upsert(documents: VectorDocument[]): Promise<void> {
    this.ensureConnected();
    
    // Validate vectors
    documents.forEach(doc => {
      if (!doc.vector || doc.vector.length === 0) {
        throw new Error(`Document ${doc.id} has invalid vector`);
      }
    });
    
    await this.provider!.upsert(documents);
  }

  /**
   * Delete documents by IDs
   */
  async delete(ids: string[]): Promise<void> {
    this.ensureConnected();
    await this.provider!.delete(ids);
  }

  /**
   * Fetch documents by IDs
   */
  async fetch(ids: string[]): Promise<VectorDocument[]> {
    this.ensureConnected();
    return this.provider!.fetch(ids);
  }

  /**
   * Search for similar vectors
   */
  async search(
    vector: number[], 
    topK: number = 10, 
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    this.ensureConnected();
    
    if (!vector || vector.length === 0) {
      throw new Error('Invalid search vector');
    }
    
    return this.provider!.search(vector, topK, filter);
  }

  /**
   * Search by text (requires embedding generation)
   */
  async searchByText(
    text: string, 
    topK: number = 10, 
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    this.ensureConnected();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Invalid search text');
    }
    
    return this.provider!.searchByText(text, topK, filter);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ documentCount: number; indexSize: number }> {
    this.ensureConnected();
    return this.provider!.getStats();
  }

  /**
   * Batch upsert with automatic chunking
   */
  async batchUpsert(documents: VectorDocument[], chunkSize: number = 100): Promise<void> {
    this.ensureConnected();
    
    for (let i = 0; i < documents.length; i += chunkSize) {
      const chunk = documents.slice(i, i + chunkSize);
      await this.upsert(chunk);
      
      // Small delay to avoid rate limiting
      if (i + chunkSize < documents.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Hybrid search combining vector similarity and metadata filters
   */
  async hybridSearch(
    vector: number[],
    filter: Record<string, any>,
    topK: number = 10,
    vectorWeight: number = 0.7
  ): Promise<VectorSearchResult[]> {
    this.ensureConnected();
    
    // Get vector search results
    const vectorResults = await this.search(vector, topK * 2);
    
    // Apply metadata filters
    const filtered = vectorResults.filter(result => {
      if (!result.metadata) return false;
      
      return Object.entries(filter).every(([key, value]) => {
        return result.metadata![key] === value;
      });
    });
    
    // Re-score based on vector weight
    const rescored = filtered.map(result => ({
      ...result,
      score: result.score * vectorWeight + (1 - vectorWeight)
    }));
    
    // Sort and limit
    rescored.sort((a, b) => b.score - a.score);
    return rescored.slice(0, topK);
  }

  /**
   * Find nearest neighbors for multiple vectors
   */
  async batchSearch(
    vectors: number[][],
    topK: number = 10,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[][]> {
    this.ensureConnected();
    
    const results = await Promise.all(
      vectors.map(vector => this.search(vector, topK, filter))
    );
    
    return results;
  }

  private ensureConnected(): void {
    if (!this.isConnected || !this.provider) {
      throw new Error('VectorDB not connected. Call initialize() first.');
    }
  }

  /**
   * Create a collection with automatic index configuration
   */
  async createCollection(
    name: string,
    schema?: {
      dimension?: number;
      metric?: string;
      fields?: Array<{ name: string; type: string; indexed?: boolean }>;
    }
  ): Promise<void> {
    this.ensureConnected();
    
    const dimension = schema?.dimension || this.config.dimension || 384;
    const metric = schema?.metric || this.config.metric || 'cosine';
    
    await this.createIndex(name, dimension, metric);
  }

  /**
   * Get similar documents with pagination
   */
  async getSimilar(
    id: string,
    topK: number = 10,
    offset: number = 0
  ): Promise<VectorSearchResult[]> {
    this.ensureConnected();
    
    // Fetch the document
    const [doc] = await this.fetch([id]);
    if (!doc) {
      throw new Error(`Document ${id} not found`);
    }
    
    // Search for similar documents
    const results = await this.search(doc.vector, topK + offset + 1);
    
    // Remove the original document and apply offset
    const filtered = results.filter(r => r.id !== id);
    return filtered.slice(offset, offset + topK);
  }
}