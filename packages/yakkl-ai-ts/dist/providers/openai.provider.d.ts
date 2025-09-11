/**
 * OpenAI Provider implementation
 */
import { BaseAIProvider } from './base.provider';
import { ModelConfig, PromptMessage, TokenUsage, AIResponse } from '../types/models';
export declare class OpenAIProvider extends BaseAIProvider {
    protected initializeAuth(): void;
    complete(messages: PromptMessage[], modelConfig?: ModelConfig): Promise<AIResponse>;
    stream(messages: PromptMessage[], modelConfig?: ModelConfig): AsyncGenerator<string, void, unknown>;
    calculateTokens(text: string): number;
    estimateCost(tokens: TokenUsage): number;
    getAvailableModels(): string[];
    validateModel(model: string): boolean;
    /**
     * OpenAI-specific: List fine-tuned models
     */
    listFineTunedModels(): Promise<string[]>;
}
//# sourceMappingURL=openai.provider.d.ts.map