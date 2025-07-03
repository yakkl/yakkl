import type { ChainDisplay } from '$lib/types';

// Default chain configurations with explorer URLs
export const DEFAULT_CHAINS: ChainDisplay[] = [
  {
    key: 'eth-mainnet',
    name: 'Ethereum',
    network: 'Mainnet',
    icon: '/images/eth.svg',
    isTestnet: false,
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || ''
  },
  {
    key: 'eth-sepolia',
    name: 'Ethereum',
    network: 'Sepolia',
    icon: '/images/eth.svg',
    isTestnet: true,
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || ''
  },
  {
    key: 'eth-goerli',
    name: 'Ethereum',
    network: 'Goerli',
    icon: '/images/eth.svg',
    isTestnet: true,
    chainId: 5,
    rpcUrl: 'https://goerli.infura.io/v3/YOUR_KEY',
    explorerUrl: 'https://goerli.etherscan.io',
    explorerApiUrl: 'https://api-goerli.etherscan.io/api',
    explorerApiKey: process.env.ETHERSCAN_API_KEY || ''
  },
  {
    key: 'polygon-mainnet',
    name: 'Polygon',
    network: 'Mainnet',
    icon: '🟣',
    isTestnet: false,
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    explorerApiKey: ''
  },
  {
    key: 'polygon-mumbai',
    name: 'Polygon',
    network: 'Mumbai',
    icon: '🟣',
    isTestnet: true,
    chainId: 80001,
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    explorerApiUrl: 'https://api-testnet.polygonscan.com/api',
    explorerApiKey: ''
  },
  {
    key: 'bsc-mainnet',
    name: 'BNB Chain',
    network: 'Mainnet',
    icon: '🟡',
    isTestnet: false,
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    explorerApiUrl: 'https://api.bscscan.com/api',
    explorerApiKey: ''
  },
  {
    key: 'bsc-testnet',
    name: 'BNB Chain',
    network: 'Testnet',
    icon: '🟡',
    isTestnet: true,
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    explorerApiUrl: 'https://api-testnet.bscscan.com/api',
    explorerApiKey: ''
  },
  {
    key: 'avalanche-mainnet',
    name: 'Avalanche',
    network: 'C-Chain',
    icon: '🔺',
    isTestnet: false,
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    explorerApiUrl: 'https://api.snowtrace.io/api',
    explorerApiKey: ''
  },
  {
    key: 'avalanche-fuji',
    name: 'Avalanche',
    network: 'Fuji',
    icon: '🔺',
    isTestnet: true,
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    explorerApiUrl: 'https://api-testnet.snowtrace.io/api',
    explorerApiKey: ''
  },
  {
    key: 'arbitrum-mainnet',
    name: 'Arbitrum',
    network: 'One',
    icon: '🔷',
    isTestnet: false,
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    explorerApiKey: ''
  },
  {
    key: 'arbitrum-goerli',
    name: 'Arbitrum',
    network: 'Goerli',
    icon: '🔷',
    isTestnet: true,
    chainId: 421613,
    rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://goerli.arbiscan.io',
    explorerApiUrl: 'https://api-goerli.arbiscan.io/api',
    explorerApiKey: ''
  },
  {
    key: 'optimism-mainnet',
    name: 'Optimism',
    network: 'Mainnet',
    icon: '🔴',
    isTestnet: false,
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
    explorerApiKey: ''
  },
  {
    key: 'optimism-goerli',
    name: 'Optimism',
    network: 'Goerli',
    icon: '🔴',
    isTestnet: true,
    chainId: 420,
    rpcUrl: 'https://goerli.optimism.io',
    explorerUrl: 'https://goerli-optimism.etherscan.io',
    explorerApiUrl: 'https://api-goerli-optimistic.etherscan.io/api',
    explorerApiKey: ''
  },
  {
    key: 'base-mainnet',
    name: 'Base',
    network: 'Mainnet',
    icon: '🔵',
    isTestnet: false,
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    explorerApiKey: ''
  },
  {
    key: 'fantom-mainnet',
    name: 'Fantom',
    network: 'Opera',
    icon: '👻',
    isTestnet: false,
    chainId: 250,
    rpcUrl: 'https://rpc.ftm.tools',
    explorerUrl: 'https://ftmscan.com',
    explorerApiUrl: 'https://api.ftmscan.com/api',
    explorerApiKey: ''
  }
];

// Helper function to get chain by ID
export function getChainById(chainId: number): ChainDisplay | undefined {
  return DEFAULT_CHAINS.find(chain => chain.chainId === chainId);
}

// Helper function to get explorer URL for a transaction
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const chain = getChainById(chainId);
  if (chain?.explorerUrl) {
    return `${chain.explorerUrl}/tx/${txHash}`;
  }
  // Default to Etherscan
  return `https://etherscan.io/tx/${txHash}`;
}

// Helper function to get explorer URL for an address
export function getExplorerAddressUrl(chainId: number, address: string): string {
  const chain = getChainById(chainId);
  if (chain?.explorerUrl) {
    return `${chain.explorerUrl}/address/${address}`;
  }
  // Default to Etherscan
  return `https://etherscan.io/address/${address}`;
}

// Helper function to get explorer API configuration
export function getExplorerApiConfig(chainId: number) {
  const chain = getChainById(chainId);
  if (chain) {
    return {
      name: chain.name,
      baseUrl: chain.explorerApiUrl || '',
      apiKey: chain.explorerApiKey || '',
      chainId: chain.chainId
    };
  }
  return null;
}
