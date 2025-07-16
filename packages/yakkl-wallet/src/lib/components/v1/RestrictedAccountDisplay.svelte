<!-- RestrictedAccountDisplay.svelte - Shows blurred restricted accounts with upgrade prompt -->
<script lang="ts">
	import type { YakklAccount } from '$lib/common';
	import { AccountTypeCategory } from '$lib/common/types';

	interface Props {
		accounts: YakklAccount[];
		onUpgrade?: () => void;
	}

	let { accounts, onUpgrade = () => {} }: Props = $props();
</script>

{#if accounts.length > 0}
	<div class="mt-4 border-t border-gray-200 pt-4">
		<div class="text-center mb-3">
			<h4 class="text-sm font-medium text-gray-600 mb-1">
				{accounts.length} More Account{accounts.length > 1 ? 's' : ''} Available
			</h4>
			<p class="text-xs text-gray-500">Upgrade to view all your accounts</p>
		</div>

		<!-- Blurred account preview -->
		<div class="space-y-2 filter blur-sm opacity-50 pointer-events-none overflow-hidden">
			{#each accounts.slice(0, 2) as account}
				<div
					class="flex items-start rounded-lg p-3 bg-gray-50 border border-gray-200 overflow-hidden"
				>
					<div
						class="w-6 h-6 flex items-center justify-center rounded-full {account.accountType ===
						AccountTypeCategory.PRIMARY
							? 'bg-purple-400'
							: account.accountType === AccountTypeCategory.SUB
								? 'bg-blue-400'
								: 'bg-green-400'} text-white mr-3 shrink-0"
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
							<h5 class="text-sm font-medium text-gray-700 truncate">
								{account.accountType === AccountTypeCategory.PRIMARY
									? 'PORTFOLIO'
									: account.accountType === AccountTypeCategory.SUB
										? 'SUB-PORTFOLIO'
										: 'IMPORTED'}
							</h5>
						</div>
						<p class="text-xs text-gray-600 truncate" title={account.name}>{account.name}</p>
						<p class="text-xs text-gray-400 mt-1 font-mono truncate" title={account.address}>
							{account.address.slice(0, 6)}...{account.address.slice(-4)}
						</p>
						<div class="flex items-center justify-between mt-2">
							<div class="text-xs text-gray-500">
								<span class="bg-gray-200 rounded px-2 py-1">••• ETH</span>
							</div>
							<div class="text-xs text-gray-500">
								<span class="bg-gray-200 rounded px-2 py-1">$•••</span>
							</div>
						</div>
					</div>
				</div>
			{/each}

			{#if accounts.length > 2}
				<div class="text-center py-2 text-xs text-gray-400">
					... and {accounts.length - 2} more
				</div>
			{/if}
		</div>

		<!-- Upgrade button -->
		<div class="mt-4 text-center">
			<button
				class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
				onclick={onUpgrade}
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 10l7-7m0 0l7 7m-7-7v18"
					/>
				</svg>
				Upgrade to View All Accounts
			</button>

			<p class="text-xs text-gray-500 mt-2">Basic members can view up to 3 accounts</p>
		</div>
	</div>
{/if}
