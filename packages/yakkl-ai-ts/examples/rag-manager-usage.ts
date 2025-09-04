/**
 * RAG Manager usage examples
 */

// Initialize RAG
await aiManager.initializeRAG(ragConfig);

// Add documents
await aiManager.addRAGDocument(content, metadata, source);
await aiManager.addRAGDocuments(documents);

// Search knowledge base
await aiManager.ragSearch(query, options);

// Generate with RAG context
await aiManager.completeWithRAG(query, options);

// Manage documents
await aiManager.updateRAGDocument(id, content, metadata);
await aiManager.deleteRAGDocument(id);

// Get statistics
await aiManager.getRAGStats();