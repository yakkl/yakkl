import { WalletService } from '../../../services/wallet.service';
import { TokenService } from '../../../services/token.service';
import type { ServiceResponse, Preview2Token } from '../../../types';
import { currentAccount } from '../../../stores/account.store';
import { get } from 'svelte/store';

interface BalanceInfo {
  address: string;
  ethBalance: string;
  ethBalanceUSD: number;
  tokens: Preview2Token[];
  totalValueUSD: number;
  lastUpdated: Date;
}

interface BalanceHistory {
  timestamp: number;
  balance: string;
  valueUSD: number;
}

export class BalanceService {
  private static instance: BalanceService;
  private walletService: WalletService;
  private tokenService: TokenService;

  private constructor() {
    this.walletService = WalletService.getInstance();
    this.tokenService = TokenService.getInstance();
  }

  static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  async getCompleteBalance(address?: string): Promise<ServiceResponse<BalanceInfo>> {
    try {
      const account = get(currentAccount);
      const targetAddress = address || account?.address;

      if (!targetAddress) {
        return {
          success: false,
          error: { hasError: true, message: 'No address provided' }
        };
      }

      // Get ETH balance
      const ethBalanceResponse = await this.walletService.getBalance(targetAddress);
      if (!ethBalanceResponse.success) {
        return ethBalanceResponse as unknown as ServiceResponse<BalanceInfo>;
      }

      // Get token balances
      const tokensResponse = await this.tokenService.getTokens(targetAddress);
      if (!tokensResponse.success) {
        return tokensResponse as unknown as ServiceResponse<BalanceInfo>;
      }

      const ethBalance = ethBalanceResponse.data || '0';
      const tokens = tokensResponse.data || [];
      
      // Calculate total USD value
      const ethValueUSD = this.calculateETHValueUSD(ethBalance);
      const tokensValueUSD = tokens.reduce((sum, token) => sum + token.value, 0);
      const totalValueUSD = ethValueUSD + tokensValueUSD;

      return {
        success: true,
        data: {
          address: targetAddress,
          ethBalance,
          ethBalanceUSD: ethValueUSD,
          tokens,
          totalValueUSD,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Failed to get balance' 
        }
      };
    }
  }

  async refreshBalances(address?: string): Promise<ServiceResponse<boolean>> {
    try {
      const account = get(currentAccount);
      const targetAddress = address || account?.address;

      if (!targetAddress) {
        return {
          success: false,
          error: { hasError: true, message: 'No address provided' }
        };
      }

      // Refresh token prices and balances
      const refreshResponse = await this.tokenService.refreshTokenPrices();
      
      return refreshResponse;
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Failed to refresh balances' 
        }
      };
    }
  }

  async getBalanceHistory(
    address: string, 
    days: number = 30
  ): Promise<ServiceResponse<BalanceHistory[]>> {
    try {
      // In a real implementation, this would fetch historical balance data
      // For now, generate some mock historical data
      const history: BalanceHistory[] = [];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      for (let i = days; i >= 0; i--) {
        const timestamp = now - (i * dayMs);
        // Mock data - in reality this would come from an API or indexer
        history.push({
          timestamp,
          balance: (Math.random() * 2 + 0.5).toFixed(4),
          valueUSD: Math.random() * 5000 + 1000
        });
      }

      return { success: true, data: history };
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Failed to get balance history' 
        }
      };
    }
  }

  async getTokenAllowance(
    tokenAddress: string, 
    spenderAddress: string,
    ownerAddress?: string
  ): Promise<ServiceResponse<string>> {
    try {
      const account = get(currentAccount);
      const owner = ownerAddress || account?.address;

      if (!owner) {
        return {
          success: false,
          error: { hasError: true, message: 'No owner address provided' }
        };
      }

      // This would call the ERC20 allowance function
      // For now, return a mock response
      return {
        success: true,
        data: '0' // No allowance by default
      };
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Failed to get token allowance' 
        }
      };
    }
  }

  formatBalance(balance: string, decimals: number = 18, precision: number = 4): string {
    try {
      const balanceNum = parseFloat(balance) / Math.pow(10, decimals);
      return balanceNum.toFixed(precision);
    } catch {
      return '0.0000';
    }
  }

  formatValueUSD(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private calculateETHValueUSD(ethBalance: string): number {
    // This would use real ETH price from an API
    // For now, use a mock price
    const ethPrice = 2500; // Mock ETH price
    const balanceETH = parseFloat(ethBalance) / 1e18;
    return balanceETH * ethPrice;
  }
}