import { log } from '$lib/managers/Logger';
import { KeyManager } from '$lib/managers/KeyManager';
import WalletManager from '$lib/managers/WalletManager';
import type { YakklCurrentlySelected, YakklResponse } from '$lib/common/interfaces';
import { getYakklCurrentlySelected } from '$lib/common/stores';
import { STORAGE_YAKKL_ACCOUNTS } from '$lib/common';
import type { YakklAccount } from '$lib/common';
import type { Wallet } from '$lib/managers/Wallet';
import type { EthereumSigner } from '$lib/managers/blockchains/evm/ethereum/EthereumSigner';
import { getObjectFromLocalStorage } from '$lib/common/backgroundStorage';
import type { Signer } from '$lib/managers/Signer';
import { decryptDataBackground } from '$lib/common/listeners/background/unifiedMessageListener';

export class SigningManager {
  private static instance: SigningManager | null = null;
  private keyManager: KeyManager;
  private walletManager: Wallet;
  private currentlySelected: YakklCurrentlySelected;
  private address: string | null = null;

  private constructor(keyManager: KeyManager) {
    this.keyManager = keyManager;
  }

  public static async getInstance(): Promise<SigningManager> {
    if (!SigningManager.instance) {
      const keyManager = await KeyManager.getInstance();
      SigningManager.instance = new SigningManager(keyManager);
      await SigningManager.instance.initialize();
    }
    return SigningManager.instance;
  }

  private async initialize() {
    try {
      this.currentlySelected = await getYakklCurrentlySelected();
      if (!this.currentlySelected) {
        throw new Error('No currently selected account found');
      }

      // Move to a function that gets the api key based on the chainId and network
      const apiKey = this.keyManager.getKey('ALCHEMY_API_KEY_PROD');

      if (!apiKey) {
        log.warn('API key not found in environment variables, using fallback');
        // Don't throw error, just log warning and continue
      }

      log.info('SigningManager - initialize: 1', false, {apiKey});

      this.walletManager = WalletManager.getInstance(
        ['Alchemy'],
        ['Ethereum'],
        this.currentlySelected.shortcuts.chainId ?? 1,
        apiKey || '' // Allow empty string as fallback
      );

      log.info('SigningManager - initialize: 2', false, {walletManager: this.walletManager});

    } catch (error) {
      log.error('Error in SignManager initialize:', false, error);
      throw error; // Re-throw to let caller handle it
    }
  }

  public getAddress(): string | null {
    return this.address;
  }

  public setAddress(address: string) {
    this.address = address;
  }

  private getSigningAddress(method: string, params: any[]): string {
    log.info('SigningManager - getSigningAddress: 1', false, {method, params});
    switch (method) {
      case 'personal_sign':
        return params[1]; // address is second param
      case 'eth_signTypedData_v4':
        return params[0]; // address is first param
      default:
        throw new Error(`Unsupported signing method: ${method}`);
    }
  }

  public async handleSigningRequest(
    requestId: string,
    method: string,
    params: any[],
    token: string
  ): Promise<YakklResponse> {
    try {
      const accounts = await getObjectFromLocalStorage<YakklAccount[]>(STORAGE_YAKKL_ACCOUNTS);
      if (!accounts) {
        throw new Error('No accounts found');
      }

      const signingAddress = this.getSigningAddress(method, params);
      if (!signingAddress) {
        throw new Error('No signing address found in request');
      }

      const account = accounts.find(acc => acc.address.toLowerCase() === signingAddress.toLowerCase());
      if (!account || !account.data) {
        throw new Error('Account not found for signing address');
      }

      const data = await decryptDataBackground(account.data, token);
      log.info('SigningManager - handleSigningRequest: DECRYPT_DATA', false, { account, token, data });

      if (!data || !data.privateKey) {
        throw new Error('No private key found for account');
      }

      this.setAddress(account.address);
      this.walletManager.setSigner(data.privateKey);

      let signedData: string;
      switch (method) {
        case 'personal_sign':
          signedData = await this.handlePersonalSign(account, params);
          break;
        case 'eth_signTypedData_v4':
          signedData = await this.handleSignTypedData(account, params);
          break;
        default:
          throw new Error('Unsupported signing method');
      }

      log.info('SigningManager - handleSigningRequest: 7', false, { signedData });
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: requestId,
        method,
        result: signedData
      };

    } catch (error) {
      log.error('Error in handleSigningRequest:', false, { error });
      return this.errorResponse(requestId, error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  private errorResponse(id: string, message: string): YakklResponse {
    return {
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      error: {
      code: 4001,
      message
      }
    };
  }

  private async handlePersonalSign(account: YakklAccount, params: any[]): Promise<string> {
    try {
      const [message, address] = params;
      log.info('SigningManager - handlePersonalSign: 1', false, {message, address, account});
      if (!message || !address) {
        throw new Error('Invalid parameters for personal_sign');
      }

      const blockchain = this.walletManager.getBlockchain();
      log.info('SigningManager - handlePersonalSign: 2', false, {blockchain});

      const signer: Signer = blockchain.getSigner() as Signer;

      if (!signer) {
        throw new Error('No signer available');
      }
      const signedMessage = await signer.signMessage(message);

      log.info('SigningManager - handlePersonalSign: 3', false, {signedMessage});
      return signedMessage;
    } catch (error) {
      log.error('Error in handlePersonalSign:', false, { error });
      throw error;
    }
  }

  private async handleSignTypedData(account: YakklAccount, params: any[]): Promise<string> {
    try {
      const [address, typedData] = params;
      log.info('SigningManager - handleSignTypedData: 1', false, {address, typedData, account});
      if (!address || !typedData) {
        throw new Error('Invalid parameters for eth_signTypedData_v4');
      }

      const blockchain = this.walletManager.getBlockchain();
      log.info('SigningManager - handleSignTypedData: 2', false, {blockchain});
      const signer = blockchain.getSigner() as EthereumSigner;
      if (!signer) {
        throw new Error('No signer available');
      }

      // Parse the typed data into the expected format
      const { domain, types, message } = typeof typedData === 'string' ? JSON.parse(typedData) : typedData;

      const signedMessage = await signer.signTypedData(
        domain,
        types,
        message
      );
      log.info('SigningManager - handleSignTypedData: 3', false, {signedMessage});

      return signedMessage;
    } catch (error) {
      log.error('Error in handleSignTypedData:', false, { error });
      throw error;
    }
  }
}

export const getSigningManager = () => SigningManager.getInstance();
