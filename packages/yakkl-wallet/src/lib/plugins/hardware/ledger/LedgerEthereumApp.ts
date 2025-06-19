// Ledger Ethereum app communication

import { 
  HardwareWalletError, 
  UserRejectedError, 
  WrongAppError,
  type HardwareAccount,
  type TransactionData,
  type SignedTransaction,
  type TypedData
} from '../common/HardwareWalletTypes';
import { LedgerTransport } from './LedgerTransport';
import type { LedgerAppConfig } from './types';

export class LedgerEthereumApp {
  private transport: LedgerTransport;
  private ethApp: any; // Will be typed as AppEth from @ledgerhq/hw-app-eth
  
  constructor() {
    this.transport = LedgerTransport.getInstance();
  }
  
  async initialize(): Promise<void> {
    await this.transport.initialize();
    
    // Lazy load the Ethereum app
    const { default: AppEth } = await import('@ledgerhq/hw-app-eth');
    this.ethApp = AppEth;
  }
  
  async getAddress(
    deviceId: string, 
    derivationPath: string, 
    verify: boolean = false
  ): Promise<HardwareAccount> {
    const transport = this.transport.getTransport(deviceId);
    const eth = new this.ethApp(transport);
    
    try {
      const result = await eth.getAddress(derivationPath, verify);
      
      // Extract index from derivation path
      const pathParts = derivationPath.split('/');
      const index = parseInt(pathParts[pathParts.length - 1]);
      
      return {
        address: result.address,
        derivationPath,
        publicKey: result.publicKey,
        deviceId,
        deviceType: 'ledger',
        chainCode: result.chainCode,
        index
      };
    } catch (error: any) {
      this.handleError(error);
      throw error; // This will never be reached due to handleError throwing
    }
  }
  
  async getAppConfiguration(deviceId: string): Promise<LedgerAppConfig> {
    const transport = this.transport.getTransport(deviceId);
    const eth = new this.ethApp(transport);
    
    try {
      const config = await eth.getAppConfiguration();
      return {
        name: 'Ethereum',
        version: config.version,
        flags: {
          isArbitraryDataEnabled: config.arbitraryDataEnabled === 1
        }
      };
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }
  
  async signTransaction(
    deviceId: string,
    derivationPath: string,
    transaction: TransactionData
  ): Promise<SignedTransaction> {
    const transport = this.transport.getTransport(deviceId);
    const eth = new this.ethApp(transport);
    
    try {
      // Serialize transaction for Ledger
      const tx = this.serializeTransaction(transaction);
      
      const signature = await eth.signTransaction(derivationPath, tx);
      
      return {
        v: signature.v,
        r: signature.r,
        s: signature.s
      };
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }
  
  async signMessage(
    deviceId: string,
    derivationPath: string,
    message: string
  ): Promise<string> {
    const transport = this.transport.getTransport(deviceId);
    const eth = new this.ethApp(transport);
    
    try {
      // Convert message to hex
      const messageHex = Buffer.from(message, 'utf8').toString('hex');
      
      const signature = await eth.signPersonalMessage(derivationPath, messageHex);
      
      // Combine signature components
      const v = parseInt(signature.v, 16);
      const vHex = (v - 27).toString(16).padStart(2, '0');
      
      return `0x${signature.r}${signature.s}${vHex}`;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }
  
  async signTypedData(
    deviceId: string,
    derivationPath: string,
    typedData: TypedData
  ): Promise<string> {
    const transport = this.transport.getTransport(deviceId);
    const eth = new this.ethApp(transport);
    
    try {
      // Check if EIP-712 is supported
      const config = await this.getAppConfiguration(deviceId);
      if (!config.flags.isArbitraryDataEnabled) {
        throw new HardwareWalletError(
          'Please enable "Blind signing" in the Ethereum app settings on your Ledger device',
          'BLIND_SIGNING_DISABLED',
          'ledger'
        );
      }
      
      const signature = await eth.signEIP712Message(derivationPath, typedData);
      
      // Combine signature components
      const v = parseInt(signature.v, 16);
      const vHex = (v - 27).toString(16).padStart(2, '0');
      
      return `0x${signature.r}${signature.s}${vHex}`;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }
  
  private serializeTransaction(tx: TransactionData): string {
    // Import ethers utilities for transaction serialization
    // This is a simplified version - in production, use proper RLP encoding
    const fields = [];
    
    // Add fields in order based on transaction type
    if (tx.type === 2) {
      // EIP-1559 transaction
      fields.push(tx.chainId || '0x1');
      fields.push(tx.nonce || '0x0');
      fields.push(tx.maxPriorityFeePerGas || '0x0');
      fields.push(tx.maxFeePerGas || '0x0');
      fields.push(tx.gasLimit || '0x5208');
      fields.push(tx.to || '0x');
      fields.push(tx.value || '0x0');
      fields.push(tx.data || '0x');
      fields.push([]); // accessList
    } else {
      // Legacy transaction
      fields.push(tx.nonce || '0x0');
      fields.push(tx.gasPrice || '0x0');
      fields.push(tx.gasLimit || '0x5208');
      fields.push(tx.to || '0x');
      fields.push(tx.value || '0x0');
      fields.push(tx.data || '0x');
      fields.push(tx.chainId || '0x1');
      fields.push('0x');
      fields.push('0x');
    }
    
    // This would need proper RLP encoding
    // For now, return a hex string representation
    return fields.join('');
  }
  
  private handleError(error: any): never {
    // Handle common Ledger errors
    if (error.statusCode === 0x6985 || error.message?.includes('Denied by user')) {
      throw new UserRejectedError('ledger');
    }
    
    if (error.statusCode === 0x6511 || error.statusCode === 0x6d00) {
      throw new WrongAppError('Ethereum', 'ledger');
    }
    
    if (error.message?.includes('Ledger device locked')) {
      throw new HardwareWalletError(
        'Please unlock your Ledger device',
        'DEVICE_LOCKED',
        'ledger'
      );
    }
    
    if (error.message?.includes('DisconnectedDevice')) {
      throw new HardwareWalletError(
        'Ledger device disconnected',
        'DEVICE_DISCONNECTED',
        'ledger'
      );
    }
    
    throw new HardwareWalletError(
      `Ledger error: ${error.message || 'Unknown error'}`,
      'LEDGER_ERROR',
      'ledger'
    );
  }
}