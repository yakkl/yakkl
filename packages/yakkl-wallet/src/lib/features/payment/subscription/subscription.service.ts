import { BaseService } from '../../../services/base.service';
import type { ServiceResponse } from '../../../types';
import { PlanType } from '$lib/common/types';
import { currentAccount } from '../../../stores/account.store';
import { get } from 'svelte/store';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: PlanType;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  discount?: number;
}

interface Subscription {
  id: string;
  planId: string;
  userId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  trialEnd?: number;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: string;
  lastPayment?: {
    amount: number;
    currency: string;
    date: number;
    status: 'succeeded' | 'failed';
  };
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'crypto' | 'bank';
  details: any;
  isDefault: boolean;
  createdAt: number;
}

interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  dueDate: number;
  paidAt?: number;
  paymentMethod?: string;
}

export class SubscriptionService extends BaseService {
  private static instance: SubscriptionService;

  private constructor() {
    super('SubscriptionService');
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async getAvailablePlans(): Promise<ServiceResponse<SubscriptionPlan[]>> {
    try {
      const response = await this.sendMessage<SubscriptionPlan[]>({
        method: 'yakkl_getSubscriptionPlans'
      });

      if (response.success && response.data) {
        return response;
      }

      // Fallback plans
      return this.getDefaultPlans();
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getCurrentSubscription(): Promise<ServiceResponse<Subscription | null>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<Subscription>({
        method: 'yakkl_getCurrentSubscription',
        params: [account.address]
      });

      if (response.success) {
        return response;
      }

      // Return null if no subscription found
      return { success: true, data: null };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async subscribeToPlan(
    planId: string,
    paymentMethodId: string,
    couponCode?: string
  ): Promise<ServiceResponse<Subscription>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<Subscription>({
        method: 'yakkl_subscribeToPlan',
        params: [{
          planId,
          paymentMethodId,
          userAddress: account.address,
          couponCode
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

  async cancelSubscription(immediate: boolean = false): Promise<ServiceResponse<Subscription>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<Subscription>({
        method: 'yakkl_cancelSubscription',
        params: [{
          userAddress: account.address,
          immediate
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

  async updatePaymentMethod(paymentMethodId: string): Promise<ServiceResponse<boolean>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<boolean>({
        method: 'yakkl_updateSubscriptionPaymentMethod',
        params: [{
          userAddress: account.address,
          paymentMethodId
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

      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async addPaymentMethod(
    type: 'card' | 'crypto' | 'bank',
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
          userAddress: account.address,
          type,
          details
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

  async getInvoices(limit: number = 10): Promise<ServiceResponse<Invoice[]>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<Invoice[]>({
        method: 'yakkl_getInvoices',
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

  async startTrial(planId: string): Promise<ServiceResponse<Subscription>> {
    try {
      const account = get(currentAccount);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      const response = await this.sendMessage<Subscription>({
        method: 'yakkl_startTrial',
        params: [{
          planId,
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

  async validateCoupon(couponCode: string): Promise<ServiceResponse<{
    valid: boolean;
    discount: number;
    type: 'percent' | 'amount';
    expiresAt?: number;
  }>> {
    try {
      const response = await this.sendMessage<any>({
        method: 'yakkl_validateCoupon',
        params: [couponCode]
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  private async getDefaultPlans(): Promise<ServiceResponse<SubscriptionPlan[]>> {
    const plans: SubscriptionPlan[] = [
      {
        id: 'explorer_member',
        name: 'Explorer',
        type: PlanType.EXPLORER_MEMBER,
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: [
          'Send & Receive Crypto',
          'View Balances',
          'Basic Security',
          'Major Networks Only',
          'Community Support'
        ]
      },
      {
        id: 'pro-monthly',
        name: 'Pro',
        type: PlanType.YAKKL_PRO,
        price: 8.00,
        currency: 'USD',
        interval: 'month',
        features: [
          'Everything in Explorer',
          'Token Swapping',
          'AI Assistant',
          'Advanced Analytics',
          'All Networks & Testnets',
          'Priority Support',
          'Hardware Wallet Support',
          'Advanced Security'
        ],
        popular: true
      },
      {
        id: 'pro-yearly',
        name: 'Pro',
        type: PlanType.YAKKL_PRO,
        price: 80.00,
        currency: 'USD',
        interval: 'year',
        features: [
          'Everything in Explorer',
          'Token Swapping',
          'AI Assistant',
          'Advanced Analytics',
          'All Networks & Testnets',
          'Priority Support',
          'Hardware Wallet Support',
          'Advanced Security'
        ],
        discount: 17 // 2 months free
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        type: PlanType.ENTERPRISE,
        price: 999.99,
        currency: 'USD',
        interval: 'month',
        features: [
          'Everything in Pro',
          'White Label Solutions',
          'Custom Branding',
          'Dedicated Support',
          'Custom Features',
          'SLA Guarantees'
        ]
      }
    ];

    return { success: true, data: plans };
  }
}
