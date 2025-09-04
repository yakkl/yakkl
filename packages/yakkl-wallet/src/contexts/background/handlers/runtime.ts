import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { BackgroundPriceService } from '$lib/services/background/BackgroundPriceService';
// import browser from 'webextension-polyfill';
// import { getSettings } from '$lib/common/stores';
// import { setBadgeText, setIconLock, setIconUnlock } from '$lib/utilities/utilities';

export const runtimeHandlers = new Map<string, MessageHandlerFunc>([
  // Handler for ui_context_initialized 
  ['ui_context_initialized', async (payload: any): Promise<MessageResponse> => {
    // Log the initialization for debugging but don't error
    console.log('UI Context Initialized:', payload);
    return { success: true, data: { acknowledged: true } };
  }],

  // Handler for ui_context_activity
  ['ui_context_activity', async (payload: any): Promise<MessageResponse> => {
    // Log UI activity but don't error
    // This seems to track UI activity for monitoring
    return { success: true, data: { acknowledged: true } };
  }],

  // Handler for ui_context_closing
  ['ui_context_closing', async (payload: any): Promise<MessageResponse> => {
    // Handle UI context closing - cleanup if needed
    console.log('UI Context Closing:', payload?.contextId);
    // TODO: Add any cleanup logic here if needed (e.g., clear temporary data, save state)
    return { success: true, data: { acknowledged: true, contextId: payload?.contextId } };
  }],

  // Handler for popout (open in new window)
  ['popout', async (payload: any): Promise<MessageResponse> => {
    // This is handled in background.ts for opening popups
    // Return success to avoid error
    return { success: true, data: { handled: true } };
  }],

  // Handler for yakkl_refreshTokens (handles both 'type' and 'method' format)
  ['yakkl_refreshTokens', async (payload: any): Promise<MessageResponse> => {
    // Handle token refresh request
    console.log('Token refresh requested:', payload);
    // TODO: Implement actual token refresh logic
    return { success: true, data: { refreshed: false, message: 'Token refresh not yet implemented' } };
  }],

  // Handler for INTERNAL_TOKEN_REQUEST
  ['INTERNAL_TOKEN_REQUEST', async (payload: any): Promise<MessageResponse> => {
    // This appears to be a request for token data
    // For now, return empty data until we know what's expected
    console.log('Internal token request:', payload);
    return { 
      success: true, 
      data: {
        tokens: [],
        action: payload?.action || 'getTokenData'
      }
    };
  }],

  // Handler for yakkl_getTokensForChain
  ['yakkl_getTokensForChain', async (payload: any): Promise<MessageResponse> => {
    try {
      const { address, chainId } = payload || {};
      
      if (!address || !chainId) {
        return { success: false, error: 'Address and chainId are required' };
      }
      
      console.log('Getting tokens for chain:', { address, chainId });
      
      // Import browser storage API for fetching stored tokens
      const browser = (await import('webextension-polyfill')).default;
      
      // Get stored tokens from browser storage
      const storageKey = `yakkl_tokens_${chainId}`;
      const storedData = await browser.storage.local.get([storageKey, 'yakkl_defaultTokens']);
      
      let tokens: any[] = Array.isArray(storedData[storageKey]) ? storedData[storageKey] : [];
      
      // If no tokens for this chain, try default tokens
      if (tokens.length === 0 && storedData.yakkl_defaultTokens) {
        const defaultTokens = storedData.yakkl_defaultTokens as any[];
        tokens = defaultTokens.filter((t: any) => t.chainId === chainId);
      }
      
      // Get native balance first
      const nativeBalanceKey = `native_balance_${chainId}_${address.toLowerCase()}`;
      const nativeData = await browser.storage.local.get(nativeBalanceKey);
      const nativeBalance = nativeData[nativeBalanceKey] || '0';
      
      console.log('Native balance from storage:', { chainId, address, nativeBalance });
      
      // Add native token to the list
      const nativeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: chainId === 1 ? 'ETH' : chainId === 137 ? 'MATIC' : 'ETH',
        name: chainId === 1 ? 'Ethereum' : chainId === 137 ? 'Polygon' : 'Native Token',
        decimals: 18,
        balance: nativeBalance,
        isNative: true,
        chainId
      };
      
      // For non-native tokens, fetch balances if we have a provider
      const tokenBalances = [];
      
      // Always include native token
      tokenBalances.push(nativeToken);
      
      // Add stored ERC20 tokens with their cached balances
      for (const token of (tokens as any[])) {
        if (token.address && token.address !== '0x0000000000000000000000000000000000000000') {
          // Check if we have a cached balance for this token
          const tokenBalanceKey = `token_balance_${chainId}_${address.toLowerCase()}_${token.address.toLowerCase()}`;
          const tokenBalanceData = await browser.storage.local.get(tokenBalanceKey);
          const cachedBalance = tokenBalanceData[tokenBalanceKey];
          
          tokenBalances.push({
            ...token,
            balance: cachedBalance || '0',
            chainId
          });
        }
      }
      
      console.log('Returning tokens with balances:', {
        count: tokenBalances.length,
        nativeBalance,
        hasTokens: tokenBalances.length > 0
      });
      
      return { 
        success: true, 
        data: tokenBalances
      };
    } catch (error) {
      console.error('Error getting tokens for chain:', error);
      return { success: false, error: error.message };
    }
  }],

  // Handler for yakkl_refreshTokenPrices
  ['yakkl_refreshTokenPrices', async (payload: any): Promise<MessageResponse> => {
    try {
      console.log('Refreshing token prices:', payload);
      
      // Use BackgroundPriceService to update prices
      const priceService = BackgroundPriceService.getInstance();
      
      // Perform price update
      await priceService.updatePrices();
      
      console.log('Token prices refreshed successfully');
      return { 
        success: true, 
        data: { refreshed: true }
      };
    } catch (error) {
      console.error('Error refreshing token prices:', error);
      return { success: false, error: error.message };
    }
  }]
]);

