import { BaseService } from '../../../services/base.service';
import type { ServiceResponse } from '../../../types';
import { currentAccount } from '../../../stores/account.store';
import { get } from 'svelte/store';

interface BuyQuote {
  amount: number;
  currency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  rate: number;
  fees: {
    network: number;
    service: number;
    total: number;
  };
  total: number;
  estimatedTime: string;
  provider: string;
  validUntil: number;
}

interface BuyOrder {
  id: string;
  amount: number;
  currency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  provider: string;
  createdAt: number;
  completedAt?: number;
  txHash?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal' | 'apple_pay' | 'google_pay';
  name: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface BuyLimits {
  min: number;
  max: number;
  daily: number;
  monthly: number;
  currency: string;
}

export class BuyService extends BaseService {
  private static instance: BuyService;

  private constructor() {
    super('BuyService');
  }

  static getInstance(): BuyService {
    if (!BuyService.instance) {
      BuyService.instance = new BuyService();
    }
    return BuyService.instance;
  }

  async getBuyQuote(
    amount: number, 
    currency: string = 'USD', 
    cryptoCurrency: string = 'ETH'
  ): Promise<ServiceResponse<BuyQuote>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<any>({
        method: 'yakkl_getBuyQuote',
        params: [{
          amount,
          currency,
          cryptoCurrency,
          userAddress: account.address
        }]
      });

      if (response.success && response.data) {
        const quote: BuyQuote = {
          amount,
          currency,
          cryptoAmount: response.data.cryptoAmount,
          cryptoCurrency,
          rate: response.data.rate,
          fees: response.data.fees,
          total: response.data.total,
          estimatedTime: response.data.estimatedTime,
          provider: response.data.provider || 'Stripe',
          validUntil: Date.now() + (10 * 60 * 1000) // 10 minutes
        };

        return { success: true, data: quote };
      }

      // Fallback mock quote
      return this.getMockBuyQuote(amount, currency, cryptoCurrency);
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async executeBuyOrder(
    quote: BuyQuote, 
    paymentMethodId: string
  ): Promise<ServiceResponse<BuyOrder>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      // Check if quote is still valid
      if (Date.now() > quote.validUntil) {
        return {
          success: false,
          error: { hasError: true, message: 'Quote expired, please get a new quote' }
        };
      }

      const response = await this.sendMessage<any>({
        method: 'yakkl_executeBuyOrder',
        params: [{
          quote,
          paymentMethodId,
          userAddress: account.address
        }]
      });

      if (response.success && response.data) {
        const order: BuyOrder = {
          id: response.data.orderId,
          amount: quote.amount,
          currency: quote.currency,
          cryptoAmount: quote.cryptoAmount,
          cryptoCurrency: quote.cryptoCurrency,
          status: 'pending',
          paymentMethod: paymentMethodId,
          provider: quote.provider,
          createdAt: Date.now()
        };

        return { success: true, data: order };
      }

      return response as ServiceResponse<BuyOrder>;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getPaymentMethods(): Promise<ServiceResponse<PaymentMethod[]>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<PaymentMethod[]>({
        method: 'yakkl_getPaymentMethods',
        params: [account.address]
      });

      if (response.success && response.data) {
        return response;
      }

      // Return empty array if no payment methods
      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async addPaymentMethod(
    type: string, 
    details: any
  ): Promise<ServiceResponse<PaymentMethod>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<PaymentMethod>({
        method: 'yakkl_addPaymentMethod',
        params: [{
          type,
          details,
          userAddress: account.address
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

  async getBuyLimits(): Promise<ServiceResponse<BuyLimits>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<BuyLimits>({
        method: 'yakkl_getBuyLimits',
        params: [account.address]
      });

      if (response.success && response.data) {
        return response;
      }

      // Default limits for basic users
      return {
        success: true,
        data: {
          min: 10,
          max: 1000,
          daily: 1000,
          monthly: 10000,
          currency: 'USD'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getBuyHistory(limit: number = 10): Promise<ServiceResponse<BuyOrder[]>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<BuyOrder[]>({
        method: 'yakkl_getBuyHistory',
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

  async getSupportedCurrencies(): Promise<ServiceResponse<string[]>> {
    try {
      const response = await this.sendMessage<string[]>({
        method: 'yakkl_getSupportedCurrencies'
      });

      if (response.success && response.data) {
        return response;
      }

      // Default supported currencies
      return {
        success: true,
        data: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getSupportedCryptoCurrencies(): Promise<ServiceResponse<string[]>> {
    try {
      const response = await this.sendMessage<string[]>({
        method: 'yakkl_getSupportedCryptoCurrencies'
      });

      if (response.success && response.data) {
        return response;
      }

      // Default supported crypto currencies
      return {
        success: true,
        data: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI']
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  private async getMockBuyQuote(
    amount: number, 
    currency: string, 
    cryptoCurrency: string
  ): Promise<ServiceResponse<BuyQuote>> {
    // Mock exchange rates
    const rates: Record<string, number> = {
      'ETH': 2500,
      'BTC': 45000,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1
    };

    const rate = rates[cryptoCurrency] || 2500;
    const networkFee = 5;
    const serviceFee = amount * 0.029; // 2.9% service fee
    const totalFees = networkFee + serviceFee;
    const total = amount + totalFees;
    const cryptoAmount = amount / rate;

    const quote: BuyQuote = {
      amount,
      currency,
      cryptoAmount,
      cryptoCurrency,
      rate,
      fees: {
        network: networkFee,
        service: serviceFee,
        total: totalFees
      },
      total,
      estimatedTime: '5-10 minutes',
      provider: 'Mock Provider',
      validUntil: Date.now() + (10 * 60 * 1000)
    };

    return { success: true, data: quote };
  }
}