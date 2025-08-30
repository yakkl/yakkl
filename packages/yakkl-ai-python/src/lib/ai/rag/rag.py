# rag_manager.py
"""
Production-ready RAG (Retrieval-Augmented Generation) System for Python
Supports multiple vector stores, embedding providers, and retrieval strategies
"""

import asyncio
import json
import hashlib
import uuid
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, AsyncGenerator
from dataclasses import dataclass, field, asdict
from enum import Enum
from abc import ABC, abstractmethod
import aiohttp
import logging

logger = logging.getLogger(__name__)


# ============== Types and Enums ==============

class VectorStoreProvider(Enum):
    """Available vector store providers"""
    PINECONE = 'pinecone'
    WEAVIATE = 'weaviate'
    CHROMA = 'chroma'
    QDRANT = 'qdrant'
    MILVUS = 'milvus'
    FAISS = 'faiss'
    MEMORY = 'memory'  # In-memory for testing


class EmbeddingProvider(Enum):
    """Available embedding providers"""
    OPENAI = 'openai'
    COHERE = 'cohere'
    GOOGLE = 'google'
    HUGGINGFACE = 'huggingface'
    CUSTOM = 'custom'


class ChunkingStrategy(Enum):
    """Document chunking strategies"""
    FIXED = 'fixed'
    SENTENCE = 'sentence'
    PARAGRAPH = 'paragraph'
    SEMANTIC = 'semantic'
    RECURSIVE = 'recursive'
    CUSTOM = 'custom'


class RetrievalStrategy(Enum):
    """Retrieval strategies"""
    SIMILARITY = 'similarity'
    MMR = 'mmr'  # Maximum Marginal Relevance
    HYBRID = 'hybrid'  # Combine vector + keyword
    SEMANTIC = 'semantic'
    CONTEXTUAL = 'contextual'
    GRAPH = 'graph'  # Knowledge graph based


class RerankingProvider(Enum):
    """Reranking providers"""
    COHERE = 'cohere'
    CROSS_ENCODER = 'cross-encoder'
    CUSTOM = 'custom'


@dataclass
class Document:
    """Document in the knowledge base"""
    id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    source: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    embeddings: Optional[List[float]] = None
    chunks: Optional[List['DocumentChunk']] = None


@dataclass
class DocumentChunk:
    """Chunk of a document"""
    id: str
    document_id: str
    content: str
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    start_index: int = 0
    end_index: int = 0
    page_number: Optional[int] = None
    section: Optional[str] = None


@dataclass
class VectorStoreConfig:
    """Vector store configuration"""
    provider: VectorStoreProvider
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    index_name: Optional[str] = None
    dimension: Optional[int] = None
    metric: str = 'cosine'  # cosine, euclidean, dotproduct
    cloud_provider: Optional[str] = None
    region: Optional[str] = None


@dataclass
class EmbeddingConfig:
    """Embedding configuration"""
    provider: EmbeddingProvider
    model: str
    api_key: Optional[str] = None
    batch_size: int = 100
    dimensions: Optional[int] = None


@dataclass
class ChunkingConfig:
    """Chunking configuration"""
    strategy: ChunkingStrategy
    chunk_size: int = 1000
    chunk_overlap: int = 200
    separators: Optional[List[str]] = None
    preserve_paragraphs: bool = False
    preserve_sentences: bool = True


@dataclass
class RetrievalConfig:
    """Retrieval configuration"""
    strategy: RetrievalStrategy
    top_k: int = 5
    score_threshold: Optional[float] = None
    max_tokens: Optional[int] = None
    include_metadata: bool = True
    hybrid_alpha: float = 0.5  # For hybrid search (0 = keyword only, 1 = vector only)


@dataclass
class RerankingConfig:
    """Reranking configuration"""
    provider: RerankingProvider
    model: Optional[str] = None
    top_k: Optional[int] = None
    api_key: Optional[str] = None


@dataclass
class RAGConfig:
    """Complete RAG configuration"""
    vector_store: VectorStoreConfig
    embeddings: EmbeddingConfig
    retrieval: RetrievalConfig
    chunking: ChunkingConfig
    reranking: Optional[RerankingConfig] = None


@dataclass
class SearchResult:
    """Search result from vector store"""
    chunk: DocumentChunk
    score: float
    document: Optional[Document] = None
    highlights: Optional[List[str]] = None
    explanation: Optional[str] = None


@dataclass
class RAGResponse:
    """RAG-enhanced response"""
    answer: str
    sources: List[SearchResult]
    confidence: float
    tokens: Dict[str, int]
    citations: List['Citation']
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class Citation:
    """Citation in a response"""
    text: str
    source_id: str
    document_id: str
    page_number: Optional[int] = None
    confidence: float = 0.0


# ============== Base Embedding Provider ==============

class BaseEmbeddingProvider(ABC):
    """Abstract base class for embedding providers"""
    
    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generate embedding for text"""
        pass
    
    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for batch of texts"""
        pass
    
    @abstractmethod
    def get_dimensions(self) -> int:
        """Get embedding dimensions"""
        pass
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        if self.session:
            await self.session.close()


# ============== OpenAI Embeddings ==============

class OpenAIEmbeddings(BaseEmbeddingProvider):
    """OpenAI embedding provider"""
    
    def __init__(self, config: EmbeddingConfig):
        super().__init__(config)
        self.headers = {
            'Authorization': f"Bearer {config.api_key}",
            'Content-Type': 'application/json'
        }
    
    async def embed(self, text: str) -> List[float]:
        """Generate OpenAI embedding"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.post(
            'https://api.openai.com/v1/embeddings',
            headers=self.headers,
            json={
                'model': self.config.model or 'text-embedding-3-small',
                'input': text
            }
        ) as response:
            data = await response.json()
            return data['data'][0]['embedding']
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate OpenAI embeddings in batch"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        batch_size = self.config.batch_size or 100
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            async with self.session.post(
                'https://api.openai.com/v1/embeddings',
                headers=self.headers,
                json={
                    'model': self.config.model or 'text-embedding-3-small',
                    'input': batch
                }
            ) as response:
                data = await response.json()
                embeddings.extend([d['embedding'] for d in data['data']])
        
        return embeddings
    
    def get_dimensions(self) -> int:
        """Get OpenAI embedding dimensions"""
        dimensions = {
            'text-embedding-3-small': 1536,
            'text-embedding-3-large': 3072,
            'text-embedding-ada-002': 1536,
        }
        return dimensions.get(self.config.model, 1536)


# ============== Base Vector Store ==============

class BaseVectorStore(ABC):
    """Abstract base class for vector stores"""
    
    def __init__(self, config: VectorStoreConfig):
        self.config = config
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize vector store"""
        pass
    
    @abstractmethod
    async def upsert(self, chunks: List[DocumentChunk]) -> None:
        """Insert or update chunks"""
        pass
    
    @abstractmethod
    async def search(
        self,
        embedding: List[float],
        top_k: int,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """Search for similar chunks"""
        pass
    
    @abstractmethod
    async def delete(self, ids: List[str]) -> None:
        """Delete chunks by ID"""
        pass
    
    @abstractmethod
    async def clear(self) -> None:
        """Clear all data"""
        pass
    
    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        """Get statistics"""
        pass


# ============== Memory Vector Store ==============

class MemoryVectorStore(BaseVectorStore):
    """In-memory vector store for testing"""
    
    def __init__(self, config: VectorStoreConfig):
        super().__init__(config)
        self.vectors: Dict[str, Tuple[List[float], DocumentChunk]] = {}
    
    async def initialize(self) -> None:
        """Initialize memory store"""
        pass  # No initialization needed
    
    async def upsert(self, chunks: List[DocumentChunk]) -> None:
        """Insert chunks into memory"""
        for chunk in chunks:
            if chunk.embedding:
                self.vectors[chunk.id] = (chunk.embedding, chunk)
    
    async def search(
        self,
        query_embedding: List[float],
        top_k: int,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """Search in memory"""
        results = []
        
        for chunk_id, (embedding, chunk) in self.vectors.items():
            # Apply metadata filter
            if filter and not self._matches_filter(chunk.metadata, filter):
                continue
            
            score = self._cosine_similarity(query_embedding, embedding)
            results.append(SearchResult(chunk=chunk, score=score))
        
        # Sort by score and return top K
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]
    
    async def delete(self, ids: List[str]) -> None:
        """Delete from memory"""
        for id in ids:
            self.vectors.pop(id, None)
    
    async def clear(self) -> None:
        """Clear memory"""
        self.vectors.clear()
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get memory stats"""
        if self.vectors:
            first_vector = next(iter(self.vectors.values()))
            dimensions = len(first_vector[0])
        else:
            dimensions = 0
        
        return {
            'count': len(self.vectors),
            'dimensions': dimensions
        }
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity"""
        a_np = np.array(a)
        b_np = np.array(b)
        return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))
    
    def _matches_filter(self, metadata: Dict[str, Any], filter: Dict[str, Any]) -> bool:
        """Check if metadata matches filter"""
        for key, value in filter.items():
            if metadata.get(key) != value:
                return False
        return True


# ============== Pinecone Vector Store ==============

class PineconeVectorStore(BaseVectorStore):
    """Pinecone vector store implementation"""
    
    def __init__(self, config: VectorStoreConfig):
        super().__init__(config)
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self) -> None:
        """Initialize Pinecone connection"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.get(
            f"{self.config.endpoint}/indexes/{self.config.index_name}",
            headers={'Api-Key': self.config.api_key}
        ) as response:
            if response.status != 200:
                raise Exception('Failed to connect to Pinecone')
    
    async def upsert(self, chunks: List[DocumentChunk]) -> None:
        """Upsert to Pinecone"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        vectors = [
            {
                'id': chunk.id,
                'values': chunk.embedding,
                'metadata': {
                    **chunk.metadata,
                    'content': chunk.content,
                    'document_id': chunk.document_id
                }
            }
            for chunk in chunks if chunk.embedding
        ]
        
        async with self.session.post(
            f"{self.config.endpoint}/vectors/upsert",
            headers={
                'Api-Key': self.config.api_key,
                'Content-Type': 'application/json'
            },
            json={
                'namespace': self.config.index_name,
                'vectors': vectors
            }
        ) as response:
            if response.status != 200:
                raise Exception('Failed to upsert to Pinecone')
    
    async def search(
        self,
        embedding: List[float],
        top_k: int,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """Search in Pinecone"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.post(
            f"{self.config.endpoint}/query",
            headers={
                'Api-Key': self.config.api_key,
                'Content-Type': 'application/json'
            },
            json={
                'namespace': self.config.index_name,
                'vector': embedding,
                'topK': top_k,
                'includeMetadata': True,
                'filter': filter
            }
        ) as response:
            data = await response.json()
            
            results = []
            for match in data.get('matches', []):
                chunk = DocumentChunk(
                    id=match['id'],
                    content=match['metadata'].get('content', ''),
                    document_id=match['metadata'].get('document_id', ''),
                    metadata=match['metadata'],
                    embedding=match.get('values')
                )
                results.append(SearchResult(chunk=chunk, score=match['score']))
            
            return results
    
    async def delete(self, ids: List[str]) -> None:
        """Delete from Pinecone"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.post(
            f"{self.config.endpoint}/vectors/delete",
            headers={
                'Api-Key': self.config.api_key,
                'Content-Type': 'application/json'
            },
            json={
                'namespace': self.config.index_name,
                'ids': ids
            }
        ) as response:
            if response.status != 200:
                raise Exception('Failed to delete from Pinecone')
    
    async def clear(self) -> None:
        """Clear Pinecone index"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.post(
            f"{self.config.endpoint}/vectors/delete",
            headers={
                'Api-Key': self.config.api_key,
                'Content-Type': 'application/json'
            },
            json={
                'namespace': self.config.index_name,
                'deleteAll': True
            }
        ) as response:
            if response.status != 200:
                raise Exception('Failed to clear Pinecone')
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get Pinecone stats"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.get(
            f"{self.config.endpoint}/describe_index_stats",
            headers={'Api-Key': self.config.api_key}
        ) as response:
            data = await response.json()
            return {
                'count': data.get('totalVectorCount', 0),
                'dimensions': data.get('dimension', 0)
            }
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        if self.session:
            await self.session.close()


# ============== Document Chunker ==============

class DocumentChunker:
    """Document chunking service"""
    
    def __init__(self, config: ChunkingConfig):
        self.config = config
    
    def chunk(self, document: Document) -> List[DocumentChunk]:
        """Chunk a document"""
        if self.config.strategy == ChunkingStrategy.FIXED:
            return self._fixed_chunking(document)
        elif self.config.strategy == ChunkingStrategy.SENTENCE:
            return self._sentence_chunking(document)
        elif self.config.strategy == ChunkingStrategy.PARAGRAPH:
            return self._paragraph_chunking(document)
        elif self.config.strategy == ChunkingStrategy.SEMANTIC:
            return self._semantic_chunking(document)
        elif self.config.strategy == ChunkingStrategy.RECURSIVE:
            return self._recursive_chunking(document)
        else:
            return self._fixed_chunking(document)
    
    def _fixed_chunking(self, document: Document) -> List[DocumentChunk]:
        """Fixed-size chunking"""
        chunks = []
        content = document.content
        chunk_size = self.config.chunk_size
        overlap = self.config.chunk_overlap
        
        for i in range(0, len(content), chunk_size - overlap):
            chunk = DocumentChunk(
                id=f"{document.id}-chunk-{len(chunks)}",
                document_id=document.id,
                content=content[i:i + chunk_size],
                metadata={
                    **document.metadata,
                    'chunk_index': len(chunks)
                },
                start_index=i,
                end_index=min(i + chunk_size, len(content))
            )
            chunks.append(chunk)
            
            if i + chunk_size >= len(content):
                break
        
        return chunks
    
    def _sentence_chunking(self, document: Document) -> List[DocumentChunk]:
        """Sentence-based chunking"""
        chunks = []
        sentences = self._split_into_sentences(document.content)
        chunk_size = self.config.chunk_size
        overlap = self.config.chunk_overlap
        
        current_chunk = ''
        current_start = 0
        sentence_count = 0
        
        for i, sentence in enumerate(sentences):
            potential_chunk = current_chunk + ' ' + sentence if current_chunk else sentence
            
            if len(potential_chunk) <= chunk_size:
                current_chunk = potential_chunk.strip()
                sentence_count += 1
            else:
                if current_chunk:
                    chunks.append(DocumentChunk(
                        id=f"{document.id}-chunk-{len(chunks)}",
                        document_id=document.id,
                        content=current_chunk,
                        metadata={
                            **document.metadata,
                            'chunk_index': len(chunks),
                            'sentence_count': sentence_count
                        },
                        start_index=current_start,
                        end_index=current_start + len(current_chunk)
                    ))
                
                # Start new chunk with overlap
                overlap_sentences = overlap // 100  # Approximate
                start_idx = max(0, i - overlap_sentences)
                current_chunk = ' '.join(sentences[start_idx:i + 1])
                current_start += len(current_chunk)
                sentence_count = overlap_sentences + 1
        
        # Add remaining content
        if current_chunk:
            chunks.append(DocumentChunk(
                id=f"{document.id}-chunk-{len(chunks)}",
                document_id=document.id,
                content=current_chunk,
                metadata={
                    **document.metadata,
                    'chunk_index': len(chunks),
                    'sentence_count': sentence_count
                },
                start_index=current_start,
                end_index=len(document.content)
            ))
        
        return chunks
    
    def _paragraph_chunking(self, document: Document) -> List[DocumentChunk]:
        """Paragraph-based chunking"""
        chunks = []
        paragraphs = document.content.split('\n\n')
        chunk_size = self.config.chunk_size
        
        current_chunk = ''
        current_start = 0
        
        for paragraph in paragraphs:
            if len(paragraph) > chunk_size:
                # Split large paragraphs
                sub_doc = Document(
                    id=document.id,
                    content=paragraph,
                    metadata=document.metadata
                )
                sub_chunks = self._fixed_chunking(sub_doc)
                chunks.extend(sub_chunks)
            elif len(current_chunk) + len(paragraph) <= chunk_size:
                current_chunk += ('\n\n' if current_chunk else '') + paragraph
            else:
                if current_chunk:
                    chunks.append(DocumentChunk(
                        id=f"{document.id}-chunk-{len(chunks)}",
                        document_id=document.id,
                        content=current_chunk,
                        metadata={
                            **document.metadata,
                            'chunk_index': len(chunks),
                            'type': 'paragraph'
                        },
                        start_index=current_start,
                        end_index=current_start + len(current_chunk)
                    ))
                current_chunk = paragraph
                current_start += len(current_chunk)
        
        # Add remaining content
        if current_chunk:
            chunks.append(DocumentChunk(
                id=f"{document.id}-chunk-{len(chunks)}",
                document_id=document.id,
                content=current_chunk,
                metadata={
                    **document.metadata,
                    'chunk_index': len(chunks),
                    'type': 'paragraph'
                },
                start_index=current_start,
                end_index=len(document.content)
            ))
        
        return chunks
    
    def _semantic_chunking(self, document: Document) -> List[DocumentChunk]:
        """Semantic chunking based on topic boundaries"""
        sections = self._identify_semantic_sections(document.content)
        chunks = []
        
        for section in sections:
            if len(section['content']) > self.config.chunk_size:
                # Recursively chunk large sections
                sub_doc = Document(
                    id=document.id,
                    content=section['content'],
                    metadata=document.metadata
                )
                sub_chunks = self._fixed_chunking(sub_doc)
                chunks.extend(sub_chunks)
            else:
                chunks.append(DocumentChunk(
                    id=f"{document.id}-chunk-{len(chunks)}",
                    document_id=document.id,
                    content=section['content'],
                    metadata={
                        **document.metadata,
                        'chunk_index': len(chunks),
                        'section': section.get('title', ''),
                        'semantic_type': section.get('type', 'body')
                    },
                    start_index=section['start_index'],
                    end_index=section['end_index']
                ))
        
        return chunks
    
    def _recursive_chunking(self, document: Document) -> List[DocumentChunk]:
        """Recursive chunking with multiple separators"""
        separators = self.config.separators or ['\n\n', '\n', '. ', ' ']
        return self._recursive_split(document, document.content, separators, 0)
    
    def _recursive_split(
        self,
        document: Document,
        text: str,
        separators: List[str],
        depth: int
    ) -> List[DocumentChunk]:
        """Recursively split text"""
        if len(text) <= self.config.chunk_size or not separators:
            return [DocumentChunk(
                id=f"{document.id}-chunk-{depth}",
                document_id=document.id,
                content=text,
                metadata={
                    **document.metadata,
                    'depth': depth
                },
                start_index=0,
                end_index=len(text)
            )]
        
        separator = separators[0]
        parts = text.split(separator)
        chunks = []
        current_chunk = ''
        
        for part in parts:
            if len(current_chunk) + len(part) <= self.config.chunk_size:
                current_chunk += (separator if current_chunk else '') + part
            else:
                if current_chunk:
                    chunks.extend(self._recursive_split(
                        document,
                        current_chunk,
                        separators[1:],
                        depth + 1
                    ))
                current_chunk = part
        
        if current_chunk:
            chunks.extend(self._recursive_split(
                document,
                current_chunk,
                separators[1:],
                depth + 1
            ))
        
        return chunks
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitting - in production use NLTK or spaCy
        import re
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _identify_semantic_sections(self, content: str) -> List[Dict[str, Any]]:
        """Identify semantic sections in content"""
        sections = []
        lines = content.split('\n')
        current_section = {
            'title': '',
            'content': '',
            'type': 'body',
            'start_index': 0,
            'end_index': 0
        }
        
        for i, line in enumerate(lines):
            # Detect headers (simple heuristic)
            if line.startswith('#') or (line and line[0].isupper() and line.endswith(':')):
                if current_section['content']:
                    sections.append(current_section)
                current_section = {
                    'title': line,
                    'content': line,
                    'type': 'header',
                    'start_index': i,
                    'end_index': i
                }
            else:
                current_section['content'] += '\n' + line
                current_section['end_index'] = i
        
        if current_section['content']:
            sections.append(current_section)
        
        return sections


# ============== Retriever ==============

class Retriever:
    """Document retrieval service"""
    
    def __init__(
        self,
        config: RetrievalConfig,
        vector_store: BaseVectorStore,
        reranker: Optional['Reranker'] = None
    ):
        self.config = config
        self.vector_store = vector_store
        self.reranker = reranker
    
    async def retrieve(
        self,
        query: str,
        query_embedding: List[float],
        filter: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """Retrieve relevant documents"""
        
        if self.config.strategy == RetrievalStrategy.SIMILARITY:
            results = await self._similarity_search(query_embedding, filter)
        elif self.config.strategy == RetrievalStrategy.MMR:
            results = await self._mmr_search(query_embedding, filter)
        elif self.config.strategy == RetrievalStrategy.HYBRID:
            results = await self._hybrid_search(query, query_embedding, filter)
        elif self.config.strategy == RetrievalStrategy.CONTEXTUAL:
            results = await self._contextual_search(query, query_embedding, filter)
        else:
            results = await self._similarity_search(query_embedding, filter)
        
        # Apply reranking
        if self.reranker:
            results = await self.reranker.rerank(query, results)
        
        # Apply score threshold
        if self.config.score_threshold:
            results = [r for r in results if r.score >= self.config.score_threshold]
        
        return results[:self.config.top_k]
    
    async def _similarity_search(
        self,
        query_embedding: List[float],
        filter: Optional[Dict[str, Any]]
    ) -> List[SearchResult]:
        """Standard similarity search"""
        return await self.vector_store.search(query_embedding, self.config.top_k * 2, filter)
    
    async def _mmr_search(
        self,
        query_embedding: List[float],
        filter: Optional[Dict[str, Any]]
    ) -> List[SearchResult]:
        """Maximum Marginal Relevance search"""
        candidates = await self.vector_store.search(
            query_embedding,
            self.config.top_k * 3,
            filter
        )
        
        selected = []
        lambda_param = 0.5  # Balance between relevance and diversity
        
        while len(selected) < self.config.top_k and candidates:
            best_score = -float('inf')
            best_index = -1
            
            for i, candidate in enumerate(candidates):
                relevance = candidate.score
                max_similarity = 0
                
                for selected_result in selected:
                    if candidate.chunk.embedding and selected_result.chunk.embedding:
                        similarity = self._calculate_similarity(
                            candidate.chunk.embedding,
                            selected_result.chunk.embedding
                        )
                        max_similarity = max(max_similarity, similarity)
                
                mmr_score = lambda_param * relevance - (1 - lambda_param) * max_similarity
                
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_index = i
            
            if best_index != -1:
                selected.append(candidates[best_index])
                candidates.pop(best_index)
            else:
                break
        
        return selected
    
    async def _hybrid_search(
        self,
        query: str,
        query_embedding: List[float],
        filter: Optional[Dict[str, Any]]
    ) -> List[SearchResult]:
        """Hybrid vector + keyword search"""
        # Vector search
        vector_results = await self.vector_store.search(
            query_embedding,
            self.config.top_k,
            filter
        )
        
        # Keyword search
        keyword_results = await self._keyword_search(query, filter)
        
        # Merge results
        alpha = self.config.hybrid_alpha
        merged = {}
        
        for result in vector_results:
            merged[result.chunk.id] = SearchResult(
                chunk=result.chunk,
                score=result.score * alpha
            )
        
        for result in keyword_results:
            if result.chunk.id in merged:
                merged[result.chunk.id].score += result.score * (1 - alpha)
            else:
                merged[result.chunk.id] = SearchResult(
                    chunk=result.chunk,
                    score=result.score * (1 - alpha)
                )
        
        results = list(merged.values())
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:self.config.top_k]
    
    async def _contextual_search(
        self,
        query: str,
        query_embedding: List[float],
        filter: Optional[Dict[str, Any]]
    ) -> List[SearchResult]:
        """Contextual search with neighboring chunks"""
        results = await self._similarity_search(query_embedding, filter)
        expanded_results = []
        
        for result in results:
            expanded_results.append(result)
            
            # Add neighboring chunks
            neighbors = await self._get_neighboring_chunks(result.chunk)
            expanded_results.extend(neighbors)
        
        # Deduplicate and sort
        unique = {}
        for result in expanded_results:
            if result.chunk.id not in unique or unique[result.chunk.id].score < result.score:
                unique[result.chunk.id] = result
        
        results = list(unique.values())
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:self.config.top_k]
    
    async def _keyword_search(
        self,
        query: str,
        filter: Optional[Dict[str, Any]]
    ) -> List[SearchResult]:
        """Simple keyword search"""
        keywords = query.lower().split()
        all_results = await self.vector_store.search(
            [0] * 1536,  # Dummy embedding
            1000,
            filter
        )
        
        scored_results = []
        for result in all_results:
            content = result.chunk.content.lower()
            score = sum(1 for keyword in keywords if keyword in content) / len(keywords)
            if score > 0:
                scored_results.append(SearchResult(
                    chunk=result.chunk,
                    score=score
                ))
        
        scored_results.sort(key=lambda x: x.score, reverse=True)
        return scored_results
    
    async def _get_neighboring_chunks(self, chunk: DocumentChunk) -> List[SearchResult]:
        """Get neighboring chunks from same document"""
        filter = {
            'document_id': chunk.document_id,
            'chunk_index': {
                '$gte': chunk.metadata.get('chunk_index', 0) - 1,
                '$lte': chunk.metadata.get('chunk_index', 0) + 1
            }
        }
        return await self.vector_store.search(chunk.embedding or [], 3, filter)
    
    def _calculate_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate similarity between embeddings"""
        a_np = np.array(a)
        b_np = np.array(b)
        return float(np.dot(a_np, b_np))


# ============== Reranker ==============

class Reranker:
    """Document reranking service"""
    
    def __init__(self, config: RerankingConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def rerank(self, query: str, results: List[SearchResult]) -> List[SearchResult]:
        """Rerank search results"""
        if self.config.provider == RerankingProvider.COHERE:
            return await self._cohere_rerank(query, results)
        elif self.config.provider == RerankingProvider.CROSS_ENCODER:
            return await self._cross_encoder_rerank(query, results)
        else:
            return results
    
    async def _cohere_rerank(self, query: str, results: List[SearchResult]) -> List[SearchResult]:
        """Rerank using Cohere"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.post(
            'https://api.cohere.ai/v1/rerank',
            headers={
                'Authorization': f"Bearer {self.config.api_key}",
                'Content-Type': 'application/json'
            },
            json={
                'model': self.config.model or 'rerank-english-v2.0',
                'query': query,
                'documents': [r.chunk.content for r in results],
                'top_n': self.config.top_k or len(results)
            }
        ) as response:
            data = await response.json()
            
            reranked = []
            for item in data.get('results', []):
                original = results[item['index']]
                reranked.append(SearchResult(
                    chunk=original.chunk,
                    score=item['relevance_score'],
                    document=original.document
                ))
            
            return reranked
    
    async def _cross_encoder_rerank(self, query: str, results: List[SearchResult]) -> List[SearchResult]:
        """Rerank using cross-encoder"""
        # Simplified cross-encoder reranking
        reranked = []
        
        for result in results:
            # Calculate relevance score
            query_terms = query.lower().split()
            content = result.chunk.content.lower()
            
            score = sum(1 for term in query_terms if term in content) / len(query_terms)
            
            # Combine with original score
            combined_score = (result.score + score) / 2
            
            reranked.append(SearchResult(
                chunk=result.chunk,
                score=combined_score,
                document=result.document
            ))
        
        reranked.sort(key=lambda x: x.score, reverse=True)
        return reranked
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        if self.session:
            await self.session.close()


# ============== Main RAG Manager ==============

class RAGManager:
    """Main RAG Manager class"""
    
    def __init__(self, config: RAGConfig):
        self.config = config
        self.vector_store = self._create_vector_store(config.vector_store)
        self.embedding_provider = self._create_embedding_provider(config.embeddings)
        self.chunker = DocumentChunker(config.chunking)
        self.reranker = Reranker(config.reranking) if config.reranking else None
        self.retriever = Retriever(config.retrieval, self.vector_store, self.reranker)
        self.documents: Dict[str, Document] = {}
        self.document_index: Dict[str, List[str]] = {}  # doc_id -> chunk_ids
    
    async def initialize(self) -> None:
        """Initialize RAG system"""
        await self.vector_store.initialize()
    
    async def add_document(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        source: Optional[str] = None
    ) -> Document:
        """Add document to knowledge base"""
        document = Document(
            id=str(uuid.uuid4()),
            content=content,
            metadata=metadata or {},
            source=source
        )
        
        # Chunk the document
        chunks = self.chunker.chunk(document)
        
        # Generate embeddings
        texts = [c.content for c in chunks]
        embeddings = await self.embedding_provider.embed_batch(texts)
        
        # Add embeddings to chunks
        for i, chunk in enumerate(chunks):
            chunk.embedding = embeddings[i]
        
        # Store in vector store
        await self.vector_store.upsert(chunks)
        
        # Store document and index
        document.chunks = chunks
        self.documents[document.id] = document
        self.document_index[document.id] = [c.id for c in chunks]
        
        return document
    
    async def add_documents(
        self,
        documents: List[Dict[str, Any]]
    ) -> List[Document]:
        """Add multiple documents"""
        results = []
        batch_size = 10
        
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            tasks = [
                self.add_document(
                    doc['content'],
                    doc.get('metadata'),
                    doc.get('source')
                )
                for doc in batch
            ]
            batch_results = await asyncio.gather(*tasks)
            results.extend(batch_results)
        
        return results
    
    async def search(
        self,
        query: str,
        filter: Optional[Dict[str, Any]] = None,
        top_k: Optional[int] = None,
        include_metadata: bool = True
    ) -> List[SearchResult]:
        """Search knowledge base"""
        # Generate query embedding
        query_embedding = await self.embedding_provider.embed(query)
        
        # Retrieve relevant chunks
        results = await self.retriever.retrieve(
            query,
            query_embedding,
            filter
        )
        
        # Add document information
        if include_metadata:
            for result in results:
                document = self.documents.get(result.chunk.document_id)
                if document:
                    result.document = document
        
        return results[:top_k or self.config.retrieval.top_k]
    
    async def generate_with_rag(
        self,
        query: str,
        ai_manager: Any,  # The main AI Manager instance
        filter: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        cite_sources: bool = False,
        max_context_tokens: Optional[int] = None,
        provider: Optional[Any] = None,
        model_config: Optional[Any] = None
    ) -> RAGResponse:
        """Generate response with RAG context"""
        # Search for relevant context
        search_results = await self.search(query, filter=filter, include_metadata=True)
        
        # Build context
        context = self._build_context(search_results, max_context_tokens)
        
        # Create prompt
        if not system_prompt:
            system_prompt = (
                "You are a helpful assistant. Use the provided context to answer questions accurately. "
                "If the context doesn't contain relevant information, say so."
            )
        
        from ai_manager import PromptMessage
        messages = [
            PromptMessage(role='system', content=system_prompt),
            PromptMessage(role='user', content=f"Context:\n{context}\n\nQuestion: {query}")
        ]
        
        # Generate response
        response = await ai_manager.complete(
            messages,
            provider=provider,
            model_config=model_config
        )
        
        # Extract citations if requested
        citations = []
        if cite_sources:
            citations = self._extract_citations(response.content, search_results)
        
        return RAGResponse(
            answer=response.content,
            sources=search_results,
            confidence=self._calculate_confidence(search_results),
            tokens={
                'retrieval': self._estimate_tokens(context),
                'generation': response.token_usage.total_tokens,
                'total': self._estimate_tokens(context) + response.token_usage.total_tokens
            },
            citations=citations,
            metadata={
                'query_embedding_time': 0,
                'search_time': 0,
                'generation_time': response.latency
            }
        )
    
    async def update_document(
        self,
        document_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Document:
        """Update existing document"""
        # Delete old chunks
        old_chunk_ids = self.document_index.get(document_id, [])
        if old_chunk_ids:
            await self.vector_store.delete(old_chunk_ids)
        
        # Create updated document
        document = Document(
            id=document_id,
            content=content,
            metadata=metadata or {},
            created_at=self.documents.get(document_id, Document(id='', content='')).created_at,
            updated_at=datetime.now()
        )
        
        # Re-chunk and embed
        chunks = self.chunker.chunk(document)
        texts = [c.content for c in chunks]
        embeddings = await self.embedding_provider.embed_batch(texts)
        
        for i, chunk in enumerate(chunks):
            chunk.embedding = embeddings[i]
        
        # Update vector store
        await self.vector_store.upsert(chunks)
        
        # Update indexes
        document.chunks = chunks
        self.documents[document.id] = document
        self.document_index[document.id] = [c.id for c in chunks]
        
        return document
    
    async def delete_document(self, document_id: str) -> None:
        """Delete document"""
        chunk_ids = self.document_index.get(document_id, [])
        if chunk_ids:
            await self.vector_store.delete(chunk_ids)
            del self.document_index[document_id]
            del self.documents[document_id]
    
    async def clear(self) -> None:
        """Clear all data"""
        await self.vector_store.clear()
        self.documents.clear()
        self.document_index.clear()
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get RAG statistics"""
        vector_stats = await self.vector_store.get_stats()
        
        return {
            'documents': len(self.documents),
            'chunks': vector_stats['count'],
            'dimensions': vector_stats['dimensions'],
            'average_chunks_per_document': (
                vector_stats['count'] / max(1, len(self.documents))
            ),
            'total_tokens': self._estimate_total_tokens()
        }
    
    def get_document(self, document_id: str) -> Optional[Document]:
        """Get document by ID"""
        return self.documents.get(document_id)
    
    def get_all_documents(self) -> List[Document]:
        """Get all documents"""
        return list(self.documents.values())
    
    # Helper methods
    def _create_vector_store(self, config: VectorStoreConfig) -> BaseVectorStore:
        """Create vector store instance"""
        if config.provider == VectorStoreProvider.PINECONE:
            return PineconeVectorStore(config)
        elif config.provider == VectorStoreProvider.MEMORY:
            return MemoryVectorStore(config)
        else:
            return MemoryVectorStore(config)
    
    def _create_embedding_provider(self, config: EmbeddingConfig) -> BaseEmbeddingProvider:
        """Create embedding provider instance"""
        if config.provider == EmbeddingProvider.OPENAI:
            return OpenAIEmbeddings(config)
        else:
            raise ValueError(f"Unsupported embedding provider: {config.provider}")
    
    def _build_context(self, results: List[SearchResult], max_tokens: Optional[int]) -> str:
        """Build context from search results"""
        max_context_tokens = max_tokens or self.config.retrieval.max_tokens or 2000
        context = ''
        current_tokens = 0
        
        for result in results:
            chunk_text = result.chunk.content
            chunk_tokens = self._estimate_tokens(chunk_text)
            
            if current_tokens + chunk_tokens > max_context_tokens:
                break
            
            context += f"\n---\nSource: {result.chunk.metadata.get('source', 'Unknown')}\n"
            context += f"Score: {result.score:.3f}\n"
            context += f"Content: {chunk_text}\n"
            
            current_tokens += chunk_tokens
        
        return context.strip()
    
    def _extract_citations(self, answer: str, sources: List[SearchResult]) -> List[Citation]:
        """Extract citations from answer"""
        citations = []
        
        for source in sources:
            content_snippet = source.chunk.content[:100]
            if content_snippet.lower()[:30] in answer.lower():
                citations.append(Citation(
                    text=content_snippet,
                    source_id=source.chunk.id,
                    document_id=source.chunk.document_id,
                    page_number=source.chunk.page_number,
                    confidence=source.score
                ))
        
        return citations
    
    def _calculate_confidence(self, results: List[SearchResult]) -> float:
        """Calculate confidence score"""
        if not results:
            return 0.0
        
        # Weighted average of top scores
        weighted_sum = 0
        weight_sum = 0
        
        for i in range(min(3, len(results))):
            weight = 1 / (i + 1)
            weighted_sum += results[i].score * weight
            weight_sum += weight
        
        return weighted_sum / weight_sum if weight_sum > 0 else 0.0
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count"""
        return len(text) // 4
    
    def _estimate_total_tokens(self) -> int:
        """Estimate total tokens in knowledge base"""
        total = 0
        for doc in self.documents.values():
            total += self._estimate_tokens(doc.content)
        return total
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        if hasattr(self.vector_store, 'cleanup'):
            await self.vector_store.cleanup()
        if hasattr(self.embedding_provider, 'cleanup'):
            await self.embedding_provider.cleanup()
        if self.reranker and hasattr(self.reranker, 'cleanup'):
            await self.reranker.cleanup()


# Export main classes
__all__ = [
    'RAGManager',
    'RAGConfig',
    'Document',
    'DocumentChunk',
    'SearchResult',
    'RAGResponse',
    'Citation',
    'VectorStoreProvider',
    'EmbeddingProvider',
    'ChunkingStrategy',
    'RetrievalStrategy',
    'RerankingProvider',
    'VectorStoreConfig',
    'EmbeddingConfig',
    'ChunkingConfig',
    'RetrievalConfig',
    'RerankingConfig',
]
