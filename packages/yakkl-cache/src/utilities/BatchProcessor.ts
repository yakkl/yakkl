/**
 * BatchProcessor - Groups multiple requests into batches for efficient processing
 * Reduces API calls and improves performance
 */

import PQueue from 'p-queue';

export interface BatchProcessorOptions<T, R> {
  maxBatchSize?: number;
  maxWaitTime?: number; // ms to wait before processing incomplete batch
  concurrency?: number;
  processor: (batch: T[]) => Promise<R[]>;
  keyExtractor?: (item: T) => string;
  resultMapper?: (items: T[], results: R[]) => Map<T, R>;
}

export class BatchProcessor<T, R> {
  private queue: T[] = [];
  private promises: Map<T, { resolve: (value: R) => void; reject: (error: any) => void }> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private processing: boolean = false;
  private pQueue: PQueue;
  private options: Required<BatchProcessorOptions<T, R>>;
  private stats = {
    totalItems: 0,
    totalBatches: 0,
    avgBatchSize: 0,
    errors: 0
  };

  constructor(options: BatchProcessorOptions<T, R>) {
    this.options = {
      maxBatchSize: options.maxBatchSize || 100,
      maxWaitTime: options.maxWaitTime || 50,
      concurrency: options.concurrency || 5,
      processor: options.processor,
      keyExtractor: options.keyExtractor || ((item: T) => JSON.stringify(item)),
      resultMapper: options.resultMapper || this.defaultResultMapper.bind(this)
    };
    
    this.pQueue = new PQueue({ concurrency: this.options.concurrency });
  }

  /**
   * Add an item to be processed
   */
  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push(item);
      this.promises.set(item, { resolve, reject });
      this.stats.totalItems++;
      
      // Start timer if not already running
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.options.maxWaitTime);
      }
      
      // Process immediately if batch is full
      if (this.queue.length >= this.options.maxBatchSize) {
        this.flush();
      }
    });
  }

  /**
   * Add multiple items
   */
  async addMany(items: T[]): Promise<R[]> {
    return Promise.all(items.map(item => this.add(item)));
  }

  /**
   * Process all pending items immediately
   */
  async flush(): Promise<void> {
    // Clear timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // Nothing to process
    if (this.queue.length === 0) {
      return;
    }
    
    // Get items to process
    const batch = this.queue.splice(0, this.options.maxBatchSize);
    const batchPromises = new Map<T, { resolve: (value: R) => void; reject: (error: any) => void }>();
    
    // Move promises for this batch
    for (const item of batch) {
      const promise = this.promises.get(item);
      if (promise) {
        batchPromises.set(item, promise);
        this.promises.delete(item);
      }
    }
    
    // Update stats
    this.stats.totalBatches++;
    this.stats.avgBatchSize = 
      (this.stats.avgBatchSize * (this.stats.totalBatches - 1) + batch.length) / this.stats.totalBatches;
    
    // Process batch
    await this.pQueue.add(async () => {
      try {
        const results = await this.options.processor(batch);
        const resultMap = this.options.resultMapper(batch, results);
        
        // Resolve promises
        for (const [item, promise] of batchPromises.entries()) {
          const result = resultMap.get(item);
          if (result !== undefined) {
            promise.resolve(result);
          } else {
            promise.reject(new Error('No result for item'));
            this.stats.errors++;
          }
        }
      } catch (error) {
        // Reject all promises in batch
        for (const promise of batchPromises.values()) {
          promise.reject(error);
          this.stats.errors++;
        }
      }
    });
    
    // If there are more items, set timer again
    if (this.queue.length > 0 && !this.timer) {
      this.timer = setTimeout(() => this.flush(), this.options.maxWaitTime);
    }
  }

  /**
   * Wait for all pending items to be processed
   */
  async waitForAll(): Promise<void> {
    await this.flush();
    await this.pQueue.onIdle();
  }

  /**
   * Clear all pending items
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // Reject all pending promises
    for (const promise of this.promises.values()) {
      promise.reject(new Error('Batch processor cleared'));
    }
    
    this.queue = [];
    this.promises.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalItems: number;
    totalBatches: number;
    avgBatchSize: number;
    errors: number;
    errorRate: number;
    pendingItems: number;
    activeJobs: number;
  } {
    return {
      ...this.stats,
      errorRate: this.stats.totalItems > 0 ? this.stats.errors / this.stats.totalItems : 0,
      pendingItems: this.queue.length,
      activeJobs: this.pQueue.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalItems: 0,
      totalBatches: 0,
      avgBatchSize: 0,
      errors: 0
    };
  }

  /**
   * Default result mapper - assumes results are in same order as items
   */
  private defaultResultMapper(items: T[], results: R[]): Map<T, R> {
    const map = new Map<T, R>();
    
    for (let i = 0; i < items.length && i < results.length; i++) {
      map.set(items[i], results[i]);
    }
    
    return map;
  }
}

/**
 * AutoBatchProcessor - Automatically batches function calls
 */
export class AutoBatchProcessor {
  private processors: Map<string, BatchProcessor<any, any>> = new Map();

  /**
   * Create a batched version of a function
   */
  batch<T extends any[], R>(
    fn: (batch: T) => Promise<R[]>,
    options?: Partial<BatchProcessorOptions<T[0], R>>
  ): (...args: T) => Promise<R> {
    const processorKey = fn.toString();
    
    let processor = this.processors.get(processorKey);
    if (!processor) {
      processor = new BatchProcessor<T[0], R>({
        processor: fn as any,
        ...options
      });
      this.processors.set(processorKey, processor);
    }
    
    return async (...args: T): Promise<R> => {
      // Assuming single argument for simplicity
      // Can be extended to handle multiple arguments
      return processor.add(args[0]);
    };
  }

  /**
   * Clear all processors
   */
  clearAll(): void {
    for (const processor of this.processors.values()) {
      processor.clear();
    }
    this.processors.clear();
  }

  /**
   * Get statistics for all processors
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    let index = 0;
    
    for (const processor of this.processors.values()) {
      stats[`processor_${index++}`] = processor.getStats();
    }
    
    return stats;
  }
}