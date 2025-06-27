<!-- EnhancedDeleteConfirmation.svelte - Enhanced delete confirmation with account hierarchy -->
<script lang="ts">
	import type { YakklAccount } from '$lib/common';
	import { AccountTypeCategory } from '$lib/common/types';
	import Modal from './Modal.svelte';
	import SkeletonBalance from './SkeletonBalance.svelte';

	interface AccountWithBalance {
		account: YakklAccount;
		balance: bigint;
		balanceFormatted: string;
		valueFormatted: string;
		isLoading: boolean;
		error: string | null;
	}

	interface Props {
		show?: boolean;
		account?: YakklAccount | null;
		allAccounts?: YakklAccount[];
		onConfirm?: () => void;
		onCancel?: () => void;
		onLoadBalance?: (address: string) => Promise<bigint>;
	}

	let {
		show = $bindable(false),
		account = null,
		allAccounts = [],
		onConfirm = () => {},
		onCancel = () => {},
		onLoadBalance = async () => 0n
	}: Props = $props();

	let accountsWithBalances: AccountWithBalance[] = $state([]);
	let totalValue = $state(0);
	let loading = $state(false);

	// Currency formatter
	const currency = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	// Get affected accounts (primary + its sub-accounts)
	function getAffectedAccounts(): YakklAccount[] {
		if (!account) return [];

		if (account.accountType === AccountTypeCategory.PRIMARY) {
			const subAccounts = allAccounts.filter(
				(a) =>
					a.accountType === AccountTypeCategory.SUB && a.primaryAccount?.address === account.address
			);
			return [account, ...subAccounts];
		}

		return [account];
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
			'Balance fetch',
			'Balance loading timeout'
		];

		return !networkErrors.some((pattern) =>
			errorMessage.toLowerCase().includes(pattern.toLowerCase())
		);
	}

	// Load balances for all affected accounts
	async function loadBalances(): Promise<void> {
		const affectedAccounts = getAffectedAccounts();
		if (affectedAccounts.length === 0) {
			loading = false;
			return;
		}

		loading = true;

		// Initialize accounts with loading state
		accountsWithBalances = affectedAccounts.map((acc) => ({
			account: acc,
			balance: 0n,
			balanceFormatted: '0.000000',
			valueFormatted: currency.format(0),
			isLoading: true,
			error: null as string | null
		}));

		// Load balances progressively with timeout
		const balancePromises = accountsWithBalances.map(async (item, index) => {
			try {
				// Add timeout to balance loading
				const balancePromise = onLoadBalance(item.account.address);
				const timeoutPromise = new Promise<bigint>((_, reject) => {
					setTimeout(() => reject(new Error('Balance loading timeout')), 3000);
				});

				const balance = await Promise.race([balancePromise, timeoutPromise]);
				const balanceNum = Number(balance) / 1e18;
				const balanceFormatted = balanceNum.toFixed(6);
				// Assuming ETH price around $3000 for demo - in real app, get from price store
				const value = balanceNum * 3000;
				const valueFormatted = currency.format(value);

				accountsWithBalances[index] = {
					...item,
					balance,
					balanceFormatted,
					valueFormatted,
					isLoading: false,
					error: null
				};

				// Trigger reactivity
				accountsWithBalances = [...accountsWithBalances];
			} catch (error) {
				// Only log non-network errors, suppress network timeouts
				if (shouldShowErrorToUser(error)) {
					console.error('[EnhancedDeleteConfirmation] Balance loading error:', error);
				}

				accountsWithBalances[index] = {
					...item,
					isLoading: false,
					error: 'Unable to load'
				};
				accountsWithBalances = [...accountsWithBalances];
			}
		});

		// Wait for all promises with shorter overall timeout
		try {
			await Promise.race([
				Promise.all(balancePromises),
				new Promise<void>((_, reject) => {
					setTimeout(() => reject(new Error('Overall timeout')), 5000);
				})
			]);
		} catch (error) {
			console.warn(
				'[EnhancedDeleteConfirmation] Balance loading timed out, proceeding with available data'
			);
		}

		// Calculate total value
		totalValue = accountsWithBalances.reduce((sum, item) => {
			if (!item.error && !item.isLoading) {
				const value = (Number(item.balance) / 1e18) * 3000; // ETH price
				return sum + value;
			}
			return sum;
		}, 0);

		// Always set loading to false at the end
		loading = false;
	}

	// Reset state when modal closes
	function resetState(): void {
		accountsWithBalances = [];
		totalValue = 0;
		loading = false;
	}

	// Effect to load balances when modal shows
	$effect(() => {
		if (show && account) {
			loadBalances();
		} else if (!show) {
			// Reset state when modal is closed
			resetState();
		}
	});

	function handleConfirm(): void {
		onConfirm();
		show = false;
	}

	function handleCancel(): void {
		onCancel();
		show = false;
	}

	function getAccountIcon(accountType: AccountTypeCategory): string {
		switch (accountType) {
			case AccountTypeCategory.PRIMARY:
				return 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10';
			case AccountTypeCategory.SUB:
				return 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2';
			default:
				return 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4';
		}
	}

	const isPrimaryAccountWithSubs = $derived(() => {
		return account?.accountType === AccountTypeCategory.PRIMARY && accountsWithBalances.length > 1;
	});
</script>

<Modal bind:show title="Delete Account Confirmation" className="z-[900]">
	<div class="p-6 space-y-4">
		<!-- Warning header -->
		<div class="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
			<div class="flex-shrink-0">
				<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-red-800">
					{isPrimaryAccountWithSubs ? 'Delete Primary Account & Sub-Accounts' : 'Delete Account'}
				</h3>
				<p class="text-sm text-red-600">
					This action cannot be undone and will permanently delete the account{isPrimaryAccountWithSubs
						? 's'
						: ''}.
				</p>
			</div>
		</div>

		<!-- Account hierarchy display -->
		<div class="space-y-3">
			<h4 class="font-medium text-gray-900">
				{isPrimaryAccountWithSubs ? 'Accounts to be deleted:' : 'Account to be deleted:'}
			</h4>

			<div class="bg-gray-50 rounded-lg p-4 space-y-3">
				{#each accountsWithBalances as item, index}
					<div
						class="flex items-start space-x-3 {item.account.accountType === AccountTypeCategory.SUB
							? 'ml-6 border-l-2 border-blue-200 pl-4'
							: ''}"
					>
						<!-- Account icon -->
						<div
							class="flex-shrink-0 w-8 h-8 rounded-full {item.account.accountType ===
							AccountTypeCategory.PRIMARY
								? 'bg-purple-100'
								: 'bg-blue-100'} flex items-center justify-center"
						>
							<svg
								class="w-4 h-4 {item.account.accountType === AccountTypeCategory.PRIMARY
									? 'text-purple-600'
									: 'text-blue-600'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={getAccountIcon(item.account.accountType)}
								/>
							</svg>
						</div>

						<!-- Account details -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-gray-900">
										{item.account.name}
										{#if item.account.accountType === AccountTypeCategory.SUB}
											<span class="text-xs text-gray-500">(Sub-account)</span>
										{/if}
									</p>
									<p class="text-xs text-gray-500 font-mono">
										{item.account.address.slice(0, 6)}...{item.account.address.slice(-4)}
									</p>
								</div>

								<!-- Balance display -->
								<div class="text-right">
									{#if item.isLoading}
										<SkeletonBalance showLabel={false} className="w-16" />
									{:else if item.error}
										<div class="text-xs text-red-500">Error loading</div>
									{:else}
										<div class="text-sm font-semibold text-gray-900">
											{item.balanceFormatted} ETH
										</div>
										<div class="text-xs text-gray-600">
											{item.valueFormatted}
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Total value -->
			{#if !loading && totalValue > 0}
				<div class="border-t border-gray-200 pt-3">
					<div class="flex justify-between items-center">
						<span class="font-medium text-gray-900">Total Value:</span>
						<span class="text-lg font-bold text-red-600">
							{currency.format(totalValue)}
						</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Warning message for accounts with balances -->
		{#if totalValue > 0 && !loading}
			<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
				<div class="flex items-start space-x-2">
					<svg
						class="w-5 h-5 text-yellow-600 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
					<div>
						<p class="text-sm font-medium text-yellow-800">
							Warning: Accounts contain cryptocurrency
						</p>
						<p class="text-sm text-yellow-700 mt-1">
							Please transfer all funds to another account before deleting. You will lose access to
							these funds permanently.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				onclick={handleCancel}
			>
				Cancel
			</button>
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={handleConfirm}
				disabled={loading}
			>
				{loading ? 'Loading...' : `Delete Account${isPrimaryAccountWithSubs ? 's' : ''}`}
			</button>
		</div>
	</div>
</Modal>
