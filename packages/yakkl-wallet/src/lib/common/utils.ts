/* eslint-disable no-debugger */
import {
	PRO_ELIGIBLE_PROMO_TYPES,
	TRIAL_DAYS,
	type ErrorBody,
	type ParsedError
} from '$lib/common';
import { AccessSourceType, AccountTypeCategory, PlanType } from '$lib/common/types';
import type { YakklSettings, YakklAccount, YakklPrimaryAccount } from '$lib/common/interfaces';
import {
	getYakklAccounts,
	getYakklPrimaryAccounts,
	yakklAccountsStore,
	setYakklAccountsStorage,
	setYakklPrimaryAccountsStorage,
	yakklPrimaryAccountsStore,
	getYakklSettings,
	setYakklSettingsStorage
} from '$lib/common/stores';
import { browser_ext } from './environment';
import { ethers as ethersv6 } from 'ethers-v6';
import { get } from 'svelte/store';
import { log } from '$lib/managers/Logger';
// import type { Runtime } from 'webextension-polyfill';

// Global flag to track extension context validity
let extensionContextValid = true;

// Queue for operations that need valid extension context
const contextDependentOperations: Array<() => void> = [];

export function isExtensionContextValid(): boolean {
	try {
		// Multiple checks to ensure context is valid
		if (!browser_ext?.runtime?.id) {
			return false;
		}

		// Try to access extension URL to test context
		if (browser_ext.runtime.getURL) {
			browser_ext.runtime.getURL('/');
		}

		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Validate extension context and update global flag
 */
function validateExtensionContext(): boolean {
	const wasValid = extensionContextValid;
	extensionContextValid = isExtensionContextValid();

	if (wasValid && !extensionContextValid) {
		log.warn('[ExtensionContext] Extension context became invalid');
		// Clear any pending operations
		contextDependentOperations.length = 0;
	} else if (!wasValid && extensionContextValid) {
		log.info('[ExtensionContext] Extension context restored');
		// Execute queued operations
		while (contextDependentOperations.length > 0) {
			const operation = contextDependentOperations.shift();
			try {
				operation?.();
			} catch (error) {
				log.warn('[ExtensionContext] Error executing queued operation:', false, error);
			}
		}
	}

	return extensionContextValid;
}

// This is used to get the current function name and location
export function getCurrentFunctionInfo(depth = 2): { name: string; location: string } {
	const err = new Error();
	const stack = err.stack?.split('\n');

	if (!stack || stack.length <= depth) {
		return { name: 'unknown', location: 'unknown' };
	}

	const rawLine = stack[depth].trim(); // e.g., at myFunction (src/myfile.ts:10:5)

	const match = rawLine.match(/at\s+(.*)\s+\((.*)\)/) || rawLine.match(/at\s+(.*)/);

	if (match) {
		const [, name, location] = match;
		return {
			name: name?.split(' ')[0] ?? 'anonymous',
			location: location ?? 'unknown'
		};
	}

	return { name: 'unknown', location: 'unknown' };
}

export async function isProLevel(): Promise<boolean> {
	const settings = await getYakklSettings();
	return (
		settings?.plan.type === PlanType.YAKKL_PRO ||
		settings?.plan.type === PlanType.FOUNDING_MEMBER ||
		settings?.plan.type === PlanType.EARLY_ADOPTER
	);
}

export async function isStandard(): Promise<boolean> {
	const settings = await getYakklSettings();
	return settings?.plan.type === PlanType.EXPLORER_MEMBER;
}

export async function setRegisteredType(type: PlanType): Promise<void> {
	const settings = await getYakklSettings();
	if (settings) {
		settings.plan.type = type;
		await setYakklSettingsStorage(settings); // You should have something that handles both local state and extension storage sync
	}
}

export async function isTrialing(): Promise<boolean> {
	const settings = await getYakklSettings();
	return settings.plan.source === AccessSourceType.TRIAL;
}

export async function trialExpiresSoon(): Promise<boolean> {
	const settings = await getYakklSettings();
	if (!settings.plan.trialEndDate) return false;
	return new Date(settings.plan.trialEndDate).getTime() - Date.now() < 1000 * 60 * 60 * 24; // < 1 day
}

export async function isFullyPro(providedSettings?: YakklSettings): Promise<boolean> {
	const settings = providedSettings ?? (await getYakklSettings());

	if (!settings) return false;

	const { plan } = settings;

	return (
		(plan.type === PlanType.YAKKL_PRO ||
			plan.type === PlanType.FOUNDING_MEMBER ||
			plan.type === PlanType.EARLY_ADOPTER) &&
		plan.source !== AccessSourceType.TRIAL &&
		!plan.trialEndDate &&
		!plan.promo
	);
}

export async function canUpgrade(providedSettings?: YakklSettings): Promise<boolean> {
	const settings = providedSettings ?? (await getYakklSettings());

	if (!settings) return false;

	const { plan } = settings;

	// Fully Pro users (paid or promo) can't upgrade
	if (
		(plan.type === PlanType.YAKKL_PRO ||
			plan.type === PlanType.FOUNDING_MEMBER ||
			plan.type === PlanType.EARLY_ADOPTER) &&
		plan.source !== AccessSourceType.TRIAL &&
		!plan.trialEndDate &&
		!plan.promo // optional check: may allow influencer accounts to upgrade again
	) {
		return false;
	}

	return true;
}

export function normalizeUserPlan(settings: YakklSettings): YakklSettings | null {
	// Handle null or missing settings
	if (!settings || !settings.plan) {
		console.warn('[normalizeUserPlan] Settings or plan is null/undefined');
		return null;
	}

	const now = new Date();

	const isTrialExpired =
		settings.plan.trialEndDate && new Date(settings.plan.trialEndDate).getTime() < now.getTime();

	const hasPromo =
		settings.plan.promo && PRO_ELIGIBLE_PROMO_TYPES.includes(settings.plan.promo.toLowerCase());

	if (isTrialExpired && !hasPromo) {
		return {
			...settings,
			plan: {
				...settings.plan,
				type: PlanType.EXPLORER_MEMBER,
				source: AccessSourceType.STANDARD,
				trialEndDate: null,
				promo: null,
				upgradeDate: null
			}
		};
	}

	return settings;
}

export async function getNormalizedSettings(): Promise<YakklSettings | null> {
	const raw = await getYakklSettings();

	// Handle null settings - return null to let caller handle it
	if (!raw) {
		console.warn('[getNormalizedSettings] Settings is null');
		return null;
	}

	const normalized = normalizeUserPlan(raw);

	if (normalized && raw && normalized.plan && raw.plan &&
	    JSON.stringify(normalized.plan) !== JSON.stringify(raw.plan)) {
		await setYakklSettingsStorage(normalized);
	}

	return normalized;
}

// Use for messaging to let the user know that their trial has expired
export function wasTrialExpiredRecently(
	settings: YakklSettings,
	thresholdInMs = 1000 * 60 * 60 * 24
): boolean {
	if (!settings.plan.trialEndDate) return false;

	const trialEndedAt = new Date(settings.plan.trialEndDate).getTime();
	const now = Date.now();

	return trialEndedAt < now && now - trialEndedAt < thresholdInMs;
}

export function getTrialEndDate(): string {
	const days = TRIAL_DAYS;
	const now = new Date();
	now.setDate(now.getDate() + days);
	return now.toISOString();
}

export function safeRuntimeCall<T>(callback: () => T, fallback?: T): T | undefined {
	if (!isExtensionContextValid()) {
		console.warn('Extension context invalidated');
		return fallback;
	}

	try {
		return callback();
	} catch (error: any) {
		if (error.message?.includes('Extension context invalidated')) {
			console.warn('Extension context invalidated during call');
			return fallback;
		}
		throw error;
	}
}

export async function safeSendMessage<T>(
	message: any
): Promise<T | null> {
	return safeRuntimeCall(async () => {
		try {
			return browser_ext.runtime.sendMessage(message);
		} catch (error: any) {
			if (error.message?.includes('receiving end does not exist')) {
				console.warn('Message receiver not available');
				return null;
			}
			throw error;
		}
	}, null);
}

// For ssr checks during compiling
export function isServerSide(): boolean {
	return typeof window === 'undefined' || typeof document === 'undefined';
}

// This should represent the .id property of given objects for uniqueness
export function getUserId(): string {
	let userId = localStorage.getItem('anonymous_user_id');
	if (!userId) {
		userId = crypto.randomUUID(); //  `${string}-${string}-${string}-${string}-${string}` format of very random string
		localStorage.setItem('anonymous_user_id', userId);
	}
	return userId;
}

export function detectExecutionContext():
	| 'background'
	| 'content_script'
	| 'popup'
	| 'options'
	| 'unknown' {
	// Background Service Worker (No `window` object)
	if (typeof window === 'undefined') {
		return 'background';
	}

	// Content Script (Has `document`, but no `chrome-extension://` URL)
	if (typeof document !== 'undefined' && window.location.protocol !== 'chrome-extension:') {
		return 'content_script';
	}

	// Popup or Options Page (Runs within the extension UI)
	if (window.location.protocol === 'chrome-extension:') {
		// Check if running in a popup
		if (window.location.pathname.includes('popup')) {
			return 'popup';
		}

		// Check if running in the options page
		if (window.location.pathname.includes('options')) {
			return 'options';
		}

		return 'unknown'; // Some other extension UI page
	}

	return 'unknown'; // Fallback if none of the above match
}

// export async function checkAccountRegistration(): Promise<boolean> {
//   try {
//     const accounts: YakklAccount[] = get(yakklAccountsStore);

//     if (!accounts || accounts.length === 0) {
//       return false;
//     }

//     let hasPrimaryOrImported = false;
//     if (Array.isArray(accounts)) {
//       hasPrimaryOrImported = accounts.some(account =>
//         account.accountType === AccountTypeCategory.PRIMARY ||
//         account.accountType === AccountTypeCategory.IMPORTED
//       );
//     } else {
//       log.warn('Accounts is currently not an array:', false, accounts);
//     }

//     return hasPrimaryOrImported;
//   } catch (error) {
//     log.error('Error checking registration:', false, error);
//     return false;
//   }
// }

export async function checkAccountRegistration(): Promise<boolean> {
	try {
		let accounts: YakklAccount[] | Record<string, YakklAccount> = get(yakklAccountsStore);
		let primaryAccounts: YakklPrimaryAccount[] | Record<string, YakklPrimaryAccount> =
			get(yakklPrimaryAccountsStore);

		// Ensure accounts is an array
		if (!Array.isArray(accounts)) {
			accounts = Object.values(accounts);
			log.warn('Accounts is currently not an array:', false, accounts);
			await setYakklAccountsStorage(accounts);
			yakklAccountsStore.set(accounts);
			if (Array.isArray(accounts))
				log.info('Accounts has been converted to an array and stored:', false, accounts);
		}

		if (!accounts || accounts.length === 0) {
			return false;
		}

		const hasPrimaryOrImported = accounts.some(
			(account) =>
				account.accountType === AccountTypeCategory.PRIMARY ||
				account.accountType === AccountTypeCategory.IMPORTED
		);

		// Ensure primaryAccounts is an array of values and if not return false
		if (!primaryAccounts || primaryAccounts.length === 0) {
			return false;
		}

		return hasPrimaryOrImported;
	} catch (error) {
		log.error('Error checking registration:', false, error);
		return false;
	}
}

export function parseAmount(amount: string, decimals: number): bigint {
	// Normalize input
	const normalizedAmount = amount.startsWith('.') ? `0${amount}` : amount;

	try {
		// Use a more robust parsing method
		const [integerPart, fractionalPart = ''] = normalizedAmount.split('.');

		// Truncate or pad fractional part
		const truncatedFractional = fractionalPart.slice(0, decimals).padEnd(decimals, '0');

		// Combine parts
		const fullAmount = `${integerPart}${truncatedFractional}`;

		return BigInt(fullAmount);
	} catch (error) {
		log.error('Failed to parse amount:', false, error);
		return 0n;
	}
}

export function parseAmountAlternative(amount: string, decimals: number): bigint {
	// Handle empty or invalid inputs
	if (!amount || amount === '.' || amount.trim() === '') {
		return 0n;
	}

	try {
		// Convert to number first to handle scientific notation and precision
		const numericValue = Number(amount);

		// Multiply by 10^decimals and convert to bigint
		return BigInt(Math.round(numericValue * 10 ** decimals));
	} catch (error) {
		log.error('Error parsing amount:', false, error);
		return 0n;
	}
}

// Format USD amounts to 2 decimal places
export function formatUsd(amount: number): string {
	return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format token amounts based on decimals
export function formatAmount(amount: bigint, decimals: number): string {
	if (amount === 0n) return '0';
	const value = Number(amount) / Math.pow(10, decimals);
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals
	});
}

export function convertUsdToTokenAmount(
	usdAmount: number,
	marketPrice: number,
	decimals: number
): string {
	if (marketPrice <= 0) return '0';
	const tokenAmount = usdAmount / marketPrice;
	return ethersv6.formatUnits(
		ethersv6.parseUnits(tokenAmount.toFixed(decimals), decimals),
		decimals
	);
}

export function convertTokenToUsd(tokenAmount: number, marketPrice: number): number {
	if (marketPrice <= 0) return 0;
	return tokenAmount * marketPrice;
}

/**
 * <p transition:typewriter>
		The quick brown fox jumps over the lazy dog
	</p>
 */

interface TypewriterOptions {
	speed?: number;
}

export function typewriter(node: HTMLElement, { speed = 1 }: TypewriterOptions) {
	if (node.childNodes.length !== 1 || node.childNodes[0].nodeType !== Node.TEXT_NODE) {
		throw new Error(`This transition only works on elements with a single text node child`);
	}

	const text = node.textContent ?? '';
	const duration = text.length / (speed * 0.01);

	return {
		duration,
		tick: (t: number) => {
			const i = Math.trunc(text.length * t);
			node.textContent = text.slice(0, i);
		}
	};
}

// TODO: Add more blockchain support here - Audit functions and classes and remove any duplicates (this could be one)
export function supportedChainId(chainId: number) {
	switch (chainId) {
		case 1:
		case 5:
		case 11155111:
			return true;
		default:
			break;
	}
	return false;
}

// chainId is a number and returns a hex string
export function toHexChainId(chainId: number): string {
	return `0x${chainId.toString(16)}`;
}

export const gweiToWeiHex = (gwei: number) => {
	return `0x${(gwei * 1e9).toString(16)}`;
};

export const wait = (time: number | undefined) =>
	new Promise((resolve) => setTimeout(resolve, time));

export function parseErrorMessageFromJSON(errorMessage: string): ParsedError {
	try {
		const parsedError: ErrorBody = JSON.parse(errorMessage);

		if (parsedError.body) {
			const body: ErrorBody = JSON.parse(parsedError.body);
			return body.error ?? null;
		}

		if (parsedError.reason) {
			return parsedError.reason;
		}

		return parsedError;
	} catch (error) {
		log.error('Failed to parse errorMessage, body or error:', false, error);
	}

	return null;
}
// Used for the 'data' field in the transaction
export function getLengthInBytes(value: string): number {
	if (typeof value === 'string' && value !== '0x') {
		if (value.startsWith('0x')) return Math.round(value.length / 2);
		return value.length;
	}
	return 0;
}

/**
 * Checks if an address exists in either accounts or primary accounts tables
 * @param address The address to check
 * @returns An object with exists (boolean) and table (string) properties
 */
export async function addressExist(
	address: string
): Promise<{ exists: boolean; table: string | null }> {
	try {
		// Check in accounts table
		const yakklAccounts = await getYakklAccounts();
		for (const account of yakklAccounts) {
			if (account.address === address) {
				return { exists: true, table: 'accounts' };
			}
		}

		// Check in primary accounts table
		const yakklPrimaryAccounts = await getYakklPrimaryAccounts();
		for (const account of yakklPrimaryAccounts) {
			if (account.address === address) {
				return { exists: true, table: 'primaryAccounts' };
			}
		}

		// Address not found in either table
		return { exists: false, table: null };
	} catch (error) {
		log.error('Error checking if address exists:', false, error);
		return { exists: false, table: null };
	}
}

/**
 * Removes duplicate addresses from yakklAccounts and yakklPrimaryAccounts
 * @returns An object with the number of duplicates removed from each table
 */
export async function removeDuplicateAddress(): Promise<{
	accountsRemoved: number;
	primaryAccountsRemoved: number;
}> {
	try {
		// Get current accounts
		const yakklAccounts = await getYakklAccounts();
		const yakklPrimaryAccounts = await getYakklPrimaryAccounts();

		// Track original counts
		const originalAccountsCount = yakklAccounts.length;
		const originalPrimaryAccountsCount = yakklPrimaryAccounts.length;

		// Create maps to track unique addresses
		const uniqueAccounts = new Map<string, YakklAccount>();
		const uniquePrimaryAccounts = new Map<string, YakklPrimaryAccount>();

		// Process accounts - keep only the most recent entry for each address
		for (const account of yakklAccounts) {
			if (uniqueAccounts.has(account.address)) {
				// If we already have this address, keep the one with the most recent update date
				const existingAccount = uniqueAccounts.get(account.address)!;
				if (account.updateDate > existingAccount.updateDate) {
					uniqueAccounts.set(account.address, account);
				}
			} else {
				uniqueAccounts.set(account.address, account);
			}
		}

		// Process primary accounts - keep only the most recent entry for each address
		for (const account of yakklPrimaryAccounts) {
			if (uniquePrimaryAccounts.has(account.address)) {
				// If we already have this address, keep the one with the most recent update date
				const existingAccount = uniquePrimaryAccounts.get(account.address)!;
				if (account.updateDate > existingAccount.updateDate) {
					uniquePrimaryAccounts.set(account.address, account);
				}
			} else {
				uniquePrimaryAccounts.set(account.address, account);
			}
		}

		// Convert maps back to arrays
		const deduplicatedAccounts = Array.from(uniqueAccounts.values());
		const deduplicatedPrimaryAccounts = Array.from(uniquePrimaryAccounts.values());

		// Calculate how many duplicates were removed
		const accountsRemoved = originalAccountsCount - deduplicatedAccounts.length;
		const primaryAccountsRemoved =
			originalPrimaryAccountsCount - deduplicatedPrimaryAccounts.length;

		// Only update storage if duplicates were found and removed
		if (accountsRemoved > 0) {
			await setYakklAccountsStorage(deduplicatedAccounts);
		}

		if (primaryAccountsRemoved > 0) {
			await setYakklPrimaryAccountsStorage(deduplicatedPrimaryAccounts);
		}

		return { accountsRemoved, primaryAccountsRemoved };
	} catch (error) {
		log.error('Error removing duplicate addresses:', false, error);
		return { accountsRemoved: 0, primaryAccountsRemoved: 0 };
	}
}
