# advanced_utils.py
"""
Advanced utilities and patterns for Python AI Manager
Production-ready helpers, decorators, and optimizations
"""

import asyncio
import functools
import hashlib
import json
import time
import pickle
from collections import deque, defaultdict
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, TypeVar, Generic
from enum import Enum
import aiohttp
import numpy as np
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


# ============== Async Utilities ==============

T = TypeVar('T')

class AsyncPool(Generic[T]):
    """Async connection pool for resource management"""
    
    def __init__(self, factory: Callable[[], T], max_size: int = 10):
        self.factory = factory
        self.max_size = max_size
        self.pool: deque[T] = deque()
        self.in_use: set[T] = set()
        self.lock = asyncio.Lock()
        self.not_empty = asyncio.Condition(self.lock)
    
    async def acquire(self) -> T:
        """Acquire resource from pool"""
        async with self.lock:
            while not self.pool and len(self.in_use) >= self.max_size:
                await self.not_empty.wait()
            
            if self.pool:
                resource = self.pool.popleft()
            else:
                resource = await self.factory()
            
            self.in_use.add(resource)
            return resource
    
    async def release(self, resource: T) -> None:
        """Release resource back to pool"""
        async with self.lock:
            self.in_use.discard(resource)
            if len(self.pool) < self.max_size:
                self.pool.append(resource)
                self.not_empty.notify()
            else:
                # Close excess resources
                if hasattr(resource, 'close'):
                    await resource.close()
    
    @asynccontextmanager
    async def get(self):
        """Context manager for resource acquisition"""
        resource = await self.acquire()
        try:
            yield resource
        finally:
            await self.release(resource)


class AsyncBatcher:
    """Batch async operations for efficiency"""
    
    def __init__(
        self,
        batch_size: int = 100,
        batch_timeout: float = 1.0,
        processor: Optional[Callable] = None
    ):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.processor = processor
        self.queue: asyncio.Queue = asyncio.Queue()
        self.results: Dict[str, asyncio.Future] = {}
        self.running = False
        self.task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the batcher"""
        if not self.running:
            self.running = True
            self.task = asyncio.create_task(self._process_batches())
    
    async def stop(self):
        """Stop the batcher"""
        self.running = False
        if self.task:
            await self.task
    
    async def add(self, item: Any) -> Any:
        """Add item to batch and wait for result"""
        item_id = str(id(item))
        future = asyncio.get_event_loop().create_future()
        self.results[item_id] = future
        await self.queue.put((item_id, item))
        return await future
    
    async def _process_batches(self):
        """Process batches continuously"""
        while self.running:
            batch = []
            batch_ids = []
            
            try:
                # Collect batch
                deadline = asyncio.get_event_loop().time() + self.batch_timeout
                
                while len(batch) < self.batch_size:
                    timeout = max(0, deadline - asyncio.get_event_loop().time())
                    
                    try:
                        item_id, item = await asyncio.wait_for(
                            self.queue.get(),
                            timeout=timeout
                        )
                        batch.append(item)
                        batch_ids.append(item_id)
                    except asyncio.TimeoutError:
                        break
                
                if batch and self.processor:
                    # Process batch
                    try:
                        results = await self.processor(batch)
                        
                        # Distribute results
                        for item_id, result in zip(batch_ids, results):
                            if item_id in self.results:
                                self.results[item_id].set_result(result)
                                del self.results[item_id]
                    
                    except Exception as e:
                        # Handle errors
                        for item_id in batch_ids:
                            if item_id in self.results:
                                self.results[item_id].set_exception(e)
                                del self.results[item_id]
            
            except Exception as e:
                print(f"Batcher error: {e}")
                await asyncio.sleep(1)


# ============== Caching Utilities ==============

class HierarchicalCache:
    """Multi-level cache with L1 (memory) and L2 (disk/redis)"""
    
    def __init__(
        self,
        l1_size: int = 1000,
        l1_ttl: int = 300,
        l2_backend: Optional[Any] = None
    ):
        self.l1_cache: Dict[str, Tuple[Any, float]] = {}
        self.l1_size = l1_size
        self.l1_ttl = l1_ttl
        self.l2_backend = l2_backend
        self.access_count: Dict[str, int] = defaultdict(int)
        self.lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get from cache"""
        # Check L1
        async with self.lock:
            if key in self.l1_cache:
                value, timestamp = self.l1_cache[key]
                if time.time() - timestamp < self.l1_ttl:
                    self.access_count[key] += 1
                    return value
                else:
                    del self.l1_cache[key]
        
        # Check L2
        if self.l2_backend:
            value = await self.l2_backend.get(key)
            if value:
                # Promote to L1
                await self._promote_to_l1(key, value)
                return value
        
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set in cache"""
        ttl = ttl or self.l1_ttl
        
        # Set in L1
        async with self.lock:
            self.l1_cache[key] = (value, time.time())
            self._evict_if_needed()
        
        # Set in L2
        if self.l2_backend:
            await self.l2_backend.set(key, value, ttl)
    
    async def _promote_to_l1(self, key: str, value: Any) -> None:
        """Promote value to L1 cache"""
        async with self.lock:
            self.l1_cache[key] = (value, time.time())
            self._evict_if_needed()
    
    def _evict_if_needed(self) -> None:
        """Evict least recently used items if cache is full"""
        if len(self.l1_cache) > self.l1_size:
            # Sort by access count and timestamp
            items = sorted(
                self.l1_cache.items(),
                key=lambda x: (self.access_count[x[0]], x[1][1])
            )
            
            # Evict least used/oldest
            for key, _ in items[:len(self.l1_cache) - self.l1_size]:
                del self.l1_cache[key]
                self.access_count.pop(key, None)


# ============== Retry and Circuit Breaker ==============

class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    class State(Enum):
        CLOSED = "closed"
        OPEN = "open"
        HALF_OPEN = "half_open"
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = self.State.CLOSED
        self.lock = asyncio.Lock()
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker"""
        async with self.lock:
            if self.state == self.State.OPEN:
                if self._should_attempt_reset():
                    self.state = self.State.HALF_OPEN
                else:
                    raise Exception(f"Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        
        except self.expected_exception as e:
            await self._on_failure()
            raise e
    
    async def _on_success(self) -> None:
        """Handle successful call"""
        async with self.lock:
            self.failure_count = 0
            self.state = self.State.CLOSED
    
    async def _on_failure(self) -> None:
        """Handle failed call"""
        async with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = self.State.OPEN
    
    def _should_attempt_reset(self) -> bool:
        """Check if should attempt reset"""
        return (
            self.last_failure_time and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )


def with_circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: int = 60
):
    """Decorator for circuit breaker"""
    def decorator(func):
        breaker = CircuitBreaker(failure_threshold, recovery_timeout)
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await breaker.call(func, *args, **kwargs)
        
        return wrapper
    return decorator


# ============== Rate Limiting ==============

class TokenBucket:
    """Token bucket rate limiter"""
    
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.time()
        self.lock = asyncio.Lock()
    
    async def acquire(self, tokens: int = 1) -> bool:
        """Acquire tokens from bucket"""
        async with self.lock:
            self._refill()
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            
            return False
    
    async def acquire_with_wait(self, tokens: int = 1) -> None:
        """Acquire tokens, waiting if necessary"""
        while not await self.acquire(tokens):
            await asyncio.sleep(0.1)
    
    def _refill(self) -> None:
        """Refill tokens based on elapsed time"""
        now = time.time()
        elapsed = now - self.last_refill
        tokens_to_add = elapsed * self.refill_rate
        
        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
        self.last_refill = now


class SlidingWindowRateLimiter:
    """Sliding window rate limiter"""
    
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: deque[float] = deque()
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> bool:
        """Check if request is allowed"""
        async with self.lock:
            now = time.time()
            
            # Remove old requests
            while self.requests and self.requests[0] < now - self.window_seconds:
                self.requests.popleft()
            
            # Check if allowed
            if len(self.requests) < self.max_requests:
                self.requests.append(now)
                return True
            
            return False
    
    async def wait_time(self) -> float:
        """Get time to wait before next request"""
        async with self.lock:
            if not self.requests:
                return 0.0
            
            oldest = self.requests[0]
            wait = (oldest + self.window_seconds) - time.time()
            return max(0, wait)


# ============== Monitoring and Metrics ==============

@dataclass
class Metric:
    """Performance metric"""
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str] = None


class MetricsCollector:
    """Collect and aggregate metrics"""
    
    def __init__(self, flush_interval: int = 60):
        self.metrics: List[Metric] = []
        self.flush_interval = flush_interval
        self.lock = asyncio.Lock()
        self.running = False
        self.task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start metrics collection"""
        if not self.running:
            self.running = True
            self.task = asyncio.create_task(self._flush_periodically())
    
    async def stop(self):
        """Stop metrics collection"""
        self.running = False
        if self.task:
            await self.task
    
    async def record(
        self,
        name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ):
        """Record a metric"""
        async with self.lock:
            self.metrics.append(Metric(
                name=name,
                value=value,
                timestamp=datetime.now(),
                tags=tags or {}
            ))
    
    async def _flush_periodically(self):
        """Flush metrics periodically"""
        while self.running:
            await asyncio.sleep(self.flush_interval)
            await self.flush()
    
    async def flush(self):
        """Flush metrics to backend"""
        async with self.lock:
            if not self.metrics:
                return
            
            # Aggregate metrics
            aggregated = self._aggregate_metrics(self.metrics)
            
            # Send to backend (implement your backend here)
            # await self._send_to_backend(aggregated)
            
            # Clear metrics
            self.metrics.clear()
    
    def _aggregate_metrics(self, metrics: List[Metric]) -> Dict[str, Any]:
        """Aggregate metrics by name"""
        aggregated = defaultdict(lambda: {
            'count': 0,
            'sum': 0,
            'min': float('inf'),
            'max': float('-inf'),
            'values': []
        })
        
        for metric in metrics:
            agg = aggregated[metric.name]
            agg['count'] += 1
            agg['sum'] += metric.value
            agg['min'] = min(agg['min'], metric.value)
            agg['max'] = max(agg['max'], metric.value)
            agg['values'].append(metric.value)
        
        # Calculate percentiles
        for name, agg in aggregated.items():
            values = np.array(agg['values'])
            agg['mean'] = np.mean(values)
            agg['median'] = np.median(values)
            agg['p95'] = np.percentile(values, 95)
            agg['p99'] = np.percentile(values, 99)
            del agg['values']  # Remove raw values
        
        return dict(aggregated)


def measure_time(metrics_collector: MetricsCollector):
    """Decorator to measure function execution time"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = (time.time() - start_time) * 1000  # Convert to ms
                await metrics_collector.record(
                    f"{func.__name__}_duration",
                    duration,
                    tags={'function': func.__name__}
                )
        return wrapper
    return decorator


# ============== Data Pipeline ==============

class DataPipeline:
    """Async data processing pipeline"""
    
    def __init__(self):
        self.stages: List[Callable] = []
    
    def add_stage(self, func: Callable) -> 'DataPipeline':
        """Add processing stage"""
        self.stages.append(func)
        return self
    
    async def process(self, data: Any) -> Any:
        """Process data through pipeline"""
        result = data
        for stage in self.stages:
            if asyncio.iscoroutinefunction(stage):
                result = await stage(result)
            else:
                result = stage(result)
        return result
    
    async def process_batch(self, data_list: List[Any]) -> List[Any]:
        """Process batch of data"""
        tasks = [self.process(data) for data in data_list]
        return await asyncio.gather(*tasks)


# ============== Session Management ==============

class SessionManager:
    """Manage user sessions with timeout"""
    
    def __init__(self, timeout_seconds: int = 3600):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.timeout_seconds = timeout_seconds
        self.lock = asyncio.Lock()
        self.cleanup_task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start session manager"""
        if not self.cleanup_task:
            self.cleanup_task = asyncio.create_task(self._cleanup_expired())
    
    async def stop(self):
        """Stop session manager"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            await asyncio.gather(self.cleanup_task, return_exceptions=True)
    
    async def create_session(self, user_id: str, data: Dict[str, Any] = None) -> str:
        """Create new session"""
        session_id = hashlib.sha256(
            f"{user_id}:{time.time()}".encode()
        ).hexdigest()
        
        async with self.lock:
            self.sessions[session_id] = {
                'user_id': user_id,
                'created_at': time.time(),
                'last_accessed': time.time(),
                'data': data or {}
            }
        
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        async with self.lock:
            session = self.sessions.get(session_id)
            if session:
                session['last_accessed'] = time.time()
                return session
            return None
    
    async def update_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """Update session data"""
        async with self.lock:
            if session_id in self.sessions:
                self.sessions[session_id]['data'].update(data)
                self.sessions[session_id]['last_accessed'] = time.time()
                return True
            return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session"""
        async with self.lock:
            if session_id in self.sessions:
                del self.sessions[session_id]
                return True
            return False
    
    async def _cleanup_expired(self):
        """Clean up expired sessions"""
        while True:
            await asyncio.sleep(60)  # Check every minute
            
            async with self.lock:
                now = time.time()
                expired = [
                    session_id
                    for session_id, session in self.sessions.items()
                    if now - session['last_accessed'] > self.timeout_seconds
                ]
                
                for session_id in expired:
                    del self.sessions[session_id]


# ============== Validation Utilities ==============

class InputValidator:
    """Input validation utilities"""
    
    @staticmethod
    def validate_prompt(prompt: str, max_length: int = 10000) -> bool:
        """Validate prompt input"""
        if not prompt or not isinstance(prompt, str):
            return False
        
        if len(prompt) > max_length:
            return False
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script',
            r'javascript:',
            r'data:text/html',
            r'vbscript:',
            r'file://',
        ]
        
        import re
        for pattern in suspicious_patterns:
            if re.search(pattern, prompt, re.IGNORECASE):
                return False
        
        return True
    
    @staticmethod
    def sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize metadata dictionary"""
        sanitized = {}
        
        for key, value in metadata.items():
            # Sanitize key
            if not isinstance(key, str) or len(key) > 100:
                continue
            
            # Sanitize value based on type
            if isinstance(value, (str, int, float, bool)):
                sanitized[key] = value
            elif isinstance(value, list):
                sanitized[key] = [
                    v for v in value
                    if isinstance(v, (str, int, float, bool))
                ][:100]  # Limit list size
            elif isinstance(value, dict):
                sanitized[key] = InputValidator.sanitize_metadata(value)
        
        return sanitized


# ============== Export Functions ==============

async def export_to_file(data: Any, filepath: str, format: str = 'json'):
    """Export data to file"""
    import aiofiles
    
    if format == 'json':
        content = json.dumps(data, indent=2, default=str)
    elif format == 'pickle':
        content = pickle.dumps(data)
    else:
        raise ValueError(f"Unsupported format: {format}")
    
    async with aiofiles.open(filepath, 'wb' if format == 'pickle' else 'w') as f:
        await f.write(content)


async def import_from_file(filepath: str, format: str = 'json') -> Any:
    """Import data from file"""
    import aiofiles
    
    async with aiofiles.open(filepath, 'rb' if format == 'pickle' else 'r') as f:
        content = await f.read()
    
    if format == 'json':
        return json.loads(content)
    elif format == 'pickle':
        return pickle.loads(content)
    else:
        raise ValueError(f"Unsupported format: {format}")


# ============== Testing Utilities ==============

class MockAIProvider:
    """Mock AI provider for testing"""
    
    def __init__(self, responses: List[str] = None):
        self.responses = responses or ["Mock response"]
        self.call_count = 0
    
    async def complete(self, messages: List[Any], **kwargs) -> Any:
        """Mock completion"""
        response = self.responses[self.call_count % len(self.responses)]
        self.call_count += 1
        
        return {
            'content': response,
            'token_usage': {
                'prompt_tokens': 10,
                'completion_tokens': 20,
                'total_tokens': 30
            },
            'model': 'mock-model',
            'latency': 100
        }


# Export all utilities
__all__ = [
    'AsyncPool',
    'AsyncBatcher',
    'HierarchicalCache',
    'CircuitBreaker',
    'with_circuit_breaker',
    'TokenBucket',
    'SlidingWindowRateLimiter',
    'MetricsCollector',
    'measure_time',
    'DataPipeline',
    'SessionManager',
    'InputValidator',
    'export_to_file',
    'import_from_file',
    'MockAIProvider',
]
