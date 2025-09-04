/**
 * OpenAI embeddings provider
 */

import { BaseEmbeddingProvider } from './base.embedding';
import { EmbeddingConfig } from '../../types/rag';

export class OpenAIEmbeddings extends BaseEmbeddingProvider {
  private headers: Record<string, string>;

  constructor(config: EmbeddingConfig) {
    super(config);
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async embed(text: string): Promise<number[]> {
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

  async embedBatch(texts: string[]): Promise<number[][]> {
    const batchSize = this.config.batchSize || 100;
    const embeddings: number[][] = [];

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
      embeddings.push(...data.data.map((d: any) => d.embedding));
    }

    return embeddings;
  }

  getDimensions(): number {
    const dimensions: Record<string, number> = {
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "text-embedding-ada-002": 1536,
    };
    return dimensions[this.config.model] || 1536;
  }
}