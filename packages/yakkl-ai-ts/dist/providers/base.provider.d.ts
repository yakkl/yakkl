/**
 * Base AI Provider class
 */
import { AIProviderConfig, AIError } from '../types/providers';
import { ModelConfig, PromptMessage, TokenUsage, AIResponse } from '../types/models';
export declare abstract class BaseAIProvider {
    protected config: AIProviderConfig;
    protected modelConfig: ModelConfig;
    protected headers: Record<string, string>;
    protected tokenizer?: any;
    constructor(config: AIProviderConfig);
    /**
     * Initialize authentication headers
     */
    protected abstract initializeAuth(): void;
    /**
     * Complete a prompt with the AI model
     */
    abstract complete(messages: PromptMessage[], modelConfig?: ModelConfig): Promise<AIResponse>;
    /**
     * Stream a response from the AI model
     */
    abstract stream(messages: PromptMessage[], modelConfig?: ModelConfig): AsyncGenerator<string, void, unknown>;
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
    setModel(model: string): void;
    /**
     * Update model configuration
     */
    updateConfig(config: Partial<ModelConfig>): void;
    /**
     * Refresh OAuth token if needed
     */
    protected refreshOAuthToken(): Promise<void>;
    /**
     * Handle API errors consistently
     */
    protected handleError(error: any): AIError;
    /**
     * Determine if an error is retryable
     */
    protected isRetryableError(error: any): boolean;
}
//# sourceMappingURL=base.provider.d.ts.map