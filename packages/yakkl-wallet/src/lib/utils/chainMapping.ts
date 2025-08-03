// chainMapping.ts - Map chainId to Alchemy Network enum
import { Network } from 'alchemy-sdk';

export function chainIdToAlchemyNetwork(chainId: number): Network | null {
  switch (chainId) {
    case 1:
      return Network.ETH_MAINNET;
    case 5:
      return Network.ETH_GOERLI;
    case 11155111:
      return Network.ETH_SEPOLIA;
    case 137:
      return Network.MATIC_MAINNET;
    case 80001:
      return Network.MATIC_MUMBAI;
    case 42161:
      return Network.ARB_MAINNET;
    case 421613:
      return Network.ARB_GOERLI;
    case 10:
      return Network.OPT_MAINNET;
    case 420:
      return Network.OPT_GOERLI;
    case 8453:
      return Network.BASE_MAINNET;
    case 84531:
      return Network.BASE_GOERLI;
    default:
      return null;
  }
}