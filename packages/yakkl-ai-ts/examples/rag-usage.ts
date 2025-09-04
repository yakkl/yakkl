// rag-usage-examples.ts
import AIManager, { AIProvider, PromptMessage } from "./ai-manager";
import {
  RAGManager,
  RAGConfig,
  VectorStoreProvider,
  EmbeddingProvider,
  ChunkingStrategy,
  RetrievalStrategy,
  RerankingProvider,
  Document,
  SearchResult,
  RAGResponse,
} from "./rag/index";

// 1. Basic RAG Setup
async function basicRAGSetup() {
  // Configure RAG system
  const ragConfig: RAGConfig = {
    vectorStore: {
      provider: VectorStoreProvider.MEMORY, // Use in-memory for demo
      dimension: 1536,
      metric: "cosine",
    },
    embeddings: {
      provider: EmbeddingProvider.OPENAI,
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_KEY,
      batchSize: 100,
    },
    chunking: {
      strategy: ChunkingStrategy.RECURSIVE,
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " "],
      preserveSentences: true,
    },
    retrieval: {
      strategy: RetrievalStrategy.HYBRID,
      topK: 5,
      scoreThreshold: 0.7,
      maxTokens: 2000,
      includeMetadata: true,
      hybridAlpha: 0.7, // 70% vector, 30% keyword
    },
  };

  // Initialize RAG manager
  const ragManager = new RAGManager(ragConfig);
  await ragManager.initialize();

  // Initialize AI Manager
  const aiManager = new AIManager(
    [
      {
        provider: AIProvider.OPENAI,
        apiKey: process.env.OPENAI_API_KEY,
      },
    ],
    {}, // Rate limit config
    {}, // Quota config
    { cacheEnabled: true }
  );

  return { ragManager, aiManager };
}

// 2. Document Ingestion
async function documentIngestionExample(ragManager: RAGManager) {
  console.log("📚 Document Ingestion Example");

  // Add a single document
  const doc1 = await ragManager.addDocument(
    `Artificial Intelligence (AI) is transforming healthcare through various applications.
    Machine learning algorithms can analyze medical images with high accuracy, often
    detecting diseases earlier than human doctors. Natural language processing helps
    extract insights from medical records and research papers. AI-powered drug discovery
    is accelerating the development of new treatments.`,
    {
      category: "healthcare",
      source: "research_paper_2024",
      author: "Dr. Smith",
      tags: ["AI", "healthcare", "machine learning"],
    },
    "https://example.com/ai-healthcare"
  );

  console.log("Added document:", doc1.id);

  // Add multiple documents in batch
  const documents = [
    {
      content: `Climate change is one of the most pressing challenges of our time.
      Rising global temperatures are causing melting ice caps, rising sea levels,
      and more frequent extreme weather events. The Paris Agreement aims to limit
      global warming to 1.5°C above pre-industrial levels.`,
      metadata: { category: "environment", year: 2024 },
      source: "climate_report_2024",
    },
    {
      content: `Quantum computing represents a paradigm shift in computation.
      Unlike classical bits that can be 0 or 1, quantum bits (qubits) can exist
      in superposition of both states. This enables quantum computers to solve
      certain problems exponentially faster than classical computers.`,
      metadata: { category: "technology", topic: "quantum" },
      source: "quantum_computing_guide",
    },
    {
      content: `The human immune system is a complex network of cells, tissues,
      and organs that work together to defend the body against harmful invaders.
      It includes innate immunity (first line of defense) and adaptive immunity
      (specific responses to pathogens). Vaccines work by training the adaptive
      immune system to recognize specific threats.`,
      metadata: { category: "healthcare", topic: "immunology" },
      source: "medical_textbook",
    },
  ];

  const addedDocs = await ragManager.addDocuments(documents);
  console.log(`Added ${addedDocs.length} documents in batch`);

  // Get statistics
  const stats = await ragManager.getStats();
  console.log("RAG Statistics:", stats);
}

// 3. Semantic Search
async function semanticSearchExample(ragManager: RAGManager) {
  console.log("\n🔍 Semantic Search Example");

  // Simple search
  const results = await ragManager.search(
    "How does AI help in medical diagnosis?"
  );

  console.log(`Found ${results.length} relevant chunks:`);
  for (const result of results) {
    console.log(`- Score: ${result.score.toFixed(3)}`);
    console.log(`  Content: ${result.chunk.content.substring(0, 100)}...`);
    console.log(`  Source: ${result.chunk.metadata.source}`);
  }

  // Search with filters
  const filteredResults = await ragManager.search(
    "What are the latest developments?",
    {
      filter: { category: "technology" },
      topK: 3,
      includeMetadata: true,
    }
  );

  console.log("\nFiltered search results (technology only):");
  for (const result of filteredResults) {
    console.log(`- ${result.chunk.metadata.topic}: ${result.score.toFixed(3)}`);
  }
}

// 4. RAG-Enhanced Generation
async function ragGenerationExample(
  ragManager: RAGManager,
  aiManager: AIManager
) {
  console.log("\n🤖 RAG-Enhanced Generation Example");

  const query =
    "Explain how quantum computing could revolutionize drug discovery";

  const response: RAGResponse = await ragManager.generateWithRAG(
    query,
    aiManager,
    {
      systemPrompt:
        "You are a knowledgeable assistant. Use the provided context to give accurate, detailed answers. Cite your sources.",
      citeSources: true,
      maxContextTokens: 1500,
      modelConfig: {
        model: "gpt-4-turbo-preview",
        temperature: 0.7,
        maxTokens: 500,
      },
    }
  );

  console.log("Question:", query);
  console.log("\nAnswer:", response.answer);
  console.log("\nConfidence:", response.confidence.toFixed(2));
  console.log("\nSources used:", response.sources.length);
  console.log("Tokens used:", response.tokens);

  if (response.citations.length > 0) {
    console.log("\nCitations:");
    for (const citation of response.citations) {
      console.log(
        `- "${citation.text.substring(
          0,
          50
        )}..." (confidence: ${citation.confidence.toFixed(2)})`
      );
    }
  }
}

// 5. Advanced RAG with Reranking
async function advancedRAGWithReranking() {
  console.log("\n🎯 Advanced RAG with Reranking");

  const ragConfig: RAGConfig = {
    vectorStore: {
      provider: VectorStoreProvider.PINECONE,
      apiKey: process.env.PINECONE_API_KEY,
      endpoint: "https://your-index.pinecone.io",
      indexName: "knowledge-base",
      dimension: 1536,
    },
    embeddings: {
      provider: EmbeddingProvider.OPENAI,
      model: "text-embedding-3-large",
      apiKey: process.env.OPENAI_API_KEY,
      dimensions: 3072,
    },
    chunking: {
      strategy: ChunkingStrategy.SEMANTIC,
      chunkSize: 800,
      chunkOverlap: 150,
    },
    retrieval: {
      strategy: RetrievalStrategy.MMR, // Maximum Marginal Relevance
      topK: 10,
      scoreThreshold: 0.6,
    },
    reranking: {
      provider: RerankingProvider.COHERE,
      model: "rerank-english-v2.0",
      apiKey: process.env.COHERE_API_KEY,
      topK: 5,
    },
  };

  const ragManager = new RAGManager(ragConfig);
  await ragManager.initialize();

  // Perform search with reranking
  const results = await ragManager.search(
    "What are the environmental impacts of cryptocurrency mining?"
  );

  console.log("Reranked results:");
  for (let i = 0; i < results.length; i++) {
    console.log(`${i + 1}. Score: ${results[i].score.toFixed(3)}`);
    console.log(`   ${results[i].chunk.content.substring(0, 100)}...`);
  }
}

// 6. Multi-Modal RAG (with images/PDFs)
async function multiModalRAGExample(ragManager: RAGManager) {
  console.log("\n📄 Multi-Modal RAG Example");

  // Process PDF document
  const pdfContent = await extractPDFContent("research_paper.pdf"); // Implement PDF extraction

  const pdfDoc = await ragManager.addDocument(
    pdfContent,
    {
      type: "pdf",
      filename: "research_paper.pdf",
      pages: 20,
      extractedImages: 5,
    },
    "file://research_paper.pdf"
  );

  // Process structured data (JSON, CSV)
  const structuredData = {
    title: "Quarterly Sales Report",
    data: [
      { product: "AI Assistant", revenue: 1000000, growth: 25 },
      { product: "RAG System", revenue: 750000, growth: 40 },
    ],
  };

  await ragManager.addDocument(
    JSON.stringify(structuredData, null, 2),
    {
      type: "structured",
      format: "json",
      category: "financial",
    },
    "data://quarterly_report"
  );

  // Search across multi-modal content
  const results = await ragManager.search(
    "What was the revenue growth for RAG System?"
  );
  console.log("Found in structured data:", results[0]?.chunk.content);
}

// 7. Incremental Learning & Updates
async function incrementalLearningExample(ragManager: RAGManager) {
  console.log("\n📈 Incremental Learning Example");

  // Add initial document
  const docId = (
    await ragManager.addDocument(
      "Bitcoin was created in 2009 by Satoshi Nakamoto. It was worth less than $1 initially.",
      { topic: "cryptocurrency", version: 1 }
    )
  ).id;

  // Update document with new information
  await ragManager.updateDocument(
    docId,
    "Bitcoin was created in 2009 by Satoshi Nakamoto. It was worth less than $1 initially. As of 2024, Bitcoin has reached all-time highs above $60,000 and is widely adopted by institutions.",
    { topic: "cryptocurrency", version: 2, lastUpdated: new Date() }
  );

  console.log("Document updated with new information");

  // Search for updated content
  const results = await ragManager.search(
    "What is the current status of Bitcoin?"
  );
  console.log("Updated search results:", results[0]?.chunk.content);
}

// 8. Conversational RAG with Context
async function conversationalRAGExample(
  ragManager: RAGManager,
  aiManager: AIManager
) {
  console.log("\n💬 Conversational RAG Example");

  // Maintain conversation history
  const conversation: PromptMessage[] = [];

  async function askQuestion(question: string): Promise<string> {
    // Search for relevant context
    const searchResults = await ragManager.search(question);
    const context = searchResults.map((r) => r.chunk.content).join("\n---\n");

    // Add to conversation
    conversation.push({
      role: "user",
      content: `Context: ${context}\n\nQuestion: ${question}`,
    });

    // Generate response
    const messages: PromptMessage[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant. Use the provided context and conversation history to answer questions.",
      },
      ...conversation,
    ];

    const response = await aiManager.complete(messages, {
      modelConfig: { model: "gpt-3.5-turbo", maxTokens: 300 },
    });

    // Add assistant response to conversation
    conversation.push({
      role: "assistant",
      content: response.content,
    });

    return response.content;
  }

  // Have a conversation
  console.log("Q: What is quantum computing?");
  console.log("A:", await askQuestion("What is quantum computing?"));

  console.log("\nQ: How is it different from classical computing?");
  console.log(
    "A:",
    await askQuestion("How is it different from classical computing?")
  );

  console.log("\nQ: What are its potential applications?");
  console.log("A:", await askQuestion("What are its potential applications?"));
}

// 9. RAG Evaluation & Metrics
async function ragEvaluationExample(ragManager: RAGManager) {
  console.log("\n📊 RAG Evaluation Example");

  // Test queries with expected answers
  const testCases = [
    {
      query: "What is machine learning?",
      expectedKeywords: ["algorithms", "data", "patterns", "prediction"],
    },
    {
      query: "How does climate change affect sea levels?",
      expectedKeywords: ["melting", "ice", "rising", "temperature"],
    },
  ];

  const evaluationResults = [];

  for (const testCase of testCases) {
    const results = await ragManager.search(testCase.query);

    // Calculate precision
    const relevantResults = results.filter((r) =>
      testCase.expectedKeywords.some((keyword) =>
        r.chunk.content.toLowerCase().includes(keyword)
      )
    );

    const precision = relevantResults.length / results.length;

    // Calculate average score
    const avgScore =
      results.reduce((sum, r) => sum + r.score, 0) / results.length;

    evaluationResults.push({
      query: testCase.query,
      precision,
      avgScore,
      topScore: results[0]?.score || 0,
    });
  }

  console.log("Evaluation Results:");
  for (const result of evaluationResults) {
    console.log(`Query: "${result.query}"`);
    console.log(`  Precision: ${(result.precision * 100).toFixed(1)}%`);
    console.log(`  Avg Score: ${result.avgScore.toFixed(3)}`);
    console.log(`  Top Score: ${result.topScore.toFixed(3)}`);
  }
}

// 10. RAG with Different Retrieval Strategies
async function retrievalStrategiesExample(ragManager: RAGManager) {
  console.log("\n🔄 Different Retrieval Strategies");

  const query = "Explain the benefits of renewable energy";

  // Test different strategies
  const strategies = [
    RetrievalStrategy.SIMILARITY,
    RetrievalStrategy.MMR,
    RetrievalStrategy.HYBRID,
    RetrievalStrategy.CONTEXTUAL,
  ];

  for (const strategy of strategies) {
    // Update retrieval strategy
    ragManager["config"].retrieval.strategy = strategy;

    const results = await ragManager.search(query, { topK: 3 });

    console.log(`\n${strategy} Strategy:`);
    console.log(`Found ${results.length} results`);
    console.log(`Top score: ${results[0]?.score.toFixed(3) || "N/A"}`);
    console.log(`Diversity: ${calculateDiversity(results).toFixed(2)}`);
  }
}

// 11. Knowledge Graph RAG
async function knowledgeGraphRAGExample(ragManager: RAGManager) {
  console.log("\n🕸️ Knowledge Graph RAG Example");

  // Add documents with entity relationships
  const documents = [
    {
      content: "Tesla, founded by Elon Musk, is a leader in electric vehicles.",
      metadata: {
        entities: ["Tesla", "Elon Musk"],
        relationships: [{ from: "Elon Musk", to: "Tesla", type: "founded" }],
      },
    },
    {
      content: "Elon Musk also founded SpaceX and acquired Twitter (now X).",
      metadata: {
        entities: ["Elon Musk", "SpaceX", "Twitter", "X"],
        relationships: [
          { from: "Elon Musk", to: "SpaceX", type: "founded" },
          { from: "Elon Musk", to: "Twitter", type: "acquired" },
        ],
      },
    },
    {
      content: "SpaceX develops spacecraft and aims to colonize Mars.",
      metadata: {
        entities: ["SpaceX", "Mars"],
        relationships: [{ from: "SpaceX", to: "Mars", type: "mission" }],
      },
    },
  ];

  await ragManager.addDocuments(documents);

  // Search with entity awareness
  const results = await ragManager.search(
    "What companies did Elon Musk create?",
    {
      filter: { entities: { $contains: "Elon Musk" } },
    }
  );

  console.log("Entity-aware search results:");
  for (const result of results) {
    console.log(`- ${result.chunk.content}`);
    console.log(`  Entities: ${result.chunk.metadata.entities?.join(", ")}`);
  }
}

// 12. RAG with Caching
async function ragCachingExample(ragManager: RAGManager, aiManager: AIManager) {
  console.log("\n⚡ RAG with Caching Example");

  // Create a cache for embeddings
  const embeddingCache = new Map<string, number[]>();

  // Wrapper function with caching
  async function cachedSearch(query: string): Promise<SearchResult[]> {
    let embedding = embeddingCache.get(query);

    if (!embedding) {
      embedding = await ragManager["embeddingProvider"].embed(query);
      embeddingCache.set(query, embedding);
      console.log("Generated new embedding");
    } else {
      console.log("Using cached embedding");
    }

    return ragManager["retriever"].retrieve(query, embedding);
  }

  // First search - generates embedding
  const start1 = Date.now();
  await cachedSearch("What is artificial intelligence?");
  console.log(`First search: ${Date.now() - start1}ms`);

  // Second search - uses cache
  const start2 = Date.now();
  await cachedSearch("What is artificial intelligence?");
  console.log(`Cached search: ${Date.now() - start2}ms`);
}

// 13. Export and Import RAG Data
async function exportImportExample(ragManager: RAGManager) {
  console.log("\n💾 Export/Import RAG Data");

  // Export all documents
  const allDocuments = ragManager.getAllDocuments();
  const exportData = {
    documents: allDocuments,
    stats: await ragManager.getStats(),
    timestamp: new Date().toISOString(),
  };

  // Save to file (in real app)
  const exportJson = JSON.stringify(exportData, null, 2);
  console.log(
    `Exported ${allDocuments.length} documents (${exportJson.length} bytes)`
  );

  // Clear RAG system
  await ragManager.clear();
  console.log("Cleared RAG system");

  // Import documents back
  const importData = JSON.parse(exportJson);
  await ragManager.addDocuments(
    importData.documents.map((doc: Document) => ({
      content: doc.content,
      metadata: doc.metadata,
      source: doc.source,
    }))
  );

  console.log(`Imported ${importData.documents.length} documents`);
  const newStats = await ragManager.getStats();
  console.log("New stats:", newStats);
}

// Helper Functions
async function extractPDFContent(filename: string): Promise<string> {
  // Placeholder for PDF extraction
  // In production, use libraries like pdf-parse or pdf.js
  return `Content extracted from ${filename}`;
}

function calculateDiversity(results: SearchResult[]): number {
  if (results.length < 2) return 0;

  let totalDistance = 0;
  let comparisons = 0;

  for (let i = 0; i < results.length - 1; i++) {
    for (let j = i + 1; j < results.length; j++) {
      if (results[i].chunk.embedding && results[j].chunk.embedding) {
        const distance = cosineDistance(
          results[i].chunk.embedding!,
          results[j].chunk.embedding!
        );
        totalDistance += distance;
        comparisons++;
      }
    }
  }

  return comparisons > 0 ? totalDistance / comparisons : 0;
}

function cosineDistance(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1 - similarity; // Convert to distance
}

// Main execution
async function main() {
  console.log("🚀 RAG System Examples");
  console.log("======================\n");

  try {
    // Initialize systems
    const { ragManager, aiManager } = await basicRAGSetup();

    // Run examples
    await documentIngestionExample(ragManager);
    await semanticSearchExample(ragManager);
    await ragGenerationExample(ragManager, aiManager);
    await incrementalLearningExample(ragManager);
    await conversationalRAGExample(ragManager, aiManager);
    await ragEvaluationExample(ragManager);
    await retrievalStrategiesExample(ragManager);
    await knowledgeGraphRAGExample(ragManager);
    await ragCachingExample(ragManager, aiManager);
    await exportImportExample(ragManager);

    // Advanced examples (optional)
    // await advancedRAGWithReranking();
    // await multiModalRAGExample(ragManager);

    console.log("\n✅ All examples completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicRAGSetup,
  documentIngestionExample,
  semanticSearchExample,
  ragGenerationExample,
  advancedRAGWithReranking,
  multiModalRAGExample,
  incrementalLearningExample,
  conversationalRAGExample,
  ragEvaluationExample,
  retrievalStrategiesExample,
  knowledgeGraphRAGExample,
  ragCachingExample,
  exportImportExample,
};
