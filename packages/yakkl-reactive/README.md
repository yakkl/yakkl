# @yakkl/reactive

> High-performance reactive state management library for TypeScript applications

[![npm version](https://img.shields.io/npm/v/@yakkl/reactive.svg)](https://www.npmjs.com/package/@yakkl/reactive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Features

- 🚀 **Lightweight** - Zero runtime dependencies, ~5KB gzipped
- 🔒 **Type-Safe** - Full TypeScript support with type inference
- ⚡ **Performant** - Efficient update batching and minimal overhead
- 🎯 **Framework Agnostic** - Works with any JavaScript/TypeScript project
- 🌳 **Tree-Shakeable** - Import only what you need
- 🔧 **Extensible** - Rich operator library for transformations

## Installation

```bash
npm install @yakkl/reactive
# or
pnpm add @yakkl/reactive
# or
yarn add @yakkl/reactive
```

## Quick Start

```typescript
import { writable, derived, effect } from '@yakkl/reactive';

// Create a writable store
const count = writable(0);

// Create a derived value
const doubled = derived(count, n => n * 2);

// Subscribe to changes
count.subscribe(value => {
  console.log('Count:', value);
});

// Update the store
count.set(5);
count.update(n => n + 1);

// Create side effects
effect(() => {
  console.log('Count is now:', count.get());
});
```

## Core Concepts

### Stores

Stores are reactive containers for your application state:

```typescript
import { writable, readable } from '@yakkl/reactive';

// Writable store
const name = writable('John');
name.set('Jane');
name.update(n => n + ' Doe');

// Readable store (with auto-update)
const time = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);
  
  return () => clearInterval(interval);
});
```

### Derived Values

Create computed values that automatically update:

```typescript
const firstName = writable('John');
const lastName = writable('Doe');

const fullName = derived(
  [firstName, lastName],
  ([$first, $last]) => `${$first} ${$last}`
);
```

### Effects

Run side effects when values change:

```typescript
import { effect, watch } from '@yakkl/reactive';

// Auto-track dependencies
effect(() => {
  document.title = `Count: ${count.get()}`;
});

// Watch specific values
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`);
});
```

### Operators

Transform reactive values with operators:

```typescript
import { pipe, map, filter, debounce } from '@yakkl/reactive';

const searchInput = writable('');

const searchResults = pipe(
  map((term: string) => term.trim().toLowerCase()),
  filter(term => term.length >= 3),
  debounce(300),
  map(async term => await searchAPI(term))
)(searchInput);
```

## Advanced Usage

### Custom Stores

Create stores with advanced features:

```typescript
import { createStore } from '@yakkl/reactive';

const settings = createStore({
  initial: { theme: 'dark', lang: 'en' },
  persist: {
    key: 'app-settings',
    storage: localStorage
  },
  equals: (a, b) => JSON.stringify(a) === JSON.stringify(b)
});
```

### Batching Updates

Optimize multiple updates:

```typescript
import { batch } from '@yakkl/reactive';

batch(() => {
  store1.set(value1);
  store2.set(value2);
  store3.set(value3);
  // All updates trigger once
});
```

### Computed with Memoization

```typescript
import { computed, memo } from '@yakkl/reactive';

// Auto-computed
const total = computed(() => {
  return items.get().reduce((sum, item) => sum + item.price, 0);
});

// Memoized with dependencies
const expensive = memo(
  () => heavyCalculation(input.get()),
  [input], // Dependencies
  (a, b) => a === b // Custom equality
);
```

## API Reference

### Store Functions
- `writable<T>(value: T)` - Create a writable store
- `readable<T>(value: T, start?)` - Create a readable store
- `derived(stores, fn)` - Create a derived store
- `createStore(config)` - Create an advanced store

### Reactive Functions
- `computed(fn, options?)` - Create computed value
- `effect(fn, options?)` - Create side effect
- `watch(source, callback, options?)` - Watch changes
- `watchEffect(fn, options?)` - Auto-track effect

### Operators
- `map(fn)` - Transform values
- `filter(predicate)` - Filter values
- `debounce(ms)` - Debounce updates
- `throttle(ms)` - Throttle updates
- `distinctUntilChanged()` - Unique values only
- `scan(reducer, seed)` - Accumulate values
- `pipe(...operators)` - Compose operators

### Utilities
- `batch(fn)` - Batch updates
- `untrack(fn)` - Prevent tracking
- `ref(value)` - Create a ref
- `isRef(value)` - Check if ref
- `isReactive(value)` - Check if reactive

## Examples

### Counter Store
```typescript
function createCounter(initial = 0) {
  const { subscribe, set, update } = writable(initial);
  
  return {
    subscribe,
    increment: () => update(n => n + 1),
    decrement: () => update(n => n - 1),
    reset: () => set(initial)
  };
}

const counter = createCounter();
counter.increment();
```

### Async Data Store
```typescript
function createAsyncStore<T>(fetcher: () => Promise<T>) {
  const data = writable<T | null>(null);
  const loading = writable(true);
  const error = writable<Error | null>(null);
  
  fetcher()
    .then(result => {
      data.set(result);
      loading.set(false);
    })
    .catch(err => {
      error.set(err);
      loading.set(false);
    });
  
  return {
    data: readable(data),
    loading: readable(loading),
    error: readable(error),
    refresh: async () => {
      loading.set(true);
      try {
        const result = await fetcher();
        data.set(result);
        error.set(null);
      } catch (err) {
        error.set(err as Error);
      } finally {
        loading.set(false);
      }
    }
  };
}
```

## Performance

- Automatic dependency tracking
- Efficient update batching
- Lazy evaluation for computed values
- Memory-efficient cleanup
- Minimal bundle size

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Node.js 18+

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © YAKKL Team

## Related Packages

- [@yakkl/core](https://github.com/yakkl/yakkl/tree/main/packages/yakkl-core) - Core wallet engine
- [@yakkl/wallet](https://github.com/yakkl/yakkl/tree/main/packages/yakkl-wallet) - Smart wallet extension
- [@yakkl/ui](https://github.com/yakkl/yakkl/tree/main/packages/yakkl-ui) - UI components