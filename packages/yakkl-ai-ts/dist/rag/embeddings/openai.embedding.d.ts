/**
 * OpenAI embeddings provider
 */
import { BaseEmbeddingProvider } from './base.embedding';
import { EmbeddingConfig } from '../../types/rag';
export declare class OpenAIEmbeddings extends BaseEmbeddingProvider {
    private headers;
    constructor(config: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    getDimensions(): number;
}
//# sourceMappingURL=openai.embedding.d.ts.map