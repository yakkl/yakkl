// Initialize AI Manager with query preprocessing
const aiManager = new AIManager(configs, rateLimitConfig, quotaConfig);

// Initialize query preprocessor
aiManager.initializeQueryPreprocessor({
  enableTypoCorrection: true,
  enableExpansion: true,
  enableHyde: true,
  maxQueries: 3,
  provider: AIProvider.OPENAI,
  modelConfig: { model: "gpt-3.5-turbo", temperature: 0.3 },
});

// Use preprocessing with completion
const response = await aiManager.completeWithPreprocessing(
  "how do i rest my passwrd", // Note the typos
  {
    userId: "user123",
    context: {
      previousMessages: conversationHistory,
      userProfile: {
        id: "user123",
        expertiseLevel: "beginner",
      },
    },
    combineResults: false, // Return best single response
  }
);

// Get preprocessing statistics
const stats = aiManager.getQueryPreprocessor()?.getTransformationStats();
console.log("Query transformations:", stats);

// Add domain-specific patterns
aiManager.getQueryPreprocessor()?.addPattern("api_error", {
  pattern: /api.*(error|fail)/i,
  transformation: (query) => [
    query,
    `${query} status code`,
    `${query} endpoint debugging`,
    `REST API ${query}`,
  ],
  priority: 1,
  category: "api",
});
