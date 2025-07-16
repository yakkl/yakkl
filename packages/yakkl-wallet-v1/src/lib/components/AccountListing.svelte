<!-- AccountListing.svelte -->
<script lang="ts">
	import type { YakklAccount } from '$lib/common';
	import { onMount, onDestroy } from 'svelte';
	import {
		yakklAccountsStore,
		yakklCurrentlySelectedStore,
		yakklPricingStore,
		yakklPrimaryAccountsStore,
		yakklSettingsStore
	} from '$lib/common/stores';
	import AccountForm from './AccountForm.svelte';
	import Confirmation from './Confirmation.svelte';
	import BalanceIndicator from './BalanceIndicator.svelte';
	import RestrictedAccountDisplay from './RestrictedAccountDisplay.svelte';
	import SubAccountIndicator from './SubAccountIndicator.svelte';
	import EnhancedDeleteConfirmation from './EnhancedDeleteConfirmation.svelte';
	import { dateString } from '$lib/common/datetime';
	import { setYakklAccountsStorage, setYakklPrimaryAccountsStorage } from '$lib/common/stores';
	import { AccountTypeCategory } from '$lib/common/types';
	import EditControls from './EditControls.svelte';
	import WalletManager from '$lib/managers/WalletManager';
	import type { Wallet } from '$lib/managers/Wallet';
	import { log } from '$lib/managers/Logger';
	import {
		collectAccountDataProgressive,
		createAccountDataWithRestrictions,
		type AccountData
	} from '$lib/utilities/accountData';
	import { balanceCacheManager } from '$lib/managers/BalanceCacheManager';

	interface Props {
		accounts?: YakklAccount[];
		onAccountSelect?: (account: YakklAccount) => void;
		onUpgrade?: () => void;
	}

	let {
		accounts = $bindable([]),
		onAccountSelect = () => {},
		onUpgrade = () => {}
	}: Props = $props();

	let editMode = $state(false);
	let showDeleteModal = $state(false);
	let showEnhancedDeleteModal = $state(false);
	let selectedAccount: YakklAccount | null = $state(null);
	let wallet: Wallet | null = $state(null);
	let accountData: AccountData[] = $state([]);
	let visibleAccounts: YakklAccount[] = $state([]);
	let restrictedAccounts: YakklAccount[] = $state([]);
	let isRestricted = $state(false);
	let loadDataTimeout: number | null = null;
	let isLoadingData = $state(false);
	let isInitialized = $state(false);
	let initializationTimeout: number | null = null;
	let lastProcessedAccountsHash = $state('');

	// Function to handle progressive account data updates
	function handleAccountDataUpdate(data: AccountData[]): void {
		accountData = data;
	}

	// Function to retry balance loading for a specific account
	function retryBalance(accountAddress: string): void {
		if (!wallet) return;

		const accountIndex = accountData.findIndex((data) => data.account.address === accountAddress);
		if (accountIndex === -1) return;

		// Clear any cached data for this address to force fresh fetch
		balanceCacheManager.clearCachedBalance(accountAddress);

		// Reload all account data
		loadAccountData();
	}

	// Debounced function to load account data with progressive loading
	function loadAccountDataDebounced(): void {
		// Clear any pending timeout
		if (loadDataTimeout) {
			clearTimeout(loadDataTimeout);
		}

		// Skip if already loading or no data to load
		if (isLoadingData || !wallet || visibleAccounts.length === 0) {
			if (!wallet || visibleAccounts.length === 0) {
				accountData = [];
			}
			return;
		}

		// Debounce API calls by 300ms to prevent rapid successive calls
		loadDataTimeout = setTimeout(() => {
			loadAccountData();
		}, 300) as unknown as number;
	}

	// Function to load account data with progressive loading
	function loadAccountData(): void {
		if (!wallet || visibleAccounts.length === 0) {
			accountData = [];
			return;
		}

		// Prevent multiple simultaneous loads
		if (isLoadingData) {
			log.debug('[AccountListing] Already loading data, skipping');
			return;
		}

		isLoadingData = true;

		log.info('[AccountListing] Starting progressive balance loading for accounts:', false, {
			accountCount: visibleAccounts.length,
			addresses: visibleAccounts.map((a) => a.address)
		});

		// Get initial data with cached balances
		try {
			accountData = collectAccountDataProgressive(visibleAccounts, wallet, (data) => {
				handleAccountDataUpdate(data);
				isLoadingData = false; // Reset loading flag when complete
			});
		} catch (error) {
			log.error('[AccountListing] Error loading account data:', false, error);
			isLoadingData = false;
		}
	}

	// Effect to handle accounts and membership restrictions
	$effect(() => {
		// Prevent processing the same accounts multiple times by using a hash
		if (accounts.length > 0 && $yakklSettingsStore) {
			const currentAccountsHash = accounts.map(a => a.address).join(',');
			
			if (currentAccountsHash !== lastProcessedAccountsHash) {
				lastProcessedAccountsHash = currentAccountsHash;
				
				const membershipLevel = $yakklSettingsStore.plan?.type || 'basic_member';
				const restrictions = createAccountDataWithRestrictions(accounts, membershipLevel, 3);

				visibleAccounts = restrictions.visibleAccounts;
				restrictedAccounts = restrictions.restrictedAccounts;
				isRestricted = restrictions.isRestricted;

				log.info('[AccountListing] Account restrictions applied:', false, {
					membershipLevel,
					totalAccounts: accounts.length,
					visibleAccounts: visibleAccounts.length,
					restrictedAccounts: restrictedAccounts.length,
					isRestricted
				});
			}
		}
	});

	// Effect to handle pricing changes and reload data
	$effect(() => {
		if (!isInitialized || !wallet || !$yakklPricingStore || visibleAccounts.length === 0) {
			return;
		}
		
		// Only reload if price changed significantly (increased threshold to reduce API calls)
		const priceChange = Math.abs(
			($yakklPricingStore.price - $yakklPricingStore.prevPrice) / $yakklPricingStore.prevPrice
		);
		if (priceChange > 0.05) {
			// 5% price change threshold (increased from 1% to reduce API calls)
			log.info('[AccountListing] Major price change detected, reloading account data');
			loadAccountDataDebounced();
		}
	});

	// Effect to load data when visible accounts or wallet changes
	$effect(() => {
		if (!isInitialized || !wallet || visibleAccounts.length === 0) {
			return;
		}
		
		loadAccountDataDebounced();
	});

	onMount(() => {
		if (!accounts.length) {
			accounts = $yakklAccountsStore;
		}
		wallet = WalletManager.getInstance(
			['Alchemy'],
			['Ethereum'],
			$yakklCurrentlySelectedStore!.shortcuts.chainId ?? 1,
			import.meta.env.VITE_ALCHEMY_API_KEY_PROD
		);

		// Preload cache for better initial experience
		const addresses = accounts.map((a) => a.address);
		const preloaded = balanceCacheManager.preloadBalances(addresses);
		log.info(`[AccountListing] Preloaded ${preloaded.size} balances from cache`);

		// Initialize reactive effects after a delay to prevent loops during load
		initializationTimeout = setTimeout(() => {
			isInitialized = true;
			log.debug('[AccountListing] Reactive effects initialized');
		}, 500) as unknown as number;
	});

	onDestroy(() => {
		// Clean up any pending timeouts to prevent memory leaks
		if (loadDataTimeout) {
			clearTimeout(loadDataTimeout);
			loadDataTimeout = null;
		}
		if (initializationTimeout) {
			clearTimeout(initializationTimeout);
			initializationTimeout = null;
		}
	});

	function handleEdit(account: YakklAccount) {
		selectedAccount = account;
		editMode = true;
	}

	function handleDelete(account: YakklAccount) {
		selectedAccount = account;
		showEnhancedDeleteModal = true;
	}

	async function confirmDelete() {
		if (selectedAccount) {
			// The enhanced modal already shows balances, so we can proceed with deletion
			// Note: In a production app, you might want to re-check balances here as a safety measure

			if (selectedAccount.accountType === AccountTypeCategory.PRIMARY) {
				let subAccounts = accounts.filter(
					(a) => a.primaryAccount?.address === selectedAccount!.address
				);
				subAccounts.forEach((subAccount) => {
					const index = accounts.findIndex((a) => a.address === subAccount.address);
					if (index !== -1) {
						accounts.splice(index, 1);
					}
				});
			}
			accounts = accounts.filter((a) => a.address !== selectedAccount!.address);
			setYakklAccountsStorage(accounts);
			$yakklAccountsStore = accounts;

			if (selectedAccount.accountType === AccountTypeCategory.PRIMARY) {
				let primaryAccounts = $yakklPrimaryAccountsStore.filter(
					(a) => a.address !== selectedAccount!.address
				);
				setYakklPrimaryAccountsStorage(primaryAccounts);
				selectedAccount = null;
			} else {
				if (selectedAccount.address === $yakklCurrentlySelectedStore!.shortcuts.address) {
					selectedAccount = selectedAccount!.primaryAccount?.account as YakklAccount;
					onAccountSelect(selectedAccount); // This will update the currently selected account to the primary account if the sub-account is deleted and it's the currently selected account too.
				}
			}
			showEnhancedDeleteModal = false;
		}
	}

	// Helper function to determine if an error should be shown to the user
	function shouldShowErrorToUser(error: any): boolean {
		const errorMessage = error?.message || error?.toString() || '';

		// Network/API errors that should be handled silently
		const networkErrors = [
			'missing response',
			'timeout',
			'TIMEOUT',
			'SERVER_ERROR',
			'NETWORK_ERROR',
			'Failed to fetch',
			'fetch',
			'Connection failed',
			'Request timeout',
			'eth_getBalance',
			'call revert exception',
			'alchemy.com',
			'infura.io',
			'requestBody',
			'serverError',
			'code=SERVER_ERROR',
			'version=web/',
			'JsonRpcError',
			'RPC Error',
			'getBalance',
			'Balance fetch'
		];

		return !networkErrors.some((pattern) =>
			errorMessage.toLowerCase().includes(pattern.toLowerCase())
		);
	}

	async function checkBalances(account: YakklAccount) {
		let balance = 0n;
		if (account.accountType === AccountTypeCategory.PRIMARY) {
			let subAccounts = accounts.filter((a) => a.primaryAccount?.address === account.address);
			subAccounts.forEach(async (subAccount) => {
				try {
					balance = await wallet.getBalance(subAccount.address);
					if (balance > 0n) {
						alert(
							`Sub-account ${subAccount.name} has a balance of ${balance}. Please transfer the balance to another account before deleting!`
						);
						return true;
					}
				} catch (error) {
					if (shouldShowErrorToUser(error)) {
						console.error('[AccountListing] Balance check error for sub-account:', error);
					}
					// Skip balance check for network errors
				}
			});
		} else {
			try {
				balance = await wallet.getBalance(account.address);
				if (balance > 0n) {
					alert(
						`Account ${account.name} has a balance of ${balance}. Please transfer the balance to another account before deleting!`
					);
					return true;
				}
			} catch (error) {
				if (shouldShowErrorToUser(error)) {
					console.error('[AccountListing] Balance check error:', error);
				}
				// Skip balance check for network errors
			}
		}
		return false;
	}

	function updateAccount(updatedAccount: YakklAccount) {
		const index = accounts.findIndex((a) => a.address === updatedAccount.address);
		if (index !== -1) {
			accounts[index] = { ...updatedAccount, updateDate: dateString() };
			if (updatedAccount.accountType === AccountTypeCategory.PRIMARY) {
				updatePrimaryAndSubAccounts(updatedAccount);
			}
			setYakklAccountsStorage(accounts);
			$yakklAccountsStore = accounts;
			selectedAccount = updatedAccount;
		}
		editMode = false;
	}

	function updatePrimaryAndSubAccounts(updatedPrimaryAccount: YakklAccount) {
		let primaryAccount = $yakklPrimaryAccountsStore.find(
			(a) => a.address === updatedPrimaryAccount.address
		);
		if (primaryAccount) {
			primaryAccount.name = updatedPrimaryAccount.name;
			primaryAccount.updateDate = dateString();
			setYakklPrimaryAccountsStorage($yakklPrimaryAccountsStore);
		}
		let subAccounts = accounts.filter(
			(a) => a.primaryAccount?.address === updatedPrimaryAccount.address
		);
		subAccounts.forEach((subAccount) => {
			const index = accounts.findIndex((a) => a.address === subAccount.address);
			if (index !== -1) {
				accounts[index].primaryAccount!.name = updatedPrimaryAccount.name;
				accounts[index].primaryAccount!.updateDate = dateString();
			}
		});
	}

	function handleCopy(account: YakklAccount) {
		navigator.clipboard.writeText(account.address);
	}

	// Function to load balance for enhanced delete modal - uses cached data first
	async function loadBalanceForDelete(address: string): Promise<bigint> {
		// First try to get cached balance
		const cached = balanceCacheManager.getCachedBalance(address);
		if (cached) {
			log.info(`[AccountListing] Using cached balance for delete confirmation: ${address}`);
			return cached.balance;
		}

		// Try to get from current accountData
		const accountDataItem = accountData.find((data) => data.account.address === address);
		if (accountDataItem && !accountDataItem.isLoading && !accountDataItem.loadingError) {
			log.info(`[AccountListing] Using accountData balance for delete confirmation: ${address}`);
			return accountDataItem.quantity;
		}

		// Fallback to fresh fetch only if no cached data available
		if (!wallet) return 0n;
		try {
			const balance = await wallet.getBalance(address);
			log.info(`[AccountListing] Fetched fresh balance for delete confirmation: ${address}`);
			return balance;
		} catch (error) {
			// Only log non-network errors, suppress network timeouts
			if (shouldShowErrorToUser(error)) {
				log.warn(
					`[AccountListing] Failed to load balance for delete confirmation: ${address}`,
					false,
					error
				);
			}
			return 0n;
		}
	}
</script>

<ul class="overflow-hidden">
	{#each accountData as data}
		<li class="mb-3 relative overflow-hidden">
			<button
				class="w-full flex items-start rounded-lg p-3 transition-colors duration-200 overflow-hidden {data
					.account.accountType === AccountTypeCategory.PRIMARY
					? 'bg-purple-50 hover:bg-purple-100 border border-purple-200'
					: data.account.accountType === AccountTypeCategory.SUB
						? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
						: 'bg-green-50 hover:bg-green-100 border border-green-200'}"
				onclick={() => onAccountSelect(data.account)}
			>
				<div
					class="w-6 h-6 flex items-center justify-center rounded-full {data.account.accountType ===
					AccountTypeCategory.PRIMARY
						? 'bg-purple-500'
						: data.account.accountType === AccountTypeCategory.SUB
							? 'bg-blue-500'
							: 'bg-green-500'} text-white mr-3 shrink-0"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3 h-3"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="flex-1 min-w-0 overflow-hidden">
					<div class="flex items-center justify-between mb-1">
						<div class="flex items-center space-x-2">
							<h3 class="text-sm font-semibold text-gray-800">
								{data.account.accountType === AccountTypeCategory.PRIMARY
									? 'PORTFOLIO'
									: data.account.accountType === AccountTypeCategory.SUB
										? 'SUB-PORTFOLIO'
										: 'IMPORTED'}
							</h3>
							<!-- Sub-account indicator for primary accounts -->
							{#if data.account.accountType === AccountTypeCategory.PRIMARY}
								<SubAccountIndicator
									primaryAccount={data.account}
									allAccounts={accounts}
									className="ml-1"
								/>
							{/if}
						</div>
					</div>
					<p class="text-sm font-medium text-gray-700 truncate mb-1" title={data.account.name}>
						{data.account.name}
					</p>
					{#if data.account.accountType === AccountTypeCategory.SUB}
						<span
							class="text-xs text-gray-500 mb-1 block truncate"
							title="Derived from {data.account.primaryAccount?.name}"
							>Derived from {data.account.primaryAccount?.name}</span
						>
					{/if}
					<p class="text-xs text-gray-500 font-mono truncate mb-2" title={data.account.address}>
						{data.account.address}
					</p>

					<!-- Enhanced balance indicator with loading states -->
					<BalanceIndicator
						isLoading={data.isLoading}
						loadingError={data.loadingError}
						isCached={data.isCached}
						isStale={data.isStale}
						lastUpdated={data.lastUpdated}
						quantityFormatted={data.quantityFormatted}
						totalValueFormatted={data.totalValueFormatted}
						onRetry={() => retryBalance(data.account.address)}
					/>
				</div>
			</button>
			<EditControls
				onEdit={() => handleEdit(data.account)}
				onDelete={() => handleDelete(data.account)}
				onCopy={() => handleCopy(data.account)}
				controls={['copy', 'edit', 'delete']}
				hasBalance={data.quantity > 0n}
			/>
		</li>
	{/each}
</ul>

<!-- Show restricted accounts for basic members -->
{#if isRestricted}
	<RestrictedAccountDisplay accounts={restrictedAccounts} {onUpgrade} />
{/if}

<AccountForm bind:show={editMode} account={selectedAccount} onSubmit={updateAccount} />

<EnhancedDeleteConfirmation
	bind:show={showEnhancedDeleteModal}
	account={selectedAccount}
	allAccounts={accounts}
	onConfirm={confirmDelete}
	onCancel={() => (showEnhancedDeleteModal = false)}
	onLoadBalance={loadBalanceForDelete}
/>
