import { BaseService } from './base.service';
import type { Preview2Account, Preview2Chain, ServiceResponse } from '../types';
import { PlanType } from '../types';
import type { YakklAccount, YakklCurrentlySelected } from '$lib/common/interfaces';
import { get } from 'svelte/store';
import { 
  yakklAccountsStore, 
  yakklCurrentlySelectedStore,
  yakklSettingsStore
} from '$lib/common/stores';

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
      // Get from actual YAKKL stores
      const accounts = get(yakklAccountsStore);
      const settings = get(yakklSettingsStore);
      
      if (accounts && accounts.length > 0) {
        // Transform to Preview2Account format
        const preview2Accounts: Preview2Account[] = accounts.map((acc: YakklAccount) => ({
          address: acc.address || '',
          ens: acc.alias || null,
          username: acc.name || '',
          avatar: acc.avatar || null,
          isActive: true,
          balance: acc.quantity?.toString() || '0',
          plan: (settings?.plan?.type || PlanType.Basic) as PlanType
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
          ens: null as string | null,
          username: '',
          avatar: null as string | null,
          isActive: false,
          balance: '0',
          plan: (settings?.plan?.type || PlanType.Basic) as PlanType
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
      const currentlySelected = get(yakklCurrentlySelectedStore);
      const settings = get(yakklSettingsStore);
      
      if (currentlySelected?.shortcuts?.address) {
        const accounts = get(yakklAccountsStore);
        const account = accounts?.find((acc: YakklAccount) => acc.address === currentlySelected.shortcuts.address);
        
        if (account) {
          const preview2Account: Preview2Account = {
            address: account.address || '',
            ens: account.alias || null,
            username: account.name || '',
            avatar: account.avatar || null,
            isActive: true,
            balance: account.quantity?.toString() || '0',
            plan: (settings?.plan?.type || PlanType.Basic) as PlanType
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
      const currentlySelected = get(yakklCurrentlySelectedStore);
      if (currentlySelected) {
        // Update the address in shortcuts
        yakklCurrentlySelectedStore.set({
          ...currentlySelected,
          shortcuts: {
            ...currentlySelected.shortcuts,
            address
          }
        });
      }

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
        const currentlySelected = get(yakklCurrentlySelectedStore);
        if (currentlySelected) {
          yakklCurrentlySelectedStore.set({
            ...currentlySelected,
            shortcuts: {
              ...currentlySelected.shortcuts,
              chainId
            }
          });
        }
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