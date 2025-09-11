// usage-example.ts
import AIManager, {
  AIProvider,
  AIProviderConfig,
  RateLimitConfig,
  QuotaConfig,
  PromptMessage,
} from "./ai-manager";

// 1. Initialize the AI Manager with multiple providers
const aiManager = new AIManager(
  [
    // OpenAI Configuration
    {
      provider: AIProvider.OPENAI,
      apiKey: process.env.OPENAI_API_KEY,
      organizationId: process.env.OPENAI_ORG_ID,
      maxRetries: 3,
      timeout: 30000,
    },
    // Anthropic Configuration
    {
      provider: AIProvider.ANTHROPIC,
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    // Google Configuration
    {
      provider: AIProvider.GOOGLE,
      apiKey: process.env.GOOGLE_API_KEY,
    },
    // Google Nano (Browser-based)
    {
      provider: AIProvider.GOOGLE_NANO,
      // No API key needed for Nano
    },
  ],
  // Rate Limiting Configuration
  {
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 100,
    maxRequestsPerDay: 1000,
    maxTokensPerMinute: 10000,
    maxTokensPerHour: 100000,
    debounceMs: 1000, // 1 second between requests
    burstLimit: 5,
  },
  // Quota Configuration
  {
    maxTotalTokens: 1000000,
    maxCostPerDay: 100,
    maxCostPerMonth: 3000,
    warningThreshold: 80, // Warn at 80% usage
  },
  // Options
  {
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour cache
    fallbackProviders: [AIProvider.ANTHROPIC, AIProvider.GOOGLE],
    moderationEnabled: true,
  }
);

// 2. Basic completion example
async function basicCompletion() {
  const messages: PromptMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" },
  ];

  try {
    const response = await aiManager.complete(messages, {
      userId: "user123",
      sessionId: "session456",
      modelConfig: {
        model: "gpt-4-turbo-preview",
        temperature: 0.7,
        maxTokens: 150,
      },
    });

    console.log("Response:", response.content);
    console.log("Tokens used:", response.tokenUsage);
    console.log("Estimated cost:", response.tokenUsage.estimatedCost);
    console.log("Latency:", response.latency, "ms");
  } catch (error) {
    console.error("Error:", error);
  }
}

// 3. Streaming example
async function streamingExample() {
  const messages: PromptMessage[] = [
    { role: "user", content: "Tell me a story about a robot." },
  ];

  const stream = aiManager.stream(messages, {
    provider: AIProvider.OPENAI,
    userId: "user123",
    modelConfig: {
      model: "gpt-3.5-turbo",
      temperature: 0.8,
    },
    onChunk: (chunk) => {
      process.stdout.write(chunk); // Print each chunk as it arrives
    },
  });

  for await (const chunk of stream) {
    // Process streaming chunks
  }
}

// 4. Using Google Nano (browser-only)
async function googleNanoExample() {
  // This only works in browser environment
  if (typeof window !== "undefined" && "ai" in window) {
    aiManager.switchProvider(AIProvider.GOOGLE_NANO);

    const response = await aiManager.complete(
      [{ role: "user", content: "Summarize this text: ..." }],
      {
        userId: "browser-user",
        modelConfig: {
          model: "nano",
          temperature: 0.5,
        },
      }
    );

    console.log("Nano response:", response);
    // Note: cost will be 0 as Nano runs locally
  }
}

// 5. Template management
async function templateExample() {
  // Save a template
  aiManager.saveTemplate("customer-support", [
    {
      role: "system",
      content:
        "You are a customer support agent for {{company}}. Be helpful and professional.",
    },
    {
      role: "user",
      content: "{{customerQuery}}",
    },
  ]);

  // Use the template
  const messages = aiManager.applyTemplate("customer-support", {
    company: "TechCorp",
    customerQuery: "How do I reset my password?",
  });

  const response = await aiManager.complete(messages);
  console.log("Template response:", response.content);
}

// 6. Multi-provider fallback
async function fallbackExample() {
  // Primary provider is OpenAI, but will fallback to Anthropic or Google
  const response = await aiManager.complete(
    [{ role: "user", content: "What is quantum computing?" }],
    {
      provider: AIProvider.OPENAI,
      userId: "user123",
    }
  );

  // If OpenAI fails, it automatically tries Anthropic, then Google
  console.log("Response from:", response.provider);
}

// 7. Language configuration
function languageExample() {
  // Set to French
  aiManager.setLanguage("fr", "fr-FR", "Europe/Paris");

  // Set to Japanese
  aiManager.setLanguage("ja", "ja-JP", "Asia/Tokyo");

  // Back to English
  aiManager.setLanguage("en", "en-US", "America/New_York");
}

// 8. Webhook registration
function webhookExample() {
  // Register a webhook for completion events
  aiManager.registerWebhook("completion", (data) => {
    console.log("Completion webhook:", {
      provider: data.provider,
      userId: data.userId,
      tokens: data.response.tokenUsage.totalTokens,
      cost: data.response.tokenUsage.estimatedCost,
    });

    // Send to analytics service
    // analyticsService.track('ai_completion', data);
  });
}

// 9. Reporting and analytics
async function reportingExample() {
  // Get activity report for last 7 days
  const report = aiManager.getActivityReport({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    groupBy: "provider",
  });

  console.log("Weekly Report:", {
    totalRequests: report.totalRequests,
    totalTokens: report.totalTokens,
    totalCost: report.totalCost,
    averageLatency: report.averageLatency,
    errors: report.errors,
    byProvider: report.grouped,
  });

  // Get user-specific usage
  const userUsage = aiManager.getUsage("user123");
  console.log("User usage:", userUsage);

  // Export logs for external analysis
  const logs = aiManager.exportLogs();
  // Save to database or file
  // await saveToDatabase(logs);
}

// 10. Model management
function modelManagement() {
  // Get available models for current provider
  const models = aiManager.getAvailableModels();
  console.log("Available models:", models);

  // Switch model
  aiManager.updateModel("gpt-4");

  // Get models for specific provider
  const anthropicModels = aiManager.getAvailableModels(AIProvider.ANTHROPIC);
  console.log("Anthropic models:", anthropicModels);

  // Switch provider and model
  aiManager.switchProvider(AIProvider.ANTHROPIC);
  aiManager.updateModel("claude-3-opus-20240229");
}

// 11. Health monitoring
function healthMonitoring() {
  // Get health status of all providers
  const health = aiManager.getHealthStatus();

  health.forEach((isHealthy, provider) => {
    console.log(`${provider}: ${isHealthy ? "Healthy" : "Unhealthy"}`);
  });

  // Set up quota warning handler
  const quotaManager = aiManager["quotaManager"]; // Access private member for demo
  quotaManager.onWarning("user123", (usage) => {
    console.warn(`User ${usage.userId} at ${usage.percentage}% of quota!`);
    // Send alert email
    // emailService.sendQuotaWarning(usage);
  });
}

// 12. Advanced error handling with circuit breaker
async function advancedErrorHandling() {
  try {
    const response = await aiManager.complete(
      [{ role: "user", content: "Complex query here..." }],
      {
        userId: "user123",
        provider: AIProvider.OPENAI,
      }
    );

    console.log("Success:", response);
  } catch (error: any) {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      console.log("Rate limit hit, waiting...");
      // Implement backoff strategy
    } else if (error.code === "QUOTA_EXCEEDED") {
      console.log("Quota exceeded, upgrade plan");
      // Notify user to upgrade
    } else if (error.retryable) {
      console.log("Retryable error, will retry automatically");
      // Already handled by the manager
    } else {
      console.error("Fatal error:", error);
    }
  }
}

// 13. OAuth flow example
async function oauthExample() {
  const oauthConfig: AIProviderConfig = {
    provider: AIProvider.GOOGLE,
    oauth: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      scope: ["https://www.googleapis.com/auth/generative-language"],
    },
  };

  // Manager will automatically refresh tokens as needed
  const manager = new AIManager([oauthConfig], {}, {});

  const response = await manager.complete([
    { role: "user", content: "Hello!" },
  ]);

  console.log("OAuth response:", response);
}

// 14. Batch processing with rate limiting
async function batchProcessing() {
  const queries = [
    "What is AI?",
    "Explain machine learning",
    "What is deep learning?",
    "Describe neural networks",
    "What is NLP?",
  ];

  const results = [];

  for (const query of queries) {
    try {
      const response = await aiManager.complete(
        [{ role: "user", content: query }],
        {
          userId: "batch-user",
          skipCache: false, // Use cache for repeated queries
        }
      );

      results.push({
        query,
        response: response.content,
        tokens: response.tokenUsage.totalTokens,
      });

      // Rate limiting is automatically handled
    } catch (error) {
      console.error(`Failed for query "${query}":`, error);
    }
  }

  console.log("Batch results:", results);
}

// 15. Clean up
function cleanup() {
  // Clean up resources
  aiManager.destroy();
  console.log("AI Manager cleaned up");
}

// Main execution
async function main() {
  console.log("AI Manager Examples");
  console.log("==================");

  await basicCompletion();
  await templateExample();
  await reportingExample();

  // Run other examples as needed

  cleanup();
}

// Run examples
if (require.main === module) {
  main().catch(console.error);
}

export {
  aiManager,
  basicCompletion,
  streamingExample,
  googleNanoExample,
  templateExample,
  fallbackExample,
  reportingExample,
};
