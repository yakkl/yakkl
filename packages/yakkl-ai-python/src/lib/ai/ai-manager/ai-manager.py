# ai_manager.py
"""
Production-ready AI Manager for Python
Supports multiple AI providers with advanced features
"""

import asyncio
import json
import time
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, AsyncGenerator, Tuple, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from abc import ABC, abstractmethod
import aiohttp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============== Types and Enums ==============

class AIProvider(Enum):
    """Available AI providers"""
    OPENAI = 'openai'
    ANTHROPIC = 'anthropic'
    GOOGLE = 'google'
    GOOGLE_NANO = 'google-nano'
    AZURE_OPENAI = 'azure-openai'
    COHERE = 'cohere'
    HUGGINGFACE = 'huggingface'
    CUSTOM = 'custom'


class RetrievalStrategy(Enum):
    """RAG retrieval strategies"""
    SIMILARITY = 'similarity'
    MMR = 'mmr'  # Maximum Marginal Relevance
    HYBRID = 'hybrid'
    SEMANTIC = 'semantic'
    CONTEXTUAL = 'contextual'
    GRAPH = 'graph'


@dataclass
class AIProviderConfig:
    """Configuration for AI providers"""
    provider: AIProvider
    api_key: Optional[str] = None
    jwt: Optional[str] = None
    oauth: Optional['OAuthConfig'] = None
    endpoint: Optional[str] = None
    max_retries: int = 3
    timeout: int = 30000
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    region: Optional[str] = None


@dataclass
class OAuthConfig:
    """OAuth configuration"""
    client_id: str
    client_secret: str
    refresh_token: Optional[str] = None
    access_token: Optional[str] = None
    token_endpoint: str
    scope: Optional[List[str]] = None


@dataclass
class ModelConfig:
    """Model configuration"""
    model: str
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    stop_sequences: Optional[List[str]] = None
    response_format: Optional[str] = 'text'  # text, json, stream
    seed: Optional[int] = None


@dataclass
class PromptMessage:
    """Message in a conversation"""
    role: str  # system, user, assistant, function
    content: str
    name: Optional[str] = None
    function_call: Optional[Any] = None


@dataclass
class TokenUsage:
    """Token usage statistics"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cached_tokens: Optional[int] = None
    estimated_cost: Optional[float] = None


@dataclass
class AIResponse:
    """AI provider response"""
    id: str
    provider: AIProvider
    model: str
    content: str
    token_usage: TokenUsage
    timestamp: datetime
    latency: float
    metadata: Optional[Dict[str, Any]] = None
    cached: bool = False
    error: Optional['AIError'] = None


@dataclass
class AIError:
    """AI error information"""
    code: str
    message: str
    provider: AIProvider
    retryable: bool
    details: Optional[Any] = None


@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    max_requests_per_minute: Optional[int] = None
    max_requests_per_hour: Optional[int] = None
    max_requests_per_day: Optional[int] = None
    max_tokens_per_minute: Optional[int] = None
    max_tokens_per_hour: Optional[int] = None
    max_tokens_per_day: Optional[int] = None
    debounce_ms: Optional[int] = None
    burst_limit: Optional[int] = None


@dataclass
class QuotaConfig:
    """Quota configuration"""
    max_total_tokens: Optional[int] = None
    max_cost_per_day: Optional[float] = None
    max_cost_per_month: Optional[float] = None
    warning_threshold: Optional[float] = None  # Percentage


@dataclass
class LanguageConfig:
    """Language configuration"""
    language: str  # ISO 639-1 code
    locale: Optional[str] = None
    timezone: Optional[str] = None


@dataclass
class ActivityLog:
    """Activity log entry"""
    id: str
    timestamp: datetime
    provider: AIProvider
    model: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    prompt: List[PromptMessage] = field(default_factory=list)
    response: Optional[AIResponse] = None
    token_usage: Optional[TokenUsage] = None
    cost: Optional[float] = None
    latency: float = 0
    error: Optional[AIError] = None
    metadata: Optional[Dict[str, Any]] = None


# ============== Base Provider ==============

class BaseAIProvider(ABC):
    """Abstract base class for AI providers"""
    
    def __init__(self, config: AIProviderConfig):
        self.config = config
        self.model_config = ModelConfig(model='default')
        self.headers: Dict[str, str] = {}
        self.session: Optional[aiohttp.ClientSession] = None
        self.initialize_auth()
    
    @abstractmethod
    def initialize_auth(self) -> None:
        """Initialize authentication headers"""
        pass
    
    @abstractmethod
    async def complete(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AIResponse:
        """Generate a completion"""
        pass
    
    @abstractmethod
    async def stream(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AsyncGenerator[str, None]:
        """Stream a completion"""
        pass
    
    @abstractmethod
    def calculate_tokens(self, text: str) -> int:
        """Calculate token count for text"""
        pass
    
    @abstractmethod
    def estimate_cost(self, tokens: TokenUsage) -> float:
        """Estimate cost for token usage"""
        pass
    
    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        pass
    
    @abstractmethod
    def validate_model(self, model: str) -> bool:
        """Validate if model is supported"""
        pass
    
    def set_model(self, model: str) -> None:
        """Set the model"""
        if not self.validate_model(model):
            raise ValueError(f"Invalid model {model} for provider {self.config.provider.value}")
        self.model_config.model = model
    
    def update_config(self, config: Dict[str, Any]) -> None:
        """Update model configuration"""
        for key, value in config.items():
            if hasattr(self.model_config, key):
                setattr(self.model_config, key, value)
    
    async def refresh_oauth_token(self) -> None:
        """Refresh OAuth token if needed"""
        if not self.config.oauth:
            return
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.post(
            self.config.oauth.token_endpoint,
            data={
                'grant_type': 'refresh_token',
                'refresh_token': self.config.oauth.refresh_token,
                'client_id': self.config.oauth.client_id,
                'client_secret': self.config.oauth.client_secret,
            }
        ) as response:
            data = await response.json()
            self.config.oauth.access_token = data['access_token']
            if 'refresh_token' in data:
                self.config.oauth.refresh_token = data['refresh_token']
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        if self.session:
            await self.session.close()


# ============== OpenAI Provider ==============

class OpenAIProvider(BaseAIProvider):
    """OpenAI provider implementation"""
    
    def initialize_auth(self) -> None:
        """Initialize OpenAI authentication"""
        if self.config.api_key:
            self.headers['Authorization'] = f"Bearer {self.config.api_key}"
        if self.config.organization_id:
            self.headers['OpenAI-Organization'] = self.config.organization_id
    
    async def complete(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AIResponse:
        """Generate OpenAI completion"""
        config = ModelConfig(**{
            **asdict(self.model_config),
            **(asdict(model_config) if model_config else {})
        })
        
        start_time = time.time()
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            async with self.session.post(
                'https://api.openai.com/v1/chat/completions',
                headers={**self.headers, 'Content-Type': 'application/json'},
                json={
                    'model': config.model or 'gpt-4-turbo-preview',
                    'messages': [asdict(m) for m in messages],
                    'temperature': config.temperature,
                    'max_tokens': config.max_tokens,
                    'top_p': config.top_p,
                    'frequency_penalty': config.frequency_penalty,
                    'presence_penalty': config.presence_penalty,
                    'stop': config.stop_sequences,
                    'seed': config.seed,
                }
            ) as response:
                data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"OpenAI API error: {data}")
                
                token_usage = TokenUsage(
                    prompt_tokens=data['usage']['prompt_tokens'],
                    completion_tokens=data['usage']['completion_tokens'],
                    total_tokens=data['usage']['total_tokens'],
                    estimated_cost=self.estimate_cost(TokenUsage(
                        prompt_tokens=data['usage']['prompt_tokens'],
                        completion_tokens=data['usage']['completion_tokens'],
                        total_tokens=data['usage']['total_tokens']
                    ))
                )
                
                return AIResponse(
                    id=data['id'],
                    provider=AIProvider.OPENAI,
                    model=data['model'],
                    content=data['choices'][0]['message']['content'],
                    token_usage=token_usage,
                    timestamp=datetime.now(),
                    latency=(time.time() - start_time) * 1000,
                    metadata={'finish_reason': data['choices'][0]['finish_reason']}
                )
        
        except Exception as e:
            raise AIError(
                code='OPENAI_ERROR',
                message=str(e),
                provider=AIProvider.OPENAI,
                retryable=True,
                details=e
            )
    
    async def stream(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AsyncGenerator[str, None]:
        """Stream OpenAI completion"""
        config = ModelConfig(**{
            **asdict(self.model_config),
            **(asdict(model_config) if model_config else {})
        })
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.post(
            'https://api.openai.com/v1/chat/completions',
            headers={**self.headers, 'Content-Type': 'application/json'},
            json={
                'model': config.model or 'gpt-4-turbo-preview',
                'messages': [asdict(m) for m in messages],
                'stream': True,
                'temperature': config.temperature,
                'max_tokens': config.max_tokens,
            }
        ) as response:
            async for line in response.content:
                line = line.decode('utf-8').strip()
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        return
                    try:
                        parsed = json.loads(data)
                        content = parsed['choices'][0].get('delta', {}).get('content')
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
    
    def calculate_tokens(self, text: str) -> int:
        """Calculate OpenAI tokens"""
        # Simplified - in production use tiktoken
        return len(text) // 4
    
    def estimate_cost(self, tokens: TokenUsage) -> float:
        """Estimate OpenAI cost"""
        model = self.model_config.model or 'gpt-4-turbo-preview'
        rates = {
            'gpt-4-turbo-preview': {'input': 0.01, 'output': 0.03},
            'gpt-4': {'input': 0.03, 'output': 0.06},
            'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015},
        }
        rate = rates.get(model, rates['gpt-3.5-turbo'])
        return (tokens.prompt_tokens * rate['input'] + 
                tokens.completion_tokens * rate['output']) / 1000
    
    def get_available_models(self) -> List[str]:
        """Get available OpenAI models"""
        return [
            'gpt-4-turbo-preview',
            'gpt-4',
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-16k',
            'text-embedding-ada-002',
        ]
    
    def validate_model(self, model: str) -> bool:
        """Validate OpenAI model"""
        return model in self.get_available_models()


# ============== Anthropic Provider ==============

class AnthropicProvider(BaseAIProvider):
    """Anthropic Claude provider implementation"""
    
    def initialize_auth(self) -> None:
        """Initialize Anthropic authentication"""
        if self.config.api_key:
            self.headers['x-api-key'] = self.config.api_key
            self.headers['anthropic-version'] = '2023-06-01'
    
    async def complete(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AIResponse:
        """Generate Anthropic completion"""
        config = ModelConfig(**{
            **asdict(self.model_config),
            **(asdict(model_config) if model_config else {})
        })
        
        start_time = time.time()
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        # Separate system message
        system_message = next((m.content for m in messages if m.role == 'system'), None)
        other_messages = [m for m in messages if m.role != 'system']
        
        try:
            async with self.session.post(
                'https://api.anthropic.com/v1/messages',
                headers={**self.headers, 'Content-Type': 'application/json'},
                json={
                    'model': config.model or 'claude-3-opus-20240229',
                    'messages': [{'role': m.role, 'content': m.content} for m in other_messages],
                    'system': system_message,
                    'max_tokens': config.max_tokens or 4096,
                    'temperature': config.temperature,
                    'top_p': config.top_p,
                    'top_k': config.top_k,
                    'stop_sequences': config.stop_sequences,
                }
            ) as response:
                data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"Anthropic API error: {data}")
                
                token_usage = TokenUsage(
                    prompt_tokens=data['usage']['input_tokens'],
                    completion_tokens=data['usage']['output_tokens'],
                    total_tokens=data['usage']['input_tokens'] + data['usage']['output_tokens'],
                    estimated_cost=self.estimate_cost(TokenUsage(
                        prompt_tokens=data['usage']['input_tokens'],
                        completion_tokens=data['usage']['output_tokens'],
                        total_tokens=data['usage']['input_tokens'] + data['usage']['output_tokens']
                    ))
                )
                
                return AIResponse(
                    id=data['id'],
                    provider=AIProvider.ANTHROPIC,
                    model=data['model'],
                    content=data['content'][0]['text'],
                    token_usage=token_usage,
                    timestamp=datetime.now(),
                    latency=(time.time() - start_time) * 1000
                )
        
        except Exception as e:
            raise AIError(
                code='ANTHROPIC_ERROR',
                message=str(e),
                provider=AIProvider.ANTHROPIC,
                retryable=True,
                details=e
            )
    
    async def stream(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AsyncGenerator[str, None]:
        """Stream Anthropic completion"""
        config = ModelConfig(**{
            **asdict(self.model_config),
            **(asdict(model_config) if model_config else {})
        })
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        system_message = next((m.content for m in messages if m.role == 'system'), None)
        other_messages = [m for m in messages if m.role != 'system']
        
        async with self.session.post(
            'https://api.anthropic.com/v1/messages',
            headers={**self.headers, 'Content-Type': 'application/json'},
            json={
                'model': config.model or 'claude-3-opus-20240229',
                'messages': [{'role': m.role, 'content': m.content} for m in other_messages],
                'system': system_message,
                'max_tokens': config.max_tokens or 4096,
                'stream': True,
                'temperature': config.temperature,
            }
        ) as response:
            async for line in response.content:
                line = line.decode('utf-8').strip()
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        return
                    try:
                        parsed = json.loads(data)
                        if parsed.get('type') == 'content_block_delta':
                            yield parsed['delta']['text']
                    except json.JSONDecodeError:
                        continue
    
    def calculate_tokens(self, text: str) -> int:
        """Calculate Anthropic tokens"""
        return int(len(text) / 3.5)
    
    def estimate_cost(self, tokens: TokenUsage) -> float:
        """Estimate Anthropic cost"""
        model = self.model_config.model or 'claude-3-opus-20240229'
        rates = {
            'claude-3-opus-20240229': {'input': 0.015, 'output': 0.075},
            'claude-3-sonnet-20240229': {'input': 0.003, 'output': 0.015},
            'claude-3-haiku-20240307': {'input': 0.00025, 'output': 0.00125},
        }
        rate = rates.get(model, rates['claude-3-haiku-20240307'])
        return (tokens.prompt_tokens * rate['input'] + 
                tokens.completion_tokens * rate['output']) / 1000
    
    def get_available_models(self) -> List[str]:
        """Get available Anthropic models"""
        return [
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
            'claude-2.1',
            'claude-2.0',
        ]
    
    def validate_model(self, model: str) -> bool:
        """Validate Anthropic model"""
        return model in self.get_available_models()


# ============== Google Provider ==============

class GoogleProvider(BaseAIProvider):
    """Google AI provider implementation"""
    
    def __init__(self, config: AIProviderConfig):
        super().__init__(config)
        self.is_nano = config.provider == AIProvider.GOOGLE_NANO
    
    def initialize_auth(self) -> None:
        """Initialize Google authentication"""
        if self.is_nano:
            # Google Nano runs locally, no auth needed
            return
        
        if self.config.api_key:
            self.headers['x-goog-api-key'] = self.config.api_key
        elif self.config.oauth:
            self.headers['Authorization'] = f"Bearer {self.config.oauth.access_token}"
    
    async def complete(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AIResponse:
        """Generate Google completion"""
        config = ModelConfig(**{
            **asdict(self.model_config),
            **(asdict(model_config) if model_config else {})
        })
        
        start_time = time.time()
        
        if self.is_nano:
            return await self._complete_with_nano(messages, config, start_time)
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            model = config.model or 'gemini-2.0-flash-exp'
            async with self.session.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                headers={**self.headers, 'Content-Type': 'application/json'},
                json={
                    'contents': self._convert_messages_to_gemini_format(messages),
                    'generationConfig': {
                        'temperature': config.temperature,
                        'maxOutputTokens': config.max_tokens,
                        'topP': config.top_p,
                        'topK': config.top_k,
                        'stopSequences': config.stop_sequences,
                    }
                }
            ) as response:
                data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"Google API error: {data}")
                
                content = data['candidates'][0]['content']['parts'][0]['text']
                usage = data.get('usageMetadata', {})
                
                token_usage = TokenUsage(
                    prompt_tokens=usage.get('promptTokenCount', 0),
                    completion_tokens=usage.get('candidatesTokenCount', 0),
                    total_tokens=usage.get('totalTokenCount', 0),
                    estimated_cost=self.estimate_cost(TokenUsage(
                        prompt_tokens=usage.get('promptTokenCount', 0),
                        completion_tokens=usage.get('candidatesTokenCount', 0),
                        total_tokens=usage.get('totalTokenCount', 0)
                    ))
                )
                
                return AIResponse(
                    id=str(uuid.uuid4()),
                    provider=AIProvider.GOOGLE,
                    model=model,
                    content=content,
                    token_usage=token_usage,
                    timestamp=datetime.now(),
                    latency=(time.time() - start_time) * 1000
                )
        
        except Exception as e:
            raise AIError(
                code='GOOGLE_ERROR',
                message=str(e),
                provider=AIProvider.GOOGLE,
                retryable=True,
                details=e
            )
    
    async def _complete_with_nano(
        self, 
        messages: List[PromptMessage], 
        config: ModelConfig, 
        start_time: float
    ) -> AIResponse:
        """Complete using Google Nano (browser-based)"""
        # This would need browser integration
        # Placeholder implementation
        prompt = self._convert_messages_to_prompt(messages)
        
        # Simulate Nano response
        content = f"Nano response to: {prompt[:50]}..."
        prompt_tokens = self.calculate_tokens(prompt)
        completion_tokens = self.calculate_tokens(content)
        
        return AIResponse(
            id=str(uuid.uuid4()),
            provider=AIProvider.GOOGLE_NANO,
            model='nano',
            content=content,
            token_usage=TokenUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                estimated_cost=0  # Nano is free (local)
            ),
            timestamp=datetime.now(),
            latency=(time.time() - start_time) * 1000,
            metadata={'local': True}
        )
    
    async def stream(
        self, 
        messages: List[PromptMessage], 
        model_config: Optional[ModelConfig] = None
    ) -> AsyncGenerator[str, None]:
        """Stream Google completion"""
        config = ModelConfig(**{
            **asdict(self.model_config),
            **(asdict(model_config) if model_config else {})
        })
        
        if self.is_nano:
            # Nano streaming would need browser integration
            yield "Nano streaming not implemented in Python"
            return
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        model = config.model or 'gemini-2.0-flash-exp'
        async with self.session.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent',
            headers={**self.headers, 'Content-Type': 'application/json'},
            json={
                'contents': self._convert_messages_to_gemini_format(messages),
                'generationConfig': {
                    'temperature': config.temperature,
                    'maxOutputTokens': config.max_tokens,
                }
            }
        ) as response:
            async for line in response.content:
                try:
                    data = json.loads(line)
                    content = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
                    if content:
                        yield content
                except json.JSONDecodeError:
                    continue
    
    def _convert_messages_to_gemini_format(self, messages: List[PromptMessage]) -> List[Dict]:
        """Convert messages to Gemini format"""
        return [
            {
                'role': 'model' if msg.role == 'assistant' else 'user',
                'parts': [{'text': msg.content}]
            }
            for msg in messages
        ]
    
    def _convert_messages_to_prompt(self, messages: List[PromptMessage]) -> str:
        """Convert messages to single prompt"""
        return '\n'.join([f"{msg.role}: {msg.content}" for msg in messages])
    
    def calculate_tokens(self, text: str) -> int:
        """Calculate Google tokens"""
        if self.is_nano:
            return int(len(text) / 3.5)
        return len(text) // 4
    
    def estimate_cost(self, tokens: TokenUsage) -> float:
        """Estimate Google cost"""
        if self.is_nano:
            return 0  # Nano is free
        
        model = self.model_config.model or 'gemini-2.0-flash-exp'
        rates = {
            'gemini-2.0-flash-exp': {'input': 0.000075, 'output': 0.0003},
            'gemini-1.5-pro': {'input': 0.00125, 'output': 0.005},
            'gemini-1.5-flash': {'input': 0.000075, 'output': 0.0003},
        }
        rate = rates.get(model, rates['gemini-2.0-flash-exp'])
        return (tokens.prompt_tokens * rate['input'] + 
                tokens.completion_tokens * rate['output']) / 1000
    
    def get_available_models(self) -> List[str]:
        """Get available Google models"""
        if self.is_nano:
            return ['nano']
        
        return [
            'gemini-2.0-flash-exp',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.0-pro',
        ]
    
    def validate_model(self, model: str) -> bool:
        """Validate Google model"""
        return model in self.get_available_models()


# ============== Services ==============

class RateLimiter:
    """Rate limiting service"""
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.requests: Dict[str, List[float]] = {}
        self.tokens: Dict[str, List[int]] = {}
        self.last_request: Dict[str, float] = {}
    
    async def check_limit(self, user_id: str, token_count: Optional[int] = None) -> bool:
        """Check if request is within rate limits"""
        now = time.time() * 1000  # Convert to milliseconds
        
        # Check debounce
        if self.config.debounce_ms:
            last = self.last_request.get(user_id, 0)
            if now - last < self.config.debounce_ms:
                raise Exception(f"Please wait {self.config.debounce_ms - (now - last)}ms before next request")
        
        # Clean old entries
        self._clean_old_entries(user_id, now)
        
        # Check request limits
        user_requests = self.requests.get(user_id, [])
        
        if self.config.max_requests_per_minute:
            recent_minute = [t for t in user_requests if now - t < 60000]
            if len(recent_minute) >= self.config.max_requests_per_minute:
                raise Exception('Rate limit exceeded: too many requests per minute')
        
        if self.config.max_requests_per_hour:
            recent_hour = [t for t in user_requests if now - t < 3600000]
            if len(recent_hour) >= self.config.max_requests_per_hour:
                raise Exception('Rate limit exceeded: too many requests per hour')
        
        if self.config.max_requests_per_day:
            recent_day = [t for t in user_requests if now - t < 86400000]
            if len(recent_day) >= self.config.max_requests_per_day:
                raise Exception('Rate limit exceeded: too many requests per day')
        
        # Check token limits
        if token_count and (self.config.max_tokens_per_minute or 
                           self.config.max_tokens_per_hour or 
                           self.config.max_tokens_per_day):
            user_tokens = self.tokens.get(user_id, [])
            
            if self.config.max_tokens_per_minute:
                recent_minute_tokens = sum(t for t in user_tokens if now - t < 60000)
                if recent_minute_tokens + token_count > self.config.max_tokens_per_minute:
                    raise Exception('Rate limit exceeded: too many tokens per minute')
            
            if self.config.max_tokens_per_hour:
                recent_hour_tokens = sum(t for t in user_tokens if now - t < 3600000)
                if recent_hour_tokens + token_count > self.config.max_tokens_per_hour:
                    raise Exception('Rate limit exceeded: too many tokens per hour')
            
            if self.config.max_tokens_per_day:
                recent_day_tokens = sum(t for t in user_tokens if now - t < 86400000)
                if recent_day_tokens + token_count > self.config.max_tokens_per_day:
                    raise Exception('Rate limit exceeded: too many tokens per day')
        
        return True
    
    def record_request(self, user_id: str, token_count: Optional[int] = None) -> None:
        """Record a request"""
        now = time.time() * 1000
        
        if user_id not in self.requests:
            self.requests[user_id] = []
        self.requests[user_id].append(now)
        
        if token_count:
            if user_id not in self.tokens:
                self.tokens[user_id] = []
            self.tokens[user_id].append(token_count)
        
        self.last_request[user_id] = now
    
    def _clean_old_entries(self, user_id: str, now: float) -> None:
        """Clean entries older than 24 hours"""
        if user_id in self.requests:
            self.requests[user_id] = [t for t in self.requests[user_id] if now - t < 86400000]
        
        if user_id in self.tokens:
            self.tokens[user_id] = [t for t in self.tokens[user_id] if now - t < 86400000]
    
    def reset(self, user_id: Optional[str] = None) -> None:
        """Reset rate limits"""
        if user_id:
            self.requests.pop(user_id, None)
            self.tokens.pop(user_id, None)
            self.last_request.pop(user_id, None)
        else:
            self.requests.clear()
            self.tokens.clear()
            self.last_request.clear()


class QuotaManager:
    """Quota management service"""
    
    def __init__(self, config: QuotaConfig):
        self.config = config
        self.usage: Dict[str, Dict[str, Any]] = {}
        self.callbacks: Dict[str, Callable] = {}
    
    async def check_quota(self, user_id: str, tokens: int, cost: float) -> bool:
        """Check if usage is within quota"""
        today = datetime.now().strftime('%Y-%m-%d')
        user_usage = self.usage.get(user_id, {'tokens': 0, 'cost': 0, 'date': today})
        
        # Reset if new day
        if user_usage['date'] != today:
            user_usage = {'tokens': 0, 'cost': 0, 'date': today}
        
        # Check total tokens
        if self.config.max_total_tokens and user_usage['tokens'] + tokens > self.config.max_total_tokens:
            raise Exception('Quota exceeded: maximum tokens reached')
        
        # Check daily cost
        if self.config.max_cost_per_day and user_usage['cost'] + cost > self.config.max_cost_per_day:
            raise Exception('Quota exceeded: daily cost limit reached')
        
        # Check warning threshold
        if self.config.warning_threshold:
            percentage_used = (user_usage['tokens'] / (self.config.max_total_tokens or float('inf'))) * 100
            if percentage_used >= self.config.warning_threshold:
                self._trigger_warning(user_id, percentage_used)
        
        return True
    
    def record_usage(self, user_id: str, tokens: int, cost: float) -> None:
        """Record usage"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        if user_id not in self.usage:
            self.usage[user_id] = {'tokens': 0, 'cost': 0, 'date': today}
        
        user_usage = self.usage[user_id]
        if user_usage['date'] != today:
            user_usage = {'tokens': 0, 'cost': 0, 'date': today}
        
        user_usage['tokens'] += tokens
        user_usage['cost'] += cost
        self.usage[user_id] = user_usage
    
    def _trigger_warning(self, user_id: str, percentage: float) -> None:
        """Trigger quota warning"""
        callback = self.callbacks.get(user_id)
        if callback:
            callback({'user_id': user_id, 'percentage': percentage, 'usage': self.usage.get(user_id)})
    
    def on_warning(self, user_id: str, callback: Callable) -> None:
        """Register warning callback"""
        self.callbacks[user_id] = callback
    
    def get_usage(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user usage"""
        return self.usage.get(user_id)
    
    def reset(self, user_id: Optional[str] = None) -> None:
        """Reset quotas"""
        if user_id:
            self.usage.pop(user_id, None)
        else:
            self.usage.clear()


class ResponseCache:
    """Response caching service"""
    
    def __init__(self, ttl_seconds: int = 3600):
        self.cache: Dict[str, Tuple[AIResponse, float]] = {}
        self.ttl = ttl_seconds * 1000  # Convert to milliseconds
    
    def generate_key(
        self, 
        messages: List[PromptMessage], 
        model_config: ModelConfig, 
        provider: AIProvider
    ) -> str:
        """Generate cache key"""
        content = json.dumps({
            'messages': [asdict(m) for m in messages],
            'model_config': asdict(model_config),
            'provider': provider.value
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[AIResponse]:
        """Get cached response"""
        cached = self.cache.get(key)
        if not cached:
            return None
        
        response, timestamp = cached
        if time.time() * 1000 - timestamp > self.ttl:
            del self.cache[key]
            return None
        
        response.cached = True
        return response
    
    def set(self, key: str, response: AIResponse) -> None:
        """Cache response"""
        self.cache[key] = (response, time.time() * 1000)
        
        # Clean old entries if cache is too large
        if len(self.cache) > 1000:
            sorted_items = sorted(self.cache.items(), key=lambda x: x[1][1])
            for i in range(100):
                del self.cache[sorted_items[i][0]]
    
    def clear(self) -> None:
        """Clear cache"""
        self.cache.clear()


class ActivityLogger:
    """Activity logging service"""
    
    def __init__(self, max_logs: int = 10000):
        self.logs: List[ActivityLog] = []
        self.max_logs = max_logs
    
    def log(self, entry: ActivityLog) -> None:
        """Log activity"""
        self.logs.append(entry)
        
        # Trim old logs
        if len(self.logs) > self.max_logs:
            self.logs = self.logs[-self.max_logs:]
    
    def get_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        provider: Optional[AIProvider] = None,
        user_id: Optional[str] = None,
        group_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate activity report"""
        filtered = self.logs
        
        # Apply filters
        if start_date:
            filtered = [log for log in filtered if log.timestamp >= start_date]
        
        if end_date:
            filtered = [log for log in filtered if log.timestamp <= end_date]
        
        if provider:
            filtered = [log for log in filtered if log.provider == provider]
        
        if user_id:
            filtered = [log for log in filtered if log.user_id == user_id]
        
        # Generate report
        report = {
            'total_requests': len(filtered),
            'total_tokens': 0,
            'total_cost': 0,
            'average_latency': 0,
            'errors': 0,
            'providers': {},
            'models': {},
        }
        
        total_latency = 0
        
        for log in filtered:
            if log.token_usage:
                report['total_tokens'] += log.token_usage.total_tokens
            report['total_cost'] += log.cost or 0
            total_latency += log.latency
            
            if log.error:
                report['errors'] += 1
            
            # Group by provider
            provider_name = log.provider.value
            if provider_name not in report['providers']:
                report['providers'][provider_name] = {
                    'requests': 0,
                    'tokens': 0,
                    'cost': 0,
                    'errors': 0,
                }
            report['providers'][provider_name]['requests'] += 1
            if log.token_usage:
                report['providers'][provider_name]['tokens'] += log.token_usage.total_tokens
            report['providers'][provider_name]['cost'] += log.cost or 0
            if log.error:
                report['providers'][provider_name]['errors'] += 1
            
            # Group by model
            if log.model not in report['models']:
                report['models'][log.model] = {
                    'requests': 0,
                    'tokens': 0,
                    'cost': 0,
                }
            report['models'][log.model]['requests'] += 1
            if log.token_usage:
                report['models'][log.model]['tokens'] += log.token_usage.total_tokens
            report['models'][log.model]['cost'] += log.cost or 0
        
        report['average_latency'] = total_latency / len(filtered) if filtered else 0
        
        # Apply grouping if requested
        if group_by:
            grouped = {}
            
            for log in filtered:
                if group_by == 'provider':
                    key = log.provider.value
                elif group_by == 'model':
                    key = log.model
                elif group_by == 'user':
                    key = log.user_id or 'anonymous'
                elif group_by == 'day':
                    key = log.timestamp.strftime('%Y-%m-%d')
                else:
                    key = 'unknown'
                
                if key not in grouped:
                    grouped[key] = {
                        'requests': 0,
                        'tokens': 0,
                        'cost': 0,
                        'average_latency': 0,
                        'errors': 0,
                    }
                
                grouped[key]['requests'] += 1
                if log.token_usage:
                    grouped[key]['tokens'] += log.token_usage.total_tokens
                grouped[key]['cost'] += log.cost or 0
                grouped[key]['average_latency'] += log.latency
                if log.error:
                    grouped[key]['errors'] += 1
            
            # Calculate averages
            for key in grouped:
                if grouped[key]['requests'] > 0:
                    grouped[key]['average_latency'] /= grouped[key]['requests']
            
            report['grouped'] = grouped
        
        return report
    
    def export(self) -> List[ActivityLog]:
        """Export logs"""
        return self.logs.copy()
    
    def import_logs(self, logs: List[ActivityLog]) -> None:
        """Import logs"""
        self.logs = (self.logs + logs)[-self.max_logs:]
    
    def clear(self) -> None:
        """Clear logs"""
        self.logs.clear()


# ============== Main AIManager Class ==============

class AIManager:
    """Main AI Manager class"""
    
    def __init__(
        self,
        configs: List[AIProviderConfig],
        rate_limit_config: Optional[RateLimitConfig] = None,
        quota_config: Optional[QuotaConfig] = None,
        cache_enabled: bool = True,
        cache_ttl: int = 3600,
        fallback_providers: Optional[List[AIProvider]] = None,
        moderation_enabled: bool = False
    ):
        """Initialize AI Manager"""
        self.providers: Dict[AIProvider, BaseAIProvider] = {}
        self.current_provider = configs[0].provider
        self.rate_limiter = RateLimiter(rate_limit_config or RateLimitConfig())
        self.quota_manager = QuotaManager(quota_config or QuotaConfig())
        self.cache = ResponseCache(cache_ttl) if cache_enabled else None
        self.logger = ActivityLogger()
        self.language = LanguageConfig(language='en')
        self.fallback_providers = fallback_providers or []
        self.health_checks: Dict[AIProvider, bool] = {}
        self.retry_config = {'max_retries': 3, 'backoff_multiplier': 2, 'initial_delay_ms': 1000}
        self.webhooks: Dict[str, Callable] = {}
        self.templates: Dict[str, List[PromptMessage]] = {}
        self.moderation_enabled = moderation_enabled
        self.circuit_breaker: Dict[AIProvider, Dict[str, Any]] = {}
        self.rag_manager = None  # RAG integration
        
        # Initialize providers
        for config in configs:
            self._add_provider(config)
        
        # Start health checks
        asyncio.create_task(self._start_health_checks())
    
    def _add_provider(self, config: AIProviderConfig) -> None:
        """Add a provider"""
        if config.provider in [AIProvider.OPENAI, AIProvider.AZURE_OPENAI]:
            provider = OpenAIProvider(config)
        elif config.provider == AIProvider.ANTHROPIC:
            provider = AnthropicProvider(config)
        elif config.provider in [AIProvider.GOOGLE, AIProvider.GOOGLE_NANO]:
            provider = GoogleProvider(config)
        else:
            raise ValueError(f"Unsupported provider: {config.provider}")
        
        self.providers[config.provider] = provider
        self.health_checks[config.provider] = True
        self.circuit_breaker[config.provider] = {
            'failures': 0,
            'last_failure': 0,
            'open': False
        }
    
    async def complete(
        self,
        messages: List[PromptMessage],
        provider: Optional[AIProvider] = None,
        model_config: Optional[ModelConfig] = None,
        user_id: str = 'default',
        session_id: Optional[str] = None,
        skip_cache: bool = False,
        skip_rate_limit: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AIResponse:
        """Generate completion"""
        provider = provider or self.current_provider
        
        # Check circuit breaker
        if self._is_circuit_open(provider):
            return await self._try_fallback(messages, provider, model_config, user_id, session_id, skip_cache, metadata)
        
        # Check rate limits
        if not skip_rate_limit:
            estimated_tokens = self._estimate_tokens(messages, provider)
            await self.rate_limiter.check_limit(user_id, estimated_tokens)
        
        # Check cache
        if self.cache and not skip_cache:
            cache_key = self.cache.generate_key(
                messages,
                model_config or ModelConfig(model='default'),
                provider
            )
            cached = self.cache.get(cache_key)
            if cached:
                self._log_activity(
                    provider, cached.model, user_id, session_id,
                    messages, cached, cached.token_usage, 0,
                    {'cached': True, **(metadata or {})}
                )
                return cached
        
        # Apply content moderation
        if self.moderation_enabled:
            await self._moderate_content(messages)
        
        # Get provider
        ai_provider = self.providers.get(provider)
        if not ai_provider:
            raise ValueError(f"Provider {provider} not configured")
        
        try:
            # Make request with retries
            response = await self._retry_with_backoff(
                lambda: ai_provider.complete(messages, model_config)
            )
            
            # Check quota
            await self.quota_manager.check_quota(
                user_id,
                response.token_usage.total_tokens,
                response.token_usage.estimated_cost or 0
            )
            
            # Record usage
            self.rate_limiter.record_request(user_id, response.token_usage.total_tokens)
            self.quota_manager.record_usage(
                user_id,
                response.token_usage.total_tokens,
                response.token_usage.estimated_cost or 0
            )
            
            # Cache response
            if self.cache and not skip_cache:
                self.cache.set(cache_key, response)
            
            # Log activity
            self._log_activity(
                provider, response.model, user_id, session_id,
                messages, response, response.token_usage,
                response.latency, metadata
            )
            
            # Trigger webhook
            self._trigger_webhook('completion', {
                'provider': provider,
                'user_id': user_id,
                'response': response,
                'metadata': metadata
            })
            
            # Reset circuit breaker
            self._reset_circuit_breaker(provider)
            
            return response
            
        except Exception as e:
            # Record circuit breaker failure
            self._record_circuit_breaker_failure(provider)
            
            # Try fallback providers
            if self.fallback_providers:
                return await self._try_fallback(messages, provider, model_config, user_id, session_id, skip_cache, metadata)
            
            # Log error
            self._log_activity(
                provider, model_config.model if model_config else 'unknown',
                user_id, session_id, messages, None, None, 0,
                metadata, error=str(e)
            )
            
            raise e
    
    async def stream(
        self,
        messages: List[PromptMessage],
        provider: Optional[AIProvider] = None,
        model_config: Optional[ModelConfig] = None,
        user_id: str = 'default',
        on_chunk: Optional[Callable[[str], None]] = None
    ) -> AsyncGenerator[str, None]:
        """Stream completion"""
        provider = provider or self.current_provider
        
        # Check rate limits
        estimated_tokens = self._estimate_tokens(messages, provider)
        await self.rate_limiter.check_limit(user_id, estimated_tokens)
        
        ai_provider = self.providers.get(provider)
        if not ai_provider:
            raise ValueError(f"Provider {provider} not configured")
        
        async for chunk in ai_provider.stream(messages, model_config):
            if on_chunk:
                on_chunk(chunk)
            yield chunk
        
        # Record usage (estimated)
        self.rate_limiter.record_request(user_id, estimated_tokens)
    
    # Provider management
    def switch_provider(self, provider: AIProvider) -> None:
        """Switch current provider"""
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} not configured")
        self.current_provider = provider
    
    def update_model(self, model: str, provider: Optional[AIProvider] = None) -> None:
        """Update model for provider"""
        target_provider = provider or self.current_provider
        ai_provider = self.providers.get(target_provider)
        if not ai_provider:
            raise ValueError(f"Provider {target_provider} not configured")
        ai_provider.set_model(model)
    
    def get_available_models(self, provider: Optional[AIProvider] = None) -> List[str]:
        """Get available models"""
        target_provider = provider or self.current_provider
        ai_provider = self.providers.get(target_provider)
        if not ai_provider:
            raise ValueError(f"Provider {target_provider} not configured")
        return ai_provider.get_available_models()
    
    # Language management
    def set_language(self, language: str, locale: Optional[str] = None, timezone: Optional[str] = None) -> None:
        """Set language configuration"""
        self.language = LanguageConfig(language=language, locale=locale, timezone=timezone)
    
    # Template management
    def save_template(self, name: str, messages: List[PromptMessage]) -> None:
        """Save message template"""
        self.templates[name] = messages
    
    def get_template(self, name: str) -> Optional[List[PromptMessage]]:
        """Get message template"""
        return self.templates.get(name)
    
    def apply_template(self, name: str, variables: Dict[str, str]) -> List[PromptMessage]:
        """Apply template with variables"""
        template = self.templates.get(name)
        if not template:
            raise ValueError(f"Template {name} not found")
        
        result = []
        for msg in template:
            content = msg.content
            for key, value in variables.items():
                content = content.replace(f"{{{{{key}}}}}", value)
            result.append(PromptMessage(role=msg.role, content=content))
        
        return result
    
    # Reporting
    def get_activity_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        provider: Optional[AIProvider] = None,
        user_id: Optional[str] = None,
        group_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get activity report"""
        return self.logger.get_report(start_date, end_date, provider, user_id, group_by)
    
    def export_logs(self) -> List[ActivityLog]:
        """Export activity logs"""
        return self.logger.export()
    
    def import_logs(self, logs: List[ActivityLog]) -> None:
        """Import activity logs"""
        self.logger.import_logs(logs)
    
    # Usage tracking
    def get_usage(self, user_id: str) -> Dict[str, Any]:
        """Get user usage"""
        return {
            'quota': self.quota_manager.get_usage(user_id),
            'limits': {
                'requests': self.rate_limiter.requests.get(user_id, []),
            }
        }
    
    # Webhook management
    def register_webhook(self, event: str, callback: Callable) -> None:
        """Register webhook"""
        self.webhooks[event] = callback
    
    def _trigger_webhook(self, event: str, data: Any) -> None:
        """Trigger webhook"""
        callback = self.webhooks.get(event)
        if callback:
            callback(data)
    
    # Health checks
    async def _start_health_checks(self) -> None:
        """Start health checks"""
        while True:
            for provider, ai_provider in self.providers.items():
                try:
                    # Simple health check
                    ai_provider.validate_model(ai_provider.get_available_models()[0])
                    self.health_checks[provider] = True
                except:
                    self.health_checks[provider] = False
            
            await asyncio.sleep(60)  # Check every minute
    
    def get_health_status(self) -> Dict[AIProvider, bool]:
        """Get health status"""
        return self.health_checks.copy()
    
    # Circuit breaker
    def _is_circuit_open(self, provider: AIProvider) -> bool:
        """Check if circuit is open"""
        breaker = self.circuit_breaker.get(provider)
        if not breaker:
            return False
        
        # Reset if enough time has passed
        if breaker['open'] and time.time() - breaker['last_failure'] > 60:
            breaker['open'] = False
            breaker['failures'] = 0
        
        return breaker['open']
    
    def _record_circuit_breaker_failure(self, provider: AIProvider) -> None:
        """Record circuit breaker failure"""
        breaker = self.circuit_breaker.get(provider)
        if not breaker:
            return
        
        breaker['failures'] += 1
        breaker['last_failure'] = time.time()
        
        # Open circuit after 5 failures
        if breaker['failures'] >= 5:
            breaker['open'] = True
    
    def _reset_circuit_breaker(self, provider: AIProvider) -> None:
        """Reset circuit breaker"""
        breaker = self.circuit_breaker.get(provider)
        if breaker:
            breaker['failures'] = 0
            breaker['open'] = False
    
    # Fallback logic
    async def _try_fallback(
        self,
        messages: List[PromptMessage],
        original_provider: AIProvider,
        model_config: Optional[ModelConfig],
        user_id: str,
        session_id: Optional[str],
        skip_cache: bool,
        metadata: Optional[Dict[str, Any]]
    ) -> AIResponse:
        """Try fallback providers"""
        for fallback_provider in self.fallback_providers:
            if self.health_checks.get(fallback_provider) and not self._is_circuit_open(fallback_provider):
                try:
                    return await self.complete(
                        messages,
                        provider=fallback_provider,
                        model_config=model_config,
                        user_id=user_id,
                        session_id=session_id,
                        skip_cache=skip_cache,
                        metadata=metadata
                    )
                except:
                    continue
        
        raise Exception('All providers failed')
    
    # Retry logic
    async def _retry_with_backoff(self, fn: Callable, retries: Optional[int] = None) -> Any:
        """Retry with exponential backoff"""
        retries = retries or self.retry_config['max_retries']
        last_error = None
        
        for i in range(retries):
            try:
                return await fn()
            except Exception as e:
                last_error = e
                
                if hasattr(e, 'retryable') and not e.retryable:
                    raise e
                
                delay = self.retry_config['initial_delay_ms'] * (self.retry_config['backoff_multiplier'] ** i)
                await asyncio.sleep(delay / 1000)
        
        raise last_error
    
    # Content moderation
    async def _moderate_content(self, messages: List[PromptMessage]) -> None:
        """Moderate content"""
        for message in messages:
            if self._contains_prohibited_content(message.content):
                raise ValueError('Content violates usage policies')
    
    def _contains_prohibited_content(self, content: str) -> bool:
        """Check for prohibited content"""
        # Placeholder implementation
        prohibited = ['harmful', 'illegal', 'offensive']
        return any(word in content.lower() for word in prohibited)
    
    # Helper methods
    def _estimate_tokens(self, messages: List[PromptMessage], provider: AIProvider) -> int:
        """Estimate token count"""
        ai_provider = self.providers.get(provider)
        if not ai_provider:
            return 0
        
        text = ' '.join([m.content for m in messages])
        return ai_provider.calculate_tokens(text)
    
    def _log_activity(
        self,
        provider: AIProvider,
        model: str,
        user_id: str,
        session_id: Optional[str],
        messages: List[PromptMessage],
        response: Optional[AIResponse],
        token_usage: Optional[TokenUsage],
        latency: float,
        metadata: Optional[Dict[str, Any]],
        error: Optional[str] = None
    ) -> None:
        """Log activity"""
        self.logger.log(ActivityLog(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            provider=provider,
            model=model,
            user_id=user_id,
            session_id=session_id,
            prompt=messages,
            response=response,
            token_usage=token_usage,
            cost=token_usage.estimated_cost if token_usage else None,
            latency=latency,
            error=AIError(
                code='ERROR',
                message=error,
                provider=provider,
                retryable=True
            ) if error else None,
            metadata=metadata
        ))
    
    # RAG Integration
    async def initialize_rag(self, config: Dict[str, Any]) -> None:
        """Initialize RAG system"""
        # Import RAG manager (would be in separate file)
        # from rag_manager import RAGManager
        # self.rag_manager = RAGManager(config)
        # await self.rag_manager.initialize()
        pass
    
    async def add_rag_document(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        source: Optional[str] = None
    ) -> Any:
        """Add document to RAG"""
        if not self.rag_manager:
            raise ValueError('RAG not initialized. Call initialize_rag first.')
        # return await self.rag_manager.add_document(content, metadata, source)
        pass
    
    async def complete_with_rag(
        self,
        query: str,
        provider: Optional[AIProvider] = None,
        model_config: Optional[ModelConfig] = None,
        user_id: str = 'default',
        session_id: Optional[str] = None,
        filter: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        cite_sources: bool = False,
        max_context_tokens: Optional[int] = None,
        skip_cache: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Complete with RAG context"""
        if not self.rag_manager:
            raise ValueError('RAG not initialized. Call initialize_rag first.')
        
        # Implementation would call RAG manager and then complete
        # search_results = await self.rag_manager.search(query, filter)
        # context = self._build_context(search_results, max_context_tokens)
        # messages = [
        #     PromptMessage(role='system', content=system_prompt or 'Use context to answer'),
        #     PromptMessage(role='user', content=f'Context: {context}\n\nQuestion: {query}')
        # ]
        # response = await self.complete(messages, provider, model_config, user_id, session_id, skip_cache, metadata)
        # return {'answer': response.content, 'sources': search_results, 'citations': []}
        pass
    
    # Cleanup
    async def destroy(self) -> None:
        """Cleanup resources"""
        for provider in self.providers.values():
            await provider.cleanup()
        
        self.providers.clear()
        if self.cache:
            self.cache.clear()
        self.logger.clear()
        self.rate_limiter.reset()
        self.quota_manager.reset()
        self.webhooks.clear()
        self.templates.clear()


# Export main class and types
__all__ = [
    'AIManager',
    'AIProvider',
    'AIProviderConfig',
    'ModelConfig',
    'PromptMessage',
    'TokenUsage',
    'AIResponse',
    'AIError',
    'RateLimitConfig',
    'QuotaConfig',
    'LanguageConfig',
    'ActivityLog',
]
