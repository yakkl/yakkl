<script lang="ts">
  import { onMount } from 'svelte';
  import RecentActivity from "$lib/components/RecentActivity.svelte";
  import SendModal from "$lib/components/SendModalEnhanced.svelte";
  import SwapModal from "$lib/components/SwapModalV2.svelte";
  import Receive from "$lib/components/Receive.svelte";
  import BuyModal from "$lib/components/BuyModal.svelte";
  import TokenPortfolio from "$lib/components/TokenPortfolio.svelte";
  import AddCustomToken from "$lib/components/AddCustomToken.svelte";
  import AIHelpButton from "$lib/components/AIHelpButton.svelte";
  import AdvancedAnalytics from "$lib/components/pro/AdvancedAnalytics.svelte";
  import SecureRecovery from "$lib/components/private/SecureRecovery.svelte";
  import ExtensionDashboard from "$lib/components/extensions/ExtensionDashboard.svelte";
  import Upgrade from "$lib/components/Upgrade.svelte";
  import TokenDetailModal from "$lib/components/TokenDetailModal.svelte";
  import PortfolioDetailsModal from "$lib/components/PortfolioDetailsModal.svelte";
  import TransactionListModal from "$lib/components/TransactionListModal.svelte";
  import TransactionDetailModal from "$lib/components/TransactionDetailModal.svelte";
  import PortfolioOverview from '$lib/components/PortfolioOverviewSimple.svelte';
  import OrbitalViewSelector from '$lib/components/views/OrbitalViewSelector.svelte';
  import TraditionalNavigation from '$lib/components/views/TraditionalNavigation.svelte';
  import NavigationToggle from '$lib/components/views/NavigationToggle.svelte';
  import DataInspector from '$lib/components/debug/DataInspector.svelte';
  import { isModalOpen, modalStore } from "$lib/stores/modal.store";
  import { currentAccount } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { isLoadingTokens, lastTokenUpdate, tokenStore } from '$lib/stores/token.store';
  import { canUseFeature } from '$lib/utils/features';
  import { uiStore } from '$lib/stores/ui.store';
	import { notificationService } from '$lib/services/notification.service';
	import { visibilityStore } from '$lib/common/stores/visibilityStore';
	import { get } from 'svelte/store';
	import PincodeVerify from '$lib/components/PincodeVerify.svelte';
	import ProtectedValue from '$lib/components/ProtectedValue.svelte';
  import { STORAGE_YAKKL_COMBINED_TOKENS, VERSION, type TokenData, type BigNumberish } from '$lib/common';
  import { uiJWTValidatorService } from '$lib/services/ui-jwt-validator.service';
  import { log } from '$lib/common/logger-wrapper';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
  import { BigNumber } from '$lib/common/bignumber';
  import { isNativeToken, getNativeTokenSymbol } from '$lib/utils/native-token.utils';
  import { getYakklCombinedTokens, getYakklCurrentlySelected } from '$lib/common/stores';
  import { loadYakklCache, updateYakklCache, clearYakklCache } from '$lib/stores/yakklCache.store';
  import { PriceManager } from '$lib/managers/PriceManager';
  import { setObjectInLocalStorage } from '@yakkl/browser-extension';
  import { WalletService } from '$lib/services/wallet.service';

  // State
  let showSendModal = $state(false);
  let showSwapModal = $state(false);
  let showReceiveModal = $state(false);
  let showBuyModal = $state(false);
  let showAddTokenModal = $state(false);
  let showTokenDetailModal = $state(false);
  let showPortfolioDetailsModal = $state(false);
  let showUpgradeModal = $state(false);
  let showTransactionListModal = $state(false);
  let modalOpen = $derived($isModalOpen);
  let selectedToken = $state(null);
  let showPincodeModal = $state(false);
  let isVisible = $state(get(visibilityStore) ?? true);
  let pendingAction = $state<'show' | 'hide' | null>(null);
  let nativePriceDirection = $state<'up' | 'down' | null>(null);
  let selectedTransaction = $state(null);
  let showTransactionDetailModal = $state(false);
  let hasInitialLoad = $state(false);
  let transactionListData = $state<any>(null);
  let navigationMode = $state<'orbital' | 'traditional'>('orbital');
  let yakklCombinedTokens = $state<TokenData[]>([]);  // Direct tokens from storage

  // Debug state for error tracking
  let hasError = $state(false);
  let errorMessage = $state('');
  let showDebugPanel = $state(false); // Toggle with keyboard shortcut or dev mode

  // Price manager instance and update interval
  let priceManager: PriceManager | null = null;
  let priceUpdateInterval: ReturnType<typeof setInterval> | null = null;

  function handleError(error: any, context: string) {
    const errorMsg = `Error in ${context}: ${error?.message || error}`;
    console.log(errorMsg, error);

    // Don't update state if we're in a derived/effect context
    // Use setTimeout to defer state updates outside of the reactive context
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        hasError = true;

        errorMessage = errorMsg;

        // Show user-friendly notification
        try {
          // console.trace('handleError', errorMsg);
          uiStore.showError('Page Load Error', `Failed to load home page: ${context}`);
        } catch (e) {
          log.warn('Failed to show error notification:', false, e);
        }
      }, 0);
    }
  }

  // Simplified initialization using existing services
  const loadHomeData = async () => {
    try {
      if (typeof window === 'undefined') return;

      // STEP 1: Get current account using WalletService
      const walletService = WalletService.getInstance();
      const accountResponse = await walletService.getCurrentAccount();

      if (!accountResponse.success || !accountResponse.data) {
        log.warn('[Home] No current account available');
        return;
      }

      const account = accountResponse.data;
      const address = account.address;
      const chainId = $currentChain?.chainId || 1;

      log.info('[Home] Current account:', { address, chainId });
      hasInitialLoad = true;

      // STEP 2: Get native balance directly from blockchain
      let nativeBalanceFormatted = '0';
      try {
        nativeBalanceFormatted = await walletService.getBalanceDirect(address, chainId);
        log.info('[Home] Native balance:', nativeBalanceFormatted);
      } catch (err) {
        log.error('[Home] Failed to get balance:', false, err);
      }

      // STEP 3: Load tokens from storage
      let tokensFromStorage = await getYakklCombinedTokens() || [];

      // STEP 4: Initialize PriceManager and fetch prices
      if (!priceManager) {
        priceManager = new PriceManager();
        await priceManager.initialize();
        log.info('[Home] PriceManager initialized');
      }

      // Fetch native token price
      let nativePrice = 0;
      try {
        const priceData = await priceManager.getMarketPrice('ETH-USD');
        nativePrice = priceData?.price || 0;
        log.info('[Home] Native token price:', nativePrice);
      } catch (err) {
        log.warn('[Home] Failed to fetch native price:', false, err);
      }

      // STEP 5: Update tokens with fresh data
      const nativeValue = parseFloat(nativeBalanceFormatted) * nativePrice;

      // Find and update native token or add if missing
      const nativeIndex = tokensFromStorage.findIndex(t => t.isNative);
      if (nativeIndex >= 0) {
        tokensFromStorage[nativeIndex] = {
          ...tokensFromStorage[nativeIndex],
          balance: parseFloat(nativeBalanceFormatted),
          price: {
            price: nativePrice,
            provider: 'PriceManager',
            lastUpdated: new Date()
          } as any,
          value: nativeValue
        };
      } else {
        tokensFromStorage.unshift({
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: parseFloat(nativeBalanceFormatted),
          price: {
            price: nativePrice,
            provider: 'PriceManager',
            lastUpdated: new Date()
          } as any,
          value: nativeValue,
          isNative: true,
          chainId,
          icon: '/images/eth.svg'
        });
      }

      // STEP 6: Update prices for non-native tokens
      yakklCombinedTokens = await Promise.all(tokensFromStorage.map(async (token) => {
        if (!token.isNative && token.symbol) {
          try {
            // Map token symbols to proper trading pairs
            let tradingPair = `${token.symbol}-USD`;
            if (token.symbol === 'WBTC') tradingPair = 'BTC-USD';
            if (token.symbol === 'WETH') tradingPair = 'ETH-USD';

            const priceData = await priceManager.getMarketPrice(tradingPair);
            const price = priceData?.price || 0;

            // Convert balance to number for calculation
            const balance = typeof token.balance === 'number' ?
              token.balance :
              BigNumberishUtils.toNumberSafe(token.balance || 0);
            const value = balance * price;

            return {
              ...token,
              price: {
                price,
                provider: priceData?.provider || 'PriceManager',
                lastUpdated: new Date()
              } as any,
              value
            };
          } catch (err) {
            log.warn(`[Home] Failed to update ${token.symbol} price:`, false, err);
            return token;
          }
        }
        return token;
      }));

      // STEP 7: Calculate portfolio total and update cache
      const grandTotal = yakklCombinedTokens.reduce((sum: number, token: any) => {
        const tokenValue = typeof token.value === 'number' ? token.value : 0;
        return sum + tokenValue;
      }, 0);

      log.info('[Home] Portfolio total:', grandTotal);

      await updateYakklCache({
        id: `${address}_${chainId}`,
        account: address,
        chainId,
        portfolioTotal: Math.round(grandTotal * 100).toString(),
        nativeTokenPrice: nativePrice
      });

      // Persist tokens to storage
      await setObjectInLocalStorage(STORAGE_YAKKL_COMBINED_TOKENS, yakklCombinedTokens);
      log.info('[Home] Data loaded successfully');

      // Start JWT validation if authenticated
      if (sessionStorage.getItem('wallet-authenticated') === 'true') {
        try {
          uiJWTValidatorService.start();
        } catch (e) {
          log.warn('[Home] JWT validation error (non-critical):', false, e);
        }
      }

    } catch (error) {
      handleError(error, 'async initialization');
    }
  };


  onMount(() => {
    if (typeof window === 'undefined') return;

    log.info('[Home] onMount called, starting initialization...');

    // Add keyboard shortcut for debug panel
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + D to toggle debug panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        showDebugPanel = !showDebugPanel;
      }
    };

    window.addEventListener('keydown', handleKeydown);

    // Load cached data first
    loadYakklCache().then(() => {
      log.info('[Home] YakklCache loaded from storage');
    }).catch(err => {
      log.warn('[Home] Failed to load YakklCache:', false, err);
    });

    // Start data loading
    loadHomeData().then(() => {
      log.info('[Home] Initial data loaded successfully');

      // Set up price update interval (every 30 seconds)
      priceUpdateInterval = setInterval(() => {
        loadHomeData().catch(err => {
          log.warn('[Home] Price update failed:', false, err);
        });
      }, 30000); // 30 seconds

      log.info('[Home] Price update interval started');
    }).catch(err => {
      log.error('[Home] Initial data load failed:', false, err);
    });

    // Listen for token click events
    const handleEvent = (event: Event) => {
      try {
        handleTokenClick(event as CustomEvent);
      } catch (error) {
        handleError(error, 'token click event handler');
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('tokenclick', handleEvent);
    }

    // Return cleanup function
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('keydown', handleKeydown);
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('tokenclick', handleEvent as EventListener);
        }

        // Stop JWT validation service
        uiJWTValidatorService.stop();

        // Clear price update interval
        if (priceUpdateInterval) {
          clearInterval(priceUpdateInterval);
          priceUpdateInterval = null;
          log.info('[Home] Price update interval stopped');
        }
      } catch (error) {
        handleError(error, 'cleanup');
      }
    };
  });

  // Track previous account and chain to detect changes
  let previousAccountAddress = $state<string | null>(null);
  let previousChainId = $state<number | null>(null);

  // Watch for account changes and reload data
  $effect(() => {
    try {
      // Ensure account is defined before accessing properties
      if (!account) {
        log.debug('[(wallet)/home/+page.svelte] No account available yet');
        return;
      }

      const currentChainId = $currentChain?.chainId || 1;
      const accountChanged = account.address && account.address !== previousAccountAddress;
      const chainChanged = currentChainId !== previousChainId;

      // Check if account or chain changed
      if (accountChanged || chainChanged) {
        if (accountChanged) {
          log.info('[Home] Account changed from', previousAccountAddress, 'to', account.address);
          previousAccountAddress = account.address;
        }
        if (chainChanged) {
          log.info('[Home] Chain changed from', previousChainId, 'to', currentChainId);
          previousChainId = currentChainId;
        }

        // Reload data for new account/chain
        if (hasInitialLoad) {
          // Clear cache first to ensure fresh data for new account
          // This fixes the portfolio overview showing stale values
          if (accountChanged) {
            clearYakklCache();
          }

          // Only reload if we've already done initial load
          // This prevents double-loading on first mount
          loadHomeData().then(() => {
            log.info('[Home] Data reloaded for account/chain change');
          }).catch(error => {
            log.error('[Home] Failed to reload data:', false, error);
          });
        } else {
          // Mark initial load complete and save current values
          hasInitialLoad = true;
          previousAccountAddress = account.address;
          previousChainId = currentChainId;
        }
      }
    } catch (error) {
      handleError(error, 'account/chain change effect');
    }
  });

  // Track initial load state
  let hasLoadedTokens = $state(false);

  // Watch for unexpected token clearing
  $effect(() => {
    if (yakklCombinedTokens.length === 0 && hasLoadedTokens) {
      log.warn('[Home] Tokens unexpectedly cleared after initial load');
    }
    if (yakklCombinedTokens.length > 0) {
      hasLoadedTokens = true;
    }
  });

  $effect(() => {
    try {
      // Ensure tokenList is ready before logging
      if (!tokenList || tokenList.length === 0) {
        return;
      }

      // Always log token breakdown for debugging with safer conversion
      tokenList.map((t: any) => {
        // Safely handle balance conversion
        let qty = 0;
        try {
          const balance = (t as any).balance;
          if (balance !== undefined && balance !== null && balance !== '') {
            // Try to parse balance as a number or BigNumber
            const balanceStr = String(balance);
            if (balanceStr && balanceStr !== '0') {
              const balanceNum = parseFloat(balanceStr);
              qty = balanceNum !== null && isFinite(balanceNum) ? balanceNum : 0;
            }
          }
        } catch (e) {
          // If balance conversion fails, use qty field or default to 0
          try {
            const qtyValue = (t as any).qty;
            if (qtyValue !== undefined && qtyValue !== null) {
              if (typeof qtyValue === 'number') {
                qty = isFinite(qtyValue) ? qtyValue : 0;
              } else {
                const qtyNum = BigNumberishUtils.toNumberSafe(qtyValue);
                qty = isFinite(qtyNum) ? qtyNum : 0;
              }
            }
          } catch (e2) {
            qty = 0;
          }
        }

        return {
          symbol: t.symbol,
          qty: qty,
          price: t.price,
          value: t.value,
          address: t.address,
          chainId: t.chainId
        };
      });

      // Debug logging temporarily disabled - build error with store subscriptions
      // TODO: Fix store subscription access in this context
    } catch (error) {
      handleError(error, 'portfolio debug effect');
    }
  });

  $effect(() => {
    try {
      const unsubscribe = visibilityStore.subscribe(() => {
        // Store subscription handled elsewhere - visibility updates tracked
      });
      return unsubscribe;
    } catch (error) {
      handleError(error, 'visibility store effect');
    }
  });

  // Reactive values from stores - memoized to prevent unnecessary recalculations
  // Use derived state for reactive account and chain
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);

  // Effect to log and trigger updates when account changes
  $effect(() => {
    if (account && account.address) {
      log.info('[Home] Account is now available:', account.address);
      // Account is available, ensure UI updates
    }
  });

  // Use tokens directly from yakklCombinedTokens state - simple reactive derivation
  let tokenList = $derived(yakklCombinedTokens);

  // Debug token data
  // $effect(() => {
  //   if (tokenList?.length > 0) {
  //     log.info('[(wallet)/home/+page.svelte] Token data update:', {
  //       tokenListLength: tokenList.length,
  //       firstToken: tokenList[0],
  //       tokenListType: typeof tokenList,
  //       isArray: Array.isArray(tokenList)
  //     });
  //   }
  // });


  // Current account value calculated directly from yakklCombinedTokens
  let currentAccountValue = $derived.by(() => {
    try {
      if (typeof window === 'undefined') return 0;

      if (!account || !chain) {
        return 0;
      }

      // Calculate total value directly from yakklCombinedTokens
      let total = 0;
      yakklCombinedTokens.forEach(token => {
        if (token.value) {
          const val = typeof token.value === 'number' ? token.value : parseFloat(token.value.toString());
          if (!isNaN(val)) {
            total += val;
          }
        }
      });

      // Return dollars directly - formatCurrency expects dollars not cents
      return total;
    } catch (error) {
      log.error('[(wallet)/home/+page.svelte] Error calculating current account value:', false, error);
      return 0;
    }
  });


  let loading = $derived.by(() => {
    try {
      return $isLoadingTokens || false;
    } catch (error) {
      log.error('[(wallet)/home/+page.svelte] Error getting loading state:', false, error);
      return false;
    }
  });

  let lastUpdate = $derived.by(() => {
    try {
      const updateValue = $lastTokenUpdate;
      if (!updateValue) return null;

      // Convert string to Date if it's a string
      if (typeof updateValue === 'string') {
        return new Date(updateValue);
      }

      // If it's already a Date, return it
      if (updateValue && typeof updateValue === 'object' && 'getTime' in updateValue) {
        return updateValue as Date;
      }

      return null;
    } catch (error) {
      log.error('[(wallet)/home/+page.svelte] Error getting last update:', false, error);
      return null;
    }
  });

  // Find native token and its price
  let nativeToken = $derived.by(() => {
    try {
      // Debug logging to understand why native token isn't found
      const nativeSymbol = chain ? getNativeTokenSymbol(chain) : 'ETH';

      // CRITICAL FIX: More robust native token lookup
      const found = tokenList.find(t => {
        // Check if it's a native token using the utility
        if (isNativeToken(t.symbol, chain)) return true;

        // Also check for exact match with native symbol
        if (t.symbol === nativeSymbol) return true;

        // Check for native token by address (0x0 or empty)
        if (!t.address || t.address === '0x0000000000000000000000000000000000000000') {
          return t.symbol === nativeSymbol;
        }

        return false;
      });

      if (!found && tokenList.length > 0) {
        // Create a synthetic native token with price from service
        log.debug('[(wallet)/home/+page.svelte] Native token not in list, will use price service', false, {
          lookingFor: nativeSymbol,
          chainId: chain?.chainId,
          tokenListLength: tokenList.length
        });
      }

      return found;
    } catch (error) {
      log.error('[(wallet)/home/+page.svelte] Error finding native token:', false, error);
      return null;
    }
  });

  let nativePrice = $derived.by(() => {
    try {
      if (typeof window === 'undefined') return 0;

      // First check if we have a native token with price
      if (nativeToken?.price) {
        let price = nativeToken.price;

        // Handle price object structure
        if (typeof price === 'object' && price.price !== undefined) {
          const priceVal = price.price;
          if (typeof priceVal === 'number' && priceVal > 0) {
            log.info('[Home] Using native price from token object:', priceVal);
            return priceVal;
          }
        }

        // If it's already a number, return it
        if (typeof price === 'number' && price > 0) {
          log.info('[Home] Using native price number:', price);
          return price;
        }

        // If it's a string that looks like a number, parse it
        if (typeof price === 'string' && !isNaN(parseFloat(price))) {
          const parsed = parseFloat(price);
          if (parsed > 0) {
            log.info('[Home] Using parsed native price:', parsed);
            return parsed;
          }
        }
      }

      // Try to find ETH price from any token in the list (fallback)
      const ethToken = yakklCombinedTokens.find(t =>
        t.symbol === 'ETH' || t.symbol === 'WETH' || t.isNative ||
        t.address === '0x0000000000000000000000000000000000000000'
      );

      if (ethToken?.price) {
        const price = typeof ethToken.price === 'object' ? ethToken.price.price : ethToken.price;
        if (price > 0) {
          log.info('[Home] Using ETH price from token list:', price);
          return price;
        }
      }

      return 0;
    } catch (error) {
      log.error('[Home] Error getting native price:', false, error);
      return 0;
    }
  });

  // Calculate native token value for account display
  let accountNativeValue = $derived.by(() => {
    try {
      if (typeof window === 'undefined') return 0;

      if (!account || !chain || !nativePrice) return 0;

      // Parse balance to number
      const balance = parseFloat(account.balance || '0');
      // TODO: Use DecimalMath for precision

      // Calculate value in dollars
      const valueInDollars = balance * nativePrice;

      // Convert to cents for consistency with other values
      return Math.round(valueInDollars * 100);
    } catch (error) {
      // Just log the error, don't call handleError which modifies state
      log.error('[(wallet)/home/+page.svelte] Error calculating account native value:', false, error);
      return 0;
    }
  });

  // Track native price changes and update direction indicator
  $effect(() => {
    try {
      if (!nativePrice || nativePrice <= 0) {
        // Native price not yet loaded - this is normal during initialization
        log.debug('[(wallet)/home/+page.svelte] Native price not yet available', false, {
          nativePrice,
          chainId: chain?.chainId
        });
        return; // No price to track yet
      }

      const chainId = chain?.chainId;
      if (!chainId) {
        console.error('[(wallet)/home/+page.svelte] No chain to track', false, {
          chainId
        }); // just for debugging
        return; // No chain to track
      }

      // Try to get stored price from localStorage
      const storedPriceKey = `native_price_${chainId}`;
      const storedPrice = localStorage.getItem(storedPriceKey);

      if (storedPrice) {
        const stored = parseFloat(storedPrice);
        if (stored > 0 && stored !== nativePrice) {
          // Set direction based on comparison with stored price
          if (nativePrice > stored) {
            nativePriceDirection = 'up';
          } else {
            nativePriceDirection = 'down';
          }
        } else {
          // Same price or invalid stored price
          // Show up arrow for positive sentiment on first load
          if (!nativePriceDirection) {
            nativePriceDirection = 'up';
          }
        }
      } else {
        // No stored price - first time seeing this chain
        // Default to up arrow for positive sentiment
        nativePriceDirection = 'up';
      }

      // Always store current price for next comparison
      localStorage.setItem(storedPriceKey, nativePrice.toString());
    } catch (error) {
      log.error('[(wallet)/home/+page.svelte] Error in native price tracking effect:', false, error);
    }
  });

  // Track modal states with proper guard to prevent infinite loop
  let lastUpgradeModalState = false;
  $effect(() => {
    try {
      // Only act when showUpgradeModal changes
      if (showUpgradeModal !== lastUpgradeModalState) {
        lastUpgradeModalState = showUpgradeModal;

        if (showUpgradeModal) {
          modalStore.openModal('upgrade');
        } else if (modalStore.isModalOpen()) {
          modalStore.closeModal();
        }
      }
    } catch (error) {
      handleError(error, 'modal state tracking effect');
    }
  });

  // Subscribe to modal store for transactionList modal
  $effect(() => {
    try {
      const unsubscribe = modalStore.subscribe(state => {
        if (state.modalType === 'transactionList' && state.isOpen) {
          showTransactionListModal = true;
          transactionListData = (state as any).data || null;
        } else if (state.modalType === 'transactionList' && !state.isOpen) {
          showTransactionListModal = false;
          transactionListData = null;
        }
      });

      return () => unsubscribe();
    } catch (error) {
      handleError(error, 'modal store subscription effect');
    }
  });

  async function refreshAllData(forceRefresh = false) {
    try {
      console.log('[(wallet)/home/+page.svelte] refreshAllData: Starting data refresh...', { forceRefresh });

      // Re-run the initialization to refresh all data
      // await initializeAsync();

      console.log('[(wallet)/home/+page.svelte] refreshAllData: Refresh completed');

    } catch (error) {
      handleError(error, 'refreshAllData');
    }
  }

  function handleTokenSend(token: any) {
    selectedToken = token;
    showTokenDetailModal = false;
    showSendModal = true;
  }

  function handleSend(tx: any) {
    showSendModal = false;
    console.log('[(wallet)/home/+page.svelte] Transaction sent:', tx);

    // Show success feedback
    uiStore.showTransactionPending(tx.hash);

    // Refresh token data immediately after send
    // The stores will update when the transaction is confirmed
    refreshAllData();
  }

  function handleSwap(tx: any) {
    showSwapModal = false;
    console.log('[(wallet)/home/+page.svelte] Swap requested:', tx);

    // Show swap feedback
    uiStore.showSuccess(
      'Swap Initiated!',
      'Your token swap is being processed'
    );

    // Refresh data immediately after swap
    // The stores will update when the transaction is confirmed
    refreshAllData();
  }

  function handleReceive() {
    showReceiveModal = true;
  }

  function handleBuySell() {
    // Buy crypto is available to all users
    showBuyModal = true;
  }

  function handleSwapClick() {
    // Swap is available to all users
    showSwapModal = true;
  }

  function shortAddr(addr: string): string {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function formatCurrency(value: number | BigNumberish): string {
    let numValue: number;

    try {
      if (typeof value === 'number') {
        numValue = value;
      } else if (typeof value === 'bigint') {
        // BigInt values are stored as cents, convert to dollars
        numValue = Number(value) / 100;
      } else {
        // Use BigNumberishUtils for safe conversion
        const valueInCents = BigNumberishUtils.toBigInt(value);
        numValue = Number(valueInCents) / 100;
      }

      // Validate the numeric value
      if (!isFinite(numValue) || isNaN(numValue)) {
        log.warn('[(wallet)/home/+page.svelte] Invalid numeric value for currency formatting:', false, value);
        return '$0.00';
      }
    } catch (error) {
      log.warn('[(wallet)/home/+page.svelte] Failed to convert value for currency formatting:', false, value, error);
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  }

  function safeFormatBalance(balance: string | number | BigNumberish): string {
    try {
      if (typeof balance === 'string' || typeof balance === 'number') {
        const balanceNum = typeof balance === 'number' ? balance : parseFloat(balance.toString());
        return balanceNum !== null && isFinite(balanceNum) ? balanceNum.toFixed(4) : '0.0000';
      } else {
        const balanceNum = BigNumberishUtils.toNumberSafe(balance);
        return isFinite(balanceNum) ? balanceNum.toFixed(4) : '0.0000';
      }
    } catch (error) {
      log.warn('[(wallet)/home/+page.svelte] Failed to format balance:', false, balance, error);
      return '0.0000';
    }
  }


  function handleTokenClick(event: CustomEvent) {
    selectedToken = event.detail.token;
    showTokenDetailModal = true;
  }

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);

      // Show success notification
      uiStore.showSuccess('Address Copied', 'Address has been copied to clipboard');

      // For public addresses, we don't need to clear the clipboard
      // as mentioned in the requirement
    } catch (error) {
      log.warn('Failed to copy address:', false, error);
      uiStore.showError('Copy Failed', 'Failed to copy address to clipboard');
    }
  }

  function handleToggleClick() {
    if (isVisible) {
      // Hiding values doesn't require PIN
      isVisible = false;
      visibilityStore.set(false);
      pendingAction = null;
      notificationService.show({
        title: 'Values Hidden',
        message: 'Sensitive values are now hidden',
        type: 'info',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
    } else {
      // Showing values requires PIN verification
      pendingAction = 'show';
      showPincodeModal = true;
    }
  }

  function handlePinVerified(_digestedPin: string) {
    if (pendingAction === 'show') {
      visibilityStore.set(true);
      isVisible = true;
      notificationService.show({
        title: 'Values Visible',
        message: 'Sensitive values are now visible',
        type: 'success',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
    }
    pendingAction = null;
    showPincodeModal = false;
  }

  function handlePinRejected(reason: string) {
    notificationService.show({
      title: 'PIN Verification Failed',
      message: reason || 'Unable to verify PIN',
      type: 'error'
    });
    pendingAction = null;
    showPincodeModal = false;
  }

  function handleTransactionClick(transaction: any) {
    selectedTransaction = transaction;
    showTransactionDetailModal = true;
  }
</script>

<PincodeVerify
  bind:show={showPincodeModal}
  onVerified={handlePinVerified}
  onRejected={handlePinRejected}
/>

<SendModal
  show={showSendModal}
  onClose={() => {
    showSendModal = false;
    selectedToken = null;
  }}
  onSend={handleSend}
  tokens={tokenList}
  chain={chain}
  mode="send"
/>

<SwapModal
  show={showSwapModal}
  onClose={() => showSwapModal = false}
  onSwap={handleSwap}
/>

<Receive
  bind:show={showReceiveModal}
/>

<BuyModal
  show={showBuyModal}
  onClose={() => showBuyModal = false}
/>

<TokenDetailModal
  show={showTokenDetailModal}
  token={selectedToken}
  onClose={() => {
    showTokenDetailModal = false;
    selectedToken = null;
  }}
  onSend={handleTokenSend}
/>

<!-- Debug Panel for Error Tracking -->
{#if hasError}
<div class="fixed top-2 left-4 right-4 z-50 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg">
  <div class="flex justify-between items-start">
    <div>
      <h3 class="text-red-800 dark:text-red-200 font-bold">Home Page Error</h3>
      <p class="text-red-700 dark:text-red-300 text-sm mt-1">{errorMessage}</p>
      <p class="text-red-600 dark:text-red-400 text-xs mt-2">
        Try refreshing the page or checking the browser console for more details.
      </p>
    </div>
    <button
      onclick={() => { hasError = false; errorMessage = ''; }}
      class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
    >
      ✕
    </button>
  </div>
</div>
{/if}

<!-- Fixed centered logo watermark -->
<div class="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-0">
  <img src="/images/logoBullFav128x128.png" class="w-44 h-44 opacity-10 dark:opacity-15" alt="logo" />
</div>

<div class="max-w-[400px] mx-auto p-5 space-y-5 mt-1 pt-2 relative">

  <!-- Error Fallback Content -->
  {#if hasError}
    <div class="yakkl-card p-6 text-center">
      <div class="text-red-500 mb-4">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-zinc-900 dark:text-white mb-4">Page Loading Error</h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        There was an error loading the home page. This is likely a temporary issue.
      </p>
      <div class="space-y-3">
        <button
          onclick={() => { hasError = false; errorMessage = ''; }}
          class="yakkl-btn-secondary w-full"
        >
          Try Again
        </button>
        <a href="/accounts" class="yakkl-btn-secondary w-full inline-block text-center">
          Go to Accounts
        </a>
      </div>
      <details class="mt-6 text-left">
        <summary class="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">Technical Details</summary>
        <pre class="mt-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-auto">{errorMessage}</pre>
      </details>
    </div>
  {:else}
  <!-- Normal Page Content -->
  <!-- Account header -->
  <div class="flex items-center justify-between relative z-10">
    <div>
      <div class="text-xs text-gray-400 dark:text-gray-500">Account</div>
      {#if account}
        <div class="text-lg font-semibold tracking-wide">{account.ens || account.name || 'Wallet'}</div>
        <div class="flex items-center gap-1">
          <div class="text-xs text-gray-500 dark:text-gray-400">{shortAddr(account.address)}</div>
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            onclick={() => copyAddress(account.address)}
            class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded transition-colors"
            title="Copy address"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <div class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1 group/value cursor-help relative">
          <span class="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Value: <ProtectedValue value={formatCurrency(currentAccountValue || 0)} placeholder="*******" />
          </span>

          <!-- Token Breakdown Hover Card -->
          <div class="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-3 opacity-0 invisible group-hover/value:opacity-100 group-hover/value:visible transition-all duration-200 z-50">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Token Breakdown</div>
            <div class="space-y-1 max-h-48 overflow-y-auto">
              {#if tokenList.length > 0}
                {#each tokenList.slice(0, 5) as token}
                  <div class="flex justify-between items-center text-xs">
                    <div class="flex items-center gap-1">
                      {#if token.icon}
                        {@const isImagePath = token.icon && (token.icon.startsWith('/') || token.icon.startsWith('http') || token.icon.includes('.svg') || token.icon.includes('.png') || token.icon.includes('.jpg') || token.icon.includes('.jpeg') || token.icon.includes('.gif') || token.icon.includes('.webp'))}
                        {#if isImagePath}
                          <img src={token.icon} alt={token.symbol} class="w-4 h-4 rounded-full" />
                        {:else}
                          <div class="w-4 h-4 rounded-full flex items-center justify-center bg-gray-400 text-white text-[10px] font-bold">
                            {token.icon || token.symbol?.[0] || '?'}
                          </div>
                        {/if}
                      {:else}
                        <div class="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      {/if}
                      <span class="font-medium">{token.symbol}</span>
                    </div>
                    <ProtectedValue
                      value={formatCurrency(token?.value || 0)}
                      placeholder="*****"
                    />
                  </div>
                {/each}
                {#if tokenList.length > 5}
                  <div class="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                    +{tokenList.length - 5} more tokens
                  </div>
                {/if}
              {:else}
                <div class="text-xs text-gray-500 dark:text-gray-400">No tokens found</div>
              {/if}
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span class="text-xs font-medium">Native Balance:</span>
              <span class="text-xs">
                <ProtectedValue
                  value={`${safeFormatBalance(account.balance || '0')} ${chain?.nativeCurrency?.symbol || 'ETH'} (${formatCurrency(accountNativeValue)})`}
                  placeholder="**** *** (*****)"
                />
              </span>
            </div>
          </div>
        </div>
      {:else}
        <div class="text-lg font-semibold tracking-wide">No account</div>
      {/if}
      <a href="/accounts" class="text-blue-500 dark:text-blue-400 text-xs hover:underline">Switch Account</a>
    </div>
    <div class="flex flex-col items-end">
      {#if chain}
        <div class="text-sm bg-green-100 dark:bg-green-900 dark:text-green-200 text-green-800 px-2 py-1 rounded font-bold">
          {chain.isTestnet ? 'TESTNET' : 'LIVE'}
        </div>
        {#if chain}
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
            <span>{chain.nativeCurrency?.symbol || 'ETH'}:</span>
            {#if nativePrice && nativePrice > 0}
              <ProtectedValue value={formatCurrency(nativePrice)} placeholder="****" />
            {:else}
              <span class="animate-pulse">Loading...</span>
            {/if}
            {#if nativePriceDirection}
              <span class="inline-flex items-center">
                {#if nativePriceDirection === 'up'}
                  <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4l8 12H4z" />
                  </svg>
                {:else}
                  <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 20l8-12H4z" />
                  </svg>
                {/if}
              </span>
            {/if}
          </div>
        {/if}

        <!-- Hide Values Button -->
        <button
          onclick={handleToggleClick}
          class="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20 mt-1"
          aria-label={isVisible ? "Hide values" : "Show values"}
        >
          {#if isVisible}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Hide</span>
          {:else}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <span>Show</span>
          {/if}
        </button>
      {/if}
    </div>
  </div>


  <!-- Portfolio Overview -->
  <PortfolioOverview
    onRefresh={() => refreshAllData(true)}
    {loading}
    {lastUpdate}
    className="mb-4"
  />

  <!-- Navigation Mode Toggle -->
  <div class="flex justify-center mb-4">
    <NavigationToggle
      value={navigationMode}
      onChange={(mode: 'orbital' | 'traditional') => navigationMode = mode}
    />
  </div>

  <!-- Navigation View -->
  {#if navigationMode === 'orbital'}
    <!-- Orbital View Navigation -->
    <div class="flex justify-center my-4">
      <OrbitalViewSelector
        showTotal={true}
        enableAnimations={true}
        className="scale-75 md:scale-100"
      />
    </div>
  {:else}
    <!-- Traditional Navigation -->
    <TraditionalNavigation className="my-4" />
  {/if}

  <!-- Action Buttons -->
  <div class="grid grid-cols-4 gap-3 relative z-10">
    <button
      class="yakkl-btn-primary yakkl-btn-send text-sm"
      onclick={() => showSendModal = true}
      disabled={!account}
      title={'Send/Transfer tokens'}
    >
      Send
    </button>

    <button
      class="yakkl-btn-primary bg-blue-600 hover:bg-blue-700 text-sm"
      onclick={handleReceive}
      disabled={!account}
      title={'QR code to receive tokens'}
    >
      Receive
    </button>

    <button
      class="yakkl-btn-primary yakkl-swap text-sm}"
      onclick={handleSwapClick}
      disabled={!account}
      title={'Swap tokens'}
    >
      Swap
    </button>

    <button
      class="yakkl-btn-primary yakkl-btn-buy text-sm"
      onclick={handleBuySell}
      disabled={!account}
      title={'Buy and sell crypto'}
    >
      Buy/Sell
    </button>
  </div>

  <!-- Recent Activity -->
  <!-- Transactions are cached by BlockchainExplorer -->
  <RecentActivity
    className="yakkl-card relative z-10"
    showAll={true}
    onRefresh={async () => refreshAllData(true)}
    onTransactionClick={handleTransactionClick}
  />

  <!-- Token Portfolio -->
  <TokenPortfolio
    tokens={tokenList}
    loading={loading}
    className="yakkl-card relative z-10"
  />

  <!-- Debug Panel (Toggle with Ctrl/Cmd + Shift + D) -->
  {#if showDebugPanel}
    <div class="mt-4 relative z-10">
      <DataInspector />
    </div>
  {:else if import.meta.env.DEV}
    <!-- Show hint in dev mode -->
    <div class="mt-2 text-center text-xs opacity-50">
      Press Ctrl+Shift+D (or Cmd+Shift+D) to open debug panel
    </div>
  {/if}

  <!-- Pro Feature: Advanced Analytics -->
  {#if canUseFeature('advanced_analytics')}
    <AdvancedAnalytics className="relative z-10" />
  {:else}
    <div class="yakkl-card relative z-10 p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div class="text-gray-400 dark:text-gray-500 mb-3">
        <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="text-lg font-medium mb-2">Advanced Analytics</h3>
        <p class="text-sm mb-4">Get detailed portfolio insights, performance metrics, and market analysis.</p>
        <button
          onclick={() => showUpgradeModal = true}
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  {/if}

  <!-- Secure Full Recovery - Basic Feature -->
  {#if canUseFeature('secure_recovery')}
    <SecureRecovery className="relative z-10" />
  {/if}

  <!-- Extension System -->
  <ExtensionDashboard className="yakkl-card relative z-10" />

  <!-- Version Badge -->
  <div class="text-center pt-4 pb-2 relative z-10">
    <div class="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-md">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      YAKKL v{VERSION}
    </div>
    </div>
  {/if}
  <!-- End normal page content -->

</div>

<!-- AI Help Button - Floating Action Button (hidden during modals) -->
{#if !modalOpen}
  {#if !canUseFeature('ai_assistant')}
    <AIHelpButton className="fixed bottom-12 right-4" />
  {:else}
    <!-- Show locked AI button for non-Pro users -->
    <div class="fixed bottom-12 right-4 z-40">
      <button
        onclick={() => showUpgradeModal = true}
        class="yakkl-circle-button text-xl opacity-60 hover:opacity-80 transition-opacity"
        title="AI Assistant (Pro Feature - Upgrade Required)"
      >
        🤖
      </button>
    </div>
  {/if}
{/if}

<!-- Upgrade Modal -->
<Upgrade
  bind:show={showUpgradeModal}
  onComplete={() => {
    showUpgradeModal = false;
    // Refresh all data after upgrade
    refreshAllData();
  }}
  onCancel={() => showUpgradeModal = false}
/>

<!-- Add Token Modal -->
{#if showAddTokenModal}
  <AddCustomToken
    onCancel={() => {
      showAddTokenModal = false;
      selectedToken = null;
    }}
    onSuccess={() => {
      showAddTokenModal = false;
      selectedToken = null;
      tokenStore.refresh();
    }}
  />
{/if}

<!-- Transaction Detail Modal -->
<TransactionDetailModal
  show={showTransactionDetailModal}
  transaction={selectedTransaction}
  onClose={() => {
    showTransactionDetailModal = false;
    selectedTransaction = null;
  }}
/>

<!-- Portfolio Details Modal -->
<PortfolioDetailsModal
  bind:show={showPortfolioDetailsModal}
  onClose={() => showPortfolioDetailsModal = false}
/>

<!-- Transaction List Modal -->
{#if transactionListData}
  <TransactionListModal
    show={showTransactionListModal}
    account={transactionListData.account}
    chainId={transactionListData.chainId}
    chainName={transactionListData.chainName}
    transactions={transactionListData.transactions}
    ethPrice={transactionListData.ethPrice}
    onClose={() => {
      showTransactionListModal = false;
      transactionListData = null;
      modalStore.closeModal();
    }}
  />
{/if}
