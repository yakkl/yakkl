const ethereum = {
  id: 1,
  name: "Ethereum",
  network: "ethereum",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://eth.llamarpc.com"],
    public: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    infura: ["https://mainnet.infura.io/v3"],
    alchemy: ["https://eth-mainnet.g.alchemy.com/v2"],
    quicknode: ["https://eth-mainnet.quicknode.pro"]
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://etherscan.io",
      apiUrl: "https://api.etherscan.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 14353601
    },
    ensRegistry: {
      address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
    },
    ensUniversalResolver: {
      address: "0xE4Acdd618deED4e6d2f03b9bf62dc6118FC9A4da"
    }
  },
  chainType: "EVM"
};
const polygon = {
  id: 137,
  name: "Polygon",
  network: "polygon",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://polygon-rpc.com"],
    public: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
    infura: ["https://polygon-mainnet.infura.io/v3"],
    alchemy: ["https://polygon-mainnet.g.alchemy.com/v2"],
    quicknode: ["https://polygon-mainnet.quicknode.pro"]
  },
  blockExplorers: {
    default: {
      name: "Polygonscan",
      url: "https://polygonscan.com",
      apiUrl: "https://api.polygonscan.com/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 25770160
    }
  },
  chainType: "EVM"
};
const arbitrum = {
  id: 42161,
  name: "Arbitrum One",
  network: "arbitrum",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://arb1.arbitrum.io/rpc"],
    public: ["https://arb1.arbitrum.io/rpc", "https://rpc.ankr.com/arbitrum"],
    infura: ["https://arbitrum-mainnet.infura.io/v3"],
    alchemy: ["https://arb-mainnet.g.alchemy.com/v2"],
    quicknode: ["https://arbitrum-mainnet.quicknode.pro"]
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://arbiscan.io",
      apiUrl: "https://api.arbiscan.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 7654707
    }
  },
  chainType: "EVM"
};
const optimism = {
  id: 10,
  name: "OP Mainnet",
  network: "optimism",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://mainnet.optimism.io"],
    public: ["https://mainnet.optimism.io", "https://rpc.ankr.com/optimism"],
    infura: ["https://optimism-mainnet.infura.io/v3"],
    alchemy: ["https://opt-mainnet.g.alchemy.com/v2"],
    quicknode: ["https://optimism-mainnet.quicknode.pro"]
  },
  blockExplorers: {
    default: {
      name: "Optimistic Etherscan",
      url: "https://optimistic.etherscan.io",
      apiUrl: "https://api-optimistic.etherscan.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 4286263
    }
  },
  chainType: "EVM"
};
const base = {
  id: 8453,
  name: "Base",
  network: "base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://mainnet.base.org"],
    public: ["https://mainnet.base.org", "https://base.llamarpc.com"],
    alchemy: ["https://base-mainnet.g.alchemy.com/v2"],
    quicknode: ["https://base-mainnet.quicknode.pro"]
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://basescan.org",
      apiUrl: "https://api.basescan.org/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 5022
    }
  },
  chainType: "EVM"
};
const bsc = {
  id: 56,
  name: "BNB Smart Chain",
  network: "bsc",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://bsc-dataseed.binance.org"],
    public: [
      "https://bsc-dataseed.binance.org",
      "https://bsc-dataseed1.binance.org",
      "https://bsc-dataseed2.binance.org",
      "https://rpc.ankr.com/bsc"
    ],
    quicknode: ["https://bsc-mainnet.quicknode.pro"]
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: "https://bscscan.com",
      apiUrl: "https://api.bscscan.com/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 15921452
    }
  },
  chainType: "EVM"
};
const avalanche = {
  id: 43114,
  name: "Avalanche",
  network: "avalanche",
  nativeCurrency: {
    name: "AVAX",
    symbol: "AVAX",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://api.avax.network/ext/bc/C/rpc"],
    public: ["https://api.avax.network/ext/bc/C/rpc", "https://rpc.ankr.com/avalanche"],
    infura: ["https://avalanche-mainnet.infura.io/v3"],
    quicknode: ["https://avalanche-mainnet.quicknode.pro"]
  },
  blockExplorers: {
    default: {
      name: "SnowTrace",
      url: "https://snowtrace.io",
      apiUrl: "https://api.snowtrace.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 11907934
    }
  },
  chainType: "EVM"
};
const sepolia = {
  id: 11155111,
  name: "Sepolia",
  network: "sepolia",
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: ["https://rpc.sepolia.org"],
    public: ["https://rpc.sepolia.org", "https://rpc2.sepolia.org"],
    infura: ["https://sepolia.infura.io/v3"],
    alchemy: ["https://eth-sepolia.g.alchemy.com/v2"]
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      apiUrl: "https://api-sepolia.etherscan.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 751532
    }
  },
  testnet: true,
  chainType: "EVM"
};
const chains = {
  ethereum,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  sepolia
};
const chainById = Object.values(chains).reduce(
  (acc, chain) => {
    acc[chain.id] = chain;
    return acc;
  },
  {}
);
function getChainById(chainId) {
  return chainById[chainId];
}
function getChainByNetwork(network) {
  return Object.values(chains).find((chain) => chain.network === network);
}
function isTestnet(chainId) {
  const chain = getChainById(chainId);
  return (chain == null ? void 0 : chain.testnet) || false;
}
function getMainnetChains() {
  return Object.values(chains).filter((chain) => !chain.testnet);
}
function getTestnetChains() {
  return Object.values(chains).filter((chain) => chain.testnet);
}
export {
  arbitrum,
  avalanche,
  base,
  bsc,
  chainById,
  chains,
  ethereum,
  getChainById,
  getChainByNetwork,
  getMainnetChains,
  getTestnetChains,
  isTestnet,
  optimism,
  polygon,
  sepolia
};
//# sourceMappingURL=chains.js.map
