<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';

	let activeAction = $state<string | null>(null);

	function handleAction(action: string) {
		activeAction = action;
		
		// Reset after animation
		setTimeout(() => {
			activeAction = null;
		}, 150);

		// Navigate to appropriate screens
		switch (action) {
			case 'send':
				goto('/preview/send');
				break;
			case 'receive':
				goto('/preview/receive');
				break;
			case 'swap':
				goto('/preview/swap');
				break;
			case 'history':
				goto('/preview/history');
				break;
			case 'more':
				goto('/preview/settings');
				break;
			default:
				console.log(`Action: ${action}`);
		}
	}
</script>

<div class="grid grid-cols-3 gap-3">
	<!-- Send -->
	<button
		onclick={() => handleAction('send')}
		class="group bg-surface rounded-card p-4 hover:bg-surface-elevated transition-all duration-200 hover:shadow-card active:scale-95 border border-border-light hover:border-border"
		class:scale-95={activeAction === 'send'}
	>
		<div class="flex flex-col items-center space-y-2">
			<div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
				<svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
				</svg>
			</div>
			<span class="text-sm font-medium text-text-primary group-hover:text-primary-600 transition-colors">Send</span>
		</div>
	</button>

	<!-- Receive -->
	<button
		onclick={() => handleAction('receive')}
		class="group bg-surface rounded-card p-4 hover:bg-surface-elevated transition-all duration-200 hover:shadow-card active:scale-95 border border-border-light hover:border-border"
		class:scale-95={activeAction === 'receive'}
	>
		<div class="flex flex-col items-center space-y-2">
			<div class="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center group-hover:bg-success-200 transition-colors">
				<svg class="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
				</svg>
			</div>
			<span class="text-sm font-medium text-text-primary group-hover:text-success-600 transition-colors">Receive</span>
		</div>
	</button>

	<!-- Swap -->
	<button
		onclick={() => handleAction('swap')}
		class="group bg-surface rounded-card p-4 hover:bg-surface-elevated transition-all duration-200 hover:shadow-card active:scale-95 border border-border-light hover:border-border"
		class:scale-95={activeAction === 'swap'}
	>
		<div class="flex flex-col items-center space-y-2">
			<div class="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center group-hover:bg-warning-200 transition-colors">
				<svg class="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
				</svg>
			</div>
			<span class="text-sm font-medium text-text-primary group-hover:text-warning-600 transition-colors">Swap</span>
		</div>
	</button>
</div>

<!-- Secondary Actions Row -->
<div class="flex justify-center mt-4">
	<div class="flex items-center space-x-6">
		<button
			onclick={() => handleAction('history')}
			class="flex items-center space-x-2 px-4 py-2 rounded-button hover:bg-surface transition-colors text-sm text-text-secondary hover:text-text-primary"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>History</span>
		</button>

		<div class="w-px h-4 bg-border-light"></div>

		<button
			onclick={() => handleAction('more')}
			class="flex items-center space-x-2 px-4 py-2 rounded-button hover:bg-surface transition-colors text-sm text-text-secondary hover:text-text-primary"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
			</svg>
			<span>More</span>
		</button>
	</div>
</div>