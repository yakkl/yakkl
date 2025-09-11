/**
 * Provider-related type definitions for YAKKL AI Library
 */

export enum AIProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  GOOGLE_NANO = "google-nano",
  AZURE_OPENAI = "azure-openai",
  COHERE = "cohere",
  HUGGINGFACE = "huggingface",
  CUSTOM = "custom",
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  jwt?: string;
  oauth?: OAuthConfig;
  endpoint?: string;
  maxRetries?: number;
  timeout?: number;
  organizationId?: string;
  projectId?: string;
  region?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  tokenEndpoint: string;
  scope?: string[];
}

export interface RateLimitConfig {
  maxRequestsPerMinute?: number;
  maxRequestsPerHour?: number;
  maxRequestsPerDay?: number;
  maxTokensPerMinute?: number;
  maxTokensPerHour?: number;
  maxTokensPerDay?: number;
  debounceMs?: number;
  burstLimit?: number;
}

export interface QuotaConfig {
  maxTotalTokens?: number;
  maxCostPerDay?: number;
  maxCostPerMonth?: number;
  warningThreshold?: number; // Percentage
}

export interface LanguageConfig {
  language: string; // ISO 639-1 code
  locale?: string;
  timezone?: string;
}

export interface AIError {
  code: string;
  message: string;
  provider: AIProvider;
  retryable: boolean;
  details?: any;
}