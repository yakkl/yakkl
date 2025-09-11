# AI Manager - Setup & Configuration Guide

## Installation

### 1. Install Dependencies

```bash
# Core dependencies
npm install dotenv

# Optional: For better token counting
npm install tiktoken  # OpenAI tokenizer
npm install @anthropic-ai/tokenizer  # Anthropic tokenizer

# Optional: For OAuth support
npm install node-fetch

# For browser support (Google Nano)
# No additional dependencies needed - uses browser APIs
```

### 2. Environment Variables

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
```

## Configuration Options

### Rate Limiting Configuration

```typescript
const rateLimitConfig: RateLimitConfig = {
  maxRequestsPerMinute: 10,      // Max API calls per minute
  maxRequestsPerHour: 100,        // Max API calls per hour
  maxRequestsPerDay: 1000,        // Max API calls per day
  maxTokensPerMinute: 10000,      // Max tokens per minute
  maxTokensPerHour: 100000,       // Max tokens per hour
  maxTokensPerDay: 1000000,       // Max tokens per day
  debounceMs: 1000,               // Min time between requests (ms)
  burstLimit: 5,                  // Max concurrent requests
};
```

### Quota Configuration

```typescript
const quotaConfig: QuotaConfig = {
  maxTotalTokens: 1000000,        // Total token limit
  maxCostPerDay: 100,              // Daily cost limit ($)
  maxCostPerMonth: 3000,           // Monthly cost limit ($)
  warningThreshold: 80,            // Warning at X% usage
};
```

### Model Configurations

```typescript
const modelConfig: ModelConfig = {
  model: 'gpt-4-turbo-preview',   // Model identifier
  temperature: 0.7,                // Randomness (0-2)
  maxTokens: 1000,                 // Max response length
  topP: 0.9,                       // Nucleus sampling
  topK: 40,                        // Top-K sampling
  frequencyPenalty: 0,            // Reduce repetition
  presencePenalty: 0,             // Encourage new topics
  stopSequences: ['\n\n'],        // Stop generation triggers
  responseFormat: 'text',          // text | json | stream
  seed: 12345,                     // Reproducible outputs
};
```

## Provider-Specific Setup

### OpenAI Setup

```typescript
const openAIConfig: AIProviderConfig = {
  provider: AIProvider.OPENAI,
  apiKey: process.env.OPENAI_API_KEY,
  organizationId: process.env.OPENAI_ORG_ID,
  endpoint: 'https://api.openai.com/v1',  // Optional custom endpoint
  maxRetries: 3,
  timeout: 30000,
};

// Available models:
// - gpt-4-turbo-preview
// - gpt-4
// - gpt-3.5-turbo
// - gpt-3.5-turbo-16k
```

### Anthropic Setup

```typescript
const anthropicConfig: AIProviderConfig = {
  provider: AIProvider.ANTHROPIC,
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
  timeout: 60000,  // Claude can take longer
};

// Available models:
// - claude-3-opus-20240229
// - claude-3-sonnet-20240229
// - claude-3-haiku-20240307
```

### Google Setup

```typescript
// API Key authentication
const googleConfig: AIProviderConfig = {
  provider: AIProvider.GOOGLE,
  apiKey: process.env.GOOGLE_API_KEY,
};

// OAuth authentication
const googleOAuthConfig: AIProviderConfig = {
  provider: AIProvider.GOOGLE,
  oauth: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scope: ['https://www.googleapis.com/auth/generative-language'],
  },
};

// Available models:
// - gemini-2.0-flash-exp
// - gemini-1.5-pro
// - gemini-1.5-flash
```

### Google Nano (Browser) Setup

```typescript
// Only works in Chrome/Edge with AI features enabled
const googleNanoConfig: AIProviderConfig = {
  provider: AIProvider.GOOGLE_NANO,
  // No authentication needed - runs locally
};

// Check availability:
if (typeof window !== 'undefined' && 'ai' in window) {
  console.log('Google Nano is available');
}
```

## Advanced Features

### 1. Caching Strategy

```typescript
const cacheOptions = {
  cacheEnabled: true,
  cacheTTL: 3600,  // 1 hour in seconds
};

// Cache keys are generated from:
// - Provider
// - Model
// - Messages content
// - Model configuration
```

### 2. Fallback Providers

```typescript
const fallbackProviders = [
  AIProvider.ANTHROPIC,  // First fallback
  AIProvider.GOOGLE,     // Second fallback
];

// Fallback triggers on:
// - API errors
// - Rate limits
// - Provider outages
// - Circuit breaker activation
```

### 3. Circuit Breaker

```typescript
// Automatically configured with:
// - Opens after 5 consecutive failures
// - Resets after 60 seconds
// - Per-provider isolation
```

### 4. Content Moderation

```typescript
const options = {
  moderationEnabled: true,
};

// Checks for:
// - Harmful content
// - Policy violations
// - Inappropriate requests
```

### 5. Webhook Events

```typescript
// Available events:
aiManager.registerWebhook('completion', (data) => {});
aiManager.registerWebhook('error', (data) => {});
aiManager.registerWebhook('rateLimit', (data) => {});
aiManager.registerWebhook('quotaWarning', (data) => {});
```

## Performance Optimization

### 1. Token Optimization

```typescript
// Minimize token usage:
const optimizedConfig: ModelConfig = {
  model: 'gpt-3.5-turbo',  // Cheaper model
  maxTokens: 500,           // Limit response length
  temperature: 0.3,         // More focused responses
};
```

### 2. Batch Processing

```typescript
// Process multiple requests efficiently
async function batchProcess(queries: string[]) {
  const promises = queries.map((query, index) => 
    aiManager.complete(
      [{ role: 'user', content: query }],
      { 
        userId: `batch-${index}`,
        skipCache: false,  // Use cache
      }
    )
  );
  
  return Promise.allSettled(promises);
}
```

### 3. Streaming for Long Responses

```typescript
// Use streaming for real-time feedback
const stream = aiManager.stream(messages, {
  modelConfig: { maxTokens: 2000 },
  onChunk: (chunk) => {
    // Update UI immediately
    updateUI(chunk);
  },
});
```

## Security Best Practices

### 1. API Key Management

```typescript
// Never hardcode API keys
// Use environment variables or secure key management services

// For production:
const getApiKey = async (provider: string) => {
  // Fetch from secure vault
  return await keyVault.getSecret(`${provider}-api-key`);
};
```

### 2. User Authentication

```typescript
// Always pass userId for tracking
const response = await aiManager.complete(messages, {
  userId: authenticatedUser.id,
  sessionId: session.id,
  metadata: {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  },
});
```

### 3. Input Validation

```typescript
// Validate user input before processing
function validateInput(content: string): boolean {
  if (content.length > 10000) return false;
  if (containsSensitiveData(content)) return false;
  return true;
}
```

## Monitoring & Logging

### 1. Activity Reports

```typescript
// Daily report
const dailyReport = aiManager.getActivityReport({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date(),
  groupBy: 'provider',
});

// User-specific report
const userReport = aiManager.getActivityReport({
  userId: 'user123',
  groupBy: 'day',
});
```

### 2. Cost Monitoring

```typescript
// Set up cost alerts
aiManager.registerWebhook('quotaWarning', async (data) => {
  if (data.percentage > 90) {
    await sendAlert('Critical: 90% of quota used');
  }
});
```

### 3. Error Tracking

```typescript
// Log errors for analysis
aiManager.registerWebhook('error', (error) => {
  logger.error('AI Provider Error', {
    provider: error.provider,
    code: error.code,
    message: error.message,
    retryable: error.retryable,
  });
});
```

## Testing

### Unit Tests

```typescript
import { AIManager, MockProvider } from './ai-manager';

describe('AIManager', () => {
  it('should handle rate limiting', async () => {
    const manager = new AIManager(
      [{ provider: MockProvider }],
      { maxRequestsPerMinute: 1 }
    );
    
    await manager.complete([{ role: 'user', content: 'test' }]);
    
    await expect(
      manager.complete([{ role: 'user', content: 'test' }])
    ).rejects.toThrow('Rate limit exceeded');
  });
});
```

### Integration Tests

```typescript
// Test with real providers
it('should fallback to secondary provider', async () => {
  const manager = new AIManager(
    [failingProvider, workingProvider],
    {},
    { fallbackProviders: [workingProvider] }
  );
  
  const response = await manager.complete(messages);
  expect(response.provider).toBe(workingProvider);
});
```

## Troubleshooting

### Common Issues

1. **Rate Limit Errors**
   - Increase debounce time
   - Implement exponential backoff
   - Use multiple API keys

2. **Token Limit Exceeded**
   - Reduce maxTokens
   - Truncate input messages
   - Use summarization

3. **High Costs**
   - Use cheaper models for simple tasks
   - Enable caching
   - Implement quota limits

4. **Slow Response Times**
   - Use streaming for long responses
   - Implement timeouts
   - Cache frequent queries

5. **Provider Outages**
   - Configure fallback providers
   - Monitor health status
   - Implement circuit breakers

## Migration Guide

### From OpenAI SDK

```typescript
// Before (OpenAI SDK)
const openai = new OpenAI({ apiKey });
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages,
});

// After (AI Manager)
const aiManager = new AIManager([
  { provider: AIProvider.OPENAI, apiKey }
]);
const response = await aiManager.complete(messages, {
  modelConfig: { model: 'gpt-4' }
});
```

### From Anthropic SDK

```typescript
// Before (Anthropic SDK)
const anthropic = new Anthropic({ apiKey });
const response = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  messages,
});

// After (AI Manager)
const aiManager = new AIManager([
  { provider: AIProvider.ANTHROPIC, apiKey }
]);
const response = await aiManager.complete(messages, {
  modelConfig: { model: 'claude-3-opus-20240229' }
});
```

## Production Checklist

- [ ] API keys stored securely
- [ ] Rate limits configured appropriately
- [ ] Quotas set based on budget
- [ ] Fallback providers configured
- [ ] Caching enabled for production
- [ ] Monitoring webhooks set up
- [ ] Error logging configured
- [ ] Health checks running
- [ ] Content moderation enabled
- [ ] User authentication implemented
- [ ] Activity reporting scheduled
- [ ] Cost alerts configured
- [ ] Circuit breakers tested
- [ ] Retry logic verified
- [ ] Performance metrics tracked