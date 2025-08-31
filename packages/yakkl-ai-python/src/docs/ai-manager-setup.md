# Python AI Manager - Setup & Installation Guide

## Requirements

### Python Version
- Python 3.8 or higher
- Recommended: Python 3.10+

### Dependencies

Create a `requirements.txt` file:

```txt
# Core dependencies
aiohttp>=3.9.0
numpy>=1.24.0
python-dotenv>=1.0.0

# AI Provider SDKs (optional, for enhanced features)
openai>=1.0.0
anthropic>=0.18.0
google-generativeai>=0.3.0
cohere>=4.0.0

# Vector Store Clients
pinecone-client>=2.2.0
weaviate-client>=3.24.0
chromadb>=0.4.0
qdrant-client>=1.7.0

# Embedding & NLP
tiktoken>=0.5.0  # OpenAI tokenizer
transformers>=4.35.0  # HuggingFace
sentence-transformers>=2.2.0  # Sentence embeddings

# Document Processing
pypdf>=3.17.0  # PDF processing
python-docx>=1.0.0  # Word documents
pandas>=2.0.0  # CSV/Excel processing
beautifulsoup4>=4.12.0  # Web scraping
markdownify>=0.11.0  # HTML to Markdown

# Utilities
tenacity>=8.2.0  # Retry logic
cachetools>=5.3.0  # Caching
pydantic>=2.0.0  # Data validation
structlog>=23.0.0  # Structured logging

# Development
pytest>=7.4.0
pytest-asyncio>=0.21.0
black>=23.0.0
mypy>=1.5.0
```

## Installation

### 1. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
# Install all dependencies
pip install -r requirements.txt

# For development
pip install -r requirements-dev.txt
```

### 3. Environment Variables

Create a `.env` file in your project root:

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=AIza...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# Azure OpenAI (optional)
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name

# Cohere (for reranking)
COHERE_API_KEY=...

# Vector Stores
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=...

WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=...

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=...

# Application Settings
CACHE_TTL=3600
MAX_RETRIES=3
LOG_LEVEL=INFO
MODERATION_ENABLED=true
```

## Project Structure

```
ai_manager_project/
├── ai_manager/
│   ├── __init__.py
│   ├── ai_manager.py          # Main AI Manager
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py            # Base provider class
│   │   ├── openai.py          # OpenAI provider
│   │   ├── anthropic.py       # Anthropic provider
│   │   ├── google.py          # Google provider
│   │   └── custom.py          # Custom providers
│   ├── services/
│   │   ├── __init__.py
│   │   ├── rate_limiter.py    # Rate limiting
│   │   ├── quota_manager.py   # Quota management
│   │   ├── cache.py           # Response caching
│   │   └── logger.py          # Activity logging
│   └── types/
│       ├── __init__.py
│       └── models.py          # Data models
├── rag/
│   ├── __init__.py
│   ├── rag_manager.py         # RAG Manager
│   ├── embeddings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── openai.py
│   │   └── cohere.py
│   ├── vector_stores/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── memory.py
│   │   ├── pinecone.py
│   │   └── weaviate.py
│   ├── chunking/
│   │   ├── __init__.py
│   │   └── chunker.py
│   └── retrieval/
│       ├── __init__.py
│       ├── retriever.py
│       └── reranker.py
├── examples/
│   ├── basic_usage.py
│   ├── rag_examples.py
│   ├── advanced_features.py
│   └── notebooks/
│       └── tutorial.ipynb
├── tests/
│   ├── __init__.py
│   ├── test_ai_manager.py
│   ├── test_providers.py
│   ├── test_rag.py
│   └── fixtures/
├── config/
│   ├── __init__.py
│   ├── settings.py
│   └── logging.py
├── utils/
│   ├── __init__.py
│   ├── helpers.py
│   └── validators.py
├── .env
├── .env.example
├── requirements.txt
├── requirements-dev.txt
├── setup.py
├── README.md
└── LICENSE
```

## Quick Start

### Basic Usage

```python
import asyncio
from ai_manager import AIManager, AIProvider, AIProviderConfig, PromptMessage

async def main():
    # Initialize AI Manager
    ai_manager = AIManager(
        configs=[
            AIProviderConfig(
                provider=AIProvider.OPENAI,
                api_key="your-api-key"
            )
        ]
    )
    
    # Create completion
    response = await ai_manager.complete(
        messages=[
            PromptMessage(role='user', content='Hello!')
        ]
    )
    
    print(response.content)

asyncio.run(main())
```

### With RAG

```python
from rag_manager import RAGManager, RAGConfig, VectorStoreProvider

async def main():
    # Initialize RAG
    rag_config = RAGConfig(
        vector_store=VectorStoreConfig(
            provider=VectorStoreProvider.MEMORY
        ),
        embeddings=EmbeddingConfig(
            provider=EmbeddingProvider.OPENAI,
            model='text-embedding-3-small'
        )
    )
    
    rag_manager = RAGManager(rag_config)
    await rag_manager.initialize()
    
    # Add documents
    await rag_manager.add_document(
        content="Your document content here",
        metadata={'category': 'example'}
    )
    
    # Search
    results = await rag_manager.search("query")
    print(results)

asyncio.run(main())
```

## Configuration

### Rate Limiting

```python
from ai_manager import RateLimitConfig

rate_config = RateLimitConfig(
    max_requests_per_minute=10,
    max_requests_per_hour=100,
    max_tokens_per_minute=10000,
    debounce_ms=1000
)
```

### Quota Management

```python
from ai_manager import QuotaConfig

quota_config = QuotaConfig(
    max_total_tokens=1000000,
    max_cost_per_day=100,
    warning_threshold=80
)
```

### Logging Configuration

```python
import logging
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.dev.ConsoleRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Set log level
logging.basicConfig(
    format="%(message)s",
    level=logging.INFO,
)
```

## Testing

### Unit Tests

```python
# test_ai_manager.py
import pytest
from ai_manager import AIManager, AIProviderConfig, AIProvider

@pytest.mark.asyncio
async def test_completion():
    ai_manager = AIManager(
        configs=[
            AIProviderConfig(
                provider=AIProvider.OPENAI,
                api_key="test-key"
            )
        ]
    )
    
    # Mock the provider
    ai_manager.providers[AIProvider.OPENAI] = MockProvider()
    
    response = await ai_manager.complete(
        messages=[PromptMessage(role='user', content='test')]
    )
    
    assert response.content == "mocked response"
```

### Integration Tests

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_real_openai():
    ai_manager = AIManager(
        configs=[
            AIProviderConfig(
                provider=AIProvider.OPENAI,
                api_key=os.getenv('OPENAI_API_KEY')
            )
        ]
    )
    
    response = await ai_manager.complete(
        messages=[PromptMessage(role='user', content='Hello')]
    )
    
    assert response.content
    assert response.token_usage.total_tokens > 0
```

### Run Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_ai_manager.py

# Run with coverage
pytest --cov=ai_manager --cov-report=html

# Run only unit tests
pytest -m "not integration"
```

## Deployment

### Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run application
CMD ["python", "-m", "ai_manager"]
```

Build and run:

```bash
# Build image
docker build -t ai-manager .

# Run container
docker run -p 8080:8080 --env-file .env ai-manager
```

### Docker Compose

```yaml
version: '3.8'

services:
  ai-manager:
    build: .
    ports:
      - "8080:8080"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_manager
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Production Considerations

#### 1. API Key Security

```python
# Use environment variables
api_key = os.getenv('OPENAI_API_KEY')

# Or use a secrets manager
from azure.keyvault.secrets import SecretClient
client = SecretClient(vault_url, credential)
api_key = client.get_secret("openai-key").value
```

#### 2. Connection Pooling

```python
# Configure connection limits
connector = aiohttp.TCPConnector(
    limit=100,
    limit_per_host=30,
    ttl_dns_cache=300
)

session = aiohttp.ClientSession(connector=connector)
```

#### 3. Error Recovery

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def resilient_complete(messages):
    return await ai_manager.complete(messages)
```

#### 4. Monitoring

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram

request_count = Counter('ai_requests_total', 'Total AI requests')
request_duration = Histogram('ai_request_duration_seconds', 'Request duration')

@request_duration.time()
async def monitored_complete(messages):
    request_count.inc()
    return await ai_manager.complete(messages)
```

## Performance Optimization

### 1. Async Batch Processing

```python
async def batch_process(queries: List[str]):
    tasks = [
        ai_manager.complete([PromptMessage(role='user', content=q)])
        for q in queries
    ]
    return await asyncio.gather(*tasks)
```

### 2. Connection Reuse

```python
# Reuse session across requests
class OptimizedProvider:
    def __init__(self):
        self.session = None
    
    async def get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session
```

### 3. Caching Strategy

```python
from cachetools import TTLCache
from functools import wraps

cache = TTLCache(maxsize=1000, ttl=3600)

def cached(ttl=3600):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            if key in cache:
                return cache[key]
            result = await func(*args, **kwargs)
            cache[key] = result
            return result
        return wrapper
    return decorator
```

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   pip install -e .  # Install package in editable mode
   ```

2. **Async Runtime Errors**
   ```python
   # Ensure proper async context
   import asyncio
   asyncio.run(main())
   ```

3. **Rate Limiting**
   ```python
   # Add exponential backoff
   await asyncio.sleep(2 ** retry_count)
   ```

4. **Memory Issues**
   ```python
   # Limit concurrent requests
   semaphore = asyncio.Semaphore(10)
   async with semaphore:
       await process_request()
   ```

## Support

- GitHub Issues: [github.com/yourrepo/ai-manager/issues](https://github.com)
- Documentation: [docs.ai-manager.com](https://docs.example.com)
- Discord: [discord.gg/ai-manager](https://discord.gg)

## License

MIT License - See LICENSE file for details
