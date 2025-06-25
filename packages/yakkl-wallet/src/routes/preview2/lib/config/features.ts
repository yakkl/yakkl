// Feature flags for Basic vs Pro tier separation
export enum PlanType {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

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
  'basic_features' // General basic features check
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
  'custom_rpc',
  'advanced_security',
  'multi_sig'
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
  BASIC: BASIC_FEATURES,
  PRO: PRO_FEATURES,
  ENTERPRISE: ENTERPRISE_FEATURES,
  PAYMENT: PAYMENT_FEATURES
} as const;

// Helper function to check if a feature is available
export function hasFeature(userPlan: PlanType, feature: string): boolean {
  const planFeatures = FEATURES[userPlan.toUpperCase() as keyof typeof FEATURES];
  return (planFeatures as any)?.includes(feature) ?? false;
}

// Get all features for a plan
export function getFeaturesForPlan(plan: PlanType): readonly string[] {
  return FEATURES[plan.toUpperCase() as keyof typeof FEATURES] ?? FEATURES.BASIC;
}

// Check if user is on trial
export function isTrialUser(trialEndsAt?: string): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}
