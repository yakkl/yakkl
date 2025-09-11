"use strict";
/**
 * OpenAI Provider implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const base_provider_1 = require("./base.provider");
const providers_1 = require("../types/providers");
class OpenAIProvider extends base_provider_1.BaseAIProvider {
    initializeAuth() {
        if (this.config.apiKey) {
            this.headers["Authorization"] = `Bearer ${this.config.apiKey}`;
        }
        if (this.config.organizationId) {
            this.headers["OpenAI-Organization"] = this.config.organizationId;
        }
    }
    async complete(messages, modelConfig) {
        const config = { ...this.modelConfig, ...modelConfig };
        const startTime = Date.now();
        try {
            const response = await fetch(this.config.endpoint || "https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    ...this.headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: config.model || "gpt-4-turbo-preview",
                    messages,
                    temperature: config.temperature,
                    max_tokens: config.maxTokens,
                    top_p: config.topP,
                    frequency_penalty: config.frequencyPenalty,
                    presence_penalty: config.presencePenalty,
                    stop: config.stopSequences,
                    seed: config.seed,
                    response_format: config.responseFormat === 'json' ? { type: 'json_object' } : undefined,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw this.handleError(error);
            }
            const data = await response.json();
            return {
                id: data.id,
                provider: providers_1.AIProvider.OPENAI,
                model: data.model,
                content: data.choices[0].message.content,
                tokenUsage: {
                    promptTokens: data.usage.prompt_tokens,
                    completionTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                    estimatedCost: this.estimateCost({
                        promptTokens: data.usage.prompt_tokens,
                        completionTokens: data.usage.completion_tokens,
                        totalTokens: data.usage.total_tokens,
                    }),
                },
                timestamp: new Date(),
                latency: Date.now() - startTime,
                metadata: {
                    finishReason: data.choices[0].finish_reason,
                    systemFingerprint: data.system_fingerprint
                },
            };
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async *stream(messages, modelConfig) {
        const config = { ...this.modelConfig, ...modelConfig };
        const response = await fetch(this.config.endpoint || "https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                ...this.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.model || "gpt-4-turbo-preview",
                messages,
                stream: true,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                top_p: config.topP,
                frequency_penalty: config.frequencyPenalty,
                presence_penalty: config.presencePenalty,
                stop: config.stopSequences,
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
            const lines = buffer.split("\n");
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
                        const content = parsed.choices[0]?.delta?.content;
                        if (content)
                            yield content;
                    }
                    catch (e) {
                        console.warn('Failed to parse SSE data:', e);
                    }
                }
            }
        }
    }
    calculateTokens(text) {
        // Simplified token calculation - in production, use tiktoken
        // GPT-3.5 and GPT-4 use cl100k_base encoding
        // Rough approximation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }
    estimateCost(tokens) {
        const model = this.modelConfig.model || "gpt-4-turbo-preview";
        // Pricing as of 2024 (in USD per 1K tokens)
        const rates = {
            "gpt-4-turbo-preview": { input: 0.01, output: 0.03 },
            "gpt-4-1106-preview": { input: 0.01, output: 0.03 },
            "gpt-4": { input: 0.03, output: 0.06 },
            "gpt-4-32k": { input: 0.06, output: 0.12 },
            "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
            "gpt-3.5-turbo-16k": { input: 0.003, output: 0.004 },
        };
        const rate = rates[model] || rates["gpt-3.5-turbo"];
        return ((tokens.promptTokens * rate.input +
            tokens.completionTokens * rate.output) /
            1000);
    }
    getAvailableModels() {
        return [
            "gpt-4-turbo-preview",
            "gpt-4-1106-preview",
            "gpt-4",
            "gpt-4-32k",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
        ];
    }
    validateModel(model) {
        return this.getAvailableModels().includes(model);
    }
    /**
     * OpenAI-specific: List fine-tuned models
     */
    async listFineTunedModels() {
        const response = await fetch("https://api.openai.com/v1/models", {
            headers: this.headers,
        });
        const data = await response.json();
        return data.data
            .filter((model) => model.owned_by.includes('ft'))
            .map((model) => model.id);
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.provider.js.map