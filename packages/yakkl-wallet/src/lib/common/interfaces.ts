/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Runtime } from 'webextension-polyfill';
import type { AccessList, Log, Transaction } from '$lib/common/evm';
import type {
	AccessSourceType,
	AccountTypeCategory,
	BytesLike,
	NetworkType,
	PlanType,
	PromoClassificationType,
	RegisteredType,
	SystemTheme,
	URL,
	TransactionReceipt,
	TransactionRequest
} from '$lib/common/types';
import type { BigNumberish } from '$lib/common/bignumber';
import type { Token } from '$lib/managers/Token';
// import type { Runtime } from 'webextension-polyfill';
import type { BigNumber } from './bignumber';
import type { VaultReference } from '$lib/interfaces/vault.interface';

// Session Info is used to check if the session is valid and if the port is open - mainly used for the dapp popups
export interface SessionInfo {
	success?: boolean;
	portName: string | null;
	connectionId: string | null;
	requestId: string | null;
}

// Ethereum JSON-RPC request arguments
export interface RequestArguments {
	method: string;
	params?: unknown[] | object;
}

export interface JsonRpcRequest {
	jsonrpc: '2.0';
	id: string;
	method: string;
	params?: unknown[];
}

export interface JsonRpcResponse {
	type: 'YAKKL_RESPONSE:EIP6963';
	jsonrpc: '2.0';
	id: string;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface YakklRequest {
	type: string;
	id: string;
	method: string;
	params?: any[];
	requiresApproval?: boolean;
	origin?: string;
}

export interface YakklResponse {
	type: string;
	id: string;
	jsonrpc?: string;
	method?: string;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface YakklEvent {
	type: string;
	event: string;
	data: unknown;
}

export type YakklMessage = YakklRequest | YakklResponse | YakklEvent;

// Define the request metadata type
export interface RequestMetadata {
	method: string;
	params: any[];
	metaData: {
		domain: string;
		isConnected: boolean;
		icon?: string;
		title?: string;
		message?: string;
		origin?: string;
	};
}

export interface AddressTokenCache {
	walletAddress: string; // The wallet address that holds tokens
	chainId: number; // Chain ID
	tokenAddress: string; // Token contract address
	isNative: boolean;
	symbol: string; // Token symbol for quick reference
	quantity: BigNumberish; // Amount held
	lastUpdated: Date; // When balance was last fetched
}

export interface TokenCacheEntry {
	walletAddress: string;
	chainId: number;
	tokenAddress: string;
	isNative: boolean;
	symbol: string; // For quick reference
	quantity: BigNumberish;
	price: number;
	value: BigNumberish; // Changed from number
	lastPriceUpdate: Date;
	lastBalanceUpdate: Date;
	priceProvider: string; // Changed from provider to priceProvider
}

// Define the pending request type
export interface PendingRequestData {
	id: string;
	method: string;
	params: any[];
	resolve?: (result: any) => void;
	reject?: (error: any) => void;
	timestamp: number;
	type?: string;
	requiresApproval?: boolean;
	metaData?: RequestMetadata;
	origin?: string;
}

// Type alias for Runtime.Port
type RuntimePort = Runtime.Port;

// Background Pending Request type
export type BackgroundPendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  port: RuntimePort;
  data: PendingRequestData;
};

export interface EncryptedData {
	data: string;
	iv: string;
	salt?: string;
}

export interface User {
	id: string;
	persona?: string; // The persona that is associated with the account
	email: string;
	name: string;
	username?: string;
	authProvider: 'password' | 'google' | 'apple' | 'passkey';
}

export interface StoreHashResponse {
	success: boolean;
	token: string;
	expiresAt: number;
}

export interface SessionToken {
	token: string;
	expiresAt: number;
}

export interface ActiveTab {
	tabId?: number;
	windowId?: number;
	windowType?: string; //'normal' | 'popup' | 'panel' | 'app' | 'devtools' | 'incognito';
	url?: string;
	title?: string;
	favIconUrl?: string;
	dateTime?: string;
}

export interface GetActiveTabResponse {
	success: boolean;
	activeTab: ActiveTab | null;
}

// EmergencyKit data for each address. SubPortfolio will be empty if it's a primary account. Every SubPortfolio will have a Portfolio address and name.
// This is always encrypted.
export interface EmergencyKitAccountData {
	id: string;
	persona?: string; // The persona that is associated with the account
	registered: YakklRegisteredData;
	email: string;
	username: string;
	blockchain: string;
	portfolioAddress: string;
	portfolioName: string;
	subPortfolioAddress?: string;
	subPortfolioName?: string;
	privateKey: string;
	mnemonic: string;
	createDate: string;
	updateDate: string;
	version: string;
	hash?: string; // Checksum hash of the data
}

export interface EmergencyKitMetaData {
	id: string;
	persona?: string; // The persona that is associated with the account
	createDate: string;
	updateDate: string;
	version: string;
	type: string;
	plan: {
		type: PlanType;
		// Remaining fields are the same as the Settings.plan object and may not need to be here?
		source?: AccessSourceType;
		promo?: PromoClassificationType;
		trialEndDate?: string;
		upgradeDate?: string;
	};
	portfolioName?: string;
	subPortfolioName?: string;
	subPortfolioAddress?: string;
	hash?: string;
	files?: string[];
	// May want to add addresses for the portfolio and subportfolio at somepoint in the future
}

export interface EmergencyKitData {
	id: string;
	persona?: string; // The persona that is associated with the account
	data: EncryptedData;
	accounts: EmergencyKitAccountData[];
	meta?: EmergencyKitMetaData;
	cs: string; // Checksum for the overall data
}

// export interface TokenStorage {
//   address: string;
//   name: string;
//   symbol: string;
//   decimals: number;
//   chainId: number;
//   balance?: BigNumberish;
//   logoURI?: string;
//   isNative?: boolean;
//   isStablecoin?: boolean;
//   description?: string;
// }

export interface HasData<T> {
	data: T;
}

export interface MetaData {
	[key: string]: string | number | boolean | object | null;
}

export interface MetaDataParams {
	title: string;
	icon: URL;
	domain: string;
	context: string;
	message?: string;
	transaction?: unknown;
}

export interface PoolInfo {
	fee: BigNumberish;           // Changed from number
	liquidity: string;
	// quoteAmount: number;
	price: number;         // Changed from number
	tokenInAmount?: string; // Converted from bigint to string
	tokenOutAmount: string; // Converted from bigint to string
	tokenInReserve: string;
	tokenOutReserve: string;
	tokenInPrice: number;  // Changed from number
	tokenOutPrice: number; // Changed from number
	tvl: number;           // Changed from number
}

export interface PriceData {
	provider: string;
	price: number;         // Changed from number - CRITICAL
	lastUpdated: Date;
	contractFeePool?: BigNumberish; // Changed from number
	isNative?: boolean;
	status?: number;
	message?: string;
	chainId?: number; // This is the chainId of the provider and it's used to determine the network. It's optional only because of a few return type areas but it gets completed later in the call stack.
	poolInfo?: PoolInfo;
	// Add any other common fields
}

export interface PriceProvider {
	getAPIKey(): string | Promise<string>;
	getMarketPrice(pair: string): Promise<MarketPriceData>; // Enchanced version of getPrice
	getName(): string;
	getProviderPairFormat(pair: string): Promise<string> | Promise<[string, string]>;
}

export interface SwapPriceProvider extends PriceProvider {
	getSwapPriceIn(
		tokenIn: SwapToken,
		tokenOut: SwapToken,
		amountOut: BigNumberish,
		fee: number
	): Promise<SwapPriceData>;
	getSwapPriceOut(
		tokenIn: SwapToken,
		tokenOut: SwapToken,
		amountIn: BigNumberish,
		fee: number
	): Promise<SwapPriceData>;
	getPoolInfo(tokenA: SwapToken, tokenB: SwapToken, fee: number): Promise<PoolInfoData>;
}

export interface WeightedProvider {
	provider: PriceProvider;
	weight: number;
}

// export interface Signer {
//   signTransaction(transaction: Transaction): Promise<string>;
//   signMessage(message: string): Promise<string>;
// }

/**
 *  The domain for an [[link-eip-712]] payload.
 */
export interface TypedDataDomain {
	/**
	 *  The human-readable name of the signing domain.
	 */
	name?: string;

	/**
	 *  The major version of the signing domain.
	 */
	version?: string;

	/**
	 *  The chain ID of the signing domain.
	 */
	chainId?: bigint;

	/**
	 *  The the address of the contract that will verify the signature.
	 */
	verifyingContract?: string;

	/**
	 *  A salt used for purposes decided by the specific domain.
	 */
	salt?: BytesLike;
}

/**
 *  A specific field of a structured [[link-eip-712]] type.
 */
export interface TypedDataField {
	/**
	 *  The field name.
	 */
	name: string;

	/**
	 *  The type of the field.
	 */
	type: string;
}

export interface BaseTransaction {
	hash?: string;
	to?: string;
	from?: string;
	nonce?: number;
	gasLimit?: BigNumberish | null | undefined;
	gasPrice?: BigNumberish | null | undefined;
	data?: BytesLike;
	quantity?: BigNumberish | null;
	chainId?: BigNumberish;
	r?: string;
	s?: string;
	v?: number;
	type?: number | null;
	accessList?: AccessList;
	maxPriorityFeePerGas?: BigNumberish | null | undefined;
	maxFeePerGas?: BigNumberish | null | undefined;
	customData?: Record<string, any>;
	ccipReadEnabled?: boolean;
}

// Note: Using TransactionRequest and TransactionReceipt from @yakkl/core (imported via types.ts)
// These local definitions are kept for reference but commented out to avoid conflicts
/*
export interface TransactionRequest extends BaseTransaction {
	maxFeePerBlobGas?: BigNumberish | null | undefined;
}

export interface TransactionReceipt {
	to: string;
	from: string;
	contractAddress?: string;
	transactionIndex: number;
	root?: string;
	gasUsed: BigNumberish;
	logsBloom: string;
	blockHash: string;
	transactionHash: string;
	logs: Array<Log>;
	blockNumber: number;
	confirmations: number;
	cumulativeGasUsed: BigNumberish;
	effectiveGasPrice?: BigNumberish;
	byzantium?: boolean;
	type: number;
	status?: number | null | undefined;
}
*/

export interface TransactionResponse extends Transaction {
	hash: string;

	// Only if a transaction has been mined
	blockNumber?: number;
	blockHash?: string;
	timestamp?: number;
	status?: boolean;

	confirmations: number;

	// Not optional (as it is in Transaction)
	from: string;

	// The raw transaction
	raw?: string;

	// This function waits until the transaction has been mined
	wait: (confirmations?: number) => Promise<TransactionReceipt>;
}

export interface FunctionInput {
	name: string;
	type: string;
}

export interface ContractFunction {
	name: string;
	inputs: FunctionInput[];
	stateMutability: string;
}

export interface ContractData {
	address: string;
	abi: string;
	functions: ContractFunction[];
}

export interface EstimatedPrice {
	confidence: number;
	price: number;
	maxPriorityFeePerGas: number;
	maxFeePerGas: number;
}

export interface BlockPrice {
	blockNumber: number;
	estimatedTransactionCount: number;
	baseFeePerGas: number;
	estimatedPrices: EstimatedPrice[];
}

export interface BlocknativeResponse {
	blockPrices: BlockPrice[];
}

export interface GasFeeTrend {
	blocknumber: number;
	baseFeePerGas: number;
	maxPriorityFeePerGas: number;
	maxFeePerGas: number;
	timestamp: number;
}

export interface GasTransStore {
	provider: string | null;
	id: NodeJS.Timeout | null | undefined;
	results: {
		blockNumber: number;
		estimatedTransactionCount: number;
		gasProvider: string;
		actual: {
			baseFeePerGas: number;
			fastest: { maxPriorityFeePerGas: number; maxFeePerGas: number };
			faster: { maxPriorityFeePerGas: number; maxFeePerGas: number };
			fast: { maxPriorityFeePerGas: number; maxFeePerGas: number };
			standard: { maxPriorityFeePerGas: number; maxFeePerGas: number };
			slow: { maxPriorityFeePerGas: number; maxFeePerGas: number };
		};
		gasFeeTrend: {
			baseFeePerGasAvg: number;
			mostRecentFees: GasFeeTrend[];
		};
	};
}

export interface Legal {
	termsAgreed: boolean;
	privacyViewed: boolean;
	updated: boolean;
}

export interface Platform {
	arch: string;
	nacl_arch?: string;
	os: string;
	osVersion: string;
	browser?: string;
	browserVersion?: string;
	platform: string;
}

// Evaluate the need for these interfaces
export interface TransactionsRetry {
	enabled: boolean;
	howManyAttempts: number;
	seconds: number;
	baseFeeIncrease: number; // percentages
	priorityFeeIncrease: number; // percentages
}

export interface TransactionsRetain {
	enabled: boolean;
	days: number;
	includeRaw: boolean;
}

export interface Transactions {
	retry: TransactionsRetry;
	retain: TransactionsRetain;
}
// End - Evaluate the need for these interfaces

export interface SwapToken {
	id?: string;
	persona?: string; // The persona that is associated with the account
	chainId: number;
	address: string; // Token address
	name: string;
	symbol: string;
	decimals: number;
	balance?: BigNumberish;
	logoURI?: string;
	extensions?: any;
	isNative?: boolean;
	isStablecoin?: boolean;
	description?: string;
	url?: string;
	tags?: string[]; // key
	version?: string; // Symantic versioning
}

export interface TokenData extends SwapToken {
	change?: TokenChange[] | null; // getTokenChange(timeline)
	price?: MarketPriceData | null; // Current price of the token. Price is in PriceData but is for the provider's price
	value?: BigNumberish; // Changed from number - CRITICAL for financial calculations
	quantity?: BigNumber; // User's holdings
	lastKnownQuantity?: BigNumber; // CRITICAL: Preserved quantity to prevent resetting to 0
	quantityLastUpdated?: Date; // When the quantity was last updated
	formattedValue?: string; // Formatted value for display
	alias?: string; // Alias for the token
	customDefault?: 'custom' | 'default'; // If 'custom' then it's a custom token and if 'default' then it's a default token
	sidepanel?: boolean; // If true then the token is only available in the sidepanel
	evmCompatible?: boolean; // If true then the token is EVM compatible
	icon?: string; // Icon URL or emoji - can be logoURI or custom icon
	// Enhanced fields for multi-blockchain support
	blockchain?: string; // 'ethereum', 'solana', 'bitcoin', 'cosmos', etc.
	network?: string; // 'mainnet', 'testnet', 'devnet', etc.
	standard?: string; // 'ERC20', 'SPL', 'CW20', 'BRC20', etc.
	isWatchOnly?: boolean; // If true, this token is tracked but not transactable
	watchedAt?: string; // When the token was added to watchlist
	portfolioIncluded?: boolean; // Whether to include in total portfolio calculation
	exchangeInfo?: {
		exchange?: string; // 'binance', 'coinbase', 'kraken', etc.
		exchangeSymbol?: string; // Symbol used on the exchange
		isExchangeBalance?: boolean; // If this represents a balance on a centralized exchange
	};
	metadata?: {
		coingeckoId?: string; // CoinGecko API ID for price tracking
		coinmarketcapId?: string; // CoinMarketCap ID
		website?: string;
		whitepaper?: string;
		twitter?: string;
		telegram?: string;
		discord?: string;
		totalSupply?: string;
		maxSupply?: string;
		marketCap?: BigNumberish; // Changed from number
		fdv?: BigNumberish; // Changed from number - Fully diluted valuation
		lastUpdated?: string;
	};
}

// Currently only used for the token list and not as a stand alone data store
export interface TokenChange {
	timeline?: string;
	percentChange?: BigNumberish; // Changed from number for precision
}

// export interface SwapTokenListTag {
//   [key: string]: {
//     name: string;
//     description: string;
//   };
// };

// export interface SwapTokenList {
//   name: string;
//   logoURI: string;
//   timestamp: string;
//   tags: SwapTokenListTag[]
//   tokens: SwapToken[];
// };

export interface Extension {
	id: string;
	name: string;
	enabled: boolean;
	// Define additional properties as needed
}

export interface Currency {
	code: string;
	symbol: string;
}

export interface YakklWallet {
	id?: string;
	persona?: string; // The persona that is associated with the account
	title: string;
	extensionHeight: number;
	popupHeight: number;
	popupWidth: number;
	enableContextMenu: boolean;
	enableResize: boolean;
	splashDelay: number;
	alertDelay: number;
	splashImages: number;
	autoLockTimer: number; // In seconds - if 0 then it will autolock on system 'idle'
	autoLockAsk: boolean; // If true then it will prompt to ask the user to continue
	autoLockAskTimer: number; // If autoLockAsk true then this timer will keep the dialog and app open this many more seconds before locking automatically via timeout
	animationLockScreen: boolean;
	pinned: boolean;
	pinnedLocation: string; // 'TL' | 'TR' | 'BL' | 'BR' | 'M' or 'x,y' coordinates
	defaultWallet: boolean; // This can be cutoff in preferences/wallet. It allows any reference to 'window.ethereum' or others to only popup Yakkl
}

export interface Theme {
	id?: string;
	persona?: string; // The persona that is associated with the account
	name: string;
	animation: {
		lockScreen: string;
	};
	colors: {
		primary: string;
		secondary: string;
		primaryBackgroundLight: string;
		primaryBackgroundDark: string;
	};
}

export interface Protocol {
	type: string;
	url: string;
}

export interface DataKeys {
	key: string;
	chainId: string;
	blockchain: string;
}

export interface Data {
	keys: DataKeys;
	protocols: Protocol[];
}

export interface YakklProvider {
	provider: string; // If name is 'yakkl' then yakkl cloud is the provider and we're going direct to the given blockchains
	blockchain: string;
	name: string;
	chainId: number; // Have to look up the 'name' from yakklNetworks and 'key' from process.env
	weight: number; // Weight 1-5 with 5 being the provider to use the most - this only applies to mainnets. Testnets all have a weight of 0
	data: Data; // encrypted
	version: string; // Travels with the data for upgrades
}

// The networks of a given blockchain. For example, ETH - mainnet, ropsten, rinkeby, kovan, goerli, etc
export interface Network {
	blockchain: string; // Ethereum - This is redundant but its useful for the UI
	name: string; // Mainnet, Sepolia, etc.
	chainId: number;
	symbol: string; // Example: 'ETH' This is redundant but its useful for the UI
	type: NetworkType; // 'mainnet' | 'testnet' | 'private' | 'sidechain' | 'layer2' | 'other';
	explorer: URL; // URL to the explorer for the given network type of the blockchain
	decimals: number; // Decimals for the blockchain
}

export interface EnhancedSecurity {
	id?: string;
	persona?: string; // The persona that is associated with the account
	enabled: boolean; // We have this off so that user makes a decision to enable it
	rotationDays?: number;
	lastRotationDate?: string; // It will not force a pwd change but will keep prompting until they do
	passKey?: string;
	passKeyHints?: string[];
	mfaType?: string;
	phone?: string;
}

export interface YakklSecurity {
	id?: string;
	persona?: string; // The persona that is associated with the account
	type: string; //'PWD' | '2FA' | 'Passkey';
	value: string;
	enhancedSecurity?: EnhancedSecurity;
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
}

// Premature at this time
export interface Company {
	name: string;
	formedDate: string;
	type: string;
	registeredCountries: string[];
	registeredRegions: string[];
}

export interface Name {
	id: string;
	persona?: string; // The persona that is associated with the account
	prefix?: string;
	first: string;
	middle?: string;
	last: string;
	suffix?: string;
}

export interface NaturalPerson {
	id: string;
	persona: string; // The persona that is associated with the account
	sex: string;
	dateOfBirth: string;
	idPhoto: boolean;
}

export interface Document {
	id: string;
	persona: string; // The persona that is associated with the account
	type: string;
	fileName: string;
	created: string;
	expires: string;
	updated: string;
	store?: string;
}

export interface PrimaryPhone {
	id?: string;
	persona?: string; // The persona that is associated with the account
	country: string;
	number: string;
	type?: string;
	sms?: boolean; // true/false
}

export interface PrimaryAddress {
	id?: string;
	persona?: string; // The persona that is associated with the account
	add1: string;
	add2?: string;
	city: string;
	region?: string; // State/prov...
	country: string;
	postal: string;
}

export interface YakklBlocked {
	id?: string;
	persona?: string; // The persona that is associated with the account
	domain: string;
}

export interface YakklRegisteredData {
	id?: string;
	persona?: string; // The persona that is associated with the account
	key: string;
	plan: {
		type: PlanType;
		source: AccessSourceType;
		promo: PromoClassificationType;
		trialEndDate: string;
		upgradeDate: string;
	};
	version: string;
	createDate: string;
	updateDate: string;
}

export interface WatchListItem {
	id: string;
	persona?: string; // The persona that is associated with the account
	name: string;
	address: string;
	blockchain: string;
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
}

export interface YakklWatch {
	id: string; // Profile id
	persona?: string; // The persona that is associated with the account
	blockchain: string;
	name: string;
	tags?: string[];
	quantity?: BigNumberish;
	includeInPortfolio: boolean;
	explorer?: string;
	address: string;
	addressAlias?: string;
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
}

export interface ProfileData {
	id?: string;
	persona?: string; // The persona that is associated with the account
	name: Name;
  username?: string;
  planType?: PlanType;
	email: string;
	bio?: string;
	website?: string;
	avatarUrl?: string;
	registered: YakklRegisteredData;
	digest: string;
	pincode: string;
	sig?: string;
	security?: YakklSecurity;
	value: BigNumberish; // This is the total value of all the accounts in the portfolio
	accountIndex: number;
	primaryAccounts: YakklPrimaryAccount[];
	importedAccounts: YakklAccount[]; // Independent accounts - These accounts have no relation to any primary or subaccount but do use the account model
	watchList: YakklWatch[]; // If you want to see data from any of your other centralized exchanges or something different
	vaultReferences?: VaultReference[]; // References to secure vaults (keys stored in yakkl-security)
	meta?: unknown | null | undefined; // This is a placeholder for any additional data that is not part of the standard profile
}

export interface Profile {
	id: string; // Must be unique - used where there is an 'id'
	persona?: string; // The persona that is associated with the account
	username: string; // Must be unique - not encrypted
	preferences: Preferences;
	data: EncryptedData | ProfileData | Promise<ProfileData>; // Properties that are encrypted when stored
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
}

export interface Preferences {
	id: string;
	persona?: string; // The persona that is associated with the account
	idleDelayInterval: number; // System default of 1 minute - this is in seconds
	showTestNetworks?: boolean;
	dark: SystemTheme; //'dark' | 'light' | 'system';
	chart?: string;
	screenWidth: number; // These two change. They are here for temporary but we're already using settings for the popup
	screenHeight: number;
	idleAutoLock: boolean;
	idleAutoLockCycle: number; // 3 minutes
	locale: string;
	currency: Currency;
	words: number; // Default number of words - may not enable in the UI - 24 words= 12 words, 32 words= 24 words
	wallet: YakklWallet;
	theme?: string;
	themes?: Theme[];
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
}

export interface YakklSettings {
	id: string; // Profile id (aka user id)
	persona?: string; // The persona that is associated with the account
	previousVersion?: string;
	// accessSource?: AccessSourceType; // This is the source of the access to the wallet
	// promoType?: PromoClassificationType; // This is the type of promo code used
	// trialEndDate?: string; // This is the end date of the trial
	trialCountdownPinned?: boolean; // This is the pinned state of the trial countdown
	legal: Legal;
	platform: Platform;
	plan: {
		type: PlanType; // This is the public plan type of the user but is verified against the profileData.planType which is encrypted
		source?: AccessSourceType;
		promo?: PromoClassificationType;
		trialEndDate?: string;
		upgradeDate?: string;
	};
	init: boolean;
	showHints?: boolean;
	isLocked: boolean;
	isLockedHow: string; // 'internal' | 'idle_system' | 'idle_timer' | 'user'
	transactions?: Transactions; // Settings for transaction retries, etc. (not the actual transaction since that is held on the blockchain)
	meta?: MetaData; // Meta is currently not used
	upgradeDate?: string;
	lastAccessDate: string;
	version: string; // Uses semversion format but puts 'default' as a placeholder
	createDate: string;
	updateDate: string;
	// Sound settings for notifications
	soundEnabled?: boolean; // Default true
	sound?: string; // Sound file name or data URI
	// Data refresh intervals in milliseconds
	dataRefreshIntervals?: {
		transactions?: number; // Default: 15 minutes
		prices?: number;       // Default: 5 minutes
		portfolio?: number;    // Default: 2.5 minutes
	};
	// Idle timeout settings
	idleSettings?: {
		enabled: boolean;              // Enable/disable idle timeout
		detectionMinutes: number;      // Minutes before idle detection (default: 5)
		graceMinutes: number;          // Minutes after idle before lock (default: 2)
		countdownSeconds: number;      // Final countdown in seconds (default: 30)
		warningSound?: string;         // Audio file/data URI for warnings
		warningVolume?: number;        // Volume 0-1 (default: 0.7)
		soundPoints?: number[];        // Seconds remaining for sound alerts [30, 10, 5]
		showNotifications: boolean;    // Show browser notifications
		showCountdownModal: boolean;   // Show countdown modal dialog
		autoDismissOnActivity: boolean; // Auto dismiss warnings on activity
	};
}

export interface YakklChat {
	id: string;
	persona?: string; // The persona that is associated with the account
	text: string;
	sender: string;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
	};
	timestamp?: string;
	version: string;
	createDate: string;
	updateDate: string;
}

export interface PreferencesShort {
	locale: string;
	currency: Currency;
}

export interface ProfileShort {
	id?: string;
	persona?: string; // The persona that is associated with the account
	username: string;
	name: Name | null;
	email?: string;
}

export interface Shortcuts {
	id?: string;
	persona?: string; // The persona that is associated with the account
	quantity?: BigNumberish; // Account value
	accountType: AccountTypeCategory; // primary, imported, sub
	accountName: string;
	smartContract: boolean;
	address: string;
	alias?: string;
	primary: YakklPrimaryAccount | null;
	init: boolean;
	legal: boolean;
	isLocked: boolean;
	showTestNetworks: boolean;
	profile: ProfileShort;
	gasLimit: number; //21_000 | 45_000; // 21000 for EOA and 45000 for smart contracts
	networks: Network[]; // This is the network object array for a given blockchain and comes from the blockchain object!
	network: Network; // This is the network object for a given blockchain and comes from the blockchain object! Network encapsulates the chainId, symbol, explorer, type, and name
	blockchain?: string; //'Ethereum';
	type?: string; // Mainnet
	chainId?: number; // 1
	symbol?: string; //'ETH';
	explorer?: string; // https://etherscan.io/ example
}

export interface CurrentlySelectedData {
	id?: string;
	persona?: string; // The persona that is associated with the account
	profile?: Profile | Promise<Profile>;
	primaryAccount?: YakklPrimaryAccount | null; // | undefined | null;
	account?: YakklAccount;
	rawData?: unknown; // Hex format, mainly used for smart contracts
}

export interface YakklCurrentlySelected {
	id: string; // Profile id
	persona?: string; // The persona that is associated with the account
	shortcuts: Shortcuts;
	preferences: PreferencesShort;
	data: EncryptedData | CurrentlySelectedData | Promise<CurrentlySelectedData>; // Properties that are encrypted when stored
	version: string; // Travels with the data and mainly used for upgrades
	createDate: string;
	updateDate: string;
}

export interface AccountData {
	id?: string;
	persona?: string; // The persona that is associated with the account
	extendedKey?: string;
	privateKey: string;
	publicKey: string;
	publicKeyUncompressed?: string;
	path?: string;
	pathIndex?: number;
	fingerPrint?: string;
	parentFingerPrint?: string;
	chainCode?: string; // Aids in deriving accounts/keys from the extended key on some blockchains
	assignedTo?: string[]; // Who are the parties that have responsibility for this account
}

export interface YakklAccount {
	id: string; // Profile id
	persona?: string; // The persona that is associated with the account
	index: number;
	blockchain: string; // Primary blockchain (example: Ethereum)
	smartContract: boolean; // SmartContracts do not have private keys and the price per gas unit is usually 45,000 instead of 21,000
	address: string; // Must be unique
	alias: string;
	accountType: AccountTypeCategory; //'imported' | 'sub' | 'primary' | 'NA';
	name: string;
	description: string; // Can use this to describe an account associated with an NFT or RWA (Real World Asset) or class
	primaryAccount: YakklPrimaryAccount | null; // If the account is a primary account then this is empty
	data: EncryptedData | AccountData; // anything with 'data' as a property then the content will be encrypted
	quantity?: BigNumberish; // Value is used as a placeholder and adjusted as needed for display and calculations - dynamic
	class?: string; // Used for enterprise environments
	level?: string; // L1
	isSigner?: boolean;
	isActive?: boolean; // Set to false if the account is not active - this is used to determine if the account is active or not - default is true on creation
	avatar?: string; // Default is identityicon but can be changed to user/account avatar
	tags?: string[];
	chainIds?: number[]; // 1 will be the default for all accounts
	connectedDomains: string[];
	includeInPortfolio: boolean; // This only applies to the value in this primary account and not any of the derived accounts
	// explorer?: string; // Remove later - moved to network
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
}

export interface AccountInfo {
	id: string;
	index: number;
	accountName: string;
	path: string;
}

export interface PrimaryAccountData {
	extendedKey: string;
	privateKey: string;
	publicKey: string;
	publicKeyUncompressed?: string;
	path: string | null;
	pathIndex: number;
	fingerPrint?: string;
	parentFingerPrint?: string;
	chainCode?: string; // Aids in deriving accounts/keys from the extended key on some blockchains
	mnemonic: string | null | undefined; // Mnemonic phrase
	entropy: string | Uint8Array | undefined; // Entropy used to create the mnemonic
	password?: string | undefined; // Not yakkl password but address creation password if there is one
	wordCount: number | undefined; // 12, 24, 48
	wordListLocale: string | undefined; // locale used for account creation may be different from current locale
}

export interface YakklPrimaryAccount {
	id: string; // Profile id
	persona?: string; // The persona that is associated with the account
	name: string; // account name, address, and keys are here for convenience - they are also in the yakklAccount record
	address: string;
	quantity: BigNumberish; // Value is used as a placeholder and adjusted as needed for display and calculations - dynamic
	index: number; // for primary path account index
	data: EncryptedData | PrimaryAccountData; // anything with 'data' as a property then the content will be encrypted
	account: YakklAccount; // Primary
	subIndex: number; // for indexing the path for derived - sub accounts
	subAccounts: YakklAccount[]; // yakklAccounts
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
}

export interface PrimaryAccountReturnValues {
	currentlySelected: YakklCurrentlySelected;
	primaryAccount: YakklPrimaryAccount;
}

// Address information for the dApp on connected domains
export interface AccountAddress {
	id: string;
	persona: string; // The persona that is associated with the account
	address: string;
	name: string;
	alias: string;
	blockchain: string;
	chainId: number; // May only want the dapp to access a specific chainId (testnet)
}

// This is only for the Dapp address dialog
export interface ConnectedDomainAddress extends AccountAddress {
	checked: boolean; // Checkbox checked if true
}

export interface ConnectedDomainPermissions {
	id?: string;
	persona?: string; // The persona that is associated with the account
	domain?: string;
	url?: string;
	icon?: string;
	name?: string;
	permissions?: {
		parentCapability?: string;
		caveats?: string[];
	}[];
}

export interface ConnectedDomainRevoked {
	id?: string;
	persona?: string; // The persona that is associated with the account
	domain?: string;
	revokedDate?: string; // Date and time the domain was revoked
	revokedBy?: string; // Who revoked the domain
	revokedReason?: string; // Reason the domain was revoked
	revokedMessage?: string; // Message from the domain that was revoked
	revokedSignature?: string; // Signature of the domain that was revoked - Maybe not needed
}

export interface YakklConnectedDomain {
	id: string;
	persona?: string; // The persona that is associated with the account
	addresses: AccountAddress[]; // Array of address objects
	chainId: number; // ChainId of the connected domain
	name: string; // Name of dApp/site
	permissions: ConnectedDomainPermissions; // What permissions has Yakkl allowed for this connected domain
	domain: string;
	url: string;
	icon: string;
	version: string; // Travels with the data for upgrades
	status: string; // 'approved' | 'revoked'
	revoked: ConnectedDomainRevoked; // If status revoked then the domain has been revoked and this will have the details
	createDate: string;
	updateDate: string;
}

export interface YakklContact {
	id: string;
	persona?: string; // The persona that is associated with the account
	name: string;
	address: string;
	addressType: string; //'EOA' | 'SC'; // EOA or SC
	avatar?: string;
	blockchain: string; // Ethereum
	chainId: number;
	alias?: string;
	note?: string; // Note on the contact for anything you wish to keep
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
	meta?: MetaData; // Flexible type-safe approach for meta data
}

export interface Media {
	type: string; // 'image' | 'video' | 'audio';
	url: string;
}

export interface YakklNFT {
	id: string;
	persona?: string; // The persona that is associated with the account
	name: string;
	description?: string;
	token?: string;
	thumbnail?: string;
	blockchain?: string;
	media?: Media[];
	contract?: string;
	owner?: string;
	transferDate?: string;
	version: string; // Travels with the data for upgrades
	createDate: string;
	updateDate: string;
	meta?: MetaData;
}

// DEX - Decentralized Exchange specific interfaces
export interface BasePriceData {
	provider: string;
	lastUpdated: Date;
	chainId?: number;
	currency?: string;
	status?: number;
	message?: string;
	isNative?: boolean;
	isStablecoin?: boolean;
}

// Amounts reference quantity of tokens and Price reference the price of a given token
export interface SwapPriceData extends BasePriceData {
	tokenIn: SwapToken; // Sell token
	tokenOut: SwapToken; // Buy token
	quoteAmount: BigNumberish; // Amount of token out or in depending on the direction of the swap
	fundingAddress: string;
	feeAmount: BigNumberish; // Fee in the tokenOut or buy side token
	amountAfterFee: BigNumberish; // Amount of token out or in after fee depending on the direction of the swap
	amountIn: BigNumberish; // Amount of sell token
	amountOut: BigNumberish; // Amount of buy token
	exchangeRate: BigNumberish; // Amount of buy token per sell token

	// MarketPrice - Updated to BigNumberish for precision
	marketPriceIn: number; // Changed from number
	marketPriceOut: number; // Changed from number
	marketPriceGas: number; // Changed from number

	priceImpactRatio: number; // Changed from number - critical for DeFi calculations
	path: string[]; // Path of tokens for the swap
	fee?: BigNumberish; // Changed from number
	feeBasisPoints: number; // Fee in basis points - constant - can stay number
	feeAmountPrice: BigNumberish; // Changed from number
	feeAmountInUSD?: string; // Fee in USD formatted
	gasEstimate: BigNumberish; // Gas estimate for the swap
	gasEstimateInUSD?: string; // Gas estimate in USD formatted
	tokenOutPriceInUSD?: string; // Token out price in USD formatted

	slippageTolerance?: BigNumberish; // Changed from number for precision
	deadline?: number; // Deadline for the swap

	sqrtPriceX96After?: BigNumberish; // Uniswap specific - sqrtPriceX96 after the swap
	initializedTicksCrossed?: number; // Uniswap specific - initialized ticks crossed
	poolInfo?: PoolInfo; // Uniswap specific - Pool information
	multiHop?: boolean; // Uniswap specific - Multi-hop swap

	error?: any;
	isLoading?: boolean;
}

// export interface UniswapSwapPriceData extends SwapPriceData {
//   poolInfo: PoolInfo;
//   sqrtPriceX96After: BigNumberish;
//   initializedTicksCrossed: number;
// }

export interface MarketPriceData extends BasePriceData {
	price: number;
	pair?: string;
}

export interface PoolInfoData extends BasePriceData {
	fee?: BigNumberish; // Changed from number
	liquidity: string;
	sqrtPriceX96: string;
	tick: number;
	tokenInReserve: string;
	tokenOutReserve: string;
	tokenInUSDPrice: string;
	tokenOutUSDPrice: string;
	tvl: number;
}

export interface GraphTick {
	tickIdx: string;
	liquidityGross: string;
	liquidityNet: string;
}

// interfaces.ts (add these)
export interface SwapCalculation {
	amountIn: BigNumberish;
	amountOut: BigNumberish;
	yakklFee: BigNumberish;
	poolFee: BigNumberish;
	gasEstimate: BigNumberish;
	priceImpact: number;
	exchangeRate?: BigNumberish;
}

export interface PoolPriceData {
	price: number; // Changed from number
	token0Price: number; // Changed from number
	token1Price: number; // Changed from number
	token0Reserve: string;
	token1Reserve: string;
	liquidityUSD: number; // Changed from number
	priceImpact: number; // Changed from number
}

// interfaces.ts (add this)
export interface SwapQuote {
	amountIn: BigNumberish;
	amountOut: BigNumberish;
	priceImpact: number;
	path: string[];
	fee: number;
	feeBasisPoints?: BigNumberish;
	gasEstimate: BigNumberish;
}

export interface SwapParams {
	tokenIn: Token;
	tokenOut: Token;
	amount: BigNumberish;
	fee: number;
	slippage: number;
	deadline: number;
	recipient: string;
	feeRecipient: string;
	feeAmount: BigNumberish;

	// These 3 are transaction related and not swap related
	gasLimit: BigNumberish;
	maxFeePerGas: BigNumberish;
	maxPriorityFeePerGas: BigNumberish;
}

export interface ExactInputSingleParams {
	tokenIn: string;
	tokenOut: string;
	fee: number;
	recipient: string;
	deadline: number;
	amountIn: bigint;
	amountOutMinimum: bigint;
	sqrtPriceLimitX96: number;
}
