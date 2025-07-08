import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { encryptData, decryptData } from '$lib/common/encryption';
import { getObjectFromLocalStorage, setObjectInLocalStorage, removeObjectFromLocalStorage } from '$lib/common/storage';
import { getProfile } from '$lib/common/stores';
import { log } from '$lib/managers/Logger';
import type { EncryptedData } from '$lib/common/interfaces';

export interface APIKey {
  name: string;
  key: string;
  category: string;
  description?: string;
  lastUpdated?: Date;
  isActive: boolean;
}

export interface KeyManagementData {
  keys: APIKey[];
  encryptedData?: string;
  version: string;
}

// Initial state
const initialState: KeyManagementData = {
  keys: [],
  version: '1.0.0'
};

// Create the writable store
export const keyManagementStore = writable<KeyManagementData>(initialState);

// Derived store for keys by category
export const keysByCategory = derived(keyManagementStore, ($store) => {
  const categories: Record<string, APIKey[]> = {};
  
  $store.keys.forEach(key => {
    if (!categories[key.category]) {
      categories[key.category] = [];
    }
    categories[key.category].push(key);
  });
  
  return categories;
});

// Load keys from storage
export async function loadKeyManagement(): Promise<void> {
  if (!browser) return;
  
  try {
    const profile = await getProfile();
    if (!profile?.id) {
      log.warn('No profile ID available for loading key management');
      return;
    }
    
    const encryptedData = await getObjectFromLocalStorage<EncryptedData>(`yakklKeyManagement_${profile.id}`);
    if (encryptedData) {
      // Decrypt the data
      const decryptedData = await decryptData<string>(encryptedData, profile.id);
      const data = JSON.parse(decryptedData) as KeyManagementData;
      
      // Convert date strings back to Date objects
      data.keys = data.keys.map(key => ({
        ...key,
        lastUpdated: key.lastUpdated ? new Date(key.lastUpdated) : undefined
      }));
      
      keyManagementStore.set(data);
    }
  } catch (error) {
    log.error('Failed to load key management data', false, error);
  }
}

// Save keys to storage
export async function saveKeyManagement(): Promise<void> {
  if (!browser) return;
  
  try {
    const profile = await getProfile();
    if (!profile?.id) {
      log.warn('No profile ID available for saving key management');
      return;
    }
    
    const data = get(keyManagementStore);
    
    // Encrypt the data
    const encryptedData = await encryptData(data, profile.id);
    
    await setObjectInLocalStorage(`yakklKeyManagement_${profile.id}`, encryptedData);
    log.info('Key management data saved successfully');
  } catch (error) {
    log.error('Failed to save key management data', false, error);
    throw error;
  }
}

// Add or update an API key
export async function setAPIKey(
  name: string,
  key: string,
  category: string,
  description?: string
): Promise<void> {
  keyManagementStore.update(store => {
    const existingIndex = store.keys.findIndex(k => k.name === name);
    
    const newKey: APIKey = {
      name,
      key,
      category,
      description,
      lastUpdated: new Date(),
      isActive: true
    };
    
    if (existingIndex >= 0) {
      store.keys[existingIndex] = newKey;
    } else {
      store.keys.push(newKey);
    }
    
    return store;
  });
  
  await saveKeyManagement();
}

// Remove an API key
export async function removeAPIKey(name: string): Promise<void> {
  keyManagementStore.update(store => {
    store.keys = store.keys.filter(k => k.name !== name);
    return store;
  });
  
  await saveKeyManagement();
}

// Toggle API key active status
export async function toggleAPIKeyStatus(name: string): Promise<void> {
  keyManagementStore.update(store => {
    const key = store.keys.find(k => k.name === name);
    if (key) {
      key.isActive = !key.isActive;
      key.lastUpdated = new Date();
    }
    return store;
  });
  
  await saveKeyManagement();
}

// Get a specific API key (decrypted)
export function getAPIKey(name: string): APIKey | undefined {
  const store = get(keyManagementStore);
  return store.keys.find(k => k.name === name && k.isActive);
}

// Clear all keys
export async function clearAllKeys(): Promise<void> {
  keyManagementStore.set(initialState);
  
  const profile = await getProfile();
  if (profile?.id) {
    await removeObjectFromLocalStorage(`yakklKeyManagement_${profile.id}`);
  }
}

// API Key Categories and their descriptions
export const API_KEY_CATEGORIES = {
  AI: {
    name: 'AI & Machine Learning',
    description: 'API keys for AI services and language models',
    keys: [
      { name: 'OpenAI', description: 'OpenAI API for ChatGPT and GPT models' },
      { name: 'Claude', description: 'Anthropic Claude API' },
      { name: 'Perplexity', description: 'Perplexity AI search API' },
      { name: 'Grok', description: 'X.AI Grok API' }
    ]
  },
  BLOCKCHAIN: {
    name: 'Blockchain Infrastructure',
    description: 'Node providers and blockchain data services',
    keys: [
      { name: 'Alchemy', description: 'Alchemy blockchain development platform' },
      { name: 'Infura', description: 'Infura Ethereum API provider' },
      { name: 'Chainstack', description: 'Chainstack managed blockchain services' },
      { name: 'ANKR', description: 'ANKR decentralized infrastructure' },
      { name: 'BlockNative', description: 'BlockNative real-time blockchain events' }
    ]
  },
  EXCHANGE: {
    name: 'Cryptocurrency Exchanges',
    description: 'API keys for exchange integrations',
    keys: [
      { name: 'Coinbase', description: 'Coinbase exchange API' },
      { name: 'Kraken', description: 'Kraken exchange API' },
      { name: 'Binance', description: 'Binance exchange API' },
      { name: 'Gemini', description: 'Gemini exchange API' }
    ]
  },
  DATA: {
    name: 'Data & Analytics',
    description: 'Blockchain explorers and data services',
    keys: [
      { name: 'Etherscan', description: 'Etherscan blockchain explorer API' },
      { name: 'CoinDesk', description: 'CoinDesk market data API' }
    ]
  },
  DEFI: {
    name: 'DeFi Services',
    description: 'Decentralized finance protocol APIs',
    keys: [
      { name: '1inch', description: '1inch DEX aggregator API' },
      { name: 'Circle', description: 'Circle USDC and payment APIs' }
    ]
  },
  PLATFORM: {
    name: 'Platform Services',
    description: 'YAKKL platform specific APIs',
    keys: [
      { name: 'YAKKL', description: 'YAKKL platform API key' }
    ]
  }
};