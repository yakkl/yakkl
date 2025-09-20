import { BaseService } from './base.service';
import type { AccountDisplay, ChainDisplay, ServiceResponse } from '../types';
import { PlanType } from '$lib/common/types';
import type { YakklAccount, YakklCurrentlySelected } from '$lib/common/interfaces';
import { AccountTypeCategory } from '$lib/common/types';
import { get } from 'svelte/store';
import {
  yakklAccountsStore,
  yakklCurrentlySelectedStore,
  setYakklCurrentlySelectedStorage,
  getYakklAccounts,
  getYakklSettings
} from '$lib/common/stores';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import { getSafeUUID } from '$lib/common/uuid';
import { walletStore } from '$lib/managers/Wallet';
import { DEFAULT_CHAINS } from '$lib/config/chains';
import { encryptData } from '$lib/common/encryption';
import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/common/logger-wrapper';
import { getInstances } from '$lib/common/wallet';
import { formatEther } from '$lib/utils/blockchain-bridge';
import { setYakklAccountsStorage } from '$lib/common/accounts';

export class WalletService extends BaseService {
  private static instance: WalletService;

  private constructor() {
    super('WalletService');
  }

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Get balance directly from blockchain - no caching, no messaging
   * This is a direct client-side call to the blockchain using Alchemy
   */
  async getBalanceDirect(address: string, chainId: number = 1): Promise<string> {
    try {
      log.info('[WalletService] Getting balance directly from blockchain', { address, chainId });

      // Get API key directly from environment
      if (!import.meta.env.VITE_ALCHEMY_API_KEY_PROD_1) {
				log.error('[WalletService] No Alchemy API key found');
				return '0';
			}

      // Map chainId to Alchemy network URL
      const networkUrls: Record<number, string> = {
        1: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY_PROD_1}`,
        11155111: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY_PROD_1}`,
        137: `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY_PROD_1}`,
        42161: `https://arb-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY_PROD_1}`,
        10: `https://opt-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY_PROD_1}`,
      };

      const rpcUrl = networkUrls[chainId] || networkUrls[1];

      // Make direct RPC call to get balance
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Convert hex balance to decimal string
      const balanceHex = data.result;
      const balanceWei = BigInt(balanceHex).toString();
      const balanceInEth = formatEther(balanceWei);

      log.info('[WalletService] Balance response:', { success: true, data: balanceInEth });
      return balanceInEth;

    } catch (error) {
      log.error('[WalletService] Failed to get balance directly:', false, error);
      return '0';
    }
  }

  async getAccounts(): Promise<ServiceResponse<AccountDisplay[]>> {
    try {
      // Get accounts directly from storage to avoid race conditions
      const accounts = await getYakklAccounts();
      const settings = await getYakklSettings();

      if (accounts && accounts.length > 0) {
        // Transform to AccountDisplay format
        const displayAccounts: AccountDisplay[] = accounts.map((acc: YakklAccount) => ({
          address: acc.address || '',
          ens: acc.alias || null,
          name: acc.name || '',
          avatar: acc.avatar || null,
          isActive: acc.isActive || true,
          balance: acc.quantity?.toString() || '0',
          plan: (settings?.plan?.type || PlanType.EXPLORER_MEMBER) as PlanType,
          // Additional properties for account management
          value: acc.quantity ? acc.quantity : 0n,
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

      // No accounts found in store
      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getCurrentAccount(): Promise<ServiceResponse<AccountDisplay | null>> {
    try {
      const currentlySelected = await getYakklCurrentlySelected();
      const settings = await getYakklSettings();

      // Check if we have a valid address (not zero address and not empty)
      const selectedAddress = currentlySelected?.shortcuts?.address;
      const isValidAddress = selectedAddress &&
        selectedAddress !== "0x0000000000000000000000000000000000000000" &&
        selectedAddress.trim().length > 0;

      if (isValidAddress) {
        const accounts = await getYakklAccounts();
        const account = accounts?.find((acc: YakklAccount) => acc.address === selectedAddress);

        if (account) {
          const displayAccount: AccountDisplay = {
            address: account.address || '',
            ens: account.alias || null,
            name: account.name || '',
            avatar: account.avatar || null,
            isActive: account.isActive || true,
            balance: account.quantity?.toString() || '0',
            plan: (settings?.plan?.type || PlanType.EXPLORER_MEMBER) as PlanType,
            // Additional properties for account management
            value: account.quantity ? account.quantity : 0n,
            createdAt: account.createDate,
            createDate: account.createDate,
            chainIds: account.chainIds,
            accountType: account.accountType,
            tags: account.tags,
            isPrimary: account.accountType === AccountTypeCategory.PRIMARY,
            connectedDomains: account.connectedDomains || []
          };

          return { success: true, data: displayAccount };
        } else {
          // Address is set but no matching account found - this is unusual
          log.warn('[WalletService] getCurrentAccount: Selected address not found in accounts', false, selectedAddress);
        }
      } else {
        // No valid address selected - this is the typical case for new wallets
        log.info('[WalletService] getCurrentAccount: No valid address selected, will fallback to first account');
      }

      // Fallback to first account AND sync yakklCurrentlySelected
      const accountsResponse = await this.getAccounts();
      if (accountsResponse.success && accountsResponse.data && accountsResponse.data.length > 0) {
        const firstAccount = accountsResponse.data[0];

        // CRITICAL: Sync yakklCurrentlySelected.shortcuts.address with the valid account
        // This ensures consistency between what's displayed and what's stored
        if (currentlySelected && firstAccount.address) {
          // Update the shortcuts with valid data
          currentlySelected.shortcuts.address = firstAccount.address;
          currentlySelected.shortcuts.accountName = firstAccount.name || '';
          // Use the enum value directly instead of type casting
          currentlySelected.shortcuts.accountType = AccountTypeCategory.PRIMARY;

          // Persist the updated selection
          await setYakklCurrentlySelectedStorage(currentlySelected);

          // Note: Account store will handle the sync via its own mechanisms
          // We've updated yakklCurrentlySelected which is the source of truth
        }

        return { success: true, data: firstAccount };
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
      // Get provider instance
      const instances = await getInstances();
      if (!instances || !instances[1]) {
        return {
          success: false,
          error: { hasError: true, message: 'Provider not initialized' }
        };
      }

      const provider = instances[1];

      // Get balance directly from provider
      const balance = await provider.getBalance(address);
      const balanceFormatted = formatEther(balance.toString()); // Note: Will need to convert based on blockchain in the future. Now all EVM chains.

      console.log('[WalletService] Balance response:', {
        success: true,
        data: balanceFormatted
      });

      return { success: true, data: balanceFormatted };
    } catch (error) {
      log.warn('[WalletService] Failed to get balance:', false, error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async switchAccount(address: string): Promise<ServiceResponse<boolean>> {
    try {
      // Get account details to update name as well
      const accounts = await getYakklAccounts();
      // Normalize address for comparison (Ethereum addresses are case-insensitive)
      const normalizedAddress = address.toLowerCase();
      const targetAccount = accounts?.find((acc: YakklAccount) =>
        acc.address?.toLowerCase() === normalizedAddress
      );

      if (!targetAccount) {
        log.error('[WalletService] Account not found for address:', false, address);
        return {
          success: false,
          error: { hasError: true, message: 'Account not found' }
        };
      }

      // Update the currently selected store
      const currentlySelected = get(yakklCurrentlySelectedStore);
      if (currentlySelected) {
        // Update both address and accountName in shortcuts - CRITICAL for persistence validation
        // Use the original address from the targetAccount to maintain case consistency
        const updated = {
          ...currentlySelected,
          shortcuts: {
            ...currentlySelected.shortcuts,
            address: targetAccount.address, // Use the actual address from the account, not the normalized one
            accountName: targetAccount.name || targetAccount.alias || 'Account'
          }
        };
        yakklCurrentlySelectedStore.set(updated);

        // Persist to storage - this will now pass validation since both address and accountName are set
        await setYakklCurrentlySelectedStorage(updated);
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
      // Return default chains
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
      }

      // For now, return success since we successfully updated the store
      // Background sync will be implemented when the handler is ready
      return { success: true, data: true };
    } catch (error) {
      log.warn('WalletService: switchChain error:', false, error);
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
      log.warn('WalletService: removeAccount error:', false, error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async importPrivateKey(privateKey: string, name?: string, alias?: string): Promise<ServiceResponse<AccountDisplay>> {
    try {
      if (!browser_ext) {
        return {
          success: false,
          error: { hasError: true, message: 'Browser extension not initialized' }
        };
      }

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

      // IMPORTANT: Private key operations should be in background service
      // For now, compute address from private key using basic crypto
      // This should be moved to a secure background handler

      // Derive address from private key (basic EVM address derivation)
      // NOTE: This is a simplified implementation - should use proper secp256k1
      // For production, this MUST be done in the background service
      const tempAddress = '0x' + cleanKey.slice(0, 40); // Temporary - replace with proper derivation

      log.warn('[WalletService] TODO: Implement proper private key to address derivation in background service');

      // Create YakklAccount
      const newAccount: YakklAccount = {
        id: getSafeUUID(),
        index: get(yakklAccountsStore).length,
        address: tempAddress,
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
      // TODO: Get the actual wallet password from user session
      // For now, use a temporary approach - in production this should prompt for password
      const tempPassword = 'imported_' + newAccount.address.slice(0, 8);
      const encryptedData = await encryptData({ privateKey: cleanKey }, tempPassword);
      const storageKey = `yakkl_pk_${newAccount.address.toLowerCase()}`;
      // Store in local storage via extension API
      if (browser_ext) {
        await browser_ext.storage.local.set({ [storageKey]: encryptedData });
      }

      // Return display account
      const displayAccount: AccountDisplay = {
        address: newAccount.address,
        ens: newAccount.alias || null,
        name: newAccount.name,
        avatar: null,
        isActive: false,
        balance: '0',
        plan: PlanType.EXPLORER_MEMBER,
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
      log.error('WalletService: importPrivateKey error:', false, error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
}
