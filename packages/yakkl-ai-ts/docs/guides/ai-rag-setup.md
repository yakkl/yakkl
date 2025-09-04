# RAG System - Setup & Configuration Guide

## Overview

The RAG (Retrieval-Augmented Generation) system enhances AI responses by retrieving relevant context from a knowledge base before generation. This provides more accurate, grounded, and contextual answers.

## Key Features

### 🎯 Core Capabilities
- **Multiple Vector Stores**: Pinecone, Weaviate, Chroma, Qdrant, Milvus, FAISS, In-Memory
- **Embedding Providers**: OpenAI, Cohere, Google, HuggingFace
- **Chunking Strategies**: Fixed, Sentence, Paragraph, Semantic, Recursive
- **Retrieval Strategies**: Similarity, MMR, Hybrid, Contextual
- **Reranking**: Cohere, Cross-Encoder models
- **Citation Tracking**: Automatic source attribution
- **Multi-Modal Support**: Text, PDFs, structured data

## Installation

```bash
# Core RAG dependencies
npm install @pinecone-database/pinecone  # For Pinecone
npm install weaviate-ts-client           # For Weaviate
npm install chromadb                     # For Chroma
npm install @qdrant/js-client            # For Qdrant

# Embedding dependencies
npm install openai                       # For OpenAI embeddings
npm install cohere-ai                    # For Cohere embeddings

# Document processing
npm install pdf-parse                    # For PDF extraction
npm install mammoth                      # For Word documents
npm install csv-parse                    # For CSV processing

# Optional: NLP tools
npm install natural                      # For advanced text processing
npm install compromise                   # For NLP operations
```

## Basic Setup

### 1. Initialize with AI Manager

```typescript
import AIManager from './ai-manager';
import { 
  VectorStoreProvider, 
  EmbeddingProvider, 
  ChunkingStrategy, 
  RetrievalStrategy 
} from './rag';

// Initialize AI Manager first
const aiManager = new AIManager([
  {
    provider: AIProvider.OPENAI,
    apiKey: process.env.OPENAI_API_KEY,
  }
]);

// Initialize RAG
await aiManager.initializeRAG({
  vectorStore: {
    provider: VectorStoreProvider.MEMORY,
    dimension: 1536,
    metric: 'cosine',
  },
  embeddings: {
    provider: EmbeddingProvider.OPENAI,
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  },
  chunking: {
    strategy: ChunkingStrategy.RECURSIVE,
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  retrieval: {
    strategy: RetrievalStrategy.HYBRID,
    topK: 5,
    scoreThreshold: 0.7,
  },
});
```

### 2. Add Knowledge Base

```typescript
// Add single document
await aiManager.addRAGDocument(
  'Your document content here...',
  { 
    category: 'documentation',
    version: '1.0',
    tags: ['api', 'guide'],
  },
  'https://source-url.com'
);

// Add multiple documents
await aiManager.addRAGDocuments([
  {
    content: 'First document...',
    metadata: { type: 'tutorial' },
    source: 'tutorial-1',
  },
  {
    content: 'Second document...',
    metadata: { type: 'reference' },
    source: 'reference-1',
  },
]);
```

### 3. Query with RAG

```typescript
// RAG-enhanced completion
const response = await aiManager.completeWithRAG(
  'How do I implement authentication?',
  {
    citeSources: true,
    maxContextTokens: 2000,
    systemPrompt: 'You are a helpful technical assistant.',
  }
);

console.log('Answer:', response.answer);
console.log('Sources:', response.sources);
console.log('Confidence:', response.confidence);
```

## Configuration Options

### Vector Store Configurations

#### Pinecone
```typescript
{
  provider: VectorStoreProvider.PINECONE,
  apiKey: process.env.PINECONE_API_KEY,
  endpoint: 'https://your-index.pinecone.io',
  indexName: 'knowledge-base',
  dimension: 1536,
  metric: 'cosine',
}
```

#### Weaviate
```typescript
{
  provider: VectorStoreProvider.WEAVIATE,
  endpoint: 'http://localhost:8080',
  apiKey: process.env.WEAVIATE_API_KEY,
  indexName: 'KnowledgeBase',
  dimension: 1536,
}
```

#### Chroma
```typescript
{
  provider: VectorStoreProvider.CHROMA,
  endpoint: 'http://localhost:8000',
  indexName: 'knowledge_collection',
  dimension: 1536,
}
```

#### In-Memory (Development)
```typescript
{
  provider: VectorStoreProvider.MEMORY,
  dimension: 1536,
  metric: 'cosine',
}
```

### Embedding Configurations

#### OpenAI Embeddings
```typescript
{
  provider: EmbeddingProvider.OPENAI,
  model: 'text-embedding-3-small',  // or 'text-embedding-3-large'
  apiKey: process.env.OPENAI_API_KEY,
  batchSize: 100,
  dimensions: 1536,  // 3072 for large model
}
```

#### Cohere Embeddings
```typescript
{
  provider: EmbeddingProvider.COHERE,
  model: 'embed-english-v3.0',
  apiKey: process.env.COHERE_API_KEY,
  batchSize: 96,
}
```

### Chunking Strategies

#### Fixed Size
```typescript
{
  strategy: ChunkingStrategy.FIXED,
  chunkSize: 1000,      // Characters per chunk
  chunkOverlap: 200,    // Overlap between chunks
}
```

#### Sentence-Based
```typescript
{
  strategy: ChunkingStrategy.SENTENCE,
  chunkSize: 1000,
  chunkOverlap: 100,
  preserveSentences: true,
}
```

#### Semantic
```typescript
{
  strategy: ChunkingStrategy.SEMANTIC,
  chunkSize: 800,
  chunkOverlap: 150,
}
```

#### Recursive
```typescript
{
  strategy: ChunkingStrategy.RECURSIVE,
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' '],
}
```

### Retrieval Strategies

#### Similarity Search
```typescript
{
  strategy: RetrievalStrategy.SIMILARITY,
  topK: 5,
  scoreThreshold: 0.7,
}
```

#### Maximum Marginal Relevance (MMR)
```typescript
{
  strategy: RetrievalStrategy.MMR,
  topK: 5,
  scoreThreshold: 0.6,
}
```

#### Hybrid Search
```typescript
{
  strategy: RetrievalStrategy.HYBRID,
  topK: 5,
  hybridAlpha: 0.7,  // 0.7 = 70% vector, 30% keyword
}
```

### Reranking Configuration

```typescript
{
  provider: RerankingProvider.COHERE,
  model: 'rerank-english-v2.0',
  apiKey: process.env.COHERE_API_KEY,
  topK: 3,
}
```

## Advanced Usage

### 1. Document Processing Pipeline

```typescript
// Process different document types
async function processDocuments() {
  // PDF processing
  const pdfContent = await extractPDF('document.pdf');
  await aiManager.addRAGDocument(pdfContent, {
    type: 'pdf',
    filename: 'document.pdf',
  });

  // CSV processing
  const csvData = await parseCSV('data.csv');
  await aiManager.addRAGDocument(JSON.stringify(csvData), {
    type: 'csv',
    structured: true,
  });

  // Web scraping
  const webContent = await scrapeWebsite('https://docs.example.com');
  await aiManager.addRAGDocument(webContent, {
    type: 'web',
    url: 'https://docs.example.com',
  });
}
```

### 2. Conversational RAG

```typescript
class ConversationalRAG {
  private conversation: PromptMessage[] = [];
  
  async ask(question: string): Promise<string> {
    const response = await aiManager.completeWithRAG(question, {
      systemPrompt: `You are a helpful assistant. 
        Use the context and conversation history to answer.
        Previous conversation: ${this.getHistory()}`,
      citeSources: true,
    });
    
    this.conversation.push(
      { role: 'user', content: question },
      { role: 'assistant', content: response.answer }
    );
    
    return response.answer;
  }
  
  private getHistory(): string {
    return this.conversation
      .slice(-4)  // Last 2 exchanges
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
  }
}
```

### 3. Knowledge Base Management

```typescript
// Update existing document
await aiManager.updateRAGDocument(
  documentId,
  'Updated content...',
  { version: '2.0', updatedAt: new Date() }
);

// Delete document
await aiManager.deleteRAGDocument(documentId);

// Get statistics
const stats = await aiManager.getRAGStats();
console.log(`Documents: ${stats.documents}`);
console.log(`Chunks: ${stats.chunks}`);
console.log(`Avg chunks/doc: ${stats.averageChunksPerDocument}`);
```

### 4. Custom Metadata Filtering

```typescript
// Search with complex filters
const results = await aiManager.ragSearch(
  'deployment strategies',
  {
    filter: {
      category: 'devops',
      version: { $gte: '2.0' },
      tags: { $contains: 'kubernetes' },
    },
    topK: 10,
    includeMetadata: true,
  }
);
```

### 5. RAG Evaluation

```typescript
async function evaluateRAG(testQueries: string[]) {
  const results = [];
  
  for (const query of testQueries) {
    const response = await aiManager.completeWithRAG(query);
    
    results.push({
      query,
      confidence: response.confidence,
      sourcesUsed: response.sources.length,
      tokensUsed: response.tokens.total,
      topScore: response.sources[0]?.score || 0,
    });
  }
  
  // Calculate metrics
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const avgSources = results.reduce((sum, r) => sum + r.sourcesUsed, 0) / results.length;
  
  return { results, avgConfidence, avgSources };
}
```

## Performance Optimization

### 1. Batch Processing

```typescript
// Process documents in batches
const documents = getLargeDocumentSet();
const batchSize = 50;

for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  await aiManager.addRAGDocuments(batch);
  console.log(`Processed ${i + batch.length}/${documents.length}`);
}
```

### 2. Embedding Caching

```typescript
const embeddingCache = new Map();

async function getCachedEmbedding(text: string) {
  if (!embeddingCache.has(text)) {
    const embedding = await generateEmbedding(text);
    embeddingCache.set(text, embedding);
  }
  return embeddingCache.get(text);
}
```

### 3. Async Processing

```typescript
// Process multiple queries in parallel
const queries = ['query1', 'query2', 'query3'];

const responses = await Promise.all(
  queries.map(q => aiManager.completeWithRAG(q))
);
```

## Best Practices

### Document Preparation
- **Clean text**: Remove unnecessary formatting, headers, footers
- **Structured metadata**: Include categories, dates, versions
- **Consistent formatting**: Use same structure across documents
- **Meaningful sources**: Provide clear source identifiers

### Chunking Strategy Selection
- **Technical docs**: Use semantic or paragraph chunking
- **Narratives**: Use sentence-based chunking
- **Structured data**: Use fixed-size chunking
- **Mixed content**: Use recursive chunking

### Retrieval Optimization
- **High precision needed**: Use higher score thresholds
- **Diverse results**: Use MMR strategy
- **Speed priority**: Use similarity search
- **Best quality**: Use hybrid search with reranking

### Token Management
- **Limit context size**: Set appropriate maxContextTokens
- **Monitor usage**: Track token consumption
- **Optimize chunks**: Balance size vs. relevance
- **Cache frequently**: Cache common queries

## Troubleshooting

### Common Issues

1. **Low Relevance Scores**
   - Adjust chunk size and overlap
   - Try different retrieval strategies
   - Improve document quality
   - Add more diverse content

2. **High Latency**
   - Reduce topK value
   - Use caching
   - Optimize chunk size
   - Consider local vector store

3. **Poor Answer Quality**
   - Increase context tokens
   - Improve chunking strategy
   - Add reranking
   - Enhance system prompts

4. **Memory Issues**
   - Use external vector store
   - Implement pagination
   - Clear old documents
   - Optimize batch sizes

## Monitoring & Analytics

```typescript
// Set up RAG monitoring
aiManager.registerWebhook('rag_completion', (event) => {
  // Log to analytics
  analytics.track('rag_query', {
    query: event.query,
    sources: event.response.sources.length,
    confidence: event.response.confidence,
    tokens: event.response.tokens,
  });
  
  // Alert on low confidence
  if (event.response.confidence < 0.5) {
    alerting.warn('Low confidence RAG response', event);
  }
});
```

## Migration from Existing Systems

### From Simple Q&A
```typescript
// Before: Simple completion
const answer = await ai.complete('What is X?');

// After: RAG-enhanced
const answer = await aiManager.completeWithRAG('What is X?');
```

### From Database Search
```typescript
// Before: SQL search
const results = await db.query('SELECT * FROM docs WHERE content LIKE ?', ['%keyword%']);

// After: Semantic search
const results = await aiManager.ragSearch('keyword concept');
```

## Security Considerations

- **API Key Management**: Store keys securely
- **Data Privacy**: Consider on-premise vector stores for sensitive data
- **Access Control**: Implement user-based filtering
- **Audit Logging**: Track all RAG operations
- **Data Encryption**: Encrypt vectors at rest
- **Rate Limiting**: Apply per-user limits

## Cost Optimization

- **Embedding Models**: Use smaller models when possible
- **Batch Operations**: Process in batches to reduce API calls
- **Caching**: Cache embeddings and results
- **Local Processing**: Use local vector stores for development
- **Optimize Chunks**: Reduce redundant content
- **Monitor Usage**: Track costs per operation
