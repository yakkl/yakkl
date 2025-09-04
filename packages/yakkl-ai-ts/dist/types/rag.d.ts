/**
 * RAG (Retrieval-Augmented Generation) type definitions
 */
export interface Document {
    id: string;
    content: string;
    metadata: Record<string, any>;
    source?: string;
    createdAt: Date;
    updatedAt: Date;
    embeddings?: number[];
    chunks?: DocumentChunk[];
}
export interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    embedding?: number[];
    metadata: Record<string, any>;
    startIndex: number;
    endIndex: number;
    pageNumber?: number;
    section?: string;
}
export interface RAGConfig {
    vectorStore: VectorStoreConfig;
    embeddings: EmbeddingConfig;
    retrieval: RetrievalConfig;
    chunking: ChunkingConfig;
    reranking?: RerankingConfig;
}
export interface VectorStoreConfig {
    provider: VectorStoreProvider;
    apiKey?: string;
    endpoint?: string;
    indexName?: string;
    dimension?: number;
    metric?: "cosine" | "euclidean" | "dotproduct";
    cloudProvider?: string;
    region?: string;
}
export declare enum VectorStoreProvider {
    PINECONE = "pinecone",
    WEAVIATE = "weaviate",
    CHROMA = "chroma",
    QDRANT = "qdrant",
    MILVUS = "milvus",
    FAISS = "faiss",
    MEMORY = "memory"
}
export interface EmbeddingConfig {
    provider: EmbeddingProvider;
    model: string;
    apiKey?: string;
    batchSize?: number;
    dimensions?: number;
}
export declare enum EmbeddingProvider {
    OPENAI = "openai",
    COHERE = "cohere",
    GOOGLE = "google",
    HUGGINGFACE = "huggingface",
    CUSTOM = "custom"
}
export interface RetrievalConfig {
    strategy: RetrievalStrategy;
    topK: number;
    scoreThreshold?: number;
    maxTokens?: number;
    includeMetadata?: boolean;
    hybridAlpha?: number;
}
export declare enum RetrievalStrategy {
    SIMILARITY = "similarity",
    MMR = "mmr",// Maximum Marginal Relevance
    HYBRID = "hybrid",// Combine vector + keyword
    SEMANTIC = "semantic",
    CONTEXTUAL = "contextual",
    GRAPH = "graph"
}
export interface ChunkingConfig {
    strategy: ChunkingStrategy;
    chunkSize: number;
    chunkOverlap: number;
    separators?: string[];
    preserveParagraphs?: boolean;
    preserveSentences?: boolean;
}
export declare enum ChunkingStrategy {
    FIXED = "fixed",
    SENTENCE = "sentence",
    PARAGRAPH = "paragraph",
    RECURSIVE = "recursive",
    SEMANTIC = "semantic",
    MARKDOWN = "markdown",
    CODE = "code"
}
export interface RerankingConfig {
    provider: RerankingProvider;
    model?: string;
    apiKey?: string;
    topK?: number;
}
export declare enum RerankingProvider {
    COHERE = "cohere",
    CROSS_ENCODER = "cross_encoder",
    CUSTOM = "custom"
}
export interface SearchResult {
    chunk: DocumentChunk;
    score: number;
    rerankedScore?: number;
}
export interface QueryResult {
    query: string;
    results: SearchResult[];
    answer?: string;
    sources: string[];
    metadata?: Record<string, any>;
}
export interface RAGResponse {
    answer: string;
    sources: Document[];
    chunks: DocumentChunk[];
    confidence?: number;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=rag.d.ts.map