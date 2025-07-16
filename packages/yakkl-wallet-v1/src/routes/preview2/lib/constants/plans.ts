/**
 * Plan constants - simplified and consistent
 */

// Map to existing system values for compatibility
export enum PlanType {
  Basic = 'basic_member',
  Pro = 'yakkl_pro', 
  Enterprise = 'enterprise',
  Private = 'yakkl_private'  // Highest security tier
}

export const PLAN_FEATURES = {
  // Basic features (free tier)
  BASIC: [
    'view_balance',
    'send_tokens',
    'receive_tokens',
    'basic_portfolio'
  ] as const,
  
  // Pro features (paid tier)
  PRO: [
    'view_balance',
    'send_tokens', 
    'receive_tokens',
    'basic_portfolio',
    'swap_tokens',
    'ai_assistant',
    'advanced_analytics',
    'buy_crypto',
    'emergency_kit'
  ] as const,
  
  // Enterprise features (business tier)
  ENTERPRISE: [
    'view_balance',
    'send_tokens',
    'receive_tokens', 
    'basic_portfolio',
    'swap_tokens',
    'ai_assistant',
    'advanced_analytics',
    'buy_crypto',
    'emergency_kit',
    'multi_signature',
    'team_management',
    'audit_logs'
  ] as const,
  
  // Private features (maximum security tier)
  PRIVATE: [
    'view_balance',
    'send_tokens',
    'receive_tokens', 
    'basic_portfolio',
    'swap_tokens',
    'ai_assistant',
    'advanced_analytics',
    'buy_crypto',
    'emergency_kit',
    'multi_signature',
    'team_management',
    'audit_logs',
    'private_key_backup',
    'secure_recovery',
    'air_gapped_signing',
    'hardware_integration',
    'zero_knowledge_proofs'
  ] as const
};

export const PLAN_DISPLAY_NAMES = {
  [PlanType.Basic]: 'Basic',
  [PlanType.Pro]: 'Pro',
  [PlanType.Enterprise]: 'Enterprise',
  [PlanType.Private]: 'Private'
} as const;

export const DEFAULT_PLAN = PlanType.Basic;

// Helper type for all possible features
export type FeatureKey = 
  | typeof PLAN_FEATURES.BASIC[number]
  | typeof PLAN_FEATURES.PRO[number] 
  | typeof PLAN_FEATURES.ENTERPRISE[number]
  | typeof PLAN_FEATURES.PRIVATE[number];