import { Middleware, StoreAdapter } from '../types';

export class PersistenceMiddleware<T> implements Middleware<T> {
  name = 'PersistenceMiddleware';
  private writeQueue: Array<{ value: T; timestamp: number }> = [];
  private flushTimer?: NodeJS.Timeout;
  private flushing = false;

  constructor(
    private persistenceAdapter: StoreAdapter<T>,
    private options: {
      batchMs?: number;
      maxBatchSize?: number;
      deduplicate?: boolean;
    } = {}
  ) {}

  //@ts-ignore
  async afterWrite(value: T, key: string): Promise<void> {
    const entry = { value, timestamp: Date.now() };

    if (this.options.batchMs) {
      this.writeQueue.push(entry);

      if (this.options.maxBatchSize && this.writeQueue.length >= this.options.maxBatchSize) {
        await this.flush();
      } else {
        this.scheduleFlush();
      }
    } else {
      await this.persistenceAdapter.write(value);
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.options.batchMs);
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.writeQueue.length === 0) return;

    this.flushing = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    try {
      const items = this.writeQueue.splice(0);

      if (this.options.deduplicate && items.length > 0) {
        // Only persist the latest value
        const latestItem = items[items.length - 1];
        await this.persistenceAdapter.write(latestItem.value);
      } else {
        // Persist all values
        for (const item of items) {
          await this.persistenceAdapter.write(item.value);
        }
      }
    } catch (error) {
      console.error('PersistenceMiddleware flush error:', error);
      // Re-queue failed items
      this.writeQueue.unshift(...this.writeQueue);
      this.scheduleFlush();
    } finally {
      this.flushing = false;
    }
  }

  async onError(error: Error, operation: 'read' | 'write' | 'delete'): Promise<void> {
    console.error(`PersistenceMiddleware error during ${operation}:`, error);
  }
}
