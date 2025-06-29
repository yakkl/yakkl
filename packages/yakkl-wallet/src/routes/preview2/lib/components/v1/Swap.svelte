<script lang="ts">
	import { log } from '$lib/common/logger-wrapper';
	import { onDestroy, onMount } from 'svelte';
	import type {
		Profile,
		ProfileData,
		SwapParams,
		SwapPriceData,
		SwapToken
	} from '$lib/common/interfaces';
	import SellTokenPanel from './SellTokenPanel.svelte';
	import BuyTokenPanel from './BuyTokenPanel.svelte';
	import SwapSettings from './SwapSettings.svelte';
	import SwapSummary from './SwapSummary.svelte';
	import Modal from './Modal.svelte';
	import {
		BigNumber,
		decryptData,
		ETH_BASE_SWAP_GAS_UNITS,
		isEncryptedData,
		parseAmount,
		TIMER_SWAP_FETCH_PRICES_TIME,
		YAKKL_FEE_BASIS_POINTS,
		type BigNumberish
	} from '$lib/common';
	import { ethers as ethersv6 } from 'ethers-v6';
	import { UniswapSwapManager } from '$lib/managers/UniswapSwapManager';
	import { TokenService } from '$lib/managers/blockchains/evm/TokenService';
	import { Ethereum } from '$lib/managers/blockchains/evm/ethereum/Ethereum';
	import { Token } from '$lib/managers/Token';
	import type { Provider } from '$lib/managers/Provider';
	import { derived, writable } from 'svelte/store';
	import { getTokenBalance } from '$lib/utilities/balanceUtils';
	import debounce from 'lodash/debounce';
	import { toBigInt } from '$lib/common/math';
	import { GasToken } from '$lib/managers/GasToken';
	import { validateSwapQuote, type ValidationResult } from '$lib/common/validation';
	import { getMiscStore, getProfile } from '$lib/common/stores';
	import { deepCopy } from '$lib/utilities';
	import ErrorNoAction from './ErrorNoAction.svelte';
	import Warning from './Warning.svelte';
	import PincodeVerify from './PincodeVerify.svelte';
	import Confirmation from './Confirmation.svelte';
	import { sendNotificationMessage } from '$lib/common/notifications';
	import { getTimerManager } from '$lib/managers/TimerManager';

	// import { browserSvelte } from '$lib/utilities/browserSvelte';
	// import { getBrowserExt } from '$lib/browser-polyfill-wrapper';
	// import type { Browser } from 'webextension-polyfill';

	// import { multiHopQuoteAlphaRouter } from '$lib/managers/alphaRouter';
	// Add back to package.json - 		"@yakkl/uniswap-alpha-router-service": "workspace:*",

	///////////////////////
	// NOTE: The swap pricing process was done by the calling routine before calling this component. However, this caused unnecessary calls to the API. So, this now requires anything using it to set up the
	// swapPriceDataStore and then remove it when done with this component.
	// NOTE: To use a turnkey swap solution, use SwapModal.svelte which is a thin wrapper that implments the price checks and this component.
	///////////////////////

	interface Props {
		// Props
		fundingAddress: string;
		provider: Provider; // Provider must have Signer set before calling Swap!
		blockchain: Ethereum;
		swapManager: UniswapSwapManager;
		tokenService: TokenService<any>;
		show?: boolean;
		className?: string;
		onSwap?: (
			fundingAddress: string,
			tokenIn: SwapToken,
			tokenOut: SwapToken,
			fromAmount: BigNumberish,
			toAmount: BigNumberish
		) => void;
	}

	let {
		fundingAddress,
		provider,
		blockchain,
		swapManager,
		tokenService,
		show = $bindable(false),
		className = 'text-gray-600 z-[699]',
		onSwap = () => {}
	}: Props = $props();

	const SUPPORTED_STABLECOINS = ['USDC', 'USDT', 'DAI', 'BUSD'];

	// May could have passed this in as a prop
	let gasToken: GasToken = $state();

	// Initial token values
	let initialToken: SwapToken = {
		chainId: 1,
		address: '',
		name: '',
		symbol: '',
		decimals: 0,
		balance: 0n,
		logoURI: '',
		isNative: false,
		isStablecoin: false
	};

	// Central store for swap price data
	const initialSwapPriceData: SwapPriceData = {
		provider: 'Uniswap V3',
		lastUpdated: new Date(),
		chainId: 1,
		tokenIn: initialToken,
		tokenOut: initialToken,
		quoteAmount: 0n,
		fundingAddress: '',
		feeAmount: 0n,
		amountAfterFee: 0n,
		amountIn: 0n,
		amountOut: 0n,
		exchangeRate: 0n,
		marketPriceIn: 0,
		marketPriceOut: 0,
		marketPriceGas: 0,
		priceImpactRatio: 0,
		path: [],
		fee: 0,
		feeBasisPoints: YAKKL_FEE_BASIS_POINTS,
		feeAmountPrice: 0,
		feeAmountInUSD: '',
		gasEstimate: 0n,
		gasEstimateInUSD: '',
		tokenOutPriceInUSD: '',
		multiHop: false,
		slippageTolerance: 0.5,
		deadline: 10,
		error: null,
		isLoading: false
	};

	// Create stores
	interface SwapStateStore {
		tokenIn: SwapToken;
		tokenOut: SwapToken;
		fromAmount: string;
		toAmount: string;
		fromBalance: string;
		error: string;
		deadline: number; // Default value for deadline
		slippageTolerance: number; // Default slippage tolerance in percentage
		poolFee: number; // Default pool fee in basis points (e.g., 0.3%)
		multiHop: boolean;
	}

	interface UIStateStore {
		resetValues: boolean;
		isLoading: boolean;
		isSwapping: boolean;
	}

	const swapPriceDataStore = writable<SwapPriceData>(initialSwapPriceData);
	const insufficientBalanceStore = writable(false);

	let swapStateStore = writable<SwapStateStore>({
		tokenIn: initialToken,
		tokenOut: initialToken,
		fromAmount: '',
		toAmount: '',
		fromBalance: '0',
		error: '',
		deadline: 10, // Default value for deadline
		slippageTolerance: 0.5, // Default slippage tolerance in percentage
		poolFee: 3000, // Default pool fee in basis points (e.g., 0.3%)
		multiHop: false
	});

	let uiStateStore = writable<UIStateStore>({
		resetValues: false,
		isLoading: false,
		isSwapping: false
	});

	// State
	// let tokenIn: SwapToken = $state(initialToken);
	// let tokenOut: SwapToken = $state(initialToken);
	// let fromAmount = $state('');
	// let toAmount = $state('');
	// let fromBalance = $state('0');
	// let slippageTolerance = $state(0.5);  // 0.5% default - amount in percentage of acceptable slippage from quoted price
	// let deadline = $state(10);  // 10 minutes default
	// let poolFee = $state(3000); // 0.3% fee default
	// let error: string | null = $state(null);
	// let isLoading = $state(false);
	// let isSwapping = $state(false);
	// let resetValues = $state(false);
	// let multiHop = $state(false);

	// eslint-disable-next-line svelte/non-reactive-declaration
	// let tokens: SwapToken[] = [];

	// svelte-ignore non_reactive_update
	// let preferredTokens: SwapToken[] = [];

	let lastModifiedPanel: 'sell' | 'buy' = $state('sell');
	let swapManagerName = '';
	let isEthWethSwap = $state(false);
	let showVerify = $state(false);
	let showError = $state(false);
	let errorValue = $state('');
	let showWarning = $state(false);
	let warningValue = $state('');
	let showConfirmation = $state(false);
	let pincodeVerified = false;

	// Initialize
	onMount(async () => {
		try {
			reset();
			const yakklMiscStore = getMiscStore();
			if (!yakklMiscStore) {
				log.info('User is not logged in yet, so no swap is possible.');
				return;
			}

			// Provider must have Signer set before calling Swap!
			gasToken = new GasToken('YAKKL GasToken', 'ETH', blockchain, provider, fundingAddress); // Native token for now

			// Defaulting gas price check as last thing in onMount
			if (gasToken) {
				const price = await gasToken.getMarketPrice(); //.then(price => {
				updateSwapPriceData({ marketPriceGas: price.price });
			}
			// Add and start timer
			getTimerManager().addTimer('swap_fetchPrices', fetchPrices, TIMER_SWAP_FETCH_PRICES_TIME);
			getTimerManager().startTimer('swap_fetchPrices');
		} catch (error) {
			log.error('Error initializing swap:', false, error);
			$swapStateStore.error = 'Failed to initialize swap. Please try again.';
		}
	});

	onDestroy(() => {
		const yakklMiscStore = getMiscStore();
		if (yakklMiscStore) {
			getTimerManager().stopTimer('swap_fetchPrices');
			debouncedGetQuote.cancel();
			debouncedCheckBalance.cancel();
			debouncedGetMarketPrice.cancel();
			reset();
		}
	});

	const quoteTrigger = derived([swapStateStore], ([$swapStateStore]) => {
		const { deadline, slippageTolerance, poolFee } = $swapStateStore;
		return { deadline, slippageTolerance, poolFee };
	});

	$effect(() => {
		if (quoteTrigger) {
			debouncedGetQuote();
		}
	});

	$effect(() => {
		$swapStateStore.multiHop = $swapPriceDataStore.multiHop;
	});

	$effect(() => {
		const { tokenIn, tokenOut } = $swapPriceDataStore;
		if (
			(tokenIn.symbol === 'ETH' && tokenOut.symbol === 'WETH') ||
			(tokenIn.symbol === 'WETH' && tokenOut.symbol === 'ETH') ||
			(tokenIn.symbol === 'ETH' && tokenOut.symbol === 'ETH') ||
			(tokenIn.symbol === 'WETH' && tokenOut.symbol === 'WETH')
		) {
			isEthWethSwap = true;
		} else {
			isEthWethSwap = false;
		}
	});

	$effect(() => {
		(async () => {
			const { tokenIn, fromAmount } = $swapStateStore;
			if (tokenIn && fromAmount) {
				await debouncedCheckBalance(tokenIn, fromAmount, fundingAddress);

				if (gasToken && $swapPriceDataStore.marketPriceGas === 0) {
					await debouncedGetGasTokenPrice();
					// gasToken.getMarketPrice().then(price => {
					//   if ($swapPriceDataStore.marketPriceGas === 0) {
					//       updateSwapPriceData({ marketPriceGas: price.price });
					//   }
					// });
				}

				if (tokenIn.symbol && swapManager && $swapPriceDataStore.marketPriceIn === 0) {
					await debouncedGetMarketPrice(tokenIn);
				}
			}
		})();
	});

	$effect(() => {
		(async () => {
			if ($swapStateStore.tokenOut && $swapStateStore.toAmount) {
				// Only need to update if we have a tokenOut and the market price is 0
				if ($swapStateStore.tokenOut.symbol && $swapPriceDataStore.marketPriceOut === 0) {
					await debouncedGetMarketPrice($swapStateStore.tokenOut);
				}
			}
		})();
	});

	// Debounced quote handler, check balance, and market price
	const debouncedGetQuote = debounce(async () => {
		await getQuote();
	}, 300);

	const debouncedCheckBalance = debounce(checkBalance, 300);

	const debouncedGetGasTokenPrice = debounce(async () => {
		const price = await gasToken.getMarketPrice();
		if ($swapPriceDataStore.marketPriceGas === 0) {
			updateSwapPriceData({ marketPriceGas: price.price });
		}
	}, 500);

	const debouncedGetMarketPrice = debounce(async (token) => {
		const price = await swapManager.getMarketPrice(`${token.symbol}-USD`);
		if (price.price > 0) {
			updateSwapPriceData({ marketPriceIn: price.price });
		}
	}, 500);

	// Function to fetch the gas price
	async function fetchPrices() {
		if (gasToken) {
			try {
				// Always the native token except where we sponsor the gas
				const price = await gasToken.getMarketPrice();
				updateSwapPriceData({ marketPriceGas: price.price });
			} catch (error) {
				log.error('Error fetching gas price:', false, error);
			}
		}

		if ($swapStateStore.tokenIn && $swapStateStore.tokenIn.symbol && swapManager) {
			try {
				const price = await swapManager.getMarketPrice(`${$swapStateStore.tokenIn.symbol}-USD`);
				updateSwapPriceData({ marketPriceIn: price.price });
			} catch (error) {
				log.error('Error fetching market price:', false, error);
			}
		}

		if ($swapStateStore.tokenOut && $swapStateStore.tokenOut.symbol && swapManager) {
			try {
				const price = await swapManager.getMarketPrice(`${$swapStateStore.tokenOut.symbol}-USD`);
				updateSwapPriceData({ marketPriceOut: price.price });
			} catch (error) {
				log.error('Error fetching market price:', false, error);
			}
		}
	}

	// Handler functions
	async function handleSellAmountChange(amount: string) {
		$swapStateStore.error = '';
		$swapStateStore.fromAmount = amount;
		lastModifiedPanel = 'sell';

		if (amount !== '.' && isNaN(parseFloat(amount))) {
			log.info('Swap - Invalid sell amount:', false, amount);

			$swapStateStore.fromAmount = '';
			updateSwapPriceData({
				amountIn: 0n,
				amountOut: 0n
			});
			return;
		}

		try {
			const parsedAmount = parseAmount(amount, $swapStateStore.tokenIn.decimals);
			updateSwapPriceData({
				amountIn: parsedAmount
			});
			if ($swapStateStore.tokenIn && $swapStateStore.tokenOut) {
				await getQuote(true);
			}
		} catch (error) {
			log.error('Error handling sell amount change:', false, error);
			$swapStateStore.error = 'Failed to process sell amount';
		}
	}

	async function handleBuyAmountChange(amount: string) {
		$swapStateStore.error = '';
		$swapStateStore.toAmount = amount;
		lastModifiedPanel = 'buy';

		if (amount !== '.' && isNaN(parseFloat(amount))) {
			$swapStateStore.toAmount = '';
			updateSwapPriceData({
				amountOut: 0n
			});
			return;
		}

		try {
			const parsedAmount = parseAmount(amount, $swapStateStore.tokenOut.decimals);
			updateSwapPriceData({
				amountOut: parsedAmount
			});
			if ($swapStateStore.tokenIn && $swapStateStore.tokenOut) await getQuote(false);
		} catch (error) {
			log.error('Error handling buy amount change:', false, error);
			$swapStateStore.error = 'Failed to process buy amount';
		}
	}

	async function handleTokenSelect(token: SwapToken, type: 'sell' | 'buy') {
		$swapStateStore.error = '';

		// Check if selecting the same token
		const otherToken = type === 'sell' ? $swapStateStore.tokenOut : $swapStateStore.tokenIn;
		if (otherToken.symbol && areTokensEqual(token, otherToken)) {
			$swapStateStore.error = `Cannot swap ${token.symbol} for itself`;
			return;
		}

		// This is a helper function to set the pool fee for stablecoins
		if (token.isStablecoin || SUPPORTED_STABLECOINS.includes(token.symbol)) {
			$swapStateStore.poolFee = 500;
			token.isStablecoin = true;
			updateSwapPriceData({ fee: $swapStateStore.poolFee });
		}

		if (!token.balance || toBigInt(token.balance) <= 0n) {
			token.balance = await getTokenBalance(token, fundingAddress, provider, tokenService);
		}
		const formattedBalance = ethersv6.formatUnits(toBigInt(token.balance), token.decimals); // NOTE: This and all ethers specific code should be moved to the TokenService - maybe

		if (type === 'sell') {
			$swapStateStore.tokenIn = token;
			updateSwapPriceData({ tokenIn: token });
			$swapStateStore.fromBalance = formattedBalance;
		} else {
			$swapStateStore.tokenOut = token;
			updateSwapPriceData({ tokenOut: token });
		}

		if ($swapStateStore.tokenIn && $swapStateStore.tokenOut) {
			if (lastModifiedPanel === 'sell' && $swapStateStore.fromAmount) {
				await handleSellAmountChange($swapStateStore.fromAmount);
			} else if (lastModifiedPanel === 'buy' && $swapStateStore.toAmount) {
				await handleBuyAmountChange($swapStateStore.toAmount);
			}
		}
	}

	async function switchTokens() {
		[$swapStateStore.tokenIn, $swapStateStore.tokenOut] = [
			$swapStateStore.tokenOut,
			$swapStateStore.tokenIn
		];
		[$swapStateStore.fromAmount, $swapStateStore.toAmount] = [
			$swapStateStore.toAmount,
			$swapStateStore.fromAmount
		];

		updateSwapPriceData({
			tokenIn: $swapStateStore.tokenIn,
			tokenOut: $swapStateStore.tokenOut,
			amountIn: $swapStateStore.toAmount
				? parseAmount($swapStateStore.toAmount, $swapStateStore.tokenIn.decimals)
				: 0n,
			amountOut: $swapStateStore.fromAmount
				? parseAmount($swapStateStore.fromAmount, $swapStateStore.tokenOut.decimals)
				: 0n
		});

		if ($swapStateStore.tokenIn && $swapStateStore.tokenOut) {
			if ($swapStateStore.fromAmount) await handleSellAmountChange($swapStateStore.fromAmount);
			else if ($swapStateStore.toAmount) await handleBuyAmountChange($swapStateStore.toAmount);
		}
	}

	// Helper functions
	function updateSwapPriceData(newData: Partial<SwapPriceData>) {
		swapPriceDataStore.update((currentData) => ({ ...currentData, ...newData }));
	}

	async function checkBalance(token: SwapToken, amount: string, fundingAddress: string) {
		try {
			if (!token || !amount || !fundingAddress) {
				insufficientBalanceStore.set(false);
				return false;
			}

			const balance = await getTokenBalance(token, fundingAddress, provider, tokenService);
			const formattedBalance = ethersv6.formatUnits(balance, token.decimals);

			// Only update if the balance actually changes
			if (formattedBalance !== $swapStateStore.fromBalance) {
				$swapStateStore.fromBalance = formattedBalance;
				token.balance = balance;
			}

			const requiredAmount = parseAmount(amount, token.decimals);
			const isInsufficient = balance < requiredAmount;
			insufficientBalanceStore.set(isInsufficient);

			return isInsufficient;
		} catch (error) {
			insufficientBalanceStore.set(false);
			log.error('Error checking balance:', false, error);
			return false;
		}
	}

	// async function fetchTokenList(): Promise<SwapToken[]> {
	//   try {
	//     if ( browserSvelte ) {
	//       const response = await fetch(browser_ext.runtime.getURL('/data/uniswap.json')); // 'https://tokens.uniswap.org' );
	//       const data = await response.json();
	//       data.tokens
	//         .filter( ( token: SwapToken ) => token.chainId === (blockchain ? blockchain.getChainId() || 1 : 1))
	//         .map( ( token: SwapToken ) => {
	//           if ( SUPPORTED_STABLECOINS.includes( token.symbol ) ) {
	//             token.isStablecoin = true;
	//           }
	//           return token;
	//         } );
	//       return data.tokens.filter((token: SwapToken) => token.chainId === 1); // blockchain.getChainId() || 1);
	//     }
	//     return [];
	//   } catch (error) {
	//     log.error('Error fetching token list:', false, error);
	//     return [];
	//   }
	// }

	// function getPreferredTokens(tokens: SwapToken[]): SwapToken[] {
	//   const preferredTokenSymbols = ["ETH", "WETH", "USDC", "USDT", "WBTC"];
	//   return preferredTokenSymbols
	//     .map(symbol => tokens.find(token => token.symbol === symbol))
	//     .filter((token): token is SwapToken => token !== undefined);
	// }

	async function validateBalance(): Promise<boolean> {
		try {
			if (!$swapStateStore.tokenIn || !$swapStateStore.fromAmount || !fundingAddress) return false;
			// Get token or native balance
			const balance = await getTokenBalance(
				$swapStateStore.tokenIn,
				fundingAddress,
				provider,
				tokenService
			);
			// Parse amounts
			const swapAmount = ethersv6.parseUnits(
				$swapStateStore.fromAmount,
				$swapStateStore.tokenIn.decimals
			);

			// If native token (ETH), account for gas
			if ($swapStateStore.tokenIn.isNative) {
				const gasEstimate = $swapPriceDataStore.gasEstimate || 0n;
				const totalRequiredAmount = swapAmount + (BigNumber.toBigInt(gasEstimate) || 0n);
				if (balance < totalRequiredAmount) {
					$swapStateStore.error = `Insufficient ${$swapStateStore.tokenIn.symbol} balance. Need ${ethersv6.formatUnits(totalRequiredAmount, $swapStateStore.tokenIn.decimals)} ${$swapStateStore.tokenIn.symbol}, but have ${ethersv6.formatUnits(balance, $swapStateStore.tokenIn.decimals)} ${$swapStateStore.tokenIn.symbol}`;
					return false;
				}
			} else {
				// For ERC20 tokens, check swap amount
				const totalRequiredAmount = swapAmount;
				if (balance < totalRequiredAmount) {
					$swapStateStore.error = `Insufficient ${$swapStateStore.tokenIn.symbol} balance. Need ${ethersv6.formatUnits(totalRequiredAmount, $swapStateStore.tokenIn.decimals)} ${$swapStateStore.tokenIn.symbol}, but have ${ethersv6.formatUnits(balance, $swapStateStore.tokenIn.decimals)} ${$swapStateStore.tokenIn.symbol}`;
					return false;
				}
			}
			return true;
		} catch (error) {
			log.error('Error validating balance:', false, error);
			$swapStateStore.error = 'Failed to validate balance. Please try again.';
			return false;
		}
	}

	// Fix for the quote formatting issue
	async function getQuote(isExactIn: boolean = true) {
		if (
			!$swapStateStore.tokenIn.symbol ||
			!$swapStateStore.tokenOut.symbol ||
			(!$swapStateStore.fromAmount && !$swapStateStore.toAmount)
		)
			return;

		// Add token equality check
		if (areTokensEqual($swapStateStore.tokenIn, $swapStateStore.tokenOut)) {
			$swapStateStore.error = `Cannot swap ${$swapStateStore.tokenIn.symbol} for itself`;
			return;
		}

		if (isEthWethSwap) {
			updateSwapPriceData({ feeAmount: 0n }); // May want to force fees, slippage, etc. to 0 here
			return; // Do nothing here for now
		}

		try {
			$uiStateStore.isLoading = true;
			const amount = isExactIn
				? parseAmount($swapStateStore.fromAmount, $swapStateStore.tokenIn.decimals)
				: parseAmount($swapStateStore.toAmount, $swapStateStore.tokenOut.decimals);

			$swapStateStore.slippageTolerance = $swapPriceDataStore.slippageTolerance || 0.5;
			$swapStateStore.deadline = $swapPriceDataStore.deadline || 10;
			$swapStateStore.poolFee = $swapPriceDataStore.fee || 3000;

			const quote = await swapManager.getQuote(
				Token.fromSwapToken($swapStateStore.tokenIn, blockchain, provider),
				Token.fromSwapToken($swapStateStore.tokenOut, blockchain, provider),
				amount,
				fundingAddress,
				isExactIn,
				$swapStateStore.poolFee
			);

			// const { multiHopQuoteAlphaRouter } = await import('../plugins/alphaRouter');

			// multiHopQuoteAlphaRouter(
			//   Token.fromSwapToken($swapStateStore.tokenIn, blockchain, provider),
			//   Token.fromSwapToken($swapStateStore.tokenOut, blockchain, provider),
			//   amount,
			//   fundingAddress,
			//   isExactIn );

			if (!quote || quote.error) {
				$swapStateStore.error =
					'No valid pool found for this token pair. Try a different combination.';
				return;
			}

			// Reset the slippage and deadline to correct values
			if (quote) {
				quote.slippageTolerance = $swapStateStore.slippageTolerance;
				quote.deadline = $swapStateStore.deadline;
			}

			// Handle the BigNumberish type safely
			if (isExactIn) {
				const amountOut = quote.amountOut ?? 0n;
				$swapStateStore.toAmount = ethersv6.formatUnits(
					toBigInt(amountOut),
					$swapStateStore.tokenOut.decimals
				);
			} else {
				const amountIn = quote.amountIn ?? 0n;
				$swapStateStore.fromAmount = ethersv6.formatUnits(
					toBigInt(amountIn),
					$swapStateStore.tokenIn.decimals
				);
			}
			updateSwapPriceData(quote);
		} catch (error) {
			log.error('Quote Error:', false, error);
			$swapStateStore.error = `Failed to get quote: ${error}`;
			$swapStateStore.toAmount = '';
		} finally {
			$uiStateStore.isLoading = false;
		}
	}

	// May want to make this a little less dependent on the store and move to a more generic function
	async function validateQuote() {
		let returnCode: boolean = false;

		if (
			!$swapStateStore.tokenIn ||
			!$swapStateStore.tokenOut ||
			!$swapStateStore.fromAmount ||
			!$swapStateStore.toAmount ||
			!fundingAddress ||
			!swapManager
		) {
			$swapStateStore.error = 'Invalid swap parameters';
			return returnCode;
		}

		// Add token equality check
		if (areTokensEqual($swapStateStore.tokenIn, $swapStateStore.tokenOut)) {
			$swapStateStore.error = `Cannot swap ${$swapStateStore.tokenIn.symbol} for itself`;
			return returnCode;
		}

		if (!$swapPriceDataStore) {
			$swapStateStore.error = 'Failed to get quote';
			return returnCode;
		}
		if ($swapPriceDataStore.error) {
			$swapStateStore.error = $swapPriceDataStore.error;
			return returnCode;
		}
		if ($insufficientBalanceStore) {
			$swapStateStore.error = `Insufficient balance for the given swap. You need ETH for gas fees and enough ${$swapStateStore.tokenIn.symbol} to sell/swap.`;
			return returnCode;
		}

		if (!(await validateBalance())) {
			// Redundant check for now
			$swapStateStore.error = 'Insufficient balance for the given swap';
			return;
		}

		const results: ValidationResult = validateSwapQuote($swapPriceDataStore);

		if (results.error) {
			$swapStateStore.error = results.error;
			log.error('Validation error:', false, $swapStateStore.error);
			return returnCode;
		}

		return true;
	}

	function areTokensEqual(token1: SwapToken, token2: SwapToken): boolean {
		// Check for native token variants (ETH/WETH)
		const isEthVariant = (symbol: string) => ['ETH', 'WETH'].includes(symbol);

		if (token1.address && token2.address) {
			// Compare addresses if both tokens have them
			return token1.address.toLowerCase() === token2.address.toLowerCase();
		} else if (token1.symbol && token2.symbol) {
			// If one is ETH and other is WETH, they're considered different
			if (isEthVariant(token1.symbol) && isEthVariant(token2.symbol)) {
				return token1.symbol === token2.symbol;
			}
			// Compare symbols as fallback
			return token1.symbol === token2.symbol;
		}
		return false;
	}

	async function swapTokens() {
		try {
			// Verify pin for one more security check before calling this function!

			if (!pincodeVerified) {
				showVerify = true;
				return;
			}

			if (isEthWethSwap) {
				updateSwapPriceData({ feeAmount: 0n }); // May want to force fees, slippage, etc. to 0 here
				// May want to do something with receipts later...
				if (
					$swapStateStore.tokenIn.symbol === 'ETH' &&
					$swapStateStore.tokenOut.symbol === 'WETH'
				) {
					// Wrap ETH to WETH
					const receipt = await swapManager.wrapETH(
						ethersv6.parseUnits($swapStateStore.fromAmount, $swapStateStore.tokenIn.decimals),
						fundingAddress
					);
				} else if (
					$swapStateStore.tokenIn.symbol === 'WETH' &&
					$swapStateStore.tokenOut.symbol === 'ETH'
				) {
					// Unwrap WETH to ETH
					const receipt = await swapManager.unwrapWETH(
						ethersv6.parseUnits($swapStateStore.fromAmount, $swapStateStore.tokenIn.decimals),
						fundingAddress
					);
				}
				return;
			}
			$uiStateStore.isSwapping = true;
			$swapStateStore.error = '';
			// Make sure getQuote has been called successfully
			if (!(await validateQuote())) {
				$uiStateStore.isSwapping = false;
				return; // Error message is set in validateQuote
			}

			const tokenInInstance = Token.fromSwapToken(
				$swapPriceDataStore.tokenIn,
				blockchain,
				provider
			);
			const tokenOutInstance = Token.fromSwapToken(
				$swapPriceDataStore.tokenOut,
				blockchain,
				provider
			);

			if (!$swapPriceDataStore.tokenIn.isNative) {
				const allowance = await swapManager.checkAllowance(tokenInInstance, fundingAddress);
				const requiredAmount = ethersv6.parseUnits(
					$swapStateStore.fromAmount,
					tokenInInstance.decimals
				);

				if (allowance < requiredAmount) {
					const receipt = await swapManager.approveToken(
						tokenInInstance,
						$swapStateStore.fromAmount
					);
				}
			}

			const { maxFeePerGas, maxPriorityFeePerGas } = await getCurrentGasPrices();

			const params: SwapParams = {
				tokenIn: tokenInInstance,
				tokenOut: tokenOutInstance,
				amount: ethersv6.parseUnits(
					$swapStateStore.fromAmount,
					$swapPriceDataStore.tokenIn.decimals
				),
				fee: $swapPriceDataStore.fee || $swapStateStore.poolFee, // Basis points - not used here for multihops
				slippage: $swapPriceDataStore.slippageTolerance || $swapStateStore.slippageTolerance,
				deadline: $swapPriceDataStore.deadline || $swapStateStore.deadline,
				recipient: $swapPriceDataStore.fundingAddress,
				feeRecipient: import.meta.env.VITE_YAKKL_FEE_RECIPIENT || 'aifees.eth', // Fee recipient address
				feeAmount: $swapPriceDataStore.feeAmount || 0n,
				gasLimit: toBigInt($swapPriceDataStore.gasEstimate) || ETH_BASE_SWAP_GAS_UNITS,
				maxFeePerGas: maxFeePerGas,
				maxPriorityFeePerGas: maxPriorityFeePerGas
			};

			const [receiptTrans, receiptFee] = await swapManager.executeFullSwap(params); // May want to do something with receipts later...

			onSwap(
				fundingAddress,
				$swapStateStore.tokenIn,
				$swapStateStore.tokenOut,
				ethersv6.parseUnits($swapStateStore.fromAmount, $swapStateStore.tokenIn.decimals),
				ethersv6.parseUnits($swapStateStore.toAmount, $swapStateStore.tokenOut.decimals)
			); // Notify parent component - could add more data here such as fee, feeAmount, etc.

			$swapStateStore.error = '';

			// Add more details to the notification in the future
			await sendNotificationMessage(
				'Swap completed successfully',
				'Your swap has been completed successfully.'
			);

			reset();
			show = false;
		} catch (err: any) {
			$uiStateStore.isSwapping = false;
			log.error('Error executing swap:', err);
			$swapStateStore.error = `Failed to execute swap: ${err.message}`;
		}
	}

	async function getCurrentGasPrices(): Promise<{
		maxFeePerGas: bigint;
		maxPriorityFeePerGas: bigint;
	}> {
		try {
			// Use a gas price API or provider method
			const feeData = await provider.getFeeData();

			return {
				maxFeePerGas: toBigInt(feeData.maxFeePerGas),
				maxPriorityFeePerGas: toBigInt(feeData.maxPriorityFeePerGas)
			};
		} catch (error) {
			// Fallback to manual rates
			return {
				maxFeePerGas: ethersv6.parseUnits('30', 'gwei'),
				maxPriorityFeePerGas: ethersv6.parseUnits('1', 'gwei')
			};
		}
	}

	function reset() {
		showConfirmation = false;
		showError = false;
		errorValue = '';
		showWarning = false;
		warningValue = '';
		pincodeVerified = false;
		showVerify = false;

		$swapStateStore.tokenIn = initialToken;
		$swapStateStore.tokenOut = initialToken;
		$swapStateStore.fromAmount = '';
		$swapStateStore.toAmount = '';
		$swapStateStore.fromBalance = '0';
		$swapStateStore.poolFee = 3000;
		$swapStateStore.error = '';
		lastModifiedPanel = 'sell';
		insufficientBalanceStore.set(false);
		swapPriceDataStore.set(initialSwapPriceData);
		$uiStateStore.resetValues = true;
	}

	function handleConfirmSwap() {
		showWarning = false;
		warningValue = '';
		showConfirmation = true;
	}

	function handleCancelSwap() {
		showConfirmation = false;
	}

	function handleConfirm() {
		showConfirmation = false;
		showWarning = false;
		warningValue = '';
		handleSwap();
	}

	function handleSwap() {
		pincodeVerified = false;
		showWarning = false;
		warningValue = '';
		showVerify = true;
	}

	function handleClose() {
		showConfirmation = false;
		showError = false;
		errorValue = '';
		showWarning = false;
		warningValue = '';
		pincodeVerified = false;
		showVerify = false;
	}

	// Pincode verification
	function handleReject(
		rejection: string = 'You have rejected or Pincode was not validated. No swap transaction was sent.'
	) {
		try {
			showConfirmation = false;
			showVerify = false;
			showError = false;
			pincodeVerified = false;
			showWarning = true;
			warningValue = rejection;
		} catch (e: any) {
			log.error(e);
		}
	}

	async function handleVerified(pincode: string) {
		try {
			let profile: Profile | null = await verifyWithPin(pincode, pincodeVerified);
			if (profile === null) {
				throw 'Profile was not found.';
			}

			pincodeVerified = true;
			showVerify = false;

			await swapTokens();
		} catch (e) {
			log.error(e);
		}
	}

	// One more internal check to verify the pincode
	async function verifyWithPin(pincode: string, pincodeVerified: boolean): Promise<Profile | null> {
		try {
			const yakklMiscStore = getMiscStore();
			let profile: Profile | null = await getProfile();
			if (profile === null) {
				pincodeVerified = false;
				throw 'Profile was not found.';
			}

			let profileEncrypted = null;

			if (isEncryptedData(profile.data)) {
				profileEncrypted = deepCopy(profile);
				await decryptData(profile?.data, yakklMiscStore).then((result) => {
					(profile as Profile).data = result as ProfileData;
				});
			}

			if ((profile.data as ProfileData).pincode !== pincode && pincodeVerified === false) {
				pincodeVerified = false;
				throw 'PINCODE was not verified.';
			}

			if (pincode === (profile.data as ProfileData).pincode) {
				profile = null;
				return profileEncrypted;
			} else {
				pincodeVerified = false;
				throw 'PINCODE did not match.';
			}
		} catch (e: any) {
			log.error(e);
			pincodeVerified = false;
			return null;
		}
	}

	function handleCloseModal() {
		reset();
		show = false;
	}
</script>

<!-- TODO: Maybe - Move these two to a SecurityBaseLayout.svelte and wrap the content in them -->
<Confirmation
	bind:show={showConfirmation}
	className="z-[990]"
	onConfirm={handleConfirm}
	onReject={handleCancelSwap}
/>
<PincodeVerify
	bind:show={showVerify}
	className="text-gray-600 z-[990]"
	onRejected={handleReject}
	onVerified={handleVerified}
/>

<!-- TODO: Maybe - Move these two to layout and use stores -->
<ErrorNoAction bind:show={showError} className="z-[999]" value={errorValue} handle={handleClose} />
<Warning bind:show={showWarning} className="z-[999]" value={warningValue} handle={handleClose} />

<Modal bind:show title="Swap" {className} onClose={handleCloseModal}>
	<div class="p-6 space-y-4">
		<!-- Sell Section -->
		<span>Sell</span>
		<SellTokenPanel
			{swapPriceDataStore}
			disabled={false}
			insufficientBalance={$insufficientBalanceStore}
			balance={$swapStateStore.fromBalance}
			bind:resetValues={$uiStateStore.resetValues}
			bind:lastModifiedPanel
			onTokenSelect={(token) => handleTokenSelect(token, 'sell')}
			onAmountChange={handleSellAmountChange}
		/>

		<!-- Switch Button -->
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button
			onclick={switchTokens}
			class="mx-auto block bg-gray-200 p-2 rounded-full transform transition-transform hover:rotate-180"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 text-gray-600"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
				/>
			</svg>
		</button>

		<!-- Buy Section -->
		<span>Buy</span>
		<BuyTokenPanel
			{swapPriceDataStore}
			disabled={false}
			bind:resetValues={$uiStateStore.resetValues}
			bind:lastModifiedPanel
			onTokenSelect={(token) => handleTokenSelect(token, 'buy')}
			onAmountChange={handleBuyAmountChange}
		/>

		<!-- Error Message (need to look at wrap blocking)-->
		{#if $swapStateStore.error && !isEthWethSwap}
			<div class="w-full bg-red-50 border border-red-200 rounded-lg p-3">
				<div class="flex items-center justify-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-red-500 mr-2"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<div class="text-red-500 text-center overflow-x-auto max-w-full">
						<span class="whitespace-nowrap">{$swapStateStore.error}</span>
					</div>
				</div>
			</div>
		{/if}

		<div class="w-full bg-blue-400 border border-blue-800 rounded-lg p-3">
			<div class="flex items-center justify-center">
				<div class="text-blue-700 text-center overflow-x-auto max-w-full">
					{#if $swapStateStore.multiHop}
						<span class="whitespace-nowrap">This swap requires multiple hops to complete.</span>
					{:else}
						<span class="whitespace-nowrap">This swap requires a single hop to complete.</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Settings -->
		{#if isEthWethSwap === false}
			<SwapSettings
				{swapPriceDataStore}
				onSlippageChange={(value) => ($swapStateStore.slippageTolerance = value)}
				onDeadlineChange={(value) => ($swapStateStore.deadline = value)}
				onPoolFeeChange={(value) => {
					$swapStateStore.poolFee = value;
					if (
						($swapStateStore.tokenIn?.isStablecoin || $swapStateStore.tokenOut?.isStablecoin) &&
						swapManagerName.includes('uniswap')
					) {
						$swapStateStore.poolFee = 500;
					}
					updateSwapPriceData({ fee: $swapStateStore.poolFee });
				}}
			/>
		{:else}
			<div class="w-full bg-blue-400 border border-blue-800 rounded-lg p-3">
				<div class="flex items-center justify-center">
					<div class="text-blue-700 text-center overflow-x-auto max-w-full">
						<span class="whitespace-nowrap"
							>ETH-WETH swap is a simple wrap so no additional information needed.</span
						>
					</div>
				</div>
			</div>
		{/if}

		<!-- Summary -->
		<SwapSummary {swapPriceDataStore} disabled={isEthWethSwap} />

		<!-- Reset Button -->
		<button
			onclick={reset}
			class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 mr-2"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
			Reset Swap
		</button>

		<!-- Swap Button -->
		<button
			onclick={handleConfirmSwap}
			class="w-full px-4 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
			disabled={!$swapStateStore.tokenIn ||
				!$swapStateStore.tokenOut ||
				!$swapStateStore.fromAmount ||
				!$swapStateStore.toAmount}
		>
			{#if !isEthWethSwap}
				{$uiStateStore.isLoading ? 'Loading...' : $uiStateStore.isSwapping ? 'Swapping...' : 'Swap'}
			{:else}
				{$uiStateStore.isLoading
					? 'Loading...'
					: $swapStateStore.tokenIn.symbol === 'WETH'
						? 'Unwrap'
						: 'Wrap'}
			{/if}
		</button>
		<!-- Cancel Button -->
		<button
			onclick={handleCloseModal}
			class="w-full px-4 py-3 text-lg font-medium text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
		>
			Cancel
		</button>
	</div>
</Modal>
