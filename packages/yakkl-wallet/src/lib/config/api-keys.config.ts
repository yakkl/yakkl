/**
 * API Keys Configuration
 * This file is generated at build time by webpack DefinePlugin
 * DO NOT commit actual API keys to version control
 */

// These values will be replaced at build time by webpack DefinePlugin
export const API_KEYS = {
  // Alchemy keys
  ALCHEMY_API_KEY_ETHEREUM: process.env.VITE_ALCHEMY_API_KEY_ETHEREUM || '',
  ALCHEMY_API_KEY_PROD_1: process.env.ALCHEMY_API_KEY_PROD_1 || process.env.VITE_ALCHEMY_API_KEY_PROD_1 || '',
  ALCHEMY_API_KEY_PROD_2: process.env.ALCHEMY_API_KEY_PROD_2 || process.env.VITE_ALCHEMY_API_KEY_PROD_2 || '',
  ALCHEMY_API_KEY_DEV: process.env.ALCHEMY_API_KEY_DEV || '',

  // Infura keys
  INFURA_API_KEY_PROD: process.env.INFURA_API_KEY_PROD || process.env.VITE_INFURA_API_KEY_PROD || '',
  INFURA_API_KEY_DEV: process.env.INFURA_API_KEY_DEV || '',

  // Other provider keys
  BLOCKNATIVE_API_KEY: process.env.BLOCKNATIVE_API_KEY || process.env.VITE_BLOCKNATIVE_API_KEY || '',

  // AI keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || ''
};

// Helper function to get an API key by name
export function getApiKey(keyName: string): string | undefined {
  return API_KEYS[keyName as keyof typeof API_KEYS] || undefined;
}

// Helper to check if we have any provider API keys
export function hasProviderApiKeys(): boolean {
  return !!(
    API_KEYS.ALCHEMY_API_KEY_PROD_1 ||
    API_KEYS.ALCHEMY_API_KEY_PROD_2 ||
    API_KEYS.ALCHEMY_API_KEY_ETHEREUM ||
    API_KEYS.ALCHEMY_API_KEY_DEV ||
    API_KEYS.INFURA_API_KEY_PROD ||
    API_KEYS.INFURA_API_KEY_DEV
  );
}

// Get the first available Alchemy key
export function getAlchemyApiKey(): string | undefined {
  const keys = [
    API_KEYS.ALCHEMY_API_KEY_ETHEREUM,
    API_KEYS.ALCHEMY_API_KEY_PROD_1,
    API_KEYS.ALCHEMY_API_KEY_PROD_2,
    API_KEYS.ALCHEMY_API_KEY_DEV
  ];

  for (const key of keys) {
    if (key && key !== 'undefined' && key !== '') {
      return key;
    }
  }

  return undefined;
}

// Debug logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('[api-keys.config] API keys loaded:', {
    hasAlchemy: !!getAlchemyApiKey(),
    hasInfura: !!(API_KEYS.INFURA_API_KEY_PROD || API_KEYS.INFURA_API_KEY_DEV),
    hasBlocknative: !!API_KEYS.BLOCKNATIVE_API_KEY,
    totalKeys: Object.values(API_KEYS).filter(k => k && k !== '').length
  });
}