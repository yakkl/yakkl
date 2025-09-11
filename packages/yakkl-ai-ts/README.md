# YAKKL AI Library - TypeScript

A comprehensive AI integration library for TypeScript/JavaScript applications, providing seamless integration with multiple AI providers, advanced RAG (Retrieval-Augmented Generation) implementation, and sophisticated query preprocessing capabilities.

## Features

- 🤖 **Multi-Provider Support**: OpenAI, Anthropic, Google (Gemini), Azure OpenAI, Cohere, HuggingFace
- 🔍 **RAG Implementation**: Full-featured RAG pipeline with vector stores, embeddings, and retrieval strategies
- 📝 **Query Preprocessing**: Advanced query transformation, expansion, and optimization
- ⚡ **Streaming Support**: Real-time streaming responses from supported providers
- 💾 **Intelligent Caching**: Reduce costs with semantic and response caching
- 🔄 **Retry & Fallback**: Automatic retry logic and provider fallback chains
- 📊 **Usage Tracking**: Monitor token usage, costs, and performance metrics
- 🔌 **Plugin System**: Extensible architecture with middleware support
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @yakkl/ai-ts
# or
yarn add @yakkl/ai-ts
# or
pnpm add @yakkl/ai-ts
```

## Quick Start

```typescript
import { AIManager, AIProvider } from '@yakkl/ai-ts';

// Initialize the AI Manager
const ai = new AIManager({
  providers: [
    {
      provider: AIProvider.OPENAI,
      apiKey: process.env.OPENAI_API_KEY,
    },
    {
      provider: AIProvider.ANTHROPIC,
      apiKey: process.env.ANTHROPIC_API_KEY,
    }
  ],
  defaultProvider: AIProvider.OPENAI,
});

// Simple completion
const response = await ai.complete([
  { role: 'user', content: 'What is the capital of France?' }
]);

console.log(response.content);

// Streaming response
for await (const chunk of ai.stream([
  { role: 'user', content: 'Tell me a story' }
])) {
  process.stdout.write(chunk);
}
```

## RAG Implementation

```typescript
import { RAGManager, VectorStoreProvider } from '@yakkl/ai-ts';

// Initialize RAG
const rag = new RAGManager({
  vectorStore: {
    provider: VectorStoreProvider.PINECONE,
    apiKey: process.env.PINECONE_API_KEY,
    indexName: 'my-knowledge-base',
  },
  embeddings: {
    provider: 'openai',
    model: 'text-embedding-3-small',
  },
  chunking: {
    strategy: 'recursive',
    chunkSize: 1000,
    chunkOverlap: 200,
  },
});

// Add documents
await rag.addDocuments([
  {
    content: 'Your document content here',
    metadata: { source: 'docs', type: 'guide' },
  }
]);

// Query with RAG
const result = await rag.query('How do I configure the system?', {
  topK: 5,
  includeSourceText: true,
});

console.log(result.answer);
console.log('Sources:', result.sources);
```

## Query Preprocessing

```typescript
import { QueryPreprocessor } from '@yakkl/ai-ts';

const preprocessor = new QueryPreprocessor({
  enableTypoCorrection: true,
  enableExpansion: true,
  enableHyde: true,
});

// Transform query for better results
const enhanced = await preprocessor.process('wat is teh bset way to lern programing');
// Returns: ["what is the best way to learn programming", ...]

// Use with RAG
const results = await rag.query(enhanced.queries[0]);
```

## Advanced Features

### Provider Fallback

```typescript
const ai = new AIManager({
  providers: [/* ... */],
  fallbackChain: [AIProvider.OPENAI, AIProvider.ANTHROPIC, AIProvider.GOOGLE],
});
```

### Caching

```typescript
const ai = new AIManager({
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    semanticCaching: true,
  },
});
```

### Rate Limiting

```typescript
const ai = new AIManager({
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxTokensPerHour: 100000,
  },
});
```

### Custom Plugins

```typescript
const customPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  install: (manager) => {
    manager.addMiddleware(async (context, next) => {
      console.log('Before request:', context);
      await next();
      console.log('After request:', context);
    });
  },
};

ai.use(customPlugin);
```

## Documentation

- [Getting Started Guide](docs/guides/getting-started.md)
- [API Reference](docs/api/README.md)
- [RAG Setup Guide](docs/guides/ai-rag-setup.md)
- [Provider Configuration](docs/guides/providers.md)
- [TypeScript vs Python Comparison](docs/guides/typescript-python-comparison.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © YAKKL

## Support

- [GitHub Issues](https://github.com/yakkl/yakkl-ai-ts/issues)
- [Discord Community](https://discord.gg/yakkl)
- [Documentation](https://docs.yakkl.com/ai)

## Related Packages

- `@yakkl/ai-python` - Python implementation of the YAKKL AI Library
- `@yakkl/yakkl-core` - Core utilities used by this library
- `@yakkl/yakkl-cache` - Advanced caching system