/**
 * Base class for embedding providers
 */

import { EmbeddingConfig } from '../../types/rag';

export abstract class BaseEmbeddingProvider {
  protected config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  abstract embed(text: string): Promise<number[]>;
  abstract embedBatch(texts: string[]): Promise<number[][]>;
  abstract getDimensions(): number;
}