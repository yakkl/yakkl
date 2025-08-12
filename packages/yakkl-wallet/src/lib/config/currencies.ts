// Currency configuration for multi-currency support
// Follows MetaMask and Trust Wallet standards

export interface CurrencyConfig {
	code: string;
	name: string;
	symbol: string;
	decimals: number;
	locale?: string;
}

// Currency configurations matching industry standards
export const CURRENCY_CONFIG: Record<string, CurrencyConfig> = {
	// Major currencies
	USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, locale: 'en-US' },
	EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, locale: 'de-DE' },
	GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, locale: 'en-GB' },
	JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, locale: 'ja-JP' }, // No decimals
	CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, locale: 'zh-CN' },
	
	// Other major currencies
	CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, locale: 'en-CA' },
	AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, locale: 'en-AU' },
	CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimals: 2, locale: 'de-CH' },
	INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, locale: 'hi-IN' },
	KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0, locale: 'ko-KR' }, // No decimals
	
	// European currencies
	SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2, locale: 'sv-SE' },
	NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, locale: 'nb-NO' },
	DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2, locale: 'da-DK' },
	PLN: { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimals: 2, locale: 'pl-PL' },
	CZK: { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, locale: 'cs-CZ' },
	
	// Asia-Pacific currencies
	SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, locale: 'en-SG' },
	HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, locale: 'zh-HK' },
	NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, locale: 'en-NZ' },
	THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2, locale: 'th-TH' },
	PHP: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2, locale: 'en-PH' },
	IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, locale: 'id-ID' }, // No decimals
	MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, locale: 'ms-MY' },
	VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimals: 0, locale: 'vi-VN' }, // No decimals
	
	// Americas
	MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', decimals: 2, locale: 'es-MX' },
	BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2, locale: 'pt-BR' },
	ARS: { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', decimals: 2, locale: 'es-AR' },
	CLP: { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$', decimals: 0, locale: 'es-CL' }, // No decimals
	COP: { code: 'COP', name: 'Colombian Peso', symbol: 'COL$', decimals: 0, locale: 'es-CO' }, // No decimals
	
	// Middle East & Africa
	AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, locale: 'ar-AE' },
	SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2, locale: 'ar-SA' },
	ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2, locale: 'en-ZA' },
	NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: 2, locale: 'en-NG' },
	
	// Crypto-related (for reference)
	BTC: { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8, locale: 'en-US' },
	ETH: { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', decimals: 18, locale: 'en-US' },
	USDT: { code: 'USDT', name: 'Tether', symbol: '₮', decimals: 6, locale: 'en-US' },
	USDC: { code: 'USDC', name: 'USD Coin', symbol: '$', decimals: 6, locale: 'en-US' }
};

// Default currency (can be overridden by user preference)
export const DEFAULT_CURRENCY = 'USD';

// Get currency config with fallback to USD
export function getCurrencyConfig(code: string): CurrencyConfig {
	return CURRENCY_CONFIG[code] || CURRENCY_CONFIG[DEFAULT_CURRENCY];
}

// Convert amount to smallest unit (e.g., dollars to cents, yen to yen)
export function toSmallestUnit(amount: number, currencyCode: string): bigint {
	const config = getCurrencyConfig(currencyCode);
	const factor = Math.pow(10, config.decimals);
	return BigInt(Math.round(amount * factor));
}

// Convert from smallest unit to display amount
export function fromSmallestUnit(amount: bigint, currencyCode: string): number {
	const config = getCurrencyConfig(currencyCode);
	const factor = Math.pow(10, config.decimals);
	return Number(amount) / factor;
}

// Format currency for display
export function formatCurrency(
	amount: number,
	currencyCode: string,
	locale?: string,
	options?: Intl.NumberFormatOptions
): string {
	const config = getCurrencyConfig(currencyCode);
	const formatLocale = locale || config.locale || 'en-US';
	
	return new Intl.NumberFormat(formatLocale, {
		style: 'currency',
		currency: config.code,
		minimumFractionDigits: config.decimals,
		maximumFractionDigits: config.decimals,
		...options
	}).format(amount);
}

// Check if currency has decimal places
export function hasDecimals(currencyCode: string): boolean {
	const config = getCurrencyConfig(currencyCode);
	return config.decimals > 0;
}

// Get list of supported currencies for UI
export function getSupportedCurrencies(): CurrencyConfig[] {
	// Filter out crypto currencies for fiat currency list
	return Object.values(CURRENCY_CONFIG).filter(
		currency => !['BTC', 'ETH', 'USDT', 'USDC'].includes(currency.code)
	);
}