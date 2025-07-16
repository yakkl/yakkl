/**
 * Service for handling sensitive cryptographic operations via background context
 * All operations involving private keys, mnemonics, or signing are delegated to the background
 */

import { sendToBackground } from './message.service';
import { log } from '$lib/common/logger-wrapper';

export interface ImportPrivateKeyResult {
  id: string;
  address: string;
  name: string;
  index: number;
}

export interface ImportMnemonicResult {
  id: string;
  address: string;
  name: string;
  index: number;
  isPrimary: boolean;
}

export interface CreateWalletResult {
  id: string;
  address: string;
  name: string;
  index: number;
  mnemonic: string; // Only returned on creation, user must save this
  isPrimary: boolean;
}

export interface DeriveAccountResult {
  id: string;
  address: string;
  name: string;
  index: number;
  primaryAccountId: string;
}

export interface SignResult {
  signature: string;
  address: string;
}

class SensitiveOperationsService {
  /**
   * Import an account from a private key
   * @param privateKey The private key (with or without 0x prefix)
   * @param name Optional account name
   * @param alias Optional account alias
   */
  async importPrivateKey(
    privateKey: string,
    name?: string,
    alias?: string
  ): Promise<ImportPrivateKeyResult> {
    try {
      log.info('SensitiveOperations: Importing private key via background');
      
      const response = await sendToBackground({
        type: 'sensitive.importPrivateKey',
        payload: { privateKey, name, alias }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to import private key';
        throw new Error(errorMessage);
      }

      return response.data as ImportPrivateKeyResult;
    } catch (error) {
      log.error('SensitiveOperations: Import private key failed', false, error);
      throw error;
    }
  }

  /**
   * Import an account from a mnemonic/seed phrase
   * @param mnemonic The mnemonic phrase
   * @param name Optional account name
   * @param derivationPath Optional custom derivation path
   * @param index Optional account index for derivation
   */
  async importMnemonic(
    mnemonic: string,
    name?: string,
    derivationPath?: string,
    index?: number
  ): Promise<ImportMnemonicResult> {
    try {
      log.info('SensitiveOperations: Importing mnemonic via background');
      
      const response = await sendToBackground({
        type: 'sensitive.importMnemonic',
        payload: { mnemonic, name, derivationPath, index }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to import mnemonic';
        throw new Error(errorMessage);
      }

      return response.data as ImportMnemonicResult;
    } catch (error) {
      log.error('SensitiveOperations: Import mnemonic failed', false, error);
      throw error;
    }
  }

  /**
   * Create a new HD wallet
   * @param name Optional wallet name
   * @param entropy Optional entropy for deterministic generation
   */
  async createNewWallet(
    name?: string,
    entropy?: Uint8Array
  ): Promise<CreateWalletResult> {
    try {
      log.info('SensitiveOperations: Creating new wallet via background');
      
      const response = await sendToBackground({
        type: 'sensitive.createNewWallet',
        payload: { name, entropy }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to create wallet';
        throw new Error(errorMessage);
      }

      return response.data as CreateWalletResult;
    } catch (error) {
      log.error('SensitiveOperations: Create wallet failed', false, error);
      throw error;
    }
  }

  /**
   * Derive a sub-account from a primary account
   * @param primaryAccountId The ID of the primary account
   * @param index Optional specific index to derive
   * @param name Optional account name
   */
  async deriveAccount(
    primaryAccountId: string,
    index?: number,
    name?: string
  ): Promise<DeriveAccountResult> {
    try {
      log.info('SensitiveOperations: Deriving account via background');
      
      const response = await sendToBackground({
        type: 'sensitive.deriveAccount',
        payload: { primaryAccountId, index, name }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to derive account';
        throw new Error(errorMessage);
      }

      return response.data as DeriveAccountResult;
    } catch (error) {
      log.error('SensitiveOperations: Derive account failed', false, error);
      throw error;
    }
  }

  /**
   * Sign a message with an account's private key
   * @param address The account address
   * @param message The message to sign
   */
  async signMessage(
    address: string,
    message: string
  ): Promise<SignResult> {
    try {
      log.info('SensitiveOperations: Signing message via background');
      
      const response = await sendToBackground({
        type: 'sensitive.signMessage',
        payload: { address, message }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to sign message';
        throw new Error(errorMessage);
      }

      return response.data as SignResult;
    } catch (error) {
      log.error('SensitiveOperations: Sign message failed', false, error);
      throw error;
    }
  }

  /**
   * Sign typed data (EIP-712)
   * @param address The account address
   * @param domain The EIP-712 domain
   * @param types The EIP-712 types
   * @param value The data to sign
   */
  async signTypedData(
    address: string,
    domain: any,
    types: any,
    value: any
  ): Promise<SignResult> {
    try {
      log.info('SensitiveOperations: Signing typed data via background');
      
      const response = await sendToBackground({
        type: 'sensitive.signTypedData',
        payload: { address, domain, types, value }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to sign typed data';
        throw new Error(errorMessage);
      }

      return response.data as SignResult;
    } catch (error) {
      log.error('SensitiveOperations: Sign typed data failed', false, error);
      throw error;
    }
  }

  /**
   * Get private key for an account (requires PIN verification)
   * This is already implemented in the background as yakkl_getPrivateKey
   */
  async getPrivateKey(address: string): Promise<string> {
    try {
      log.info('SensitiveOperations: Getting private key via background');
      
      const response = await sendToBackground({
        type: 'yakkl_getPrivateKey',
        payload: { address }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to get private key';
        throw new Error(errorMessage);
      }

      return response.data.privateKey;
    } catch (error) {
      log.error('SensitiveOperations: Get private key failed', false, error);
      throw error;
    }
  }
}

// Export singleton instance
export const sensitiveOperations = new SensitiveOperationsService();