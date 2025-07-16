import { BaseService } from './base.service';
import type { AccountDisplay, ChainDisplay, ServiceResponse } from '../types';
import { PlanType } from '../types';
import type { YakklAccount, YakklCurrentlySelected } from '$lib/common/interfaces';
import { AccountTypeCategory } from '$lib/common/types';
import { get } from 'svelte/store';
import {
  yakklAccountsStore,
  yakklCurrentlySelectedStore,
  yakklSettingsStore,
  setYakklAccountsStorage
} from '$lib/common/stores';
import { getSafeUUID } from '$lib/common/uuid';
import { walletStore } from '$lib/managers/Wallet';
import { browser } from '$app/environment';

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
          plan: (settings?.plan?.type || PlanType.Basic) as PlanType,
          // Additional properties for account management
          value: acc.quantity ? parseFloat(acc.quantity.toString()) : 0,
          createdAt: acc.createDate,
          createDate: acc.createDate,
          chainIds: acc.chainIds,
          accountType: acc.accountType,
          tags: acc.tags,
          isPrimary: acc.primaryAccount === null,
          connectedDomains: acc.connectedDomains || []
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
            plan: (settings?.plan?.type || PlanType.Basic) as PlanType,
            // Additional properties for account management
            value: account.quantity ? parseFloat(account.quantity.toString()) : 0,
            createdAt: account.createDate,
            createDate: account.createDate,
            chainIds: account.chainIds,
            accountType: account.accountType,
            tags: account.tags,
            isPrimary: account.primaryAccount === null,
            connectedDomains: account.connectedDomains || []
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

  async removeAccount(address: string): Promise<ServiceResponse<boolean>> {
    try {
      // Get the wallet instance from store
      const walletInstance = get(walletStore);
      if (!walletInstance) {
        return {
          success: false,
          error: { hasError: true, message: 'Wallet not initialized' }
        };
      }

      // Remove account from wallet
      walletInstance.removeAccount(address);

      // Update yakklAccountsStore
      const accounts = get(yakklAccountsStore);
      const updatedAccounts = accounts.filter((acc: YakklAccount) => acc.address !== address);
      yakklAccountsStore.set(updatedAccounts);

      // Save to storage
      await setYakklAccountsStorage(updatedAccounts);

      return { success: true, data: true };
    } catch (error) {
      console.error('WalletService: removeAccount error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async importPrivateKey(privateKey: string, name?: string, alias?: string): Promise<ServiceResponse<AccountDisplay>> {
    try {
      // Import using Wallet manager
      const walletInstance = get(walletStore);
      if (!walletInstance) {
        return {
          success: false,
          error: { hasError: true, message: 'Wallet not initialized' }
        };
      }

      // Remove 0x prefix if present
      const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      
      // Create account from private key
      const { ethers } = await import('ethers-v6');
      const ethersWallet = new ethers.Wallet(cleanKey);
      
      // Create YakklAccount
      const newAccount: YakklAccount = {
        id: getSafeUUID(),
        index: get(yakklAccountsStore).length,
        address: ethersWallet.address,
        name: name || 'Imported Account',
        alias: alias || '',
        accountType: AccountTypeCategory.IMPORTED,
        primaryAccount: null,
        tags: ['imported'],
        chainIds: [1], // Default to mainnet
        createDate: new Date().toISOString(),
        connectedDomains: [],
        blockchain: 'Ethereum',
        smartContract: false,
        avatar: '',
        quantity: 0,
        data: {} as any,
        description: '',
        includeInPortfolio: true,
        version: '1.0.0',
        updateDate: new Date().toISOString()
      };

      // Add to wallet
      walletInstance.addAccount(newAccount);

      // Update yakklAccountsStore
      const accounts = get(yakklAccountsStore);
      accounts.push(newAccount);
      yakklAccountsStore.set(accounts);

      // Save to storage
      await setYakklAccountsStorage(accounts);

      // Store encrypted private key
      const { encryptData } = await import('$lib/common/encryption');
      // TODO: Get the actual wallet password from user session
      // For now, use a temporary approach - in production this should prompt for password
      const tempPassword = 'imported_' + newAccount.address.slice(0, 8);
      const encryptedData = await encryptData({ privateKey: cleanKey }, tempPassword);
      const storageKey = `yakkl_pk_${newAccount.address.toLowerCase()}`;
      // Store in local storage via extension API
      if (browser) {
        const { getBrowserExt } = await import('$lib/common/environment');
        const browserExt = getBrowserExt();
        if (browserExt) {
          await browserExt.storage.local.set({ [storageKey]: encryptedData });
        }
      }

      // Return display account
      const displayAccount: AccountDisplay = {
        address: newAccount.address,
        ens: newAccount.alias || null,
        username: newAccount.name,
        avatar: null,
        isActive: false,
        balance: '0',
        plan: PlanType.Basic,
        accountType: AccountTypeCategory.IMPORTED,
        tags: ['imported'],
        createdAt: newAccount.createDate,
        createDate: newAccount.createDate,
        chainIds: newAccount.chainIds,
        isPrimary: newAccount.primaryAccount === null,
        connectedDomains: newAccount.connectedDomains || [],
        value: 0
      };

      return { success: true, data: displayAccount };
    } catch (error) {
      console.error('WalletService: importPrivateKey error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
}
