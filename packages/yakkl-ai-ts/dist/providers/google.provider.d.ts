/**
 * Google (Gemini) Provider implementation
 * Supports both Gemini API and Google Nano (local browser AI)
 */
import { BaseAIProvider } from './base.provider';
import { ModelConfig, PromptMessage, TokenUsage, AIResponse } from '../types/models';
export declare class GoogleProvider extends BaseAIProvider {
    private isNano;
    constructor(config: any);
    protected initializeAuth(): void;
    complete(messages: PromptMessage[], modelConfig?: ModelConfig): Promise<AIResponse>;
    private completeWithNano;
    stream(messages: PromptMessage[], modelConfig?: ModelConfig): AsyncGenerator<string, void, unknown>;
    private convertMessagesToGeminiFormat;
    private convertMessagesToPrompt;
    calculateTokens(text: string): number;
    estimateCost(tokens: TokenUsage): number;
    getAvailableModels(): string[];
    validateModel(model: string): boolean;
}
//# sourceMappingURL=google.provider.d.ts.map