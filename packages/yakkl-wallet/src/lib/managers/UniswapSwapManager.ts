/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// UniswapSwapManager.ts
import {
	toBigInt,
	YAKKL_FEE_BASIS_POINTS,
	YAKKL_GAS_ESTIMATE_MIN_USD,
	YAKKL_GAS_ESTIMATE_MULTIHOP_SWAP_DEFAULT,
	YAKKL_GAS_ESTIMATE_MULTIPLIER_BASIS_POINTS
} from '$lib/common';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import { DecimalMath } from '$lib/common/DecimalMath';
import type {
	BigNumberish,
	PoolInfoData,
	PriceData,
	SwapParams,
	SwapPriceData,
	SwapToken,
	TransactionReceipt,
	TransactionRequest,
	TransactionResponse
} from './types';
import { EthereumBigNumber } from '$lib/common/bignumber-ethereum';
import type { ExactInputParams, ExactInputSingleParams } from '$lib/common/ISwapRouter';
import IUniswapV3FactoryJSON from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';
const IUniswapV3FactoryABI = IUniswapV3FactoryJSON;
import ISwapRouterJSON from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json';
const ISwapRouterABI = ISwapRouterJSON.abi;
import IQuoterV2JSON from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
const IQuoterV2ABI = IQuoterV2JSON;
import { ethers } from 'ethers-v6';
import { formatFeeToUSD, formatPrice } from '../utils/v1_utilities';
import type { Ethereum } from './blockchains/evm/ethereum/Ethereum';
import { ADDRESSES } from './contracts/evm/constants-evm';
import type { Provider } from './Provider';
import { SwapManager } from './SwapManager';
import { Token } from './Token';
import { EVMToken } from './tokens/evm/EVMToken';
import { EthersConverter } from './utilities/EthersConverter';
import { log } from '$lib/common/logger-wrapper';

const SUPPORTED_STABLECOINS = ['USDC', 'USDT', 'DAI', 'BUSD'];

export class UniswapSwapManager extends SwapManager {
	private routerContract: ethers.Contract | null = null;
	private providerNative: ethers.JsonRpcProvider | null = null;
	private signerNative: ethers.JsonRpcSigner | null = null;
	private factory: ethers.Contract | null = null;

	constructor(
		blockchain: Ethereum,
		provider: Provider,
		initialFeeBasisPoints: number = YAKKL_FEE_BASIS_POINTS
	) {
		super(blockchain, provider, initialFeeBasisPoints);
		this.initialize().then();
	}

	async initialize(): Promise<void> {
		this.providerNative = await this.provider.getProvider(); // This needs to be the normal native provider and not Signer
		if (!this.providerNative) throw new Error('Ethereum native provider not initialized');
		this.signerNative = this.provider.getSignerNative();
		if (!this.signerNative) throw new Error('Ethereum native signer not initialized');

		this.factory = new ethers.Contract(
			ADDRESSES.UNISWAP_FACTORY,
			IUniswapV3FactoryABI.abi,
			this.providerNative
		);

		this.routerContract = new ethers.Contract(
			ADDRESSES.UNISWAP_V3_ROUTER,
			ISwapRouterABI,
			this.signerNative
		);

		this.tokens = await this.fetchTokenList();
		this.preferredTokens = this.getPreferredTokens(this.tokens);
		this.tokens = this.tokens
			.filter((token) => !this.preferredTokens.includes(token))
			.sort((a, b) => a.symbol.localeCompare(b.symbol));
		this.stablecoinTokens = this.tokens.filter((token) => token.isStablecoin);
	}

	dispose() {
	}

	getName(): string {
		return 'Uniswap V3';
	}

	async checkIfPoolExists(tokenIn: Token, tokenOut: Token, fee: number): Promise<boolean> {
		if (!this.factory) throw new Error('Factory contract not initialized');
		try {
			const poolAddress = await this.factory.getPool(tokenIn.address, tokenOut.address, fee);
			return poolAddress !== ethers.ZeroAddress;
		} catch (error) {
			return false;
		}
	}

	async fetchTokenList(): Promise<SwapToken[]> {
		try {
			const response = await fetch('https://tokens.uniswap.org');
			const data = await response.json();
			data.tokens
				.filter((token: SwapToken) => token.chainId === this.blockchain?.getChainId())
				.map((token: SwapToken) => {
					if (SUPPORTED_STABLECOINS.includes(token.symbol)) {
						token.isStablecoin = true;
					}
					return token;
				});

			const eth: SwapToken = {
				chainId: 1,
				address: ADDRESSES.WETH,
				name: 'Ethereum',
				symbol: 'ETH',
				decimals: 18,
				isNative: true,
				isStablecoin: false,
				logoURI: '/images/eth.svg'
			};

			data.tokens.unshift(eth);
			return data.tokens;
		} catch (error) {
			log.error('Error fetching token list:', false, error);
			return [];
		}
	}

	getPreferredTokens(tokens: SwapToken[]): SwapToken[] {
		const preferredTokenSymbols = ['ETH', 'WETH', 'WBTC', 'USDC', 'USDT', 'DAI'];
		return preferredTokenSymbols
			.map((symbol) => tokens.find((token) => token.symbol === symbol))
			.filter((token): token is SwapToken => token !== undefined);
	}

	async multiHopQuote(
		tokenIn: Token,
		tokenOut: Token,
		amount: BigNumberish,
		fundingAddress: string,
		isExactIn: boolean = true,
		fee: number = 3000
	): Promise<SwapPriceData> {
		const provider = new ethers.AlchemyProvider(
			'mainnet',
			import.meta.env.VITE_ALCHEMY_API_KEY_PROD
		);
		const quoterV2ABI = [
			{
				inputs: [
					{
						internalType: 'bytes',
						name: 'path',
						type: 'bytes'
					},
					{
						internalType: 'uint256',
						name: 'amountIn',
						type: 'uint256'
					}
				],
				name: 'quoteExactInput',
				outputs: [
					{
						internalType: 'uint256',
						name: 'amountOut',
						type: 'uint256'
					}
				],
				stateMutability: 'nonpayable',
				type: 'function'
			},
			{
				inputs: [
					{
						internalType: 'bytes',
						name: 'path',
						type: 'bytes'
					},
					{
						internalType: 'uint256',
						name: 'amountOut',
						type: 'uint256'
					}
				],
				name: 'quoteExactOutput',
				outputs: [
					{
						internalType: 'uint256',
						name: 'amountIn',
						type: 'uint256'
					}
				],
				stateMutability: 'nonpayable',
				type: 'function'
			}
		];

		const quoterContract = new ethers.Contract(ADDRESSES.UNISWAP_V3_QUOTER, quoterV2ABI, provider);

		const tokenInAddress = tokenIn.address;
		const tokenOutAddress = tokenOut.address;

		const encodedPath = isExactIn
			? ethers.solidityPacked(
					['address', 'uint24', 'address', 'uint24', 'address'],
					[
						tokenInAddress, // TokenIn address
						fee, // Fee for TokenIn -> WETH pool
						ADDRESSES.WETH, // WETH address
						fee, // Fee for WETH -> TokenOut pool
						tokenOutAddress // TokenOut address
					]
				)
			: ethers.solidityPacked(
					['address', 'uint24', 'address', 'uint24', 'address'],
					[
						tokenOutAddress, // TokenOut address
						fee, // Fee for TokenOut -> WETH pool
						ADDRESSES.WETH, // WETH address
						fee, // Fee for WETH -> TokenIn pool
						tokenInAddress // TokenIn address
					]
				);

		const amountInOrOut = toBigInt(amount);

		const multiHopParams = {
			path: encodedPath,
			...(isExactIn ? { amountIn: amountInOrOut } : { amountOut: amountInOrOut })
		};

		try {
			let quoteAmount: bigint;

			if (isExactIn) {
				quoteAmount = await quoterContract.quoteExactInput.staticCall(
					multiHopParams.path,
					amountInOrOut
				);
			} else {
				quoteAmount = await quoterContract.quoteExactOutput.staticCall(
					multiHopParams.path,
					amountInOrOut
				);
			}

			if (quoteAmount > 0n) {
				const gasEstimate = await this.getGasEstimateForSwap(
					tokenInAddress,
					tokenOutAddress,
					amountInOrOut,
					fundingAddress,
					fee
				);

				return await this.constructQuoteData(
					tokenIn,
					tokenOut,
					fundingAddress,
					amount,
					quoteAmount,
					fee,
					gasEstimate,
					true, // multiHop
					0n, //sqrtPriceX96After.toBigInt(),
					0, //initializedTicksCrossed,
					isExactIn
				);
			}
		} catch (error) {
			const excludedProperties = ['url', 'requestBody', 'requestMethod', 'accessList'];
			const formattedError = this.errorUniswap(error, excludedProperties);

			throw new Error(formattedError);
		}

		throw new Error('Token pools not found');
	}

	async getQuote(
		tokenIn: Token,
		tokenOut: Token,
		amount: BigNumberish,
		fundingAddress: string,
		isExactIn: boolean = true,
		fee: number = 3000
	): Promise<SwapPriceData> {
		const actualTokenIn = tokenIn.isNative ? await this.getWETHToken() : tokenIn;
		const actualTokenOut = tokenOut.isNative ? await this.getWETHToken() : tokenOut;

		switch (fee) {
			case 500:
			case 3000:
			case 10000:
				break;
			default:
				fee = 3000;
				break;
		}

		if (!actualTokenIn?.address || !actualTokenOut?.address || !amount) {
			return {
				provider: this.getName(),
				lastUpdated: new Date(),
				chainId: this.provider ? this.provider.getChainId() : 1,
				tokenIn,
				tokenOut,
				fundingAddress,
				quoteAmount: 0n,
				feeAmount: 0n,
				amountAfterFee: 0n,
				amountIn: 0n,
				amountOut: 0n,
				exchangeRate: 0,
				marketPriceIn: 0,
				marketPriceOut: 0,
				marketPriceGas: 0,
				priceImpactRatio: 0,
				path: [
					tokenIn.isNative ? ethers.ZeroAddress : tokenIn.address,
					tokenOut.isNative ? ethers.ZeroAddress : tokenOut.address
				],
				fee,
				feeBasisPoints: this.feeBasisPoints,
				feeAmountPrice: 0,
				feeAmountInUSD: '',
				gasEstimate: 0n,
				gasEstimateInUSD: '',
				tokenOutPriceInUSD: '',
				slippageTolerance: 0.5,
				deadline: 10,
				sqrtPriceX96After: 0n,
				initializedTicksCrossed: 0,
				multiHop: false,
				error: 'Insufficient parameters for quote',
				isLoading: false
			};
		}
		if (!this.providerNative) throw new Error('Provider(s) not set');
		const availablePools = await this.getAvailablePools(actualTokenIn, actualTokenOut);
		let newFee = fee;

		if (!availablePools || !availablePools.includes(fee)) {
			newFee = availablePools[0];
		}

		if (!availablePools || availablePools.length === 0) {
			try {
				return await this.multiHopQuote(
					tokenIn,
					tokenOut,
					amount,
					fundingAddress,
					isExactIn,
					newFee
				);
			} catch (error) {
				log.error('Multi-hop quote failed:', false, error);
				throw new Error('No valid route exists for the provided tokens and amount');
			}
		}

		try {
			const params = {
				tokenIn: actualTokenIn.address,
				tokenOut: actualTokenOut.address,
				fee: newFee,
				sqrtPriceLimitX96: 0n,
				...(isExactIn ? { amountIn: amount } : { amount: amount })
			};

			const quoterContract = new ethers.Contract(
				ADDRESSES.UNISWAP_V3_QUOTER,
				IQuoterV2ABI.abi,
				this.providerNative
			);
			let quoteAmount: bigint;
			let sqrtPriceX96After: bigint = 0n;
			let initializedTicksCrossed: number = 0;
			let gasEstimate: bigint = 0n;

			if (isExactIn) {
				[quoteAmount, sqrtPriceX96After, initializedTicksCrossed, gasEstimate] =
					await quoterContract.quoteExactInputSingle.staticCall(params);
			} else {
				[quoteAmount, sqrtPriceX96After, initializedTicksCrossed, gasEstimate] =
					await quoterContract.quoteExactOutputSingle.staticCall(params);
			}

			if (quoteAmount > 0n) {
				return await this.constructQuoteData(
					tokenIn,
					tokenOut,
					fundingAddress,
					amount,
					quoteAmount,
					newFee,
					gasEstimate,
					false, // multiHop
					sqrtPriceX96After,
					initializedTicksCrossed,
					isExactIn
				);
			}
		} catch (error) {
			log.error('Direct pool quote failed, trying multi-hop:', false, error);
		}

		try {
			return await this.multiHopQuote(tokenIn, tokenOut, amount, fundingAddress, isExactIn, newFee);
		} catch (error) {
			log.error('Multi-hop quote failed:', false, error);
			throw new Error('No valid route exists for the provided tokens and amount');
		}
	}

	async estimateSwapGas(swapRouterAddress: string, swapParams: SwapParams): Promise<bigint> {
		return 0n;
	}

	async getAvailablePools(tokenA: Token, tokenB: Token): Promise<number[]> {
		const availablePools: number[] = [];
		const feeTiers = [500, 3000, 10000]; // Common fee tiers on Uniswap V3

		for (const fee of feeTiers) {
			try {
				const poolAddress = await this.getPoolAddress(tokenA, tokenB, fee);
				if (poolAddress !== ethers.ZeroAddress) {
					availablePools.push(fee);
				}
			} catch (error) {
				log.error(`Pool not found for tokens ${tokenA.symbol}/${tokenB.symbol} with fee ${fee}`);
			}
		}
		return availablePools;
	}

	async getPoolAddress(tokenA: Token, tokenB: Token, fee: number): Promise<string> {
		if (!this.factory) throw new Error('Factory contract not initialized');
		const [token0, token1] = [tokenA.address, tokenB.address].sort((a, b) =>
			a.toLowerCase() < b.toLowerCase() ? -1 : 1
		);
		const poolAddress = await this.factory.getPool(token0, token1, fee);
		return poolAddress;
	}

	private async constructQuoteData(
		tokenIn: Token,
		tokenOut: Token,
		fundingAddress: string,
		amount: BigNumberish,
		quoteAmount: bigint,
		fee: number,
		gasEstimate: bigint,
		multiHop: boolean,
		sqrtPriceX96After: bigint,
		initializedTicksCrossed: number,
		isExactIn: boolean
	): Promise<SwapPriceData> {
		const feeAmount = this.calculateFee(isExactIn ? quoteAmount : toBigInt(amount));

		const amountAfterFee = isExactIn ? quoteAmount - feeAmount : quoteAmount + feeAmount; // Adjusted amount after fee

		const formattedAmountIn = Number(
			ethers.formatUnits(isExactIn ? toBigInt(amount) : amountAfterFee, tokenIn.decimals)
		);
		const formattedAmountOut = Number(
			ethers.formatUnits(isExactIn ? amountAfterFee : toBigInt(amount), tokenOut.decimals)
		);
		const exchangeRate = formattedAmountOut / formattedAmountIn;

		const priceIn = await this.getMarketPrice(`${tokenIn.symbol}-USD`);
		const priceOut = await this.getMarketPrice(`${tokenOut.symbol}-USD`);

		if (!priceIn || !priceOut) {
			throw new Error('Failed to get price from provider');
		}

		const feeAmountInUSD = formatFeeToUSD(feeAmount, tokenOut.decimals, BigNumberishUtils.toNumber(priceOut.price)); //feeAmountInTokenOut * priceOut.price; // Always in tokenOut (buy side)
		const priceOutBigInt = BigInt(DecimalMath.of(BigNumberishUtils.toNumber(priceOut.price)).mul(Math.pow(10, tokenOut.decimals)).round(0).toNumber());

		let gasEstimateInUSD = '';
		let adjustedGasEstimate = 0n;

		const gasPrice = await this.getMarketPrice(`ETH-USD`);

		if (gasEstimate > 0n) {
			adjustedGasEstimate =
				(gasEstimate * (10000n + YAKKL_GAS_ESTIMATE_MULTIPLIER_BASIS_POINTS)) / 10000n;

			const gasEstimateInEther = adjustedGasEstimate * 10n ** 9n;
			const gasEstimateInEtherNumber = Number(gasEstimateInEther) / 10 ** 18;

			const ethPriceInUSD = gasPrice.price;

			const gasCostInUSD = DecimalMath.of(gasEstimateInEtherNumber).mul(BigNumberishUtils.toNumber(ethPriceInUSD)).toNumber();

			gasEstimateInUSD =
				gasCostInUSD > YAKKL_GAS_ESTIMATE_MIN_USD
					? formatPrice(gasCostInUSD)
					: formatPrice(YAKKL_GAS_ESTIMATE_MIN_USD); // This is only a conservative minimum estimate and not actual
		}

		return {
			provider: this.getName(),
			lastUpdated: new Date(),
			chainId: this.getChainId(),
			tokenIn,
			tokenOut,
			fundingAddress,
			quoteAmount,
			feeAmount,
			amountAfterFee,
			amountIn: isExactIn ? amount : quoteAmount,
			amountOut: isExactIn ? amountAfterFee : amount,
			exchangeRate,
			marketPriceIn: priceIn.price,
			marketPriceOut: priceOut.price,
			marketPriceGas: gasPrice.price, // Defaults to ETH
			priceImpactRatio: 0,
			path: [
				tokenIn.isNative ? ethers.ZeroAddress : tokenIn.address,
				tokenOut.isNative ? ethers.ZeroAddress : tokenOut.address
			],
			fee,
			feeBasisPoints: this.feeBasisPoints,
			feeAmountPrice: DecimalMath.of(Number(feeAmount)).mul(BigNumberishUtils.toNumber(priceOut.price)).div(formattedAmountOut).toNumber(),
			feeAmountInUSD,
			gasEstimate: adjustedGasEstimate,
			gasEstimateInUSD,
			tokenOutPriceInUSD: formatPrice(Number(priceOutBigInt) / 10 ** tokenOut.decimals),

			slippageTolerance: 0.5,
			deadline: 10,

			sqrtPriceX96After,
			initializedTicksCrossed,
			multiHop,
			error: null,
			isLoading: false
		};
	}

	async getGasEstimateForSwap(
		tokenIn: string,
		tokenOut: string,
		amountIn: bigint,
		fundingAddress: string,
		fee: number
	): Promise<bigint> {
		if (!this.providerNative) {
			throw new Error('Ethereum provider not initialized');
		}

		const swapRouterABI = [
			'function exactInput((bytes path,uint256 amountIn,uint256 amountOutMinimum,address recipient,uint256 deadline)) external payable returns (uint256 amountOut)'
		];

		const provider = new ethers.JsonRpcProvider(await this.provider.getProviderURL());

		const swapRouter = new ethers.Contract(ADDRESSES.UNISWAP_V3_ROUTER, swapRouterABI, provider);

		const encodedPath = ethers.solidityPacked(
			['address', 'uint24', 'address', 'uint24', 'address'],
			[
				tokenIn, // TokenIn address
				fee, // Fee for TokenIn -> WETH pool
				ADDRESSES.WETH, // WETH address
				fee, // Fee for WETH -> TokenOut pool
				tokenOut // TokenOut address
			]
		);

		const recipient: string = fundingAddress;

		const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
		const amountOutMinimum = 0; // You can adjust slippage tolerance here

		const swapParams = {
			path: encodedPath,
			amountIn: amountIn.toString(), // Convert to string for ethers v5
			amountOutMinimum: amountOutMinimum,
			recipient: recipient,
			deadline: deadline
		};

		try {
			const tx = await swapRouter.exactInput.populateTransaction(swapParams);

			tx.from = recipient;

			const isNativeInput = tokenIn.toLowerCase() === ethers.ZeroAddress.toLowerCase();
			if (isNativeInput) {
				tx.value = BigInt(amountIn.toString());
			}

			let gasEstimate: bigint;
			try {
				const estimatedGas = await provider.estimateGas({
					...tx,
					from: recipient
				});
				gasEstimate = BigInt(estimatedGas.toString());
			} catch (estimateError) {
				const baseGasLimit = YAKKL_GAS_ESTIMATE_MULTIHOP_SWAP_DEFAULT; // Adjust based on typical multi-hop swap gas usage
				gasEstimate = BigInt(baseGasLimit);
			}

			const gasEstimateBigInt = gasEstimate; // Already bigint
			const adjustedGasEstimate =
				(gasEstimateBigInt * (10000n + YAKKL_GAS_ESTIMATE_MULTIPLIER_BASIS_POINTS)) / 10000n;

			return adjustedGasEstimate;
		} catch (error) {
			const fallbackGasLimit = BigInt(YAKKL_GAS_ESTIMATE_MULTIHOP_SWAP_DEFAULT); // Adjust based on typical multi-hop swap gas usage
			return fallbackGasLimit;
		}
	}

	async getPoolInfo(
		tokenIn: SwapToken,
		tokenOut: SwapToken,
		fee: number = 3000
	): Promise<PoolInfoData> {
		throw new Error('Not implemented yet');
	}

	private returnError(message: string): PriceData {
		return {
			provider: this.getName(),
			price: 0,
			lastUpdated: new Date(),
			status: 404,
			message
		};
	}

	errorUniswap(error: any, excludeProps: string[] = []): string {
		const cleanObject = (obj: any, exclude: string[]): any => {
			if (!obj || typeof obj !== 'object') {
				return obj;
			}

			const cleaned = Array.isArray(obj) ? [...obj] : { ...obj };

			for (const key in cleaned) {
				if (exclude.includes(key)) {
					delete cleaned[key];
				} else if (typeof cleaned[key] === 'string') {
					try {
						const parsed = JSON.parse(cleaned[key]);
						cleaned[key] = parsed; // Replace with parsed JSON if valid
					} catch {
						// Keep the string as-is if it's not valid JSON
					}
				} else if (typeof cleaned[key] === 'object') {
					cleaned[key] = cleanObject(cleaned[key], exclude);
				}
			}

			return cleaned;
		};

		const cleanedError = cleanObject(error, excludeProps);

		return JSON.stringify(cleanedError, null, 2);
	}

	private async getTokenReserve(token: Token, poolAddress: string): Promise<string> {
		const balance = await token.getBalance(poolAddress);
		return balance ? balance.toString() : '0';
	}

	private async getTokenUSDPrice(token: Token): Promise<number> {
		try {
			const price = await this.getMarketPrice(token.symbol + '-USD');
			return BigNumberishUtils.toNumber(price.price);
		} catch (error) {
			log.error('Error getting token price. Defaulting to 0:', false, error);
			return 0;
		}
	}

	private async calculateTVL(tokenA: Token, tokenB: Token, poolAddress: string): Promise<number> {
		const [reserveA, reserveB] = await Promise.all([
			this.getTokenReserve(tokenA, poolAddress),
			this.getTokenReserve(tokenB, poolAddress)
		]);

		const [priceA, priceB] = await Promise.all([
			this.getTokenUSDPrice(tokenA),
			this.getTokenUSDPrice(tokenB)
		]);

		const valueA = (Number(reserveA) / 10 ** tokenA.decimals) * priceA;
		const valueB = (Number(reserveB) / 10 ** tokenB.decimals) * priceB;

		return valueA + valueB;
	}

	getRouterAddress(): string {
		return this.routerContract!.target as string;
	}

	async getWETHToken(): Promise<Token> {
		const chainId = this.getChainId();
		const wethAddress = chainId === 1 ? ADDRESSES.WETH : ADDRESSES.WETH_SEPOLIA;

		return new EVMToken(
			wethAddress,
			'Wrapped Ether',
			'WETH',
			18,
			'/images/eth.svg',
			'Wrapped version of Ether',
			chainId,
			false, // Not native since it's wrapped,
			false,
			this.blockchain,
			this.provider
		);
	}

	async populateSwapTransaction(
		tokenIn: Token,
		tokenOut: Token,
		amountIn: BigNumberish,
		amountOutMin: BigNumberish,
		recipient: string,
		deadline: number,
		fee: number = 3000,
		estimateOnly: boolean = false
	): Promise<TransactionRequest | bigint> {
		const params: ExactInputSingleParams = {
			tokenIn: tokenIn.address,
			tokenOut: tokenOut.address,
			fee,
			recipient,
			deadline,
			amountIn: toBigInt(amountIn),
			amountOutMinimum: toBigInt(amountOutMin),
			sqrtPriceLimitX96: 0
		};

		if (!this.routerContract) throw new Error('Router contract not initialized');
		const populatedTx = await this.routerContract.exactInputSingle.populateTransaction(params);

		if (estimateOnly) {
			const signer = this.provider.getSigner();
			if (!signer) throw new Error('No signer available');

			const gasEstimate = await this.provider.estimateGas({
				from: await signer.getAddress(),
				to: this.routerContract!.target as string,
				data: populatedTx.data,
				quantity: tokenIn.isNative ? amountIn : 0n,
				chainId: this.getChainId()
			});

			return gasEstimate;
		}

		return {
			to: this.routerContract.target as string,
			data: populatedTx.data,
			quantity: tokenIn.isNative ? amountIn : 0n,
			from: params.recipient,
			chainId: this.getChainId()
		};
	}

	async populateMultiHopSwapTransaction(
		tokenIn: Token,
		tokenOut: Token,
		amountIn: BigNumberish,
		amountOutMin: BigNumberish,
		recipient: string,
		deadline: number
	): Promise<TransactionRequest> {
		const params: ExactInputParams = {
			path: [tokenIn.address, ADDRESSES.WETH, tokenOut.address],
			recipient,
			deadline,
			amountIn: EthereumBigNumber.from(amountIn).toBigInt() ?? 0n,
			amountOutMinimum: EthereumBigNumber.from(amountOutMin).toBigInt() ?? 0n
		};

		if (!this.routerContract) throw new Error('Router contract not initialized');
		const populatedTx = await this.routerContract.exactInput.populateTransaction(params);

		return {
			to: this.routerContract!.target as string,
			data: populatedTx.data,
			quantity: tokenIn.isNative ? amountIn : 0,
			from: params.recipient,
			chainId: this.getChainId()
		};
	}

	async checkAllowance(token: Token, fundingAddress: string): Promise<bigint> {
		try {
			if (!token || token.isNative || !fundingAddress || !this.providerNative) {
				return 0n;
			}

			const tokenContract = new ethers.Contract(
				token.address,
				['function allowance(address,address) view returns (uint256)'],
				this.providerNative
			);

			if (!tokenContract) {
				throw new Error('Token contract not initialized');
			}

			const allowance = await tokenContract.allowance(fundingAddress, this.getRouterAddress());
			return toBigInt(allowance);
		} catch (error) {
			log.error('Error checking allowance:', false, error);
			return 0n;
		}
	}

	async approveToken(token: Token, amount: string): Promise<TransactionReceipt> {
		if (!this.blockchain) {
			throw new Error('Blockchain not initialized');
		}
		if (!this.signerNative) {
			throw new Error('Signer not initialized');
		}
		if (!token.address || token.address === ethers.ZeroAddress) {
			throw new Error('Invalid token address');
		}
		const routerAddress = this.getRouterAddress();
		if (!routerAddress || routerAddress === ethers.ZeroAddress) {
			throw new Error('Invalid router address');
		}
		const tokenContract = new ethers.Contract(
			token.address,
			['function approve(address,uint256) public returns (bool)'],
			this.signerNative
		);
		if (!tokenContract) {
			throw new Error('Token contract not initialized');
		}

		try {
			const parsedAmount = ethers.parseUnits(amount, token.decimals);
			if (!parsedAmount) {
				throw new Error('Failed to parse amount');
			}

			const gasLimit = 100000; // Set an appropriate gas limit value
			const maxPriorityFeePerGas = ethers.parseUnits('1.5', 'gwei'); // Adjust based on network conditions
			const maxFeePerGas = ethers.parseUnits('20', 'gwei'); // Adjust based on network conditions

			const tx = await tokenContract.approve(routerAddress, parsedAmount, {
				chainId: this.getChainId() || 1,
				type: 2,
				gasLimit,
				maxPriorityFeePerGas,
				maxFeePerGas
			});

			const receipt = await tx.wait(); // TODO: Move the class to background processing and setup a listener for the transaction receipt with no 'wait'
			if (receipt.status !== 1) {
				throw new Error('Token approval transaction failed');
			}

			if (receipt.logs.length > 0) {
				const eventFragment = tokenContract.interface.getEvent('Approval');
				const log = receipt.logs.find(
					(log: { topics: string[] }) => log.topics[0] === eventFragment?.topicHash
				);
			}

			return EthersConverter.ethersTransactionReceiptToTransactionReceipt(receipt);
		} catch (error) {
			log.error('Token approval error:', false, error);
			throw error;
		}
	}

	async executeSwap(params: SwapParams): Promise<TransactionResponse> {
		try {
			const {
				tokenIn,
				tokenOut,
				amount,
				fee,
				slippage,
				deadline,
				recipient,
				gasLimit,
				maxPriorityFeePerGas,
				maxFeePerGas
			} = params;

			const quote = await this.getQuote(tokenIn, tokenOut, amount, recipient);
			if (!quote || quote.error)
				throw new Error(quote && quote.error ? quote.error : 'Failed to get quote for excute swap');

			const minOut = (toBigInt(quote.amountOut) * BigInt(1000 - Math.floor(slippage * 10))) / 1000n;
			let tx;
			if (quote.multiHop) {
				tx = await this.populateMultiHopSwapTransaction(
					tokenIn,
					tokenOut,
					amount,
					minOut,
					recipient,
					Math.floor(Date.now() / 1000) + deadline * 60
				);
			} else {
				tx = await this.populateSwapTransaction(
					tokenIn,
					tokenOut,
					amount,
					minOut,
					recipient,
					Math.floor(Date.now() / 1000) + deadline * 60,
					fee
				);
			}

			if (typeof tx === 'bigint') {
				throw new Error('Received gas estimate instead of transaction request');
			}

			tx.type = 2;
			tx.gasLimit = toBigInt(gasLimit);
			tx.maxPriorityFeePerGas = toBigInt(maxPriorityFeePerGas);
			tx.maxFeePerGas = toBigInt(maxFeePerGas);

			return await this.provider.sendTransaction(tx);
		} catch (error) {
			log.error('Error executing swap:', false, error);
			throw error;
		}
	}

	async executeFullSwap(params: SwapParams): Promise<[TransactionReceipt, TransactionReceipt]> {
		try {
			const tx = await this.executeSwap(params);
			if (!tx) {
				throw new Error('Failed to execute swap - 1');
			}

			const swapReceipt = await tx.wait();
			if (!swapReceipt) {
				throw new Error('Failed to get transaction receipt - 2');
			}

			const feeReceipt = await this.distributeFee(
				params.tokenOut,
				params.feeAmount,
				params.feeRecipient,
				params.gasLimit,
				params.maxPriorityFeePerGas,
				params.maxFeePerGas
			);

			return [swapReceipt, feeReceipt];
		} catch (error) {
			log.error('Error executing FULL swap:', false, error);
			throw error;
		}
	}

	async distributeFee(
		tokenOut: Token,
		feeAmount: BigNumberish,
		feeRecipient: string,
		gasLimit: BigNumberish,
		maxPriorityFeePerGas: BigNumberish,
		maxFeePerGas: BigNumberish
	): Promise<TransactionReceipt> {
		if (!this.provider) {
			throw new Error('Provider not initialized');
		}
		if (!tokenOut.address && !tokenOut.isNative) {
			throw new Error('Fee distribution only works with ERC20 tokens');
		}
		if (!feeRecipient) {
			throw new Error('Fee recipient address is required');
		}
		if (!feeAmount) {
			throw new Error('Fee amount is required');
		}

		let priorityFee = toBigInt(maxPriorityFeePerGas);
		const maxFee = toBigInt(maxFeePerGas);

		if (priorityFee > maxFee) {
			priorityFee = maxFee; // Adjust to make sure it's valid
		}

		if (tokenOut.isNative) {
			try {
				const signer = this.provider.getSigner();
				if (!signer) {
					throw new Error('Signer not available');
				}

				const txRequest = {
					to: feeRecipient,
					value: toBigInt(feeAmount),
					from: await signer.getAddress(),
					chainId: this.getChainId(),
					gasLimit: toBigInt(gasLimit),
					maxPriorityFeePerGas: priorityFee,
					maxFeePerGas: maxFee,
					type: 2
				};

				const tx = await this.provider.sendTransaction(txRequest); // sendTransaction and not transfer since it's a native transaction
				const receipt = await tx.wait();

				try {
					const gasUsed = toBigInt(receipt.gasUsed) || 0n;
					const cummulativeGasUsed = receipt.cumulativeGasUsed
						? toBigInt(receipt.cumulativeGasUsed.toString())
						: 0n;
					const effectiveGasPrice = receipt.effectiveGasPrice
						? toBigInt(receipt.effectiveGasPrice.toString())
						: 0n;
					const gasCost = gasUsed * effectiveGasPrice;
				} catch (error) {
					log.error('Error calculating gas cost (informational-transaction):', false, error);
				}
				return receipt;
			} catch (error) {
				log.error('Fee distribution failed (transaction):', false, error);
				throw error;
			}
		}

		try {
			const tokenContract = new ethers.Contract(
				tokenOut.address,
				['function transfer(address recipient, uint256 amount) public returns (bool)'],
				this.signerNative // Use the signer for transactions, transfers, etc.
			);

			const tx = await tokenContract.transfer(feeRecipient, feeAmount, {
				gasLimit: toBigInt(gasLimit),
				maxPriorityFeePerGas: toBigInt(maxPriorityFeePerGas),
				maxFeePerGas: toBigInt(maxFeePerGas)
			});

			const receipt = await tx.wait();

			try {
				const gasUsed = toBigInt(receipt.gasUsed) || 0n;
				const cummulativeGasUsed = toBigInt(receipt.cumulativeGasUsed.toString()) || 0n;
				const effectiveGasPrice = receipt.effectiveGasPrice
					? toBigInt(receipt.effectiveGasPrice.toString())
					: 0n;
				const gasCost = gasUsed * effectiveGasPrice;
			} catch (error) {
				log.error('Error calculating gas cost (informational-transfer):', false, error);
			}

			return receipt;
		} catch (error) {
			log.error('Fee distribution failed (transfer):', false, error);
			throw error;
		}
	}

	async wrapETH(amount: BigNumberish, recipient: string): Promise<TransactionReceipt | null> {
		if (!this.signerNative) throw new Error('Ethereum signer not initialized');
		if (!recipient) throw new Error('Recipient address is required');
		if (!amount) throw new Error('Amount is required');

		try {
			const wethContract = new ethers.Contract(
				ADDRESSES.WETH,
				['function deposit() public payable'],
				this.signerNative
			);

			let tx;
			if (recipient !== (await this.signerNative.getAddress())) {
				tx = await wethContract.deposit({
					value: amount,
					from: recipient
				});
			} else {
				tx = await wethContract.deposit({
					value: amount
				});
			}

			const receipt = await tx.wait();
			return await EthersConverter.ethersTransactionReceiptToTransactionReceipt(receipt);
		} catch (error) {
			log.error('Error wrapping ETH:', false, error);
			throw error;
		}
	}

	async unwrapWETH(amount: BigNumberish, recipient: string): Promise<TransactionReceipt | null> {
		if (!this.signerNative) throw new Error('Ethereum signer not initialized');
		if (!recipient) throw new Error('Recipient address is required');
		if (!amount) throw new Error('Amount is required');

		try {
			const wethContract = new ethers.Contract(
				ADDRESSES.WETH,
				[
					'function withdraw(uint256 amount) public',
					'function transfer(address to, uint256 value) public returns (bool)'
				],
				this.signerNative
			);

			const tx = await wethContract.withdraw(amount);
			const receiptTrans = await tx.wait();

			if (!receiptTrans || receiptTrans.status !== 1) {
				throw new Error('Failed to withdraw WETH');
			}

			if (recipient !== (await this.signerNative.getAddress())) {
				const txTransfer = await this.signerNative.sendTransaction({
					to: recipient,
					value: toBigInt(amount)
				});

				const receipt = await txTransfer.wait();
				if (!receipt || receipt.status !== 1) {
					throw new Error('Failed to transfer ETH to recipient');
				}

				return receipt
					? await EthersConverter.ethersTransactionReceiptToTransactionReceipt(receipt)
					: null;
			} else {
				return receiptTrans; // Return the original receipt if the recipient is the signer
			}
		} catch (error) {
			log.error('Error unwrapping WETH:', false, error);
			throw error;
		}
	}
}
