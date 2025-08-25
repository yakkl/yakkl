// Feature flags for Basic vs Pro tier separation
// import { PlanType } from '../types';
// export { PlanType };

import { PlanType } from "$lib/common/types";
// export { PlanType };

// Define feature arrays first to avoid circular reference
const BASIC_FEATURES = [
  'view_balance',
  'send_tokens',
  'receive_tokens',
  'swap_tokens',
  'buy_crypto',
  'sell_crypto',
  'view_transactions',
  'basic_security',
  'import_wallet',
  'export_keys',
  'hardware_wallet',
  'basic_tokens', // Limited to major tokens
  'basic_networks', // Limited to mainnet
  'basic_features', // General basic features check
  'multi_chain_portfolio', // Multi-chain portfolio aggregation
  'secure_recovery' // Secure Full Recovery feature
] as const;

const PRO_FEATURES = [
  ...BASIC_FEATURES,
  'advanced_analytics',
  'portfolio_tracking',
  'price_alerts',
  'ai_assistant',
  'staking',
  'yield_farming',
  'all_tokens',
  'testnet_access',
  'priority_support',
  'bulk_transactions',
  'api_access',
  'api_key_management',
  'custom_rpc',
  'advanced_security',
  'multi_sig',
  'network_diagnostics' // Advanced troubleshooting tools
] as const;

const FOUNDING_MEMBER_FEATURES = [
  ...PRO_FEATURES,
  'founding_member_features'
] as const;

const EARLY_ADOPTER_FEATURES = [
  ...PRO_FEATURES,
  'early_adopter_features'
] as const;

const PRO_PLUS_FEATURES = [
  ...PRO_FEATURES,
  'ai_assistant_plus',
  'multiple_visualizations',
  'rapid_support',
  'custom_features',
  'access_to_innovation_lab',
  'advanced_pro_plus_security'
] as const;

const ENTERPRISE_FEATURES = [
  ...PRO_FEATURES,
  'white_label',
  'custom_branding',
  'dedicated_support',
  'custom_features'
] as const;


const PAYMENT_FEATURES = [
  'buy_crypto_card',
  'buy_crypto_bank',
  'crypto_payment',
  'subscription_management'
] as const;

export const FEATURES = {
  [PlanType.EXPLORER_MEMBER]: BASIC_FEATURES,
  [PlanType.YAKKL_PRO]: PRO_FEATURES,
  [PlanType.YAKKL_PRO_PLUS]: PRO_PLUS_FEATURES,
  [PlanType.ENTERPRISE]: ENTERPRISE_FEATURES,
  [PlanType.FOUNDING_MEMBER]: FOUNDING_MEMBER_FEATURES,
  [PlanType.EARLY_ADOPTER]: EARLY_ADOPTER_FEATURES,
  PAYMENT: PAYMENT_FEATURES
} as const;

// Export plan features for compatibility
export const PLAN_FEATURES = {
  BASIC: BASIC_FEATURES,
  PRO: PRO_FEATURES,
  PRO_PLUS: PRO_PLUS_FEATURES,
  FOUNDING_MEMBER: FOUNDING_MEMBER_FEATURES,
  EARLY_ADOPTER: EARLY_ADOPTER_FEATURES,
  ENTERPRISE: ENTERPRISE_FEATURES
} as const;

// Type for feature keys
export type FeatureKey =
  | typeof BASIC_FEATURES[number]
  | typeof PRO_FEATURES[number]
  | typeof PRO_PLUS_FEATURES[number]
  | typeof FOUNDING_MEMBER_FEATURES[number]
  | typeof EARLY_ADOPTER_FEATURES[number]
  | typeof ENTERPRISE_FEATURES[number];

// Helper function to check if a feature is available
export function hasFeature(userPlan: PlanType, feature: string): boolean {
  const planFeatures = FEATURES[userPlan as keyof typeof FEATURES];
  return (planFeatures as any)?.includes(feature) ?? false;
}

// Get all features for a plan
export function getFeaturesForPlan(plan: PlanType): readonly string[] {
  return FEATURES[plan as keyof typeof FEATURES] ?? FEATURES[PlanType.EXPLORER_MEMBER];
}

// Check if user is on trial
export function isTrialUser(trialEndsAt?: string): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}
