# usage_examples.py
"""
Comprehensive usage examples for Python AI Manager with RAG
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json

# Import AI Manager components
from ai_manager import (
    AIManager,
    AIProvider,
    AIProviderConfig,
    ModelConfig,
    PromptMessage,
    RateLimitConfig,
    QuotaConfig,
    LanguageConfig,
    OAuthConfig
)

# Import RAG components
from rag_manager import (
    RAGManager,
    RAGConfig,
    VectorStoreProvider,
    EmbeddingProvider,
    ChunkingStrategy,
    RetrievalStrategy,
    RerankingProvider,
    VectorStoreConfig,
    EmbeddingConfig,
    ChunkingConfig,
    RetrievalConfig,
    RerankingConfig
)


# ============== 1. Basic Setup ==============

async def basic_setup_example():
    """Initialize AI Manager with multiple providers"""
    print("📦 Basic Setup Example")
    
    # Configure providers
    configs = [
        # OpenAI Configuration
        AIProviderConfig(
            provider=AIProvider.OPENAI,
            api_key=os.getenv('OPENAI_API_KEY'),
            organization_id=os.getenv('OPENAI_ORG_ID'),
            max_retries=3,
            timeout=30000
        ),
        # Anthropic Configuration
        AIProviderConfig(
            provider=AIProvider.ANTHROPIC,
            api_key=os.getenv('ANTHROPIC_API_KEY')
        ),
        # Google Configuration
        AIProviderConfig(
            provider=AIProvider.GOOGLE,
            api_key=os.getenv('GOOGLE_API_KEY')
        ),
        # Google Nano (Browser-based) - Python doesn't support this directly
        # AIProviderConfig(provider=AIProvider.GOOGLE_NANO)
    ]
    
    # Rate limiting configuration
    rate_limit_config = RateLimitConfig(
        max_requests_per_minute=10,
        max_requests_per_hour=100,
        max_requests_per_day=1000,
        max_tokens_per_minute=10000,
        max_tokens_per_hour=100000,
        debounce_ms=1000,  # 1 second between requests
        burst_limit=5
    )
    
    # Quota configuration
    quota_config = QuotaConfig(
        max_total_tokens=1000000,
        max_cost_per_day=100,
        max_cost_per_month=3000,
        warning_threshold=80  # Warn at 80% usage
    )
    
    # Initialize AI Manager
    ai_manager = AIManager(
        configs=configs,
        rate_limit_config=rate_limit_config,
        quota_config=quota_config,
        cache_enabled=True,
        cache_ttl=3600,  # 1 hour cache
        fallback_providers=[AIProvider.ANTHROPIC, AIProvider.GOOGLE],
        moderation_enabled=True
    )
    
    print("✅ AI Manager initialized with multiple providers")
    return ai_manager


# ============== 2. Basic Completion ==============

async def basic_completion_example(ai_manager: AIManager):
    """Simple completion example"""
    print("\n💬 Basic Completion Example")
    
    messages = [
        PromptMessage(role='system', content='You are a helpful assistant.'),
        PromptMessage(role='user', content='What is the capital of France?')
    ]
    
    try:
        response = await ai_manager.complete(
            messages=messages,
            user_id='user123',
            session_id='session456',
            model_config=ModelConfig(
                model='gpt-4-turbo-preview',
                temperature=0.7,
                max_tokens=150
            )
        )
        
        print(f"Response: {response.content}")
        print(f"Tokens used: {response.token_usage.total_tokens}")
        print(f"Estimated cost: ${response.token_usage.estimated_cost:.4f}")
        print(f"Latency: {response.latency:.2f}ms")
        
    except Exception as e:
        print(f"Error: {e}")


# ============== 3. Streaming Example ==============

async def streaming_example(ai_manager: AIManager):
    """Streaming response example"""
    print("\n🌊 Streaming Example")
    
    messages = [
        PromptMessage(role='user', content='Tell me a short story about a robot.')
    ]
    
    print("Streaming response: ", end='')
    
    async for chunk in ai_manager.stream(
        messages=messages,
        provider=AIProvider.OPENAI,
        user_id='user123',
        model_config=ModelConfig(
            model='gpt-3.5-turbo',
            temperature=0.8
        )
    ):
        print(chunk, end='', flush=True)
    
    print("\n✅ Streaming complete")


# ============== 4. Template Management ==============

async def template_example(ai_manager: AIManager):
    """Template management example"""
    print("\n📝 Template Management Example")
    
    # Save a template
    ai_manager.save_template('customer_support', [
        PromptMessage(
            role='system',
            content='You are a customer support agent for {{company}}. Be helpful and professional.'
        ),
        PromptMessage(
            role='user',
            content='{{customer_query}}'
        )
    ])
    
    # Use the template
    messages = ai_manager.apply_template('customer_support', {
        'company': 'TechCorp',
        'customer_query': 'How do I reset my password?'
    })
    
    response = await ai_manager.complete(messages, user_id='user123')
    print(f"Template response: {response.content[:200]}...")


# ============== 5. Multi-Provider Fallback ==============

async def fallback_example(ai_manager: AIManager):
    """Multi-provider fallback example"""
    print("\n🔄 Multi-Provider Fallback Example")
    
    messages = [
        PromptMessage(role='user', content='What is quantum computing?')
    ]
    
    # Primary provider is OpenAI, but will fallback to Anthropic or Google
    response = await ai_manager.complete(
        messages=messages,
        provider=AIProvider.OPENAI,
        user_id='user123'
    )
    
    print(f"Response from: {response.provider.value}")
    print(f"Content: {response.content[:200]}...")


# ============== 6. RAG Setup and Usage ==============

async def rag_setup_example(ai_manager: AIManager):
    """RAG system setup and usage"""
    print("\n🎯 RAG Setup Example")
    
    # Configure RAG
    rag_config = RAGConfig(
        vector_store=VectorStoreConfig(
            provider=VectorStoreProvider.MEMORY,
            dimension=1536,
            metric='cosine'
        ),
        embeddings=EmbeddingConfig(
            provider=EmbeddingProvider.OPENAI,
            model='text-embedding-3-small',
            api_key=os.getenv('OPENAI_API_KEY'),
            batch_size=100
        ),
        chunking=ChunkingConfig(
            strategy=ChunkingStrategy.RECURSIVE,
            chunk_size=1000,
            chunk_overlap=200,
            separators=['\n\n', '\n', '. ', ' ']
        ),
        retrieval=RetrievalConfig(
            strategy=RetrievalStrategy.HYBRID,
            top_k=5,
            score_threshold=0.7,
            max_tokens=2000,
            include_metadata=True,
            hybrid_alpha=0.7
        )
    )
    
    # Initialize RAG
    rag_manager = RAGManager(rag_config)
    await rag_manager.initialize()
    
    # Add documents
    documents = [
        {
            'content': """Artificial Intelligence (AI) is transforming healthcare through various applications.
            Machine learning algorithms can analyze medical images with high accuracy, often
            detecting diseases earlier than human doctors. Natural language processing helps
            extract insights from medical records and research papers. AI-powered drug discovery
            is accelerating the development of new treatments.""",
            'metadata': {
                'category': 'healthcare',
                'source': 'research_paper_2024',
                'author': 'Dr. Smith'
            },
            'source': 'https://example.com/ai-healthcare'
        },
        {
            'content': """Climate change is one of the most pressing challenges of our time.
            Rising global temperatures are causing melting ice caps, rising sea levels,
            and more frequent extreme weather events. The Paris Agreement aims to limit
            global warming to 1.5°C above pre-industrial levels.""",
            'metadata': {
                'category': 'environment',
                'year': 2024
            },
            'source': 'climate_report_2024'
        },
        {
            'content': """Quantum computing represents a paradigm shift in computation.
            Unlike classical bits that can be 0 or 1, quantum bits (qubits) can exist
            in superposition of both states. This enables quantum computers to solve
            certain problems exponentially faster than classical computers.""",
            'metadata': {
                'category': 'technology',
                'topic': 'quantum'
            },
            'source': 'quantum_computing_guide'
        }
    ]
    
    added_docs = await rag_manager.add_documents(documents)
    print(f"Added {len(added_docs)} documents to RAG")
    
    # Search
    search_results = await rag_manager.search(
        query='How does AI help in medical diagnosis?',
        top_k=3
    )
    
    print(f"\nSearch results ({len(search_results)} found):")
    for i, result in enumerate(search_results, 1):
        print(f"{i}. Score: {result.score:.3f}")
        print(f"   Content: {result.chunk.content[:100]}...")
        print(f"   Source: {result.chunk.metadata.get('source', 'Unknown')}")
    
    return rag_manager


# ============== 7. RAG-Enhanced Generation ==============

async def rag_generation_example(ai_manager: AIManager, rag_manager: RAGManager):
    """RAG-enhanced generation example"""
    print("\n🤖 RAG-Enhanced Generation Example")
    
    query = "Explain how quantum computing could revolutionize drug discovery"
    
    response = await rag_manager.generate_with_rag(
        query=query,
        ai_manager=ai_manager,
        system_prompt='You are a knowledgeable assistant. Use the provided context to give accurate, detailed answers.',
        cite_sources=True,
        max_context_tokens=1500,
        model_config=ModelConfig(
            model='gpt-4-turbo-preview',
            temperature=0.7,
            max_tokens=500
        )
    )
    
    print(f"Question: {query}")
    print(f"\nAnswer: {response.answer}")
    print(f"\nConfidence: {response.confidence:.2f}")
    print(f"Sources used: {len(response.sources)}")
    print(f"Tokens used: {response.tokens}")
    
    if response.citations:
        print("\nCitations:")
        for citation in response.citations:
            print(f"- \"{citation.text[:50]}...\" (confidence: {citation.confidence:.2f})")


# ============== 8. Language Configuration ==============

async def language_example(ai_manager: AIManager):
    """Language configuration example"""
    print("\n🌍 Language Configuration Example")
    
    # Set to French
    ai_manager.set_language('fr', locale='fr-FR', timezone='Europe/Paris')
    
    messages = [
        PromptMessage(
            role='system',
            content='You are a helpful assistant. Please respond in French.'
        ),
        PromptMessage(
            role='user',
            content='What is artificial intelligence?'
        )
    ]
    
    response = await ai_manager.complete(messages, user_id='user123')
    print(f"French response: {response.content[:200]}...")
    
    # Back to English
    ai_manager.set_language('en', locale='en-US', timezone='America/New_York')


# ============== 9. Webhook Registration ==============

def webhook_example(ai_manager: AIManager):
    """Webhook registration example"""
    print("\n🔔 Webhook Registration Example")
    
    # Register completion webhook
    def on_completion(data):
        print(f"Completion webhook triggered:")
        print(f"  Provider: {data['provider'].value}")
        print(f"  User: {data['user_id']}")
        print(f"  Tokens: {data['response'].token_usage.total_tokens}")
        print(f"  Cost: ${data['response'].token_usage.estimated_cost:.4f}")
    
    ai_manager.register_webhook('completion', on_completion)
    
    # Register quota warning webhook
    def on_quota_warning(data):
        print(f"⚠️ Quota warning: User {data['user_id']} at {data['percentage']:.1f}% usage")
    
    ai_manager.quota_manager.on_warning('user123', on_quota_warning)
    
    print("✅ Webhooks registered")


# ============== 10. Activity Reporting ==============

def reporting_example(ai_manager: AIManager):
    """Activity reporting example"""
    print("\n📊 Activity Reporting Example")
    
    # Get activity report for last 7 days
    report = ai_manager.get_activity_report(
        start_date=datetime.now() - timedelta(days=7),
        end_date=datetime.now(),
        group_by='provider'
    )
    
    print("Weekly Report:")
    print(f"  Total requests: {report['total_requests']}")
    print(f"  Total tokens: {report['total_tokens']}")
    print(f"  Total cost: ${report['total_cost']:.2f}")
    print(f"  Average latency: {report['average_latency']:.2f}ms")
    print(f"  Errors: {report['errors']}")
    
    if report.get('grouped'):
        print("\nBy Provider:")
        for provider, stats in report['grouped'].items():
            print(f"  {provider}:")
            print(f"    Requests: {stats['requests']}")
            print(f"    Tokens: {stats['tokens']}")
            print(f"    Cost: ${stats['cost']:.2f}")
    
    # Get user usage
    usage = ai_manager.get_usage('user123')
    print(f"\nUser usage: {usage}")


# ============== 11. Model Management ==============

async def model_management_example(ai_manager: AIManager):
    """Model management example"""
    print("\n⚙️ Model Management Example")
    
    # Get available models
    models = ai_manager.get_available_models()
    print(f"Available models for {ai_manager.current_provider.value}:")
    for model in models:
        print(f"  - {model}")
    
    # Switch model
    ai_manager.update_model('gpt-4')
    print("\nSwitched to GPT-4")
    
    # Switch provider and model
    ai_manager.switch_provider(AIProvider.ANTHROPIC)
    ai_manager.update_model('claude-3-opus-20240229')
    print("Switched to Anthropic Claude-3-Opus")
    
    # Test with new model
    messages = [
        PromptMessage(role='user', content='Hello!')
    ]
    response = await ai_manager.complete(messages, user_id='user123')
    print(f"Response from {response.model}: {response.content}")


# ============== 12. Health Monitoring ==============

def health_monitoring_example(ai_manager: AIManager):
    """Health monitoring example"""
    print("\n🏥 Health Monitoring Example")
    
    # Get health status
    health = ai_manager.get_health_status()
    
    print("Provider Health Status:")
    for provider, is_healthy in health.items():
        status = "✅ Healthy" if is_healthy else "❌ Unhealthy"
        print(f"  {provider.value}: {status}")


# ============== 13. Error Handling ==============

async def error_handling_example(ai_manager: AIManager):
    """Advanced error handling example"""
    print("\n⚠️ Error Handling Example")
    
    messages = [
        PromptMessage(role='user', content='Complex query here...')
    ]
    
    try:
        response = await ai_manager.complete(
            messages=messages,
            user_id='user123',
            provider=AIProvider.OPENAI
        )
        print(f"Success: {response.content[:100]}...")
        
    except Exception as e:
        error_msg = str(e)
        
        if 'Rate limit exceeded' in error_msg:
            print("Rate limit hit, waiting...")
            await asyncio.sleep(5)
            # Retry after waiting
            
        elif 'Quota exceeded' in error_msg:
            print("Quota exceeded, upgrade plan needed")
            
        else:
            print(f"Error: {error_msg}")


# ============== 14. Batch Processing ==============

async def batch_processing_example(ai_manager: AIManager):
    """Batch processing with rate limiting"""
    print("\n🔄 Batch Processing Example")
    
    queries = [
        'What is AI?',
        'Explain machine learning',
        'What is deep learning?',
        'Describe neural networks',
        'What is NLP?'
    ]
    
    results = []
    
    for i, query in enumerate(queries, 1):
        try:
            print(f"Processing {i}/{len(queries)}: {query}")
            
            response = await ai_manager.complete(
                messages=[PromptMessage(role='user', content=query)],
                user_id='batch-user',
                skip_cache=False  # Use cache for repeated queries
            )
            
            results.append({
                'query': query,
                'response': response.content[:100] + '...',
                'tokens': response.token_usage.total_tokens
            })
            
            # Rate limiting is automatically handled
            
        except Exception as e:
            print(f"Failed for query \"{query}\": {e}")
    
    print(f"\n✅ Processed {len(results)} queries successfully")
    
    # Show results
    for result in results:
        print(f"\nQ: {result['query']}")
        print(f"A: {result['response']}")
        print(f"Tokens: {result['tokens']}")


# ============== 15. OAuth Configuration ==============

async def oauth_example():
    """OAuth configuration example"""
    print("\n🔐 OAuth Configuration Example")
    
    oauth_config = OAuthConfig(
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
        refresh_token=os.getenv('GOOGLE_REFRESH_TOKEN'),
        token_endpoint='https://oauth2.googleapis.com/token',
        scope=['https://www.googleapis.com/auth/generative-language']
    )
    
    config = AIProviderConfig(
        provider=AIProvider.GOOGLE,
        oauth=oauth_config
    )
    
    # Manager will automatically refresh tokens as needed
    ai_manager = AIManager(
        configs=[config],
        rate_limit_config=RateLimitConfig(),
        quota_config=QuotaConfig()
    )
    
    response = await ai_manager.complete(
        messages=[PromptMessage(role='user', content='Hello!')],
        user_id='oauth-user'
    )
    
    print(f"OAuth response: {response.content}")


# ============== 16. Conversational RAG ==============

class ConversationalRAG:
    """Conversational RAG helper class"""
    
    def __init__(self, ai_manager: AIManager, rag_manager: RAGManager):
        self.ai_manager = ai_manager
        self.rag_manager = rag_manager
        self.conversation: List[PromptMessage] = []
    
    async def ask(self, question: str) -> str:
        """Ask a question with conversation context"""
        # Search for relevant context
        search_results = await self.rag_manager.search(question)
        
        context = '\n'.join([r.chunk.content for r in search_results[:3]])
        
        # Build conversation with context
        self.conversation.append(
            PromptMessage(
                role='user',
                content=f"Context: {context}\n\nQuestion: {question}"
            )
        )
        
        # Generate response
        messages = [
            PromptMessage(
                role='system',
                content='You are a helpful assistant. Use the context and conversation history to answer.'
            )
        ] + self.conversation
        
        response = await self.ai_manager.complete(
            messages=messages,
            model_config=ModelConfig(model='gpt-3.5-turbo', max_tokens=300)
        )
        
        # Add to conversation
        self.conversation.append(
            PromptMessage(role='assistant', content=response.content)
        )
        
        # Keep conversation manageable
        if len(self.conversation) > 10:
            self.conversation = self.conversation[-10:]
        
        return response.content


async def conversational_rag_example(ai_manager: AIManager, rag_manager: RAGManager):
    """Conversational RAG example"""
    print("\n💬 Conversational RAG Example")
    
    conv_rag = ConversationalRAG(ai_manager, rag_manager)
    
    # Have a conversation
    questions = [
        "What is quantum computing?",
        "How is it different from classical computing?",
        "What are its potential applications?"
    ]
    
    for question in questions:
        print(f"\nQ: {question}")
        answer = await conv_rag.ask(question)
        print(f"A: {answer[:200]}...")


# ============== 17. Export/Import Logs ==============

def export_import_example(ai_manager: AIManager):
    """Export and import activity logs"""
    print("\n💾 Export/Import Logs Example")
    
    # Export logs
    logs = ai_manager.export_logs()
    print(f"Exported {len(logs)} activity logs")
    
    # Save to file (simulation)
    export_data = {
        'logs': [
            {
                'id': log.id,
                'timestamp': log.timestamp.isoformat(),
                'provider': log.provider.value,
                'model': log.model,
                'user_id': log.user_id,
                'tokens': log.token_usage.total_tokens if log.token_usage else 0
            }
            for log in logs
        ],
        'exported_at': datetime.now().isoformat()
    }
    
    export_json = json.dumps(export_data, indent=2)
    print(f"Export size: {len(export_json)} bytes")
    
    # Import logs (simulation)
    # In real scenario, you'd parse the JSON and recreate ActivityLog objects
    # ai_manager.import_logs(imported_logs)
    
    print("✅ Export/Import complete")


# ============== 18. Custom Provider Integration ==============

async def custom_provider_example():
    """Custom provider integration example"""
    print("\n🔧 Custom Provider Integration")
    
    # This shows how you would extend for a custom provider
    # In practice, you'd create a new provider class
    
    print("To add a custom provider:")
    print("1. Create a class inheriting from BaseAIProvider")
    print("2. Implement required methods (complete, stream, etc.)")
    print("3. Register with AIManager")
    
    # Example structure:
    """
    class CustomProvider(BaseAIProvider):
        def initialize_auth(self):
            # Custom auth logic
            pass
        
        async def complete(self, messages, model_config):
            # Custom completion logic
            pass
        
        async def stream(self, messages, model_config):
            # Custom streaming logic
            pass
        
        def calculate_tokens(self, text):
            # Custom token calculation
            pass
        
        def estimate_cost(self, tokens):
            # Custom cost estimation
            pass
    """


# ============== 19. Performance Monitoring ==============

async def performance_monitoring_example(ai_manager: AIManager):
    """Performance monitoring example"""
    print("\n📈 Performance Monitoring Example")
    
    # Track performance across multiple calls
    latencies = []
    token_counts = []
    costs = []
    
    for i in range(5):
        messages = [
            PromptMessage(role='user', content=f'Generate a random fact #{i+1}')
        ]
        
        start_time = asyncio.get_event_loop().time()
        response = await ai_manager.complete(
            messages=messages,
            user_id='perf-test',
            model_config=ModelConfig(model='gpt-3.5-turbo', max_tokens=50)
        )
        latency = (asyncio.get_event_loop().time() - start_time) * 1000
        
        latencies.append(latency)
        token_counts.append(response.token_usage.total_tokens)
        costs.append(response.token_usage.estimated_cost or 0)
    
    # Calculate statistics
    avg_latency = sum(latencies) / len(latencies)
    avg_tokens = sum(token_counts) / len(token_counts)
    total_cost = sum(costs)
    
    print(f"Performance Statistics (5 calls):")
    print(f"  Average latency: {avg_latency:.2f}ms")
    print(f"  Average tokens: {avg_tokens:.1f}")
    print(f"  Total cost: ${total_cost:.4f}")
    print(f"  Min latency: {min(latencies):.2f}ms")
    print(f"  Max latency: {max(latencies):.2f}ms")


# ============== 20. Cleanup ==============

async def cleanup_example(ai_manager: AIManager, rag_manager: RAGManager):
    """Cleanup resources"""
    print("\n🧹 Cleanup Example")
    
    # Clean up AI Manager
    await ai_manager.destroy()
    print("AI Manager cleaned up")
    
    # Clean up RAG Manager
    await rag_manager.cleanup()
    print("RAG Manager cleaned up")
    
    print("✅ All resources released")


# ============== Main Execution ==============

async def main():
    """Main execution function"""
    print("🚀 Python AI Manager Examples")
    print("=" * 50)
    
    try:
        # Initialize
        ai_manager = await basic_setup_example()
        
        # Basic examples
        await basic_completion_example(ai_manager)
        await streaming_example(ai_manager)
        await template_example(ai_manager)
        await fallback_example(ai_manager)
        
        # RAG examples
        rag_manager = await rag_setup_example(ai_manager)
        await rag_generation_example(ai_manager, rag_manager)
        await conversational_rag_example(ai_manager, rag_manager)
        
        # Configuration examples
        await language_example(ai_manager)
        webhook_example(ai_manager)
        reporting_example(ai_manager)
        
        # Management examples
        await model_management_example(ai_manager)
        health_monitoring_example(ai_manager)
        
        # Advanced examples
        await error_handling_example(ai_manager)
        await batch_processing_example(ai_manager)
        await performance_monitoring_example(ai_manager)
        
        # Export/Import
        export_import_example(ai_manager)
        
        # Cleanup
        await cleanup_example(ai_manager, rag_manager)
        
        print("\n✅ All examples completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error in main: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run the examples
    asyncio.run(main())
