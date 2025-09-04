"use strict";
/**
 * Async resource pool for connection management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncPool = void 0;
class AsyncPool {
    pool = [];
    inUse = new Set();
    waiting = [];
    factory;
    maxSize;
    constructor(factory, maxSize = 10) {
        this.factory = factory;
        this.maxSize = maxSize;
    }
    async acquire() {
        // Check if resource available in pool
        if (this.pool.length > 0) {
            const resource = this.pool.pop();
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
        return new Promise((resolve) => {
            this.waiting.push(resolve);
        });
    }
    async release(resource) {
        this.inUse.delete(resource);
        // Check if anyone waiting
        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift();
            this.inUse.add(resource);
            resolve(resource);
        }
        else if (this.pool.length < this.maxSize) {
            this.pool.push(resource);
        }
        else {
            // Close excess resource if it has close method
            if (typeof resource.close === "function") {
                await resource.close();
            }
        }
    }
    async use(fn) {
        const resource = await this.acquire();
        try {
            return await fn(resource);
        }
        finally {
            await this.release(resource);
        }
    }
    async drain() {
        // Wait for all in-use resources
        while (this.inUse.size > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        // Close all pooled resources
        for (const resource of this.pool) {
            if (typeof resource.close === "function") {
                await resource.close();
            }
        }
        this.pool = [];
    }
}
exports.AsyncPool = AsyncPool;
//# sourceMappingURL=async-pool.js.map