/**
 * Enhanced key management interface with support for multiple keys per provider
 * Supports key rotation, different operation types, and secure key selection
 */
export interface IKeyManager {
  /**
   * Initialize the key manager
   */
  initialize(): Promise<void>;
  
  /**
   * Register a new provider with multiple API keys
   * @param providerName - Provider identifier
   * @param keys - Key configurations for this provider
   */
  registerProvider(
    providerName: string, 
    keys: ProviderKeyConfig[]
  ): Promise<void>;
  
  /**
   * Get the best available key for a provider and operation type
   * @param providerName - Provider identifier
   * @param operation - Operation type (read/write)
   * @param chainId - Optional chain ID for chain-specific keys
   */
  getKey(
    providerName: string, 
    operation: KeyOperation,
    chainId?: number
  ): Promise<string | null>;
  
  /**
   * Get all available keys for a provider
   * @param providerName - Provider identifier
   */
  getProviderKeys(providerName: string): Promise<ProviderKeyInfo[]>;
  
  /**
   * Mark a key as failed (for automatic rotation)
   * @param providerName - Provider identifier
   * @param keyId - Key identifier
   * @param error - Error details
   */
  reportKeyFailure(
    providerName: string, 
    keyId: string, 
    error: string
  ): Promise<void>;
  
  /**
   * Mark a key as successful (reset failure count)
   * @param providerName - Provider identifier
   * @param keyId - Key identifier
   */
  reportKeySuccess(
    providerName: string, 
    keyId: string
  ): Promise<void>;
  
  /**
   * Rotate to next available key for a provider
   * @param providerName - Provider identifier
   */
  rotateKey(providerName: string): Promise<void>;
  
  /**
   * Get key usage statistics
   * @param providerName - Provider identifier
   */
  getKeyStats(providerName: string): Promise<KeyStats[]>;
  
  /**
   * Check if provider has valid keys
   * @param providerName - Provider identifier
   */
  hasValidKeys(providerName: string): Promise<boolean>;
  
  /**
   * Get all registered providers
   */
  getProviders(): Promise<string[]>;
  
  /**
   * Health check for key manager
   */
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
}

/**
 * Key operation types
 */
export type KeyOperation = 
  | 'read'      // Low-cost read operations (balance, blocks, etc.)
  | 'write'     // High-cost write operations (transactions)
  | 'archive'   // Archive data queries (historical data)
  | 'trace'     // Trace/debug operations
  | 'websocket' // WebSocket connections
  | 'any';      // Any operation type

/**
 * Provider key configuration
 */
export interface ProviderKeyConfig {
  /** Unique key identifier */
  id: string;
  
  /** API key value */
  key: string;
  
  /** Key priority (higher = preferred) */
  priority: number;
  
  /** Supported operations */
  operations: KeyOperation[];
  
  /** Supported chain IDs (empty = all chains) */
  chainIds?: number[];
  
  /** Rate limits for this key */
  rateLimit?: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    computeUnitsPerMonth?: number; // For Alchemy
  };
  
  /** Key tier/plan */
  tier: 'free' | 'growth' | 'scale' | 'enterprise';
  
  /** Environment this key is for */
  environment: 'development' | 'staging' | 'production';
  
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Provider key information (without exposing actual key)
 */
export interface ProviderKeyInfo {
  /** Unique key identifier */
  id: string;
  
  /** Key priority */
  priority: number;
  
  /** Supported operations */
  operations: KeyOperation[];
  
  /** Supported chain IDs */
  chainIds?: number[];
  
  /** Key tier/plan */
  tier: string;
  
  /** Environment */
  environment: string;
  
  /** Current status */
  status: 'active' | 'failed' | 'suspended' | 'quota_exceeded';
  
  /** Failure count */
  failureCount: number;
  
  /** Last used timestamp */
  lastUsed?: number;
  
  /** Last failure timestamp */
  lastFailure?: number;
  
  /** Usage statistics */
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
  };
}

/**
 * Key statistics
 */
export interface KeyStats {
  /** Key identifier */
  id: string;
  
  /** Total requests made */
  totalRequests: number;
  
  /** Successful requests */
  successfulRequests: number;
  
  /** Failed requests */
  failedRequests: number;
  
  /** Success rate (0-100) */
  successRate: number;
  
  /** Average response time (ms) */
  avgResponseTime: number;
  
  /** Current status */
  status: 'active' | 'failed' | 'suspended' | 'quota_exceeded';
  
  /** Last used timestamp */
  lastUsed?: number;
  
  /** Remaining quota (if applicable) */
  remainingQuota?: {
    requests?: number;
    computeUnits?: number;
    resetTime?: number;
  };
}

/**
 * Key rotation strategy
 */
export interface KeyRotationStrategy {
  /** Strategy type */
  type: 'round_robin' | 'priority' | 'least_used' | 'performance_based';
  
  /** Rotation interval (ms) */
  interval?: number;
  
  /** Failure threshold before rotation */
  failureThreshold?: number;
  
  /** Performance threshold (ms) */
  performanceThreshold?: number;
}

/**
 * Key selection criteria
 */
export interface KeySelectionCriteria {
  /** Required operation type */
  operation: KeyOperation;
  
  /** Required chain ID */
  chainId?: number;
  
  /** Prefer specific tier */
  preferTier?: 'free' | 'growth' | 'scale' | 'enterprise';
  
  /** Prefer specific environment */
  preferEnvironment?: 'development' | 'staging' | 'production';
  
  /** Exclude failed keys */
  excludeFailed?: boolean;
  
  /** Minimum success rate required (0-100) */
  minSuccessRate?: number;
  
  /** Maximum response time allowed (ms) */
  maxResponseTime?: number;
}