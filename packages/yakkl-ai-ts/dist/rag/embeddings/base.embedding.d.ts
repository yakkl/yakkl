/**
 * Base class for embedding providers
 */
import { EmbeddingConfig } from '../../types/rag';
export declare abstract class BaseEmbeddingProvider {
    protected config: EmbeddingConfig;
    constructor(config: EmbeddingConfig);
    abstract embed(text: string): Promise<number[]>;
    abstract embedBatch(texts: string[]): Promise<number[][]>;
    abstract getDimensions(): number;
}
//# sourceMappingURL=base.embedding.d.ts.map