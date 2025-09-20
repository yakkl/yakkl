import { writable, derived, get } from 'svelte/store';
import type { ChainDisplay } from '$lib/types';
import {
  getObjectFromExtensionStorage,
  setObjectInExtensionStorage
} from '$lib/common/stores';
import { log } from '$lib/common/logger-wrapper';

// Define all available networks (includes unsupported ones for future use)
const ALL_NETWORKS: ChainDisplay[] = [
  {
    key: 'ethereum',
    chainId: 1,
    name: 'Ethereum Mainnet',
    network: 'ethereum',
    icon: '⟠',
    rpcUrl: 'https://eth.llamarpc.com',  // Public RPC, no auth required
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    explorerUrl: 'https://etherscan.io',
    isTestnet: false
  },
  {
    key: 'polygon',
    chainId: 137,
    name: 'Polygon',
    network: 'polygon',
    icon: '🟣',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    explorerUrl: 'https://polygonscan.com',
    isTestnet: false
  },
  {
    key: 'arbitrum',
    chainId: 42161,
    name: 'Arbitrum One',
    network: 'arbitrum',
    icon: '🔵',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    explorerUrl: 'https://arbiscan.io',
    isTestnet: false
  },
  {
    key: 'optimism',
    chainId: 10,
    name: 'Optimism',
    network: 'optimism',
    icon: '🔴',
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    explorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false
  },
  {
    key: 'base',
    chainId: 8453,
    name: 'Base',
    network: 'base',
    icon: '🔵',
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    explorerUrl: 'https://basescan.org',
    isTestnet: false
  },
  // Unsupported chains (commented out but available for future provider support)
  // {
  //   key: 'bsc',
  //   chainId: 56,
  //   name: 'BNB Smart Chain',
  //   network: 'bsc',
  //   icon: '🟡',
  //   rpcUrl: 'https://bsc-dataseed.binance.org',
  //   nativeCurrency: {
  //     name: 'BNB',
  //     symbol: 'BNB',
  //     decimals: 18
  //   },
  //   explorerUrl: 'https://bscscan.com',
  //   isTestnet: false
  // },
  // {
  //   key: 'avalanche',
  //   chainId: 43114,
  //   name: 'Avalanche',
  //   network: 'avalanche',
  //   icon: '🔺',
  //   rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  //   nativeCurrency: {
  //     name: 'AVAX',
  //     symbol: 'AVAX',
  //     decimals: 18
  //   },
  //   explorerUrl: 'https://snowtrace.io',
  //   isTestnet: false
  // }
];

// Get supported chain IDs for Alchemy provider (must match provider-cache.service.ts)
function getSupportedAlchemyChains(): number[] {
  return [
    1,        // Ethereum Mainnet
    5,        // Goerli (deprecated but still supported)
    11155111, // Sepolia
    137,      // Polygon Mainnet
    80001,    // Polygon Mumbai
    42161,    // Arbitrum One
    421613,   // Arbitrum Goerli
    10,       // Optimism
    420,      // Optimism Goerli
    8453,     // Base Mainnet
    84531     // Base Goerli
  ];
}

// Filter networks to only include supported ones
const DEFAULT_NETWORKS: ChainDisplay[] = ALL_NETWORKS.filter(network =>
  getSupportedAlchemyChains().includes(network.chainId)
);

// Testnet networks
const TESTNET_NETWORKS: ChainDisplay[] = [
  {
    key: 'sepolia',
    chainId: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    icon: '🧪',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',  // Public RPC
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true
  },
  {
    key: 'mumbai',
    chainId: 80001,
    name: 'Mumbai',
    network: 'mumbai',
    icon: '🧪',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    explorerUrl: 'https://mumbai.polygonscan.com',
    isTestnet: true
  }
];

const NETWORK_STORAGE_KEY = 'yakklNetworks';
const SELECTED_NETWORK_KEY = 'yakklSelectedNetwork';

interface NetworkStore {
  networks: ChainDisplay[];
  customNetworks: ChainDisplay[];
  selectedChainId: number | null;
  isLoading: boolean;
  error: string | null;
}

function createNetworkStore() {
  const initialState: NetworkStore = {
    networks: [...DEFAULT_NETWORKS],
    customNetworks: [],
    selectedChainId: 1, // Default to Ethereum mainnet
    isLoading: false,
    error: null
  };

  const { subscribe, set, update } = writable<NetworkStore>(initialState);

  // Load saved networks and selection on initialization
  async function initialize() {
    try {
      update(state => ({ ...state, isLoading: true }));

      // Load custom networks
      const savedNetworks = await getObjectFromExtensionStorage<ChainDisplay[]>(NETWORK_STORAGE_KEY);
      const selectedNetwork = await getObjectFromExtensionStorage<number>(SELECTED_NETWORK_KEY);

      update(state => ({
        ...state,
        customNetworks: savedNetworks || [],
        networks: [...DEFAULT_NETWORKS, ...(savedNetworks || [])],
        selectedChainId: selectedNetwork || 1,
        isLoading: false
      }));

      log.info('[NetworkStore] Initialized', false, {
        networkCount: savedNetworks?.length || 0,
        selectedChainId: selectedNetwork || 1
      });
    } catch (error) {
      log.error('[NetworkStore] Failed to initialize', false, error);
      update(state => ({
        ...state,
        error: 'Failed to load networks',
        isLoading: false
      }));
    }
  }

  // Save custom networks to storage
  async function saveNetworks() {
    const state = get({ subscribe });
    try {
      await setObjectInExtensionStorage(NETWORK_STORAGE_KEY, state.customNetworks);
      log.info('[NetworkStore] Saved custom networks', false, {
        count: state.customNetworks.length
      });
    } catch (error) {
      log.error('[NetworkStore] Failed to save networks', false, error);
    }
  }

  // Save selected network to storage
  async function saveSelectedNetwork(chainId: number) {
    try {
      await setObjectInExtensionStorage(SELECTED_NETWORK_KEY, chainId);
      log.info('[NetworkStore] Saved selected network', false, { chainId });
    } catch (error) {
      log.error('[NetworkStore] Failed to save selected network', false, error);
    }
  }

  // Initialize on creation
  initialize();

  return {
    subscribe,

    // Get all networks (default + custom)
    async getAllNetworks(): Promise<ChainDisplay[]> {
      const state = get({ subscribe });
      return state.networks;
    },

    // Get network by chain ID
    getNetwork(chainId: number): ChainDisplay | undefined {
      const state = get({ subscribe });
      return state.networks.find(n => n.chainId === chainId);
    },

    // Get selected network
    getSelectedNetwork(): ChainDisplay | undefined {
      const state = get({ subscribe });
      if (!state.selectedChainId) return undefined;
      return state.networks.find(n => n.chainId === state.selectedChainId);
    },

    // Select a network
    async selectNetwork(chainId: number): Promise<void> {
      const state = get({ subscribe });
      const network = state.networks.find(n => n.chainId === chainId);
      
      if (!network) {
        throw new Error(`Network with chainId ${chainId} not found`);
      }

      update(s => ({ ...s, selectedChainId: chainId }));
      await saveSelectedNetwork(chainId);
      
      log.info('[NetworkStore] Selected network', false, {
        chainId,
        name: network.name
      });
    },

    // Add a custom network
    async addCustomNetwork(network: ChainDisplay): Promise<void> {
      const state = get({ subscribe });
      
      // Check if network already exists
      if (state.networks.some(n => n.chainId === network.chainId)) {
        throw new Error(`Network with chainId ${network.chainId} already exists`);
      }

      update(s => ({
        ...s,
        customNetworks: [...s.customNetworks, network],
        networks: [...s.networks, network]
      }));

      await saveNetworks();
      
      log.info('[NetworkStore] Added custom network', false, {
        chainId: network.chainId,
        name: network.name
      });
    },

    // Update a custom network
    async updateCustomNetwork(chainId: number, updates: Partial<ChainDisplay>): Promise<void> {
      update(s => {
        const customIndex = s.customNetworks.findIndex(n => n.chainId === chainId);
        const networkIndex = s.networks.findIndex(n => n.chainId === chainId);
        
        if (customIndex === -1) {
          throw new Error(`Custom network with chainId ${chainId} not found`);
        }

        const updatedNetwork = { ...s.customNetworks[customIndex], ...updates };
        
        s.customNetworks[customIndex] = updatedNetwork;
        s.networks[networkIndex] = updatedNetwork;
        
        return { ...s };
      });

      await saveNetworks();
      
      log.info('[NetworkStore] Updated custom network', false, {
        chainId,
        updates
      });
    },

    // Remove a custom network
    async removeCustomNetwork(chainId: number): Promise<void> {
      const state = get({ subscribe });
      
      // Can't remove default networks
      if (DEFAULT_NETWORKS.some(n => n.chainId === chainId)) {
        throw new Error('Cannot remove default network');
      }

      update(s => ({
        ...s,
        customNetworks: s.customNetworks.filter(n => n.chainId !== chainId),
        networks: s.networks.filter(n => n.chainId !== chainId),
        selectedChainId: s.selectedChainId === chainId ? 1 : s.selectedChainId
      }));

      await saveNetworks();
      
      // If removed network was selected, save new selection
      if (state.selectedChainId === chainId) {
        await saveSelectedNetwork(1);
      }
      
      log.info('[NetworkStore] Removed custom network', false, { chainId });
    },

    // Add testnet networks
    enableTestnets(): void {
      update(s => ({
        ...s,
        networks: [...DEFAULT_NETWORKS, ...TESTNET_NETWORKS, ...s.customNetworks]
      }));
      
      log.info('[NetworkStore] Enabled testnet networks');
    },

    // Remove testnet networks
    disableTestnets(): void {
      update(s => ({
        ...s,
        networks: [...DEFAULT_NETWORKS, ...s.customNetworks]
      }));
      
      log.info('[NetworkStore] Disabled testnet networks');
    },

    // Reset to default networks
    async resetToDefaults(): Promise<void> {
      update(s => ({
        ...s,
        networks: [...DEFAULT_NETWORKS],
        customNetworks: [],
        selectedChainId: 1
      }));

      await setObjectInExtensionStorage(NETWORK_STORAGE_KEY, []);
      await setObjectInExtensionStorage(SELECTED_NETWORK_KEY, 1);
      
      log.info('[NetworkStore] Reset to default networks');
    }
  };
}

// Create and export the store
export const networkStore = createNetworkStore();

// Derived stores
export const selectedNetwork = derived(
  networkStore,
  $store => $store.networks.find(n => n.chainId === $store.selectedChainId)
);

export const isTestnetEnabled = derived(
  networkStore,
  $store => $store.networks.some(n => n.isTestnet === true)
);

// Export helper function to get store instance
export function getNetworkStore() {
  return networkStore;
}