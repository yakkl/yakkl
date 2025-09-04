/**
 * Async resource pool for connection management
 */
export declare class AsyncPool<T> {
    private pool;
    private inUse;
    private waiting;
    private factory;
    private maxSize;
    constructor(factory: () => Promise<T> | T, maxSize?: number);
    acquire(): Promise<T>;
    release(resource: T): Promise<void>;
    use<R>(fn: (resource: T) => Promise<R>): Promise<R>;
    drain(): Promise<void>;
}
//# sourceMappingURL=async-pool.d.ts.map