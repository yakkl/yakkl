"use strict";
/**
 * Google (Gemini) Provider implementation
 * Supports both Gemini API and Google Nano (local browser AI)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleProvider = void 0;
const base_provider_1 = require("./base.provider");
const providers_1 = require("../types/providers");
class GoogleProvider extends base_provider_1.BaseAIProvider {
    isNano;
    constructor(config) {
        super(config);
        this.isNano = config.provider === providers_1.AIProvider.GOOGLE_NANO;
    }
    initializeAuth() {
        if (this.isNano) {
            // Google Nano runs locally, no auth needed
            return;
        }
        if (this.config.apiKey) {
            this.headers["x-goog-api-key"] = this.config.apiKey;
        }
        else if (this.config.oauth) {
            this.headers["Authorization"] = `Bearer ${this.config.oauth.accessToken}`;
        }
    }
    async complete(messages, modelConfig) {
        const config = { ...this.modelConfig, ...modelConfig };
        const startTime = Date.now();
        if (this.isNano) {
            return this.completeWithNano(messages, config, startTime);
        }
        try {
            const model = config.model || "gemini-2.0-flash-exp";
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: "POST",
                headers: {
                    ...this.headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: this.convertMessagesToGeminiFormat(messages),
                    generationConfig: {
                        temperature: config.temperature,
                        maxOutputTokens: config.maxTokens,
                        topP: config.topP,
                        topK: config.topK,
                        stopSequences: config.stopSequences,
                    },
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw this.handleError(error);
            }
            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;
            const usage = data.usageMetadata;
            return {
                id: crypto.randomUUID(),
                provider: providers_1.AIProvider.GOOGLE,
                model,
                content,
                tokenUsage: {
                    promptTokens: usage.promptTokenCount,
                    completionTokens: usage.candidatesTokenCount,
                    totalTokens: usage.totalTokenCount,
                    estimatedCost: this.estimateCost({
                        promptTokens: usage.promptTokenCount,
                        completionTokens: usage.candidatesTokenCount,
                        totalTokens: usage.totalTokenCount,
                    }),
                },
                timestamp: new Date(),
                latency: Date.now() - startTime,
            };
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async completeWithNano(messages, config, startTime) {
        // Google Nano implementation - runs in browser
        if (!("ai" in window) || !window.ai?.generateText) {
            throw new Error("Google Nano AI is not available in this browser");
        }
        const ai = window.ai;
        const session = await ai.createTextSession({
            temperature: config.temperature,
            topK: config.topK,
        });
        const prompt = this.convertMessagesToPrompt(messages);
        const result = await session.generateText(prompt);
        // Nano tokens are calculated differently (local processing)
        const promptTokens = this.calculateTokens(prompt);
        const completionTokens = this.calculateTokens(result);
        return {
            id: crypto.randomUUID(),
            provider: providers_1.AIProvider.GOOGLE_NANO,
            model: "nano",
            content: result,
            tokenUsage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
                estimatedCost: 0, // Nano is free (local)
            },
            timestamp: new Date(),
            latency: Date.now() - startTime,
            metadata: { local: true },
        };
    }
    async *stream(messages, modelConfig) {
        if (this.isNano) {
            // Nano streaming implementation
            const ai = window.ai;
            const session = await ai.createTextSession({
                temperature: modelConfig?.temperature,
            });
            const prompt = this.convertMessagesToPrompt(messages);
            const stream = await session.generateTextStream(prompt);
            for await (const chunk of stream) {
                yield chunk;
            }
        }
        else {
            // Regular Google API streaming
            const model = modelConfig?.model || "gemini-2.0-flash-exp";
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`, {
                method: "POST",
                headers: {
                    ...this.headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: this.convertMessagesToGeminiFormat(messages),
                    generationConfig: {
                        temperature: modelConfig?.temperature,
                        maxOutputTokens: modelConfig?.maxTokens,
                    },
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
                    try {
                        const parsed = JSON.parse(line);
                        const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (content)
                            yield content;
                    }
                    catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }
    convertMessagesToGeminiFormat(messages) {
        return messages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));
    }
    convertMessagesToPrompt(messages) {
        return messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n");
    }
    calculateTokens(text) {
        // Google uses different tokenization
        if (this.isNano) {
            // Nano has different limits
            return Math.ceil(text.length / 3.5);
        }
        return Math.ceil(text.length / 4);
    }
    estimateCost(tokens) {
        if (this.isNano)
            return 0; // Nano is free
        const model = this.modelConfig.model || "gemini-2.0-flash-exp";
        const rates = {
            "gemini-2.0-flash-exp": { input: 0.000075, output: 0.0003 },
            "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
            "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
        };
        const rate = rates[model] || rates["gemini-2.0-flash-exp"];
        return ((tokens.promptTokens * rate.input +
            tokens.completionTokens * rate.output) /
            1000);
    }
    getAvailableModels() {
        if (this.isNano)
            return ["nano"];
        return [
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.0-pro",
        ];
    }
    validateModel(model) {
        return this.getAvailableModels().includes(model);
    }
}
exports.GoogleProvider = GoogleProvider;
//# sourceMappingURL=google.provider.js.map