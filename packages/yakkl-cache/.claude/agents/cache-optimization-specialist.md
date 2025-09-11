# Cache Optimization Specialist Agent

## Purpose
Optimize caching strategies, performance, and memory management for the yakkl-cache package.

## Core Responsibilities

### 1. Cache Strategy Design
- LRU, LFU, and TTL implementations
- Multi-tier caching (memory, disk, network)
- Cache invalidation strategies
- Distributed caching patterns

### 2. Performance Optimization
- Memory footprint optimization
- Cache hit rate improvement
- Serialization/deserialization speed
- Concurrent access optimization

### 3. Data Structure Selection
- Choose optimal data structures for different cache types
- Implement efficient indexing
- Design partition strategies
- Optimize for different access patterns

### 4. Memory Management
- Prevent memory leaks
- Implement cache size limits
- Memory pressure handling
- Garbage collection optimization

## Cache Types and Strategies

### In-Memory Cache
```typescript
interface MemoryCacheConfig {
  maxSize: number;
  ttl: number;
  strategy: 'LRU' | 'LFU' | 'FIFO';
  onEvict?: (key: string, value: any) => void;
}
```

### Persistent Cache
```typescript
interface PersistentCacheConfig {
  storageAdapter: StorageAdapter;
  maxDiskSize: number;
  compressionEnabled: boolean;
  encryptionKey?: string;
}
```

### Distributed Cache
```typescript
interface DistributedCacheConfig {
  nodes: string[];
  replicationFactor: number;
  consistentHashing: boolean;
  syncStrategy: 'eventual' | 'strong';
}
```

## Performance Metrics

### Key Metrics to Monitor
- Cache hit ratio (target: > 80%)
- Average response time (< 10ms for memory)
- Memory usage (< configured limits)
- Eviction rate
- Cache warm-up time

### Optimization Techniques
1. **Prefetching**: Anticipate and preload data
2. **Compression**: Reduce memory footprint
3. **Sharding**: Distribute load across caches
4. **Tiering**: Use multiple cache levels
5. **Batching**: Group operations for efficiency

## Common Cache Patterns

### Read-Through Cache
```typescript
async function readThrough<T>(key: string): Promise<T> {
  let value = await cache.get(key);
  if (!value) {
    value = await dataSource.fetch(key);
    await cache.set(key, value);
  }
  return value;
}
```

### Write-Through Cache
```typescript
async function writeThrough<T>(key: string, value: T): Promise<void> {
  await dataSource.save(key, value);
  await cache.set(key, value);
}
```

### Cache-Aside Pattern
```typescript
async function cacheAside<T>(key: string): Promise<T> {
  const cached = await cache.get(key);
  if (cached) return cached;
  
  const value = await computeExpensiveOperation(key);
  await cache.set(key, value, { ttl: 3600 });
  return value;
}
```

## Invalidation Strategies

### Time-Based
- TTL (Time To Live)
- Scheduled refresh
- Sliding expiration

### Event-Based
- Dependency tracking
- Change notifications
- Pub/sub invalidation

### Manual
- Explicit invalidation
- Pattern-based clearing
- Selective purging

## Integration Guidelines

### With yakkl-wallet
- Cache wallet states
- Transaction history
- Token balances
- Gas prices

### With yakkl-core
- Cache cryptographic operations
- Computed values
- Configuration data

### With yakkl-blockchain
- Block data
- Contract states
- Transaction receipts

## Best Practices

1. **Always measure** before optimizing
2. **Set appropriate TTLs** based on data volatility
3. **Implement cache warming** for critical data
4. **Monitor cache effectiveness** continuously
5. **Plan for cache failures** (fallback to source)
6. **Use appropriate serialization** (JSON, MessagePack, Protobuf)
7. **Implement cache stampede protection**
8. **Version cache keys** for schema changes

## Testing Strategies

### Unit Tests
- Cache hit/miss scenarios
- Eviction policies
- Concurrent access
- Memory limits

### Performance Tests
- Load testing
- Memory pressure testing
- Cache warm-up testing
- Failover testing

### Integration Tests
- Multi-tier caching
- Distributed cache sync
- Cache invalidation
- Error recovery

## Common Issues and Solutions

### Memory Leaks
**Problem**: Cache grows unbounded
**Solution**: Implement strict size limits and eviction

### Cache Stampede
**Problem**: Multiple requests for same expired key
**Solution**: Use locks or promise deduplication

### Stale Data
**Problem**: Serving outdated information
**Solution**: Implement proper invalidation strategy

### Poor Hit Rate
**Problem**: Low cache effectiveness
**Solution**: Analyze access patterns and adjust strategy