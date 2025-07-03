<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import SectionCard from './SectionCard.svelte';
	import LockIcon from './icons/LockIcon.svelte';
	import Tooltip from './Tooltip.svelte';
	import { cn } from '$lib/utils';

	let {
		show = $bindable(true),
		locked = false,
		lockMessage = 'Upgrade to unlock this feature',
		showButton = true,
		onComplete = () => {},
		title,
		icon,
		isPinned,
		eye,
		eyeTooltip,
		className,
		minHeight,
		maxHeight,
		footer,
		footerProps = {},
		lockedFooter,
		lockedFooterProps = {},
		children
	} = $props<{
		show?: boolean;
		locked?: boolean;
		lockMessage?: string | (() => string);
		showButton?: boolean;
		onComplete?: () => void;
		title: string;
		icon?: any;
		className?: string;
		isPinned?: boolean;
		eye?: boolean;
		eyeTooltip?: string;
		minHeight?: string;
		maxHeight?: string;
		footer?: any;
		footerProps?: Record<string, any>;
		lockedFooter?: any;
		lockedFooterProps?: Record<string, any>;
		children: () => any;
	}>();
</script>

{#if show}
	<SectionCard
		bind:show
		{title}
		{icon}
		{isPinned}
		{eye}
		{eyeTooltip}
		{className}
		{minHeight}
		{maxHeight}
		{footer}
		{footerProps}
		{lockedFooter}
		{lockedFooterProps}
		{locked}
	>
		{#if locked}
			<!-- Show lock overlay instead of content when locked -->
			<div class="flex items-center justify-center py-8">
				<div
					class="bg-gradient-to-br from-white/95 to-zinc-50/95 dark:from-zinc-900/95 dark:to-zinc-800/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-700 max-w-sm transform transition-all duration-300 hover:scale-105"
					transition:scale={{ duration: 300, start: 0.9 }}
				>
					<div class="flex flex-col items-center text-center">
						<div class="p-3 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 mb-4">
							<LockIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
						</div>
						<h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-2">Pro Feature</h3>
						<div class="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
							{typeof lockMessage === 'function' ? lockMessage() : lockMessage}
						</div>
						{#if showButton}
							<button
								class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
								onclick={() => onComplete()}
							>
								<span class="flex items-center gap-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									Upgrade to Pro
								</span>
							</button>
						{/if}
						<Tooltip content="Unlock advanced features with YAKKL Pro">
							<button class="text-xs text-indigo-600 dark:text-indigo-400 mt-3 hover:underline flex items-center gap-1">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Learn more about Pro features
							</button>
						</Tooltip>
					</div>
				</div>
			</div>
		{:else}
			<!-- Show actual content when unlocked -->
			{@render children()}
		{/if}
	</SectionCard>
{/if}