"use strict";
/**
 * RAG (Retrieval-Augmented Generation) type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RerankingProvider = exports.ChunkingStrategy = exports.RetrievalStrategy = exports.EmbeddingProvider = exports.VectorStoreProvider = void 0;
var VectorStoreProvider;
(function (VectorStoreProvider) {
    VectorStoreProvider["PINECONE"] = "pinecone";
    VectorStoreProvider["WEAVIATE"] = "weaviate";
    VectorStoreProvider["CHROMA"] = "chroma";
    VectorStoreProvider["QDRANT"] = "qdrant";
    VectorStoreProvider["MILVUS"] = "milvus";
    VectorStoreProvider["FAISS"] = "faiss";
    VectorStoreProvider["MEMORY"] = "memory";
})(VectorStoreProvider || (exports.VectorStoreProvider = VectorStoreProvider = {}));
var EmbeddingProvider;
(function (EmbeddingProvider) {
    EmbeddingProvider["OPENAI"] = "openai";
    EmbeddingProvider["COHERE"] = "cohere";
    EmbeddingProvider["GOOGLE"] = "google";
    EmbeddingProvider["HUGGINGFACE"] = "huggingface";
    EmbeddingProvider["CUSTOM"] = "custom";
})(EmbeddingProvider || (exports.EmbeddingProvider = EmbeddingProvider = {}));
var RetrievalStrategy;
(function (RetrievalStrategy) {
    RetrievalStrategy["SIMILARITY"] = "similarity";
    RetrievalStrategy["MMR"] = "mmr";
    RetrievalStrategy["HYBRID"] = "hybrid";
    RetrievalStrategy["SEMANTIC"] = "semantic";
    RetrievalStrategy["CONTEXTUAL"] = "contextual";
    RetrievalStrategy["GRAPH"] = "graph";
})(RetrievalStrategy || (exports.RetrievalStrategy = RetrievalStrategy = {}));
var ChunkingStrategy;
(function (ChunkingStrategy) {
    ChunkingStrategy["FIXED"] = "fixed";
    ChunkingStrategy["SENTENCE"] = "sentence";
    ChunkingStrategy["PARAGRAPH"] = "paragraph";
    ChunkingStrategy["RECURSIVE"] = "recursive";
    ChunkingStrategy["SEMANTIC"] = "semantic";
    ChunkingStrategy["MARKDOWN"] = "markdown";
    ChunkingStrategy["CODE"] = "code";
})(ChunkingStrategy || (exports.ChunkingStrategy = ChunkingStrategy = {}));
var RerankingProvider;
(function (RerankingProvider) {
    RerankingProvider["COHERE"] = "cohere";
    RerankingProvider["CROSS_ENCODER"] = "cross_encoder";
    RerankingProvider["CUSTOM"] = "custom";
})(RerankingProvider || (exports.RerankingProvider = RerankingProvider = {}));
//# sourceMappingURL=rag.js.map