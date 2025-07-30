import { BaseService } from '../../../services/base.service';
import type { ServiceResponse } from '../../../types';
import { currentAccount } from '../../../stores/account.store';
import { currentChain } from '../../../stores/chain.store';
import { get } from 'svelte/store';

interface CryptoPaymentRequest {
  id: string;
  merchantId: string;
  merchantName: string;
  amount: string;
  currency: string; // Token symbol
  description: string;
  expiresAt: number;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

interface CryptoPayment {
  id: string;
  requestId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  currency: string;
  txHash?: string;
  status: 'pending' | 'confirming' | 'completed' | 'failed' | 'expired';
  createdAt: number;
  completedAt?: number;
  confirmations: number;
  requiredConfirmations: number;
}

interface MerchantInfo {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  verified: boolean;
  trustScore: number;
  paymentAddress: string;
  supportedTokens: string[];
}

interface PaymentInvoice {
  id: string;
  merchantInfo: MerchantInfo;
  paymentRequest: CryptoPaymentRequest;
  qrCode: string;
  paymentUri: string;
  estimatedGas: string;
  networkFee: string;
}

export class CryptoPaymentService extends BaseService {
  private static instance: CryptoPaymentService;

  private constructor() {
    super('CryptoPaymentService');
  }

  static getInstance(): CryptoPaymentService {
    if (!CryptoPaymentService.instance) {
      CryptoPaymentService.instance = new CryptoPaymentService();
    }
    return CryptoPaymentService.instance;
  }

  async createPaymentRequest(
    merchantId: string,
    amount: string,
    currency: string,
    description: string,
    expirationMinutes: number = 30,
    metadata?: Record<string, any>
  ): Promise<ServiceResponse<CryptoPaymentRequest>> {
    try {
      const response = await this.sendMessage<CryptoPaymentRequest>({
        method: 'yakkl_createCryptoPaymentRequest',
        params: [{
          merchantId,
          amount,
          currency,
          description,
          expirationMinutes,
          metadata
        }]
      });

      if (response.success && response.data) {
        return response;
      }

      // Mock response for development
      return this.createMockPaymentRequest(merchantId, amount, currency, description, expirationMinutes);
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async generatePaymentInvoice(requestId: string): Promise<ServiceResponse<PaymentInvoice>> {
    try {
      const response = await this.sendMessage<PaymentInvoice>({
        method: 'yakkl_generatePaymentInvoice',
        params: [requestId]
      });

      if (response.success && response.data) {
        return response;
      }

      // Mock response for development
      return this.generateMockInvoice(requestId);
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async executePayment(
    requestId: string,
    gasPrice?: string,
    gasLimit?: string
  ): Promise<ServiceResponse<CryptoPayment>> {
    try {
      const account = get(currentAccount);
      const chain = get(currentChain);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      if (!chain) {
        return {
          success: false,
          error: { hasError: true, message: 'No network selected' }
        };
      }

      const response = await this.sendMessage<CryptoPayment>({
        method: 'yakkl_executeCryptoPayment',
        params: [{
          requestId,
          fromAddress: account.address,
          chainId: chain.chainId,
          gasPrice,
          gasLimit
        }]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<ServiceResponse<CryptoPayment>> {
    try {
      const response = await this.sendMessage<CryptoPayment>({
        method: 'yakkl_getCryptoPaymentStatus',
        params: [paymentId]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getPaymentHistory(limit: number = 10): Promise<ServiceResponse<CryptoPayment[]>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<CryptoPayment[]>({
        method: 'yakkl_getCryptoPaymentHistory',
        params: [account.address, limit]
      });

      if (response.success && response.data) {
        return response;
      }

      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getMerchantInfo(merchantId: string): Promise<ServiceResponse<MerchantInfo>> {
    try {
      const response = await this.sendMessage<MerchantInfo>({
        method: 'yakkl_getMerchantInfo',
        params: [merchantId]
      });

      if (response.success && response.data) {
        return response;
      }

      // Mock merchant info
      return this.getMockMerchantInfo(merchantId);
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async validatePaymentRequest(requestId: string): Promise<ServiceResponse<boolean>> {
    try {
      const response = await this.sendMessage<boolean>({
        method: 'yakkl_validateCryptoPaymentRequest',
        params: [requestId]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async estimatePaymentGas(
    requestId: string,
    fromAddress: string
  ): Promise<ServiceResponse<string>> {
    try {
      const response = await this.sendMessage<string>({
        method: 'yakkl_estimateCryptoPaymentGas',
        params: [{
          requestId,
          fromAddress
        }]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async cancelPayment(paymentId: string): Promise<ServiceResponse<boolean>> {
    try {
      const response = await this.sendMessage<boolean>({
        method: 'yakkl_cancelCryptoPayment',
        params: [paymentId]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  // White-label API methods for merchants
  async registerMerchant(
    name: string,
    website: string,
    paymentAddress: string,
    supportedTokens: string[]
  ): Promise<ServiceResponse<MerchantInfo>> {
    try {
      const response = await this.sendMessage<MerchantInfo>({
        method: 'yakkl_registerMerchant',
        params: [{
          name,
          website,
          paymentAddress,
          supportedTokens
        }]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getMerchantPayments(
    merchantId: string,
    limit: number = 50
  ): Promise<ServiceResponse<CryptoPayment[]>> {
    try {
      const response = await this.sendMessage<CryptoPayment[]>({
        method: 'yakkl_getMerchantPayments',
        params: [merchantId, limit]
      });

      if (response.success && response.data) {
        return response;
      }

      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  // Utility methods
  generatePaymentURI(paymentRequest: CryptoPaymentRequest, toAddress: string): string {
    const params = new URLSearchParams({
      value: paymentRequest.amount,
      function: 'transfer',
      address: toAddress
    });

    return `ethereum:${toAddress}?${params.toString()}`;
  }

  formatPaymentAmount(amount: string, currency: string): string {
    const num = parseFloat(amount);
    if (currency === 'ETH') {
      return `${num.toFixed(6)} ETH`;
    }
    return `${num.toLocaleString()} ${currency}`;
  }

  private async createMockPaymentRequest(
    merchantId: string,
    amount: string,
    currency: string,
    description: string,
    expirationMinutes: number
  ): Promise<ServiceResponse<CryptoPaymentRequest>> {
    const request: CryptoPaymentRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchantId,
      merchantName: 'Demo Merchant',
      amount,
      currency,
      description,
      expiresAt: Date.now() + (expirationMinutes * 60 * 1000)
    };

    return { success: true, data: request };
  }

  private async generateMockInvoice(requestId: string): Promise<ServiceResponse<PaymentInvoice>> {
    const invoice: PaymentInvoice = {
      id: `inv_${Date.now()}`,
      merchantInfo: {
        id: 'merchant_demo',
        name: 'Demo Merchant',
        verified: true,
        trustScore: 0.95,
        paymentAddress: '0x742d35Cc6681CB8CFB2EC5ED45F945DF6DC90e5F',
        supportedTokens: ['ETH', 'USDC', 'USDT']
      },
      paymentRequest: {
        id: requestId,
        merchantId: 'merchant_demo',
        merchantName: 'Demo Merchant',
        amount: '100.00',
        currency: 'USDC',
        description: 'Test payment',
        expiresAt: Date.now() + (30 * 60 * 1000)
      },
      qrCode: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', // Mock QR code
      paymentUri: 'ethereum:0x742d35Cc6681CB8CFB2EC5ED45F945DF6DC90e5F?value=100000000',
      estimatedGas: '21000',
      networkFee: '0.005'
    };

    return { success: true, data: invoice };
  }

  private async getMockMerchantInfo(merchantId: string): Promise<ServiceResponse<MerchantInfo>> {
    const merchant: MerchantInfo = {
      id: merchantId,
      name: 'Demo Merchant',
      website: 'https://demo-merchant.com',
      verified: true,
      trustScore: 0.95,
      paymentAddress: '0x742d35Cc6681CB8CFB2EC5ED45F945DF6DC90e5F',
      supportedTokens: ['ETH', 'USDC', 'USDT', 'DAI']
    };

    return { success: true, data: merchant };
  }
}