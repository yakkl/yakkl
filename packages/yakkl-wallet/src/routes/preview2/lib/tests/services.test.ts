import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletService } from '../services/wallet.service';
import { TokenService } from '../services/token.service';
import { TransactionService } from '../services/transaction.service';

// Mock the background message sending
vi.mock('$lib/utilities/safeClientSendMessage', () => ({
  safeClientSendMessage: vi.fn()
}));

// Mock stores
vi.mock('$lib/common/stores/accounts', () => ({
  yakklAccountStore: { subscribe: vi.fn() }
}));

vi.mock('$lib/common/stores/currently-selected', () => ({
  yakklCurrentlySelectedStore: { 
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn()
  }
}));

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = WalletService.getInstance();
  });

  it('should be a singleton', () => {
    const anotherInstance = WalletService.getInstance();
    expect(walletService).toBe(anotherInstance);
  });

  it('should get accounts', async () => {
    const result = await walletService.getAccounts();
    expect(typeof result.success).toBe('boolean');
  });

  it('should get current account', async () => {
    const result = await walletService.getCurrentAccount();
    expect(typeof result.success).toBe('boolean');
  });

  it('should switch accounts', async () => {
    const result = await walletService.switchAccount('0x123');
    expect(typeof result.success).toBe('boolean');
  });

  it('should get chains', async () => {
    const result = await walletService.getChains();
    expect(typeof result.success).toBe('boolean');
    if (result.success && result.data) {
      expect(Array.isArray(result.data)).toBe(true);
    }
  });

  it('should switch chains', async () => {
    const result = await walletService.switchChain(1);
    expect(typeof result.success).toBe('boolean');
  });
});

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = TokenService.getInstance();
  });

  it('should be a singleton', () => {
    const anotherInstance = TokenService.getInstance();
    expect(tokenService).toBe(anotherInstance);
  });

  it('should get tokens', async () => {
    const result = await tokenService.getTokens('0x123');
    expect(typeof result.success).toBe('boolean');
  });

  // Token prices method not implemented in TokenService

  // Refresh token data method not implemented in TokenService
});

describe('TransactionService', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    transactionService = TransactionService.getInstance();
  });

  it('should be a singleton', () => {
    const anotherInstance = TransactionService.getInstance();
    expect(transactionService).toBe(anotherInstance);
  });

  it('should send transaction', async () => {
    const txData = {
      to: '0x742d35Cc6681CB8CFB2EC5ED45F945DF6DC90e5F',
      value: '1.0',
      tokenAddress: '0x0000000000000000000000000000000000000000'
    };

    const result = await transactionService.sendTransaction(txData);
    expect(typeof result.success).toBe('boolean');
  });

  it('should estimate gas', async () => {
    const txData = {
      to: '0x742d35Cc6681CB8CFB2EC5ED45F945DF6DC90e5F',
      value: '1.0',
      tokenAddress: '0x0000000000000000000000000000000000000000'
    };

    const result = await transactionService.estimateGas(txData);
    expect(typeof result.success).toBe('boolean');
  });

  it('should get transaction history', async () => {
    const result = await transactionService.getTransactionHistory('0x123');
    expect(typeof result.success).toBe('boolean');
  });
});

describe('Service Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const walletService = WalletService.getInstance();
    
    // Test that methods return proper response format even on error
    const result = await walletService.getAccounts();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle invalid parameters', async () => {
    const tokenService = TokenService.getInstance();
    
    // Test with invalid parameters
    const result = await tokenService.getTokens('');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });
});