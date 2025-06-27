import { BaseService } from './base.service';
import type { TransactionDisplay, ServiceResponse } from '../types';
import { ethers } from 'ethers';
import { get } from 'svelte/store';
import { currentAccount } from '../stores/account.store';
import { currentChain } from '../stores/chain.store';

interface SendTransactionParams {
  to: string;
  value: string;
  tokenAddress?: string;
  gasPrice?: string;
  gasLimit?: string;
}

export class TransactionService extends BaseService {
  private static instance: TransactionService;

  private constructor() {
    super();
  }

  static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  async sendTransaction(params: SendTransactionParams): Promise<ServiceResponse<string>> {
    try {
      const account = get(currentAccount);
      const chain = get(currentChain);
      
      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      // Build transaction
      const txParams: any = {
        from: account.address,
        to: params.to,
        value: params.tokenAddress ? '0x0' : ethers.parseEther(params.value).toString(),
        chainId: chain?.chainId
      };

      // If token transfer, encode the transfer function
      if (params.tokenAddress) {
        const transferData = this.encodeTokenTransfer(params.to, params.value);
        txParams.to = params.tokenAddress;
        txParams.data = transferData;
      }

      // Add gas parameters if provided
      if (params.gasPrice) {
        txParams.gasPrice = params.gasPrice;
      }
      if (params.gasLimit) {
        txParams.gas = params.gasLimit;
      }

      // Send to background
      const response = await this.sendMessage<string>({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getTransactionHistory(address: string, limit: number = 10): Promise<ServiceResponse<TransactionDisplay[]>> {
    try {
      // Request transaction history from background - use the type field for MessageHandler
      const response = await this.sendMessage<TransactionDisplay[]>({
        type: 'yakkl_getTransactionHistory',
        payload: { address, limit }
      });

      if (response.success && response.data) {
        // Data is already in the correct format from the handler
        return { success: true, data: response.data };
      }

      // If no data, return empty array instead of failing
      if (!response.data) {
        return { success: true, data: [] };
      }

      return response as ServiceResponse<TransactionDisplay[]>;
    } catch (error) {
      console.warn('Failed to load transaction history:', error);
      // Return empty array on error to avoid breaking UI
      return { 
        success: true, 
        data: []
      };
    }
  }

  async estimateGas(params: SendTransactionParams): Promise<ServiceResponse<string>> {
    try {
      const account = get(currentAccount);
      
      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const txParams: any = {
        from: account.address,
        to: params.to,
        value: params.tokenAddress ? '0x0' : ethers.parseEther(params.value).toString()
      };

      if (params.tokenAddress) {
        txParams.to = params.tokenAddress;
        txParams.data = this.encodeTokenTransfer(params.to, params.value);
      }

      const response = await this.sendMessage<string>({
        method: 'eth_estimateGas',
        params: [txParams]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getGasPrice(): Promise<ServiceResponse<string>> {
    try {
      const response = await this.sendMessage<string>({
        method: 'eth_gasPrice'
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  private encodeTokenTransfer(to: string, amount: string): string {
    // ERC20 transfer function signature
    const transferFn = 'transfer(address,uint256)';
    const transferSelector = ethers.id(transferFn).slice(0, 10);
    
    // Encode parameters
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [to, ethers.parseUnits(amount, 18)] // Assuming 18 decimals, should be dynamic
    );

    return transferSelector + encodedParams.slice(2);
  }

  private mapTxStatus(status: any): 'pending' | 'confirmed' | 'failed' {
    if (status === '0x0' || status === 0) return 'failed';
    if (status === '0x1' || status === 1) return 'confirmed';
    return 'pending';
  }

  private determineTxType(tx: any, userAddress: string): 'send' | 'receive' | 'swap' | 'contract' {
    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();
    const user = userAddress.toLowerCase();

    if (from === user && to !== user) return 'send';
    if (from !== user && to === user) return 'receive';
    if (tx.data && tx.data !== '0x') return 'contract';
    return 'send';
  }

  async trackActivity(activityType: string, details: any): Promise<ServiceResponse<boolean>> {
    try {
      // Send activity tracking to background script which has access to browser APIs
      const response = await this.sendMessage<boolean>({
        type: 'yakkl_trackActivity',
        payload: {
          type: activityType,
          details,
          timestamp: Date.now()
        }
      });

      return response;
    } catch (error) {
      // Don't fail the UI if activity tracking fails
      console.warn('Failed to track activity:', error);
      return { success: true, data: true };
    }
  }
}