# YAKKL Reactive - Claude Documentation

**Package**: @yakkl/reactive
**Version**: 0.1.0
**Purpose**: High-performance reactive state management library
**Last Updated**: 2025-09-09

## Package Overview
YAKKL Reactive is a framework-agnostic reactive state management library that provides efficient, type-safe reactive primitives. It's designed to be lightweight, performant, and easy to integrate into any TypeScript project.

## Architecture

### Core Concepts
1. **Stores** - Reactive containers for state
2. **Computed** - Derived values that auto-update
3. **Effects** - Side effects triggered by state changes
4. **Operators** - Functional transformations of reactive values

### Design Principles
- **Framework Agnostic** - Works with any JavaScript/TypeScript project
- **Type Safety** - Full TypeScript support with inference
- **Performance** - Minimal overhead, efficient updates
- **Tree Shakeable** - Import only what you need
- **Zero Dependencies** - No external runtime dependencies

## Development Guidelines

### Code Style
- Use functional programming patterns where appropriate
- Keep functions pure when possible
- Minimize side effects
- Use TypeScript strict mode
- Document all public APIs

### Testing Strategy
- Unit tests for all core functionality
- Integration tests for complex interactions
- Performance benchmarks for critical paths
- Property-based testing for operators

## API Structure

### Store Module (`/store`)
- `writable<T>()` - Create a writable store
- `readable<T>()` - Create a read-only store
- `derived()` - Create a derived store
- `createStore()` - Advanced store with persistence

### Computed Module (`/computed`)
- `computed()` - Auto-updating computed values
- `memo()` - Memoized computations

### Effect Module (`/effect`)
- `effect()` - Run side effects
- `watch()` - Watch specific values
- `watchEffect()` - Auto-track dependencies

### Operators Module (`/operators`)
- `map()` - Transform values
- `filter()` - Filter values
- `debounce()` - Delay updates
- `throttle()` - Limit update frequency
- `pipe()` - Compose operators

### Utils Module (`/utils`)
- Equality checks
- Batching updates
- Timing utilities
- Reactive helpers

## Usage Examples

### Basic Store
```typescript
import { writable } from '@yakkl/reactive';

const count = writable(0);

// Subscribe to changes
const unsubscribe = count.subscribe(value => {
  console.log('Count is:', value);
});

// Update the value
count.set(1);
count.update(n => n + 1);
```

### Derived Values
```typescript
import { writable, derived } from '@yakkl/reactive';

const price = writable(100);
const quantity = writable(2);

const total = derived(
  [price, quantity],
  ([$price, $quantity]) => $price * $quantity
);
```

### Effects
```typescript
import { effect, watch } from '@yakkl/reactive';

// Run effect when dependencies change
effect(() => {
  console.log('Effect running');
  // Cleanup function (optional)
  return () => console.log('Cleaning up');
});

// Watch specific value
watch(count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});
```

### Operators
```typescript
import { writable, pipe, map, filter, debounce } from '@yakkl/reactive';

const input = writable('');

const processed = pipe(
  map((s: string) => s.trim()),
  filter(s => s.length > 0),
  debounce(300)
)(input);
```

## Integration with Other YAKKL Packages

### With yakkl-wallet
```typescript
import { writable, derived } from '@yakkl/reactive';

// Replace Svelte stores with reactive stores
export const accountStore = writable(null);
export const balanceStore = derived(accountStore, 
  account => account?.balance || 0
);
```

### With yakkl-core
```typescript
import { createStore } from '@yakkl/reactive';
import { WalletEngine } from '@yakkl/core';

const walletState = createStore({
  initial: WalletEngine.getInitialState(),
  persist: { key: 'wallet-state' }
});
```

## Performance Considerations

### Batching
- Use `batch()` for multiple updates
- Automatic deduplication of updates
- Configurable batch size limits

### Memory Management
- Stores automatically clean up when no subscribers
- Use `unsubscribe` to prevent memory leaks
- Weak references for dependency tracking

### Optimization Tips
1. Use `derived` for computed values instead of recalculating
2. Apply operators like `debounce` for expensive operations
3. Use `distinctUntilChanged` to prevent unnecessary updates
4. Batch related updates together

## Common Patterns

### Store Composition
```typescript
function createCounterStore() {
  const { subscribe, set, update } = writable(0);
  
  return {
    subscribe,
    increment: () => update(n => n + 1),
    decrement: () => update(n => n - 1),
    reset: () => set(0)
  };
}
```

### Async Stores
```typescript
function createAsyncStore<T>(fetcher: () => Promise<T>) {
  const loading = writable(true);
  const error = writable<Error | null>(null);
  const data = writable<T | null>(null);
  
  fetcher()
    .then(result => {
      data.set(result);
      loading.set(false);
    })
    .catch(err => {
      error.set(err);
      loading.set(false);
    });
  
  return { data, loading, error };
}
```

## Troubleshooting

### Common Issues
1. **Memory leaks** - Always unsubscribe from stores
2. **Infinite loops** - Avoid circular dependencies
3. **Stale closures** - Use `get()` method for current value
4. **Performance** - Profile with Chrome DevTools

### Debug Mode
```typescript
// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  window.__YAKKL_REACTIVE_DEBUG__ = true;
}
```

## Future Enhancements
- [ ] Vue.js reactivity compatibility layer
- [ ] React hooks adapter
- [ ] Solid.js signals integration
- [ ] Advanced debugging tools
- [ ] Time-travel debugging
- [ ] Redux DevTools integration
- [ ] Persistence adapters (IndexedDB, etc.)

## Contributing
1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Run linting and type checking
5. Ensure backward compatibility

## Commands
```bash
# Development
pnpm dev          # Watch mode
pnpm build        # Production build
pnpm test         # Run tests
pnpm test:watch   # Watch tests
pnpm lint         # Lint code
pnpm typecheck    # Type checking
```

## Package Exports
The package provides multiple entry points:
- Main: `@yakkl/reactive`
- Store: `@yakkl/reactive/store`
- Computed: `@yakkl/reactive/computed`
- Effect: `@yakkl/reactive/effect`
- Operators: `@yakkl/reactive/operators`
- Utils: `@yakkl/reactive/utils`

## Version History
- **0.1.0** - Initial release with core reactive primitives