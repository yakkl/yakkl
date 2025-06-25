import { BaseService } from './base.service';
import type { Preview2Transaction, ServiceResponse } from '../types';
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

  async getTransactionHistory(address: string, limit: number = 10): Promise<ServiceResponse<Preview2Transaction[]>> {
    try {
      // Request transaction history from background
      const response = await this.sendMessage<any[]>({
        method: 'yakkl_getTransactionHistory',
        params: [address, limit]
      });

      if (response.success && response.data) {
        const transactions: Preview2Transaction[] = response.data.map(tx => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          timestamp: tx.timestamp || Date.now(),
          status: this.mapTxStatus(tx.status),
          type: this.determineTxType(tx, address),
          gas: tx.gas,
          gasPrice: tx.gasPrice
        }));

        return { success: true, data: transactions };
      }

      return response as ServiceResponse<Preview2Transaction[]>;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
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
}