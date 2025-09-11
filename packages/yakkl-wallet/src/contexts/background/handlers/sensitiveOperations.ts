/**
 * Background handlers for sensitive cryptographic operations
 * All private key and mnemonic operations should be handled here
 */

import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { getSafeUUID } from '$lib/common/uuid';
import { AccountTypeCategory } from '$lib/common/types';
import type { YakklAccount, PrimaryAccountData, YakklPrimaryAccount, AccountData } from '$lib/common/interfaces';
import {
  getYakklAccounts,
  getYakklPrimaryAccounts,
  setYakklPrimaryAccountsStorage
} from '$lib/common/stores';
import { ethers } from 'ethers-v6';
import { DEFAULT_DERIVED_PATH_ETH } from '$lib/common/constants';
import { setYakklAccountsStorage } from '$lib/common/accounts';

export const sensitiveOperationHandlers: [string, MessageHandlerFunc][] = [
  /**
   * Import account from private key
   * Handles the sensitive operation of creating an account from a private key
   */
  ['sensitive.importPrivateKey', async (payload): Promise<MessageResponse> => {
    try {
      const { privateKey, name, alias } = payload;

      if (!privateKey) {
        throw new Error('Private key is required');
      }

      // Clean the private key
      let cleanKey = privateKey.trim();
      if (!cleanKey.startsWith('0x')) {
        cleanKey = '0x' + cleanKey;
      }

      // Validate private key format
      if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
        throw new Error('Invalid private key format');
      }

      // Create wallet from private key
      const wallet = new ethers.Wallet(cleanKey);

      // Get existing accounts
      const accounts = await getYakklAccounts() || [];

      // Check if address already exists
      const exists = accounts.some(acc =>
        acc.address.toLowerCase() === wallet.address.toLowerCase()
      );

      if (exists) {
        throw new Error('Account already exists');
      }

      // Create new account
      const newAccount: YakklAccount = {
        id: getSafeUUID(),
        index: accounts.length,
        blockchain: 'Ethereum',
        smartContract: false,
        address: wallet.address,
        name: name || 'Imported Account',
        alias: alias || '',
        accountType: AccountTypeCategory.IMPORTED,
        description: '',
        primaryAccount: null,
        connectedDomains: [],
        chainIds: [],
        includeInPortfolio: true,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        data: {
          publicKey: wallet.signingKey.publicKey,
          privateKey: cleanKey
        } as AccountData,
        version: '1'
      };

      // Add to accounts
      accounts.push(newAccount);
      await setYakklAccountsStorage(accounts);

      // Return account info without sensitive data
      return {
        success: true,
        data: {
          id: newAccount.id,
          address: newAccount.address,
          name: newAccount.name,
          index: newAccount.index
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import private key'
      };
    }
  }],

  /**
   * Import account from mnemonic/seed phrase
   */
  ['sensitive.importMnemonic', async (payload): Promise<MessageResponse> => {
    try {
      const { mnemonic, name, derivationPath, index = 0 } = payload;

      if (!mnemonic) {
        throw new Error('Mnemonic is required');
      }

      // Clean and validate mnemonic
      const cleanMnemonic = mnemonic.trim().toLowerCase();
      const words = cleanMnemonic.split(/\s+/);

      if (![12, 15, 18, 21, 24].includes(words.length)) {
        throw new Error('Invalid mnemonic length. Must be 12, 15, 18, 21, or 24 words');
      }

      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(cleanMnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Create wallet from mnemonic
      const path = derivationPath || `${DEFAULT_DERIVED_PATH_ETH}${index}'/0/0`;
      const mnemonicObject = ethers.Mnemonic.fromPhrase(cleanMnemonic);
      const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObject, path);

      // Get existing accounts
      const accounts = await getYakklAccounts() || [];
      const primaryAccounts = await getYakklPrimaryAccounts() || [];

      // Check if address already exists
      const existsInAccounts = accounts.some(acc =>
        acc.address.toLowerCase() === wallet.address.toLowerCase()
      );
      const existsInPrimary = primaryAccounts.some(acc =>
        acc.address.toLowerCase() === wallet.address.toLowerCase()
      );

      if (existsInAccounts || existsInPrimary) {
        throw new Error('Account already exists');
      }

      // Create the primary YakklAccount first
      const primaryYakklAccount: YakklAccount = {
        id: getSafeUUID(),
        index: primaryAccounts.length,
        blockchain: 'Ethereum',
        smartContract: false,
        address: wallet.address,
        name: name || 'Imported Wallet',
        alias: '',
        accountType: AccountTypeCategory.PRIMARY,
        description: '',
        primaryAccount: null,
        connectedDomains: [],
        chainIds: [],
        includeInPortfolio: true,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        data: {
          publicKey: wallet.signingKey.publicKey,
          privateKey: wallet.privateKey,
          path: path,
          pathIndex: index || 0
        } as AccountData,
        version: '1'
      };

      // Create primary account for mnemonic imports
      const primaryAccount: YakklPrimaryAccount = {
        id: getSafeUUID(),
        name: name || 'Imported Wallet',
        address: wallet.address,
        quantity: '0',
        index: primaryAccounts.length,
        data: {
          extendedKey: wallet.extendedKey,
          privateKey: wallet.privateKey,
          publicKey: wallet.signingKey.publicKey,
          path: path,
          pathIndex: index || 0,
          mnemonic: cleanMnemonic,
          entropy: undefined,
          wordCount: words.length,
          wordListLocale: 'en'
        } as PrimaryAccountData,
        account: primaryYakklAccount,
        subIndex: 0,
        subAccounts: [],
        version: '1',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      };

      // Add to primary accounts
      primaryAccounts.push(primaryAccount);
      await setYakklPrimaryAccountsStorage(primaryAccounts);

      // Return account info without sensitive data
      return {
        success: true,
        data: {
          id: primaryAccount.id,
          address: primaryAccount.address,
          name: primaryAccount.name,
          index: primaryAccount.index,
          isPrimary: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import mnemonic'
      };
    }
  }],

  /**
   * Create new HD wallet
   */
  ['sensitive.createNewWallet', async (payload): Promise<MessageResponse> => {
    try {
      const { name, entropy } = payload;

      // Generate entropy if not provided
      const walletEntropy = entropy || ethers.randomBytes(32);
      const mnemonic = ethers.Mnemonic.fromEntropy(walletEntropy);

      if (!mnemonic) {
        throw new Error('Failed to generate mnemonic');
      }

      // Create wallet
      const path = `${DEFAULT_DERIVED_PATH_ETH}0'/0/0`;
      const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, path);

      if (!wallet) {
        throw new Error('Failed to create wallet');
      }

      // Get existing accounts
      const primaryAccounts = await getYakklPrimaryAccounts() || [];

      // Create the primary YakklAccount first
      const primaryYakklAccount: YakklAccount = {
        id: getSafeUUID(),
        index: primaryAccounts.length,
        blockchain: 'Ethereum',
        smartContract: false,
        address: wallet.address,
        name: name || 'Main Wallet',
        alias: '',
        accountType: AccountTypeCategory.PRIMARY,
        description: '',
        primaryAccount: null,
        connectedDomains: [],
        chainIds: [],
        includeInPortfolio: true,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        data: {
          publicKey: wallet.signingKey.publicKey,
          privateKey: wallet.privateKey,
          path: path,
          pathIndex: 0
        } as AccountData,
        version: '1'
      };

      // Create primary account
      const primaryAccount: YakklPrimaryAccount = {
        id: getSafeUUID(),
        name: name || 'Main Wallet',
        address: wallet.address,
        quantity: '0',
        index: primaryAccounts.length,
        data: {
          extendedKey: wallet.extendedKey,
          privateKey: wallet.privateKey,
          publicKey: wallet.signingKey.publicKey,
          path: path,
          pathIndex: 0,
          mnemonic: mnemonic.phrase,
          entropy: walletEntropy.toString(),
          wordCount: mnemonic.phrase.split(' ').length,
          wordListLocale: 'en'
        } as PrimaryAccountData,
        account: primaryYakklAccount,
        subIndex: 0,
        subAccounts: [],
        version: '1',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      };

      // Add to primary accounts
      primaryAccounts.push(primaryAccount);
      await setYakklPrimaryAccountsStorage(primaryAccounts);

      // Return account info without private key but WITH mnemonic for initial display
      return {
        success: true,
        data: {
          id: primaryAccount.id,
          address: primaryAccount.address,
          name: primaryAccount.name,
          index: primaryAccount.index,
          mnemonic: mnemonic.phrase, // User needs to see this once to save it
          isPrimary: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create new wallet'
      };
    }
  }],

  /**
   * Derive sub-account from primary account
   */
  ['sensitive.deriveAccount', async (payload): Promise<MessageResponse> => {
    try {
      const { primaryAccountId, index, name } = payload;

      if (!primaryAccountId) {
        throw new Error('Primary account ID is required');
      }

      // Get primary accounts
      const primaryAccounts = await getYakklPrimaryAccounts() || [];
      const primaryAccount = primaryAccounts.find(acc => acc.id === primaryAccountId);

      if (!primaryAccount) {
        throw new Error('Primary account not found');
      }

      // Get mnemonic from primary account
      const mnemonic = (primaryAccount.data as PrimaryAccountData).mnemonic;
      if (!mnemonic) {
        throw new Error('Primary account does not have a mnemonic');
      }

      // Derive new account
      const accounts = await getYakklAccounts() || [];
      const accountIndex = index !== undefined ? index : accounts.length;
      const path = `${DEFAULT_DERIVED_PATH_ETH}${accountIndex}'/0/0`;

      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);

      // Check if address already exists
      const exists = accounts.some(acc =>
        acc.address.toLowerCase() === wallet.address.toLowerCase()
      );

      if (exists) {
        throw new Error('Derived account already exists');
      }

      // Create derived account
      const derivedAccount: YakklAccount = {
        id: getSafeUUID(),
        index: accounts.length,
        blockchain: 'Ethereum',
        smartContract: false,
        address: wallet.address,
        name: name || `Account ${accountIndex + 1}`,
        alias: '',
        accountType: AccountTypeCategory.SUB,
        description: '',
        primaryAccount: null, // Sub-accounts don't reference primary accounts directly
        connectedDomains: [],
        chainIds: [],
        includeInPortfolio: true,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        data: {
          publicKey: wallet.signingKey.publicKey,
          privateKey: wallet.privateKey,
          path: path,
          pathIndex: accountIndex
        } as AccountData,
        version: '1'
      };

      // Add to accounts
      accounts.push(derivedAccount);
      await setYakklAccountsStorage(accounts);

      // Return account info without sensitive data
      return {
        success: true,
        data: {
          id: derivedAccount.id,
          address: derivedAccount.address,
          name: derivedAccount.name,
          index: derivedAccount.index,
          primaryAccountId: primaryAccount.id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to derive account'
      };
    }
  }],

  /**
   * Sign message with account's private key
   */
  ['sensitive.signMessage', async (payload): Promise<MessageResponse> => {
    try {
      const { address, message } = payload;

      if (!address || !message) {
        throw new Error('Address and message are required');
      }

      // Get account
      const accounts = await getYakklAccounts() || [];
      const primaryAccounts = await getYakklPrimaryAccounts() || [];

      const account = accounts.find(acc =>
        acc.address.toLowerCase() === address.toLowerCase()
      );
      const primaryAccount = primaryAccounts.find(acc =>
        acc.address.toLowerCase() === address.toLowerCase()
      );

      const targetAccount = account || primaryAccount;
      if (!targetAccount) {
        throw new Error('Account not found');
      }

      // Get private key
      let privateKey: string | undefined;
      if ('privateKey' in targetAccount.data) {
        privateKey = targetAccount.data.privateKey;
      }
      if (!privateKey) {
        throw new Error('Private key not found for account');
      }

      // Create wallet and sign
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(message);

      return {
        success: true,
        data: {
          signature,
          address: wallet.address
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign message'
      };
    }
  }],

  /**
   * Sign typed data (EIP-712)
   */
  ['sensitive.signTypedData', async (payload): Promise<MessageResponse> => {
    try {
      const { address, domain, types, value } = payload;

      if (!address || !domain || !types || !value) {
        throw new Error('Address, domain, types, and value are required');
      }

      // Get account
      const accounts = await getYakklAccounts() || [];
      const primaryAccounts = await getYakklPrimaryAccounts() || [];

      const account = accounts.find(acc =>
        acc.address.toLowerCase() === address.toLowerCase()
      );
      const primaryAccount = primaryAccounts.find(acc =>
        acc.address.toLowerCase() === address.toLowerCase()
      );

      const targetAccount = account || primaryAccount;
      if (!targetAccount) {
        throw new Error('Account not found');
      }

      // Get private key
      let privateKey: string | undefined;
      if ('privateKey' in targetAccount.data) {
        privateKey = targetAccount.data.privateKey;
      }
      if (!privateKey) {
        throw new Error('Private key not found for account');
      }

      // Create wallet and sign
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signTypedData(domain, types, value);

      return {
        success: true,
        data: {
          signature,
          address: wallet.address
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign typed data'
      };
    }
  }]
];
