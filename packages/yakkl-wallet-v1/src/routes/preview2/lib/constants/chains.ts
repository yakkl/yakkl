/**
 * Chain constants - only what preview2 actually uses
 */

export const SUPPORTED_CHAINS = {
  ETH_MAINNET: {
    id: 1,
    name: 'Ethereum',
    network: 'Mainnet',
    symbol: 'ETH',
    icon: '/images/eth.svg',
    isTestnet: false,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2',
    blockExplorer: 'https://etherscan.io'
  },
  ETH_SEPOLIA: {
    id: 11155111,
    name: 'Ethereum',
    network: 'Sepolia',
    symbol: 'ETH',
    icon: '/images/eth.svg',
    isTestnet: true,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  POLYGON_MAINNET: {
    id: 137,
    name: 'Polygon',
    network: 'Mainnet',
    symbol: 'MATIC',
    icon: '/images/polygon.svg',
    isTestnet: false,
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
    blockExplorer: 'https://polygonscan.com'
  }
} as const;

export const DEFAULT_CHAIN = SUPPORTED_CHAINS.ETH_MAINNET;
export const DEFAULT_TESTNET = SUPPORTED_CHAINS.ETH_SEPOLIA;

export type ChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]['id'];
export type Chain = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];