import { TransactionService } from '../../../services/transaction.service';
import type { ServiceResponse } from '../../../types';

interface SendParams {
  to: string;
  amount: string;
  tokenAddress?: string;
  gasPrice?: string;
  gasLimit?: string;
}

interface SendResult {
  txHash: string;
  gasUsed?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export class SendService {
  private static instance: SendService;
  private txService: TransactionService | null = null;

  private constructor() {
    // Delay initialization to avoid circular dependencies
  }
  
  private ensureServicesInitialized(): void {
    if (!this.txService) {
      this.txService = TransactionService.getInstance();
    }
  }

  static getInstance(): SendService {
    if (!SendService.instance) {
      SendService.instance = new SendService();
    }
    return SendService.instance;
  }

  async validateSendParams(params: SendParams): Promise<ServiceResponse<boolean>> {
    try {
      // Validate recipient address
      if (!params.to || !this.isValidAddress(params.to)) {
        return {
          success: false,
          error: { hasError: true, message: 'Invalid recipient address' }
        };
      }

      // Validate amount
      const amount = parseFloat(params.amount);
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: { hasError: true, message: 'Invalid amount' }
        };
      }

      // Additional validations can be added here
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Validation failed' 
        }
      };
    }
  }

  async estimateGasForSend(params: SendParams): Promise<ServiceResponse<string>> {
    try {
      const validation = await this.validateSendParams(params);
      if (!validation.success) {
        return validation as unknown as ServiceResponse<string>;
      }

      this.ensureServicesInitialized();
      return await this.txService!.estimateGas({
        to: params.to,
        value: params.amount,
        tokenAddress: params.tokenAddress
      });
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Gas estimation failed' 
        }
      };
    }
  }

  async sendTokens(params: SendParams): Promise<ServiceResponse<SendResult>> {
    try {
      // Validate parameters first
      const validation = await this.validateSendParams(params);
      if (!validation.success) {
        return validation as unknown as ServiceResponse<SendResult>;
      }

      // Send the transaction
      this.ensureServicesInitialized();
      const response = await this.txService!.sendTransaction({
        to: params.to,
        value: params.amount,
        tokenAddress: params.tokenAddress,
        gasPrice: params.gasPrice,
        gasLimit: params.gasLimit
      });

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            txHash: response.data,
            status: 'pending'
          }
        };
      }

      return response as unknown as ServiceResponse<SendResult>;
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Send transaction failed' 
        }
      };
    }
  }

  async getMaxSendAmount(tokenAddress?: string): Promise<ServiceResponse<string>> {
    try {
      // This would get the maximum sendable amount accounting for gas fees
      // For now, we'll use a simple implementation
      return {
        success: true,
        data: tokenAddress ? '999999999' : '0.95' // Leave some ETH for gas
      };
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Failed to calculate max amount' 
        }
      };
    }
  }

  private isValidAddress(address: string): boolean {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}