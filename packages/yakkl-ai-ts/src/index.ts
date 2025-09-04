/**
 * YAKKL AI Library - TypeScript Implementation
 * 
 * A comprehensive AI integration library supporting multiple providers,
 * RAG implementation, and advanced preprocessing capabilities.
 */

// Export all types
export * from './types';

// Export providers
export { BaseAIProvider } from './providers/base.provider';
export { OpenAIProvider } from './providers/openai.provider';
export { AnthropicProvider } from './providers/anthropic.provider';
export { GoogleProvider } from './providers/google.provider';
// export { AzureOpenAIProvider } from './providers/azure.provider';
// export { CohereProvider } from './providers/cohere.provider';
// export { HuggingFaceProvider } from './providers/huggingface.provider';

// Export provider index
export * from './providers';

// Export manager
// export { AIManager } from './manager/ai-manager';
// export { ProviderFactory } from './manager/provider-factory';
export { RateLimiter } from './manager/rate-limiter';
export { QuotaManager } from './manager/quota-manager';
// export { CacheManager } from './manager/cache-manager';

// Export RAG
// export { RAGManager } from './rag/rag-manager';
// export { DocumentStore } from './rag/document-store';
// export * from './rag/chunking';
// export * from './rag/embeddings';
// export * from './rag/vector-stores';
// export * from './rag/retrieval';

// Export preprocessing
// export { QueryPreprocessor } from './preprocessing/query-preprocessor';
// export * from './preprocessing/transformations';

// Export utilities
// export * from './utils/async';
// export * from './utils/streaming';
// export * from './utils/monitoring';
// export * from './utils/decorators';
// export * from './utils/validators';

// Export templates
// export * from './templates';

// Export plugins
// export { PluginManager } from './plugins/plugin-manager';
// export * from './plugins/middleware';

// Version
export const VERSION = '1.0.0';