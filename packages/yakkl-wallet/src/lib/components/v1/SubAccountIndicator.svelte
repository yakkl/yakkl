<!-- SubAccountIndicator.svelte - Shows sub-account count for primary accounts -->
<script lang="ts">
	import type { YakklAccount } from '$lib/common';
	import { AccountTypeCategory } from '$lib/common/types';

	interface Props {
		primaryAccount: YakklAccount;
		allAccounts: YakklAccount[];
		className?: string;
	}

	let { primaryAccount, allAccounts, className = '' }: Props = $props();

	// Calculate sub-accounts for this primary account
	const subAccounts = $derived(() => {
		if (primaryAccount.accountType !== AccountTypeCategory.PRIMARY) {
			return [];
		}

		return allAccounts.filter(
			(account) =>
				account.accountType === AccountTypeCategory.SUB &&
				account.primaryAccount?.address === primaryAccount.address
		);
	});

	const subAccountCount = $derived(subAccounts().length);
</script>

{#if subAccountCount > 0}
	<div class="flex items-center space-x-1 {className}">
		<!-- Sub-account icon -->
		<div class="relative">
			<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
				/>
			</svg>

			<!-- Count badge -->
			<div
				class="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
			>
				{subAccountCount}
			</div>
		</div>

		<!-- Text indicator -->
		<span class="text-xs text-blue-600 font-medium">
			{subAccountCount} sub-account{subAccountCount > 1 ? 's' : ''}
		</span>
	</div>
{/if}
