"use strict";
/**
 * OpenAI embeddings provider
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIEmbeddings = void 0;
const base_embedding_1 = require("./base.embedding");
class OpenAIEmbeddings extends base_embedding_1.BaseEmbeddingProvider {
    headers;
    constructor(config) {
        super(config);
        this.headers = {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
        };
    }
    async embed(text) {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                model: this.config.model || "text-embedding-3-small",
                input: text,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI Embeddings Error: ${error.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        return data.data[0].embedding;
    }
    async embedBatch(texts) {
        const batchSize = this.config.batchSize || 100;
        const embeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const response = await fetch("https://api.openai.com/v1/embeddings", {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    model: this.config.model || "text-embedding-3-small",
                    input: batch,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI Embeddings Error: ${error.error?.message || 'Unknown error'}`);
            }
            const data = await response.json();
            embeddings.push(...data.data.map((d) => d.embedding));
        }
        return embeddings;
    }
    getDimensions() {
        const dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        };
        return dimensions[this.config.model] || 1536;
    }
}
exports.OpenAIEmbeddings = OpenAIEmbeddings;
//# sourceMappingURL=openai.embedding.js.map