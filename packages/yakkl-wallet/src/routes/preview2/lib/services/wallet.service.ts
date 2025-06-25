import { BaseService } from './base.service';
import type { Preview2Account, Preview2Chain, ServiceResponse } from '../types';
// Mock account stores for Preview 2.0
const yakklAccountStore = {
  subscribe: () => () => {},
  get: (): any[] => []
};
const yakklCurrentlySelectedStore = {
  subscribe: () => () => {},
  get: (): any => null
};
import { get } from 'svelte/store';

export class WalletService extends BaseService {
  private static instance: WalletService;

  private constructor() {
    super();
  }

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  async getAccounts(): Promise<ServiceResponse<Preview2Account[]>> {
    try {
      // First try to get from store
      const accounts = yakklAccountStore.get();
      
      if (accounts && (accounts as any[]).length > 0) {
        const preview2Accounts: Preview2Account[] = (accounts as any[]).map((acc: any) => ({
          address: acc.address,
          ens: acc.alias || null,
          username: acc.name,
          avatar: acc.avatar || null,
          isActive: true,
          balance: acc.quantity?.toString() || '0',
          plan: 'basic' as any // TODO: Get from user settings
        }));
        
        return { success: true, data: preview2Accounts };
      }

      // If no accounts in store, request from background
      const response = await this.sendMessage<string[]>({
        method: 'eth_accounts'
      });

      if (response.success && response.data) {
        const preview2Accounts: Preview2Account[] = response.data.map(address => ({
          address,
          ens: null as any,
          isActive: false,
          plan: 'basic' as any
        }));
        
        return { success: true, data: preview2Accounts };
      }

      return response as unknown as ServiceResponse<Preview2Account[]>;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getCurrentAccount(): Promise<ServiceResponse<Preview2Account | null>> {
    try {
      const currentlySelected = yakklCurrentlySelectedStore.get();
      
      if ((currentlySelected as any)?.address) {
        const accounts = yakklAccountStore.get();
        const account = (accounts as any[]).find((acc: any) => acc.address === (currentlySelected as any).address);
        
        if (account) {
          const preview2Account: Preview2Account = {
            address: account.address,
            ens: (account as any).alias || null,
            username: account.name,
            avatar: account.avatar || null,
            isActive: true,
            balance: account.quantity?.toString() || '0',
            plan: 'basic' as any // TODO: Get from user settings
          };
          
          return { success: true, data: preview2Account };
        }
      }

      // Fallback to first account
      const accountsResponse = await this.getAccounts();
      if (accountsResponse.success && accountsResponse.data && accountsResponse.data.length > 0) {
        return { success: true, data: accountsResponse.data[0] };
      }

      return { success: true, data: null };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getBalance(address: string): Promise<ServiceResponse<string>> {
    try {
      const response = await this.sendMessage<string>({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async switchAccount(address: string): Promise<ServiceResponse<boolean>> {
    try {
      // Update the currently selected store
      // yakklCurrentlySelectedStore.set({ // Mock store doesn't have set method
      //   address,
      //   chainId: (get(yakklCurrentlySelectedStore) as any)?.chainId || 1
      // });

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getChains(): Promise<ServiceResponse<Preview2Chain[]>> {
    try {
      // For now, return predefined chains
      // TODO: Get from network configuration
      const chains: Preview2Chain[] = [
        {
          key: 'eth-mainnet',
          name: 'Ethereum',
          network: 'Mainnet',
          icon: '/images/eth.svg',
          isTestnet: false,
          chainId: 1,
          rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY'
        },
        {
          key: 'eth-sepolia',
          name: 'Ethereum',
          network: 'Sepolia',
          icon: '/images/eth.svg',
          isTestnet: true,
          chainId: 11155111,
          rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY'
        },
        {
          key: 'polygon-mainnet',
          name: 'Polygon',
          network: 'Mainnet',
          icon: '/images/polygon.svg',
          isTestnet: false,
          chainId: 137,
          rpcUrl: 'https://polygon-rpc.com'
        }
      ];

      return { success: true, data: chains };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async switchChain(chainId: number): Promise<ServiceResponse<boolean>> {
    try {
      const response = await this.sendMessage<boolean>({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });

      if (response.success) {
        // Update the currently selected store
        // yakklCurrentlySelectedStore.update((current: any) => ({ // Mock store doesn't have update method
        //   ...current,
        //   chainId
        // }));
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
}