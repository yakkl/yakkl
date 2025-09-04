/**
 * Anthropic (Claude) Provider implementation
 */
import { BaseAIProvider } from './base.provider';
import { ModelConfig, PromptMessage, TokenUsage, AIResponse } from '../types/models';
export declare class AnthropicProvider extends BaseAIProvider {
    protected initializeAuth(): void;
    complete(messages: PromptMessage[], modelConfig?: ModelConfig): Promise<AIResponse>;
    stream(messages: PromptMessage[], modelConfig?: ModelConfig): AsyncGenerator<string, void, unknown>;
    calculateTokens(text: string): number;
    estimateCost(tokens: TokenUsage): number;
    getAvailableModels(): string[];
    validateModel(model: string): boolean;
    /**
     * Format messages for Anthropic API (excludes system messages)
     */
    private formatMessages;
    /**
     * Extract system prompt from messages
     */
    private extractSystemPrompt;
}
//# sourceMappingURL=anthropic.provider.d.ts.map