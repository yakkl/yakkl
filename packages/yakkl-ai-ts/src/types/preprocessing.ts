/**
 * Query preprocessing type definitions
 */

import { AIProvider } from './providers';
import { ModelConfig, PromptMessage } from './models';

export interface QueryTransformation {
  id: string;
  original: string;
  transformed: string[];
  method: TransformationMethod;
  timestamp: Date;
  confidence: number;
  metadata?: Record<string, any>;
}

export enum TransformationMethod {
  TYPO_CORRECTION = "typo_correction",
  EXPANSION = "expansion",
  TECHNICAL_TRANSLATION = "technical_translation",
  CONTEXT_ENRICHMENT = "context_enrichment",
  INTENT_EXTRACTION = "intent_extraction",
  HYDE = "hyde", // Hypothetical Document Embeddings
  MULTI_QUERY = "multi_query",
  SEMANTIC_CLARIFICATION = "semantic_clarification",
}

export interface QueryPattern {
  pattern: RegExp | string;
  transformation: (query: string) => string[];
  priority: number;
  category: string;
}

export interface QueryContext {
  previousMessages?: PromptMessage[];
  userProfile?: UserProfile;
  sessionContext?: Record<string, any>;
  documentContext?: string[];
}

export interface UserProfile {
  id: string;
  expertiseLevel: "beginner" | "intermediate" | "expert";
  preferredTerminology?: Record<string, string>;
  commonIssues?: string[];
  language?: string;
}

export interface PreprocessorConfig {
  enableTypoCorrection?: boolean;
  enableExpansion?: boolean;
  enableHyde?: boolean;
  maxQueries?: number; // Max number of query variations
  cacheEnabled?: boolean;
  cacheTTL?: number;
  confidenceThreshold?: number;
  provider?: AIProvider; // For query rewriting
  modelConfig?: ModelConfig;
}

export interface PreprocessingResult {
  queries: string[];
  transformations: QueryTransformation[];
  confidence: number;
  method: TransformationMethod[];
  metadata?: Record<string, any>;
}