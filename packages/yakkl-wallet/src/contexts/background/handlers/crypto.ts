// crypto.ts - Background handlers for cryptographic operations

import { ethers } from 'ethers-v6';
import { encryptData, decryptData } from '@yakkl/sdk';
import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { getSafeUUID } from '$lib/common/uuid';
import { dateString } from '$lib/common/datetime';
import type { YakklAccount, AccountData } from '$lib/common/interfaces';
import { AccountTypeCategory } from '$lib/common/types';
import { DEFAULT_PERSONA, VERSION, DEFAULT_DERIVED_PATH_ETH } from '$lib/common/constants';
import { getYakklAccounts, setYakklAccountsStorage } from '$lib/common/accounts';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import { getYakklSettings } from '$lib/common/settings';
import { getMiscStoreAsync } from '$lib/common/miscStore';

export const cryptoHandlers = new Map<string, MessageHandlerFunc>([
  ['yakkl_importPrivateKey', async (payload): Promise<MessageResponse> => {
    try {
      const { accountName, alias, privateKey } = payload;

      // Normalize private key
      let normalizedKey = privateKey;
      if (normalizedKey.startsWith('0x')) {
        normalizedKey = normalizedKey.substring(2);
      }

      // Validate private key
      let wallet: ethers.Wallet;
      try {
        wallet = new ethers.Wallet(normalizedKey);
      } catch (e) {
        return { success: false, error: 'Invalid private key' };
      }

      const address = await wallet.getAddress();

      // Check if account already exists
      const accounts = await getYakklAccounts() || [];
      if (accounts.some((acc: YakklAccount) => acc.address === address)) {
        return { success: false, error: 'Account already exists' };
      }

      // Get current state
      const currentlySelected = await getYakklCurrentlySelected();
      const settings = await getYakklSettings();
      const encryptionPassword = await getMiscStoreAsync() || '';

      if (!encryptionPassword) {
        return { success: false, error: 'Encryption password not found' };
      }

      // Create new account
      const newAccount: YakklAccount = {
        id: getSafeUUID(),
        persona: currentlySelected?.persona || DEFAULT_PERSONA,
        blockchain: currentlySelected?.shortcuts?.network?.blockchain || 'Ethereum',
        smartContract: false,
        address,
        name: accountName,
        alias: alias || undefined,
        description: 'Imported account using private key',
        data: {
          privateKey: normalizedKey,
          publicKey: address,
          path: '' // Imported accounts don't have a derivation path
        } as AccountData,
        quantity: 0n,
        index: -1,
        accountType: AccountTypeCategory.IMPORTED,
        primaryAccount: null,
        class: 'Default',
        includeInPortfolio: true,
        createDate: dateString(),
        updateDate: dateString(),
        version: VERSION,
        chainIds: [currentlySelected?.shortcuts?.chainId || 1],
        tags: [],
        avatar: null,
        connectedDomains: []
      };

      // Encrypt private key
      const encryptedData = await encryptData(newAccount.data, encryptionPassword);
      newAccount.data = encryptedData;

      // Update storage
      accounts.push(newAccount);
      await setYakklAccountsStorage(accounts);

      return {
        success: true,
        data: {
          account: newAccount,
          address,
          name: accountName
        }
      };
    } catch (error) {
      console.error('Error importing private key:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to import private key' };
    }
  }],

  ['yakkl_validateMnemonic', async (payload): Promise<MessageResponse> => {
    try {
      const { mnemonic } = payload;
      const isValid = ethers.Mnemonic.isValidMnemonic(mnemonic.trim());
      return { success: true, data: isValid };
    } catch (error) {
      return { success: false, error: 'Failed to validate mnemonic' };
    }
  }],

  ['yakkl_deriveAccountFromPhrase', async (payload): Promise<MessageResponse> => {
    try {
      const { accountName, alias, mnemonic, accountIndex = 0 } = payload;

      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(mnemonic.trim())) {
        return { success: false, error: 'Invalid recovery phrase' };
      }

      // Derive account at specified index
      const path = `${DEFAULT_DERIVED_PATH_ETH}/${accountIndex}`;
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, path);
      const address = await wallet.getAddress();
      const privateKey = wallet.privateKey.substring(2); // Remove 0x prefix

      // Check if account already exists
      const accounts = await getYakklAccounts() || [];
      if (accounts.some((acc: YakklAccount) => acc.address === address)) {
        return { success: false, error: 'Account already exists' };
      }

      // Get current state
      const currentlySelected = await getYakklCurrentlySelected();
      const settings = await getYakklSettings();
      const encryptionPassword = await getMiscStoreAsync() || '';

      if (!encryptionPassword) {
        return { success: false, error: 'Encryption password not found' };
      }

      // Create new account
      const newAccount: YakklAccount = {
        id: getSafeUUID(),
        persona: currentlySelected?.persona || DEFAULT_PERSONA,
        blockchain: currentlySelected?.shortcuts?.network?.blockchain || 'Ethereum',
        smartContract: false,
        address,
        name: accountName,
        alias: alias || undefined,
        description: 'Account derived from recovery phrase',
        data: {
          privateKey,
          publicKey: address,
          path,
          mnemonic // Store mnemonic for HD accounts (extended property)
        } as AccountData & { mnemonic: string },
        quantity: 0n,
        index: accountIndex,
        accountType: AccountTypeCategory.SUB,
        primaryAccount: null,
        class: 'Default',
        includeInPortfolio: true,
        createDate: dateString(),
        updateDate: dateString(),
        version: VERSION,
        chainIds: [currentlySelected?.shortcuts?.chainId || 1],
        tags: [],
        avatar: null,
        connectedDomains: []
      };

      // Encrypt sensitive data
      const encryptedData = await encryptData(newAccount.data, encryptionPassword);
      newAccount.data = encryptedData;

      // Update storage
      accounts.push(newAccount);
      await setYakklAccountsStorage(accounts);

      return {
        success: true,
        data: {
          account: newAccount,
          address,
          name: accountName
        }
      };
    } catch (error) {
      console.error('Error deriving account from phrase:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to derive account' };
    }
  }],

  ['yakkl_getPrivateKey', async (payload): Promise<MessageResponse> => {
    try {
      const { address } = payload;

      // Get account
      const accounts = await getYakklAccounts() || [];
      const account = accounts.find((acc: YakklAccount) => acc.address === address);

      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      // Get encryption password
      const settings = await getYakklSettings();
      const encryptionPassword = await getMiscStoreAsync() || '';

      if (!encryptionPassword) {
        return { success: false, error: 'Encryption password not found' };
      }

      // Decrypt account data if encrypted
      let decryptedData: AccountData & { mnemonic?: string };
      if ('data' in account.data && 'iv' in account.data) {
        // It's encrypted
        decryptedData = await decryptData(account.data, encryptionPassword) as AccountData & { mnemonic?: string };
      } else {
        // It's not encrypted
        decryptedData = account.data as AccountData & { mnemonic?: string };
      }

      return {
        success: true,
        data: {
          privateKey: decryptedData.privateKey,
          mnemonic: decryptedData.mnemonic || undefined,
          path: decryptedData.path
        }
      };
    } catch (error) {
      console.error('Error getting private key:', error);
      return { success: false, error: 'Failed to retrieve private key' };
    }
  }]
]);
