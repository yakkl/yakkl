/**
 * Model and response type definitions for YAKKL AI Library
 */
import { AIProvider, AIError } from './providers';
export interface ModelConfig {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    responseFormat?: "text" | "json" | "stream";
    seed?: number;
}
export interface PromptMessage {
    role: "system" | "user" | "assistant" | "function";
    content: string;
    name?: string;
    functionCall?: any;
}
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
    estimatedCost?: number;
}
export interface AIResponse {
    id: string;
    provider: AIProvider;
    model: string;
    content: string;
    tokenUsage: TokenUsage;
    timestamp: Date;
    latency: number;
    metadata?: Record<string, any>;
    cached?: boolean;
    error?: AIError;
}
export interface ActivityLog {
    id: string;
    timestamp: Date;
    provider: AIProvider;
    model: string;
    userId?: string;
    sessionId?: string;
    prompt: PromptMessage[];
    response: AIResponse;
    tokenUsage: TokenUsage;
    cost?: number;
    latency: number;
    error?: AIError;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=models.d.ts.map