import { log } from '$lib/plugins/Logger';
import { KeyManager } from '$lib/plugins/KeyManager';
import WalletManager from '$lib/plugins/WalletManager';
import type { YakklCurrentlySelected, YakklRequest, YakklResponse } from '$lib/common/interfaces';
import { getMiscStore, getYakklCurrentlySelected } from '$lib/common/stores';
import { verify } from '$lib/common/security';
import { getYakklAccounts } from '$lib/common/stores';
import { isEncryptedData } from '$lib/common';
import { decryptData } from '$lib/common/encryption';
import type { AccountData, YakklAccount } from '$lib/common';
import type { Wallet } from '$lib/plugins';

export class SigningManager {
  private static instance: SigningManager | null = null;
  private keyManager: KeyManager;
  private walletManager: Wallet;
  private currentlySelected: YakklCurrentlySelected;
  private address: string | null = null;

  private constructor() {
    this.keyManager = KeyManager.getInstance();
    this.initialize();
  }

  private async initialize() {
    try {
      this.currentlySelected = await getYakklCurrentlySelected();
      if (!this.currentlySelected) {
        throw new Error('No currently selected account found');
      }

      // Use a more reliable way to access the environment variable
      const apiKey = process.env.ALCHEMY_API_KEY_PROD ||
                    process.env.VITE_ALCHEMY_API_KEY_PROD ||
                    import.meta.env.VITE_ALCHEMY_API_KEY_PROD;

      if (!apiKey) {
        throw new Error('API key not found in environment variables');
      }

      this.walletManager = WalletManager.getInstance(
        ['Alchemy'],
        ['Ethereum'],
        this.currentlySelected.shortcuts.chainId ?? 1,
        apiKey
      );
    } catch (error) {
      log.error('Error in SignManager initialize:', false, error );
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: 'error',
        error: {
          code: 4001,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }

  public static getInstance(): SigningManager {
    if (!SigningManager.instance) {
      SigningManager.instance = new SigningManager();
    }
    return SigningManager.instance;
  }

  public getAddress(): string | null {
    return this.address;
  }

  public setAddress(address: string) {
    this.address = address;
  }

  private getSigningAddress(method: string, params: any[]): string {
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
    params: any[]
  ): Promise<YakklResponse> {
    try {
      // Get credentials
      const yakklMisc = getMiscStore();
      log.info('SigningManager - handleSigningRequest:', false, {yakklMisc});
      if (!yakklMisc) {
        return {
          type: 'YAKKL_RESPONSE:EIP6963',
          id: requestId,
          error: {
            code: 4001,
            message: 'No credentials found'
          }
        };
      }

      // Get accounts
      const accounts = await getYakklAccounts();
      log.info('SigningManager - handleSigningRequest: 2', false, {accounts});
      if (!accounts) {
        return {
          type: 'YAKKL_RESPONSE:EIP6963',
          id: requestId,
          error: {
            code: 4001,
            message: 'No accounts found'
          }
        };
      }

      // Get the address from the signing request params
      const signingAddress = this.getSigningAddress(method, params);
      log.info('SigningManager - handleSigningRequest: 3', false, {signingAddress});
      if (!signingAddress) {
        return {
          type: 'YAKKL_RESPONSE:EIP6963',
          id: requestId,
          error: {
            code: 4001,
            message: 'No signing address found in request'
          }
        };
      }

      // Find the account that matches the signing address
      const account = accounts.find(acc => acc.address.toLowerCase() === signingAddress.toLowerCase());
      log.info('SigningManager - handleSigningRequest: 4', false, {account});
      if (!account || !account.data) {
        return {
          type: 'YAKKL_RESPONSE:EIP6963',
          id: requestId,
          error: {
            code: 4001,
            message: 'Account not found for signing address'
          }
        };
      }

      // Decrypt account data if needed
      if (isEncryptedData(account.data)) {
        await decryptData(account.data, yakklMisc).then(result => {
          account.data = result as AccountData;
        });
      }

      log.info('SigningManager - handleSigningRequest: 5', false, {account});
      if (!(account.data as AccountData).privateKey) {
        return {
          type: 'YAKKL_RESPONSE:EIP6963',
          id: requestId,
          error: {
            code: 4001,
            message: 'No private key found for account'
          }
        };
      }

      // Set the address for the signer
      this.setAddress(account.address);
      log.info('SigningManager - handleSigningRequest: 6', false, {account});
      // Perform signing based on method
      let signedData: string;
      switch (method) {
        case 'personal_sign':
          signedData = await this.handlePersonalSign(account, params);
          break;
        case 'eth_signTypedData_v4':
          signedData = await this.handleSignTypedData(account, params);
          break;
        default:
          return {
            type: 'YAKKL_RESPONSE:EIP6963',
            id: requestId,
            error: {
              code: 4001,
              message: 'Unsupported signing method'
            }
          };
      }

      log.info('SigningManager - handleSigningRequest: 7', false, {signedData});
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: requestId,
        result: signedData
      };

    } catch (error) {
      log.error('Error in handleSigningRequest:', false, { error });
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: requestId,
        error: {
          code: 4001,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }

  private async handlePersonalSign(account: YakklAccount, params: any[]): Promise<string> {
    const [message, address] = params;
    log.info('SigningManager - handlePersonalSign: 1', false, {message, address});
    if (!message || !address) {
      throw new Error('Invalid parameters for personal_sign');
    }

    const blockchain = this.walletManager.getBlockchain();
    log.info('SigningManager - handlePersonalSign: 2', false, {blockchain});
    const signedMessage = await blockchain.getProvider().signMessage(message);
    log.info('SigningManager - handlePersonalSign: 3', false, {signedMessage});
    return signedMessage;
  }

  private async handleSignTypedData(account: YakklAccount, params: any[]): Promise<string> {
    const [address, typedData] = params;
    log.info('SigningManager - handleSignTypedData: 1', false, {address, typedData});
    if (!address || !typedData) {
      throw new Error('Invalid parameters for eth_signTypedData_v4');
    }

    const blockchain = this.walletManager.getBlockchain();
    log.info('SigningManager - handleSignTypedData: 2', false, {blockchain});
    // @ts-ignore 
    const signedMessage = await blockchain.signTypedData({
      data: JSON.stringify(typedData),
      type: 1 // EIP-712 type
    });
    log.info('SigningManager - handleSignTypedData: 3', false, {signedMessage});
    return signedMessage;
  }
}

export const signingManager = SigningManager.getInstance();
