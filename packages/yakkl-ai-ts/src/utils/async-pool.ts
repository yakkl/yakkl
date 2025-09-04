/**
 * Async resource pool for connection management
 */

export class AsyncPool<T> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private waiting: Array<(resource: T) => void> = [];
  private factory: () => Promise<T> | T;
  private maxSize: number;

  constructor(factory: () => Promise<T> | T, maxSize: number = 10) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  async acquire(): Promise<T> {
    // Check if resource available in pool
    if (this.pool.length > 0) {
      const resource = this.pool.pop()!;
      this.inUse.add(resource);
      return resource;
    }

    // Check if can create new resource
    if (this.inUse.size < this.maxSize) {
      const resource = await this.factory();
      this.inUse.add(resource);
      return resource;
    }

    // Wait for resource to be released
    return new Promise<T>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  async release(resource: T): Promise<void> {
    this.inUse.delete(resource);

    // Check if anyone waiting
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.inUse.add(resource);
      resolve(resource);
    } else if (this.pool.length < this.maxSize) {
      this.pool.push(resource);
    } else {
      // Close excess resource if it has close method
      if (typeof (resource as any).close === "function") {
        await (resource as any).close();
      }
    }
  }

  async use<R>(fn: (resource: T) => Promise<R>): Promise<R> {
    const resource = await this.acquire();
    try {
      return await fn(resource);
    } finally {
      await this.release(resource);
    }
  }

  async drain(): Promise<void> {
    // Wait for all in-use resources
    while (this.inUse.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Close all pooled resources
    for (const resource of this.pool) {
      if (typeof (resource as any).close === "function") {
        await (resource as any).close();
      }
    }
    this.pool = [];
  }
}