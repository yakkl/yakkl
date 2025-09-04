/**
 * Base AI Provider class
 */

import { 
  AIProviderConfig, 
  AIError
} from '../types/providers';
import { 
  ModelConfig, 
  PromptMessage, 
  TokenUsage, 
  AIResponse 
} from '../types/models';

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  protected modelConfig: ModelConfig;
  protected headers: Record<string, string> = {};
  protected tokenizer?: any;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.modelConfig = { model: "default" };
    this.initializeAuth();
  }

  /**
   * Initialize authentication headers
   */
  protected abstract initializeAuth(): void;

  /**
   * Complete a prompt with the AI model
   */
  abstract complete(
    messages: PromptMessage[],
    modelConfig?: ModelConfig
  ): Promise<AIResponse>;

  /**
   * Stream a response from the AI model
   */
  abstract stream(
    messages: PromptMessage[],
    modelConfig?: ModelConfig
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Calculate token count for text
   */
  abstract calculateTokens(text: string): number;

  /**
   * Estimate cost for token usage
   */
  abstract estimateCost(tokens: TokenUsage): number;

  /**
   * Get list of available models
   */
  abstract getAvailableModels(): string[];

  /**
   * Validate if a model is supported
   */
  abstract validateModel(model: string): boolean;

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    if (!this.validateModel(model)) {
      throw new Error(
        `Invalid model ${model} for provider ${this.config.provider}`
      );
    }
    this.modelConfig.model = model;
  }

  /**
   * Update model configuration
   */
  updateConfig(config: Partial<ModelConfig>): void {
    this.modelConfig = { ...this.modelConfig, ...config };
  }

  /**
   * Refresh OAuth token if needed
   */
  protected async refreshOAuthToken(): Promise<void> {
    if (!this.config.oauth) return;

    const response = await fetch(this.config.oauth.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.config.oauth.refreshToken!,
        client_id: this.config.oauth.clientId,
        client_secret: this.config.oauth.clientSecret,
      }),
    });

    const data = await response.json();
    this.config.oauth.accessToken = data.access_token;
    if (data.refresh_token) {
      this.config.oauth.refreshToken = data.refresh_token;
    }
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: any): AIError {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      provider: this.config.provider,
      retryable: this.isRetryableError(error),
      details: error
    };
  }

  /**
   * Determine if an error is retryable
   */
  protected isRetryableError(error: any): boolean {
    const retryableCodes = ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
    return retryableCodes.includes(error.code) || error.status >= 500;
  }
}