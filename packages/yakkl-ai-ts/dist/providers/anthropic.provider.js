"use strict";
/**
 * Anthropic (Claude) Provider implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const base_provider_1 = require("./base.provider");
const providers_1 = require("../types/providers");
class AnthropicProvider extends base_provider_1.BaseAIProvider {
    initializeAuth() {
        if (this.config.apiKey) {
            this.headers["x-api-key"] = this.config.apiKey;
            this.headers["anthropic-version"] = "2023-06-01";
        }
    }
    async complete(messages, modelConfig) {
        const config = { ...this.modelConfig, ...modelConfig };
        const startTime = Date.now();
        try {
            const response = await fetch(this.config.endpoint || "https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    ...this.headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: config.model || "claude-3-opus-20240229",
                    messages: this.formatMessages(messages),
                    system: this.extractSystemPrompt(messages),
                    max_tokens: config.maxTokens || 4096,
                    temperature: config.temperature,
                    top_p: config.topP,
                    top_k: config.topK,
                    stop_sequences: config.stopSequences,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw this.handleError(error);
            }
            const data = await response.json();
            return {
                id: data.id,
                provider: providers_1.AIProvider.ANTHROPIC,
                model: data.model,
                content: data.content[0].text,
                tokenUsage: {
                    promptTokens: data.usage.input_tokens,
                    completionTokens: data.usage.output_tokens,
                    totalTokens: data.usage.input_tokens + data.usage.output_tokens,
                    estimatedCost: this.estimateCost({
                        promptTokens: data.usage.input_tokens,
                        completionTokens: data.usage.output_tokens,
                        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
                    }),
                },
                timestamp: new Date(),
                latency: Date.now() - startTime,
                metadata: {
                    stopReason: data.stop_reason,
                    stopSequence: data.stop_sequence,
                },
            };
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async *stream(messages, modelConfig) {
        const config = { ...this.modelConfig, ...modelConfig };
        const response = await fetch(this.config.endpoint || "https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.model || "claude-3-opus-20240229",
                messages: this.formatMessages(messages),
                system: this.extractSystemPrompt(messages),
                max_tokens: config.maxTokens || 4096,
                stream: true,
                temperature: config.temperature,
                top_p: config.topP,
                top_k: config.topK,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw this.handleError(error);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.trim() === '')
                    continue;
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]")
                        return;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.type === "content_block_delta") {
                            yield parsed.delta.text;
                        }
                    }
                    catch (e) {
                        console.warn('Failed to parse SSE data:', e);
                    }
                }
            }
        }
    }
    calculateTokens(text) {
        // Claude uses a similar tokenization to GPT models
        // Rough approximation: 1 token ≈ 3.5 characters
        return Math.ceil(text.length / 3.5);
    }
    estimateCost(tokens) {
        const model = this.modelConfig.model || "claude-3-opus-20240229";
        // Pricing as of 2024 (in USD per 1K tokens)
        const rates = {
            "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
            "claude-3-sonnet-20240229": { input: 0.003, output: 0.015 },
            "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
            "claude-2.1": { input: 0.008, output: 0.024 },
            "claude-2.0": { input: 0.008, output: 0.024 },
            "claude-instant-1.2": { input: 0.0008, output: 0.0024 },
        };
        const rate = rates[model] || rates["claude-3-haiku-20240307"];
        return ((tokens.promptTokens * rate.input +
            tokens.completionTokens * rate.output) /
            1000);
    }
    getAvailableModels() {
        return [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2",
        ];
    }
    validateModel(model) {
        return this.getAvailableModels().includes(model);
    }
    /**
     * Format messages for Anthropic API (excludes system messages)
     */
    formatMessages(messages) {
        return messages.filter((m) => m.role !== "system");
    }
    /**
     * Extract system prompt from messages
     */
    extractSystemPrompt(messages) {
        return messages.find((m) => m.role === "system")?.content;
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=anthropic.provider.js.map