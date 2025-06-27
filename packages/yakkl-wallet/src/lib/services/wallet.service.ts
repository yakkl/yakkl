import { BaseService } from './base.service';
import type { AccountDisplay, ChainDisplay, ServiceResponse } from '../types';
import { PlanType } from '../types';
import type { YakklAccount, YakklCurrentlySelected } from '$lib/common/interfaces';
import { get } from 'svelte/store';
import { 
  yakklAccountsStore, 
  yakklCurrentlySelectedStore,
  yakklSettingsStore
} from '$lib/common/stores';
import { getSafeUUID } from '$lib/common/uuid';

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

  async getAccounts(): Promise<ServiceResponse<AccountDisplay[]>> {
    try {
      // Get from actual YAKKL stores
      const accounts = get(yakklAccountsStore);
      const settings = get(yakklSettingsStore);
      
      if (accounts && accounts.length > 0) {
        // Transform to AccountDisplay format
        const displayAccounts: AccountDisplay[] = accounts.map((acc: YakklAccount) => ({
          address: acc.address || '',
          ens: acc.alias || null,
          username: acc.name || '',
          avatar: acc.avatar || null,
          isActive: true,
          balance: acc.quantity?.toString() || '0',
          plan: (settings?.plan?.type || PlanType.Basic) as PlanType
        }));
        
        return { success: true, data: displayAccounts };
      }

      // If no accounts in store, request from background
      const response = await this.sendMessage<string[]>({
        method: 'eth_accounts'
      });

      if (response.success && response.data) {
        const displayAccounts: AccountDisplay[] = response.data.map(address => ({
          address,
          ens: null as string | null,
          username: '',
          avatar: null as string | null,
          isActive: false,
          balance: '0',
          plan: (settings?.plan?.type || PlanType.Basic) as PlanType
        }));
        
        return { success: true, data: displayAccounts };
      }

      return response as unknown as ServiceResponse<AccountDisplay[]>;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getCurrentAccount(): Promise<ServiceResponse<AccountDisplay | null>> {
    try {
      const currentlySelected = get(yakklCurrentlySelectedStore);
      const settings = get(yakklSettingsStore);
      
      if (currentlySelected?.shortcuts?.address) {
        const accounts = get(yakklAccountsStore);
        const account = accounts?.find((acc: YakklAccount) => acc.address === currentlySelected.shortcuts.address);
        
        if (account) {
          const displayAccount: AccountDisplay = {
            address: account.address || '',
            ens: account.alias || null,
            username: account.name || '',
            avatar: account.avatar || null,
            isActive: true,
            balance: account.quantity?.toString() || '0',
            plan: (settings?.plan?.type || PlanType.Basic) as PlanType
          };
          
          return { success: true, data: displayAccount };
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

  async getChains(): Promise<ServiceResponse<ChainDisplay[]>> {
    try {
      // Import chain configuration
      const { DEFAULT_CHAINS } = await import('$lib/config/chains');
      
      // Get current chain from store if available
      const currentlySelected = get(yakklCurrentlySelectedStore);
      const currentChainId = currentlySelected?.shortcuts?.chainId || 1;
      
      return { success: true, data: DEFAULT_CHAINS };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async switchChain(chainId: number): Promise<ServiceResponse<boolean>> {
    try {
      console.log('WalletService: switchChain called with chainId:', chainId);
      
      // For now, just update the store directly since we may not have a background handler yet
      const currentlySelected = get(yakklCurrentlySelectedStore);
      if (currentlySelected) {
        const updated: YakklCurrentlySelected = {
          ...currentlySelected,
          shortcuts: {
            ...currentlySelected.shortcuts,
            chainId
          }
        };
        yakklCurrentlySelectedStore.set(updated);
        console.log('WalletService: Updated yakklCurrentlySelectedStore with chainId:', chainId);
      }
      
      // For now, return success since we successfully updated the store
      // Background sync will be implemented when the handler is ready
      return { success: true, data: true };
    } catch (error) {
      console.error('WalletService: switchChain error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
}