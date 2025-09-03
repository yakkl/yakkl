/**
 * SemanticCache - Intelligent caching for support questions using embeddings
 * Finds similar questions and reuses answers for better support experience
 */

import type { CacheManager } from '../core/CacheManager';
import type { VectorDBManager } from '../storage/vector/VectorDBManager';
import type { CacheOptions } from '../types';

export interface SemanticQuery {
  id: string;
  question: string;
  answer: string;
  embedding?: number[];
  category?: string;
  confidence?: number;
  metadata?: {
    source?: 'user' | 'agent' | 'documentation' | 'faq';
    timestamp?: number;
    helpful?: boolean;
    votes?: number;
    tags?: string[];
    language?: string;
  };
}

export interface SemanticSearchOptions {
  threshold?: number; // Similarity threshold (0-1)
  topK?: number;
  category?: string;
  includeMetadata?: boolean;
  boostRecent?: boolean; // Boost recent answers
  boostHelpful?: boolean; // Boost helpful answers
}

export interface EmbeddingProvider {
  generate(text: string): Promise<number[]>;
  generateBatch(texts: string[]): Promise<number[][]>;
}

export class SemanticCache {
  private cacheManager: CacheManager;
  private vectorDB: VectorDBManager | null = null;
  private embeddingProvider: EmbeddingProvider | null = null;
  private similarityThreshold: number = 0.85;
  private stats = {
    queries: 0,
    hits: 0,
    misses: 0,
    learned: 0,
    avgConfidence: 0
  };

  constructor(
    cacheManager: CacheManager,
    vectorDB?: VectorDBManager,
    embeddingProvider?: EmbeddingProvider
  ) {
    this.cacheManager = cacheManager;
    this.vectorDB = vectorDB || null;
    this.embeddingProvider = embeddingProvider || null;
  }

  /**
   * Set embedding provider for generating vectors
   */
  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
  }

  /**
   * Set vector database for similarity search
   */
  setVectorDB(vectorDB: VectorDBManager): void {
    this.vectorDB = vectorDB;
  }

  /**
   * Find similar questions and return cached answer if available
   */
  async findSimilar(
    question: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticQuery[]> {
    this.stats.queries++;
    
    // First try exact match from cache
    const cacheKey = this.getCacheKey(question);
    const exact = await this.cacheManager.get<SemanticQuery>(cacheKey);
    
    if (exact) {
      this.stats.hits++;
      return [exact];
    }
    
    // If no vector DB, return empty
    if (!this.vectorDB || !this.embeddingProvider) {
      this.stats.misses++;
      return [];
    }
    
    // Generate embedding for the question
    const embedding = await this.embeddingProvider.generate(question);
    
    // Search for similar questions
    const threshold = options.threshold || this.similarityThreshold;
    const topK = options.topK || 5;
    
    const results = await this.vectorDB.search(
      embedding,
      topK,
      options.category ? { category: options.category } : undefined
    );
    
    // Filter by similarity threshold
    const similar = results
      .filter(r => r.score >= threshold)
      .map(r => {
        const query: SemanticQuery = {
          id: r.id,
          question: r.metadata?.question || '',
          answer: r.text || '',
          confidence: r.score,
          category: r.metadata?.category,
          metadata: r.metadata
        };
        
        // Apply boosting if requested
        if (options.boostRecent && query.metadata?.timestamp) {
          const age = Date.now() - query.metadata.timestamp;
          const recencyBoost = Math.max(0, 1 - age / (30 * 24 * 60 * 60 * 1000)); // 30 days
          query.confidence! *= (1 + recencyBoost * 0.1);
        }
        
        if (options.boostHelpful && query.metadata?.helpful) {
          query.confidence! *= 1.2;
        }
        
        return query;
      })
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    
    if (similar.length > 0) {
      this.stats.hits++;
      
      // Update average confidence
      const totalConfidence = similar.reduce((sum, q) => sum + (q.confidence || 0), 0);
      this.stats.avgConfidence = 
        (this.stats.avgConfidence * (this.stats.hits - 1) + totalConfidence / similar.length) / this.stats.hits;
      
      // Cache the best match
      if (similar[0].confidence! >= 0.95) {
        await this.cacheManager.set(cacheKey, similar[0], {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          strategy: 'semantic'
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
  async learn(query: SemanticQuery): Promise<void> {
    // Store in regular cache
    const cacheKey = this.getCacheKey(query.question);
    await this.cacheManager.set(cacheKey, query, {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      strategy: 'semantic'
    });
    
    // Store in vector database if available
    if (this.vectorDB && this.embeddingProvider) {
      // Generate embedding if not provided
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
  async learnBatch(queries: SemanticQuery[]): Promise<void> {
    // Generate embeddings for all questions
    if (this.embeddingProvider) {
      const questions = queries.filter(q => !q.embedding).map(q => q.question);
      
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
    
    // Store in cache
    const cachePromises = queries.map(query => 
      this.cacheManager.set(this.getCacheKey(query.question), query, {
        ttl: 7 * 24 * 60 * 60 * 1000,
        strategy: 'semantic'
      })
    );
    
    await Promise.all(cachePromises);
    
    // Store in vector database
    if (this.vectorDB) {
      const documents = queries.map(query => ({
        id: query.id || this.generateId(),
        vector: query.embedding!,
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
  async updateFeedback(
    questionId: string,
    helpful: boolean,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    if (!this.vectorDB) return;
    
    // Fetch existing document
    const docs = await this.vectorDB.fetch([questionId]);
    if (docs.length === 0) return;
    
    const doc = docs[0];
    const metadata = doc.metadata || {};
    
    // Update metadata
    metadata.helpful = helpful;
    metadata.votes = (metadata.votes || 0) + 1;
    
    if (helpful) {
      metadata.helpfulVotes = (metadata.helpfulVotes || 0) + 1;
    }
    
    if (additionalMetadata) {
      Object.assign(metadata, additionalMetadata);
    }
    
    // Update in vector database
    await this.vectorDB.upsert([{
      ...doc,
      metadata
    }]);
  }

  /**
   * Get frequently asked questions
   */
  async getFAQs(
    category?: string,
    limit: number = 10
  ): Promise<SemanticQuery[]> {
    const pattern = category ? `semantic:${category}:*` : 'semantic:*';
    const keys = await this.cacheManager.keys(pattern);
    
    const faqs: SemanticQuery[] = [];
    
    for (const key of keys.slice(0, limit * 2)) {
      const query = await this.cacheManager.get<SemanticQuery>(key);
      if (query && query.metadata?.source === 'faq') {
        faqs.push(query);
      }
    }
    
    // Sort by votes/helpfulness
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
  async searchByMetadata(
    filters: {
      category?: string;
      tags?: string[];
      source?: string;
      language?: string;
    },
    limit: number = 10
  ): Promise<SemanticQuery[]> {
    if (!this.vectorDB) return [];
    
    // This would be more efficient with proper metadata indexing
    const results = await this.vectorDB.search(
      new Array(384).fill(0), // Dummy vector
      limit * 3,
      filters as any
    );
    
    return results
      .map(r => ({
        id: r.id,
        question: r.metadata?.question || '',
        answer: r.text || '',
        confidence: r.score,
        category: r.metadata?.category,
        metadata: r.metadata
      }))
      .slice(0, limit);
  }

  /**
   * Clear semantic cache for a category
   */
  async clearCategory(category: string): Promise<void> {
    const pattern = `semantic:${category}:*`;
    const keys = await this.cacheManager.keys(pattern);
    
    for (const key of keys) {
      await this.cacheManager.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    queries: number;
    hits: number;
    misses: number;
    hitRate: number;
    learned: number;
    avgConfidence: number;
  } {
    return {
      ...this.stats,
      hitRate: this.stats.queries > 0 ? this.stats.hits / this.stats.queries : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      queries: 0,
      hits: 0,
      misses: 0,
      learned: 0,
      avgConfidence: 0
    };
  }

  private getCacheKey(question: string): string {
    // Normalize question for caching
    const normalized = question.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const hash = this.hashString(normalized);
    return `semantic:${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private generateId(): string {
    return `sem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Mock embedding provider for development
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  async generate(text: string): Promise<number[]> {
    // Generate deterministic mock embedding based on text
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < Math.min(text.length, 384); i++) {
      embedding[i] = text.charCodeAt(i) / 255;
    }
    return embedding;
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generate(text)));
  }
}