"use strict";
/**
 * YAKKL AI Library - TypeScript Implementation
 *
 * A comprehensive AI integration library supporting multiple providers,
 * RAG implementation, and advanced preprocessing capabilities.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.QuotaManager = exports.RateLimiter = exports.GoogleProvider = exports.AnthropicProvider = exports.OpenAIProvider = exports.BaseAIProvider = void 0;
// Export all types
__exportStar(require("./types"), exports);
// Export providers
var base_provider_1 = require("./providers/base.provider");
Object.defineProperty(exports, "BaseAIProvider", { enumerable: true, get: function () { return base_provider_1.BaseAIProvider; } });
var openai_provider_1 = require("./providers/openai.provider");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return openai_provider_1.OpenAIProvider; } });
var anthropic_provider_1 = require("./providers/anthropic.provider");
Object.defineProperty(exports, "AnthropicProvider", { enumerable: true, get: function () { return anthropic_provider_1.AnthropicProvider; } });
var google_provider_1 = require("./providers/google.provider");
Object.defineProperty(exports, "GoogleProvider", { enumerable: true, get: function () { return google_provider_1.GoogleProvider; } });
// export { AzureOpenAIProvider } from './providers/azure.provider';
// export { CohereProvider } from './providers/cohere.provider';
// export { HuggingFaceProvider } from './providers/huggingface.provider';
// Export provider index
__exportStar(require("./providers"), exports);
// Export manager
// export { AIManager } from './manager/ai-manager';
// export { ProviderFactory } from './manager/provider-factory';
var rate_limiter_1 = require("./manager/rate-limiter");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return rate_limiter_1.RateLimiter; } });
var quota_manager_1 = require("./manager/quota-manager");
Object.defineProperty(exports, "QuotaManager", { enumerable: true, get: function () { return quota_manager_1.QuotaManager; } });
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
exports.VERSION = '1.0.0';
//# sourceMappingURL=index.js.map