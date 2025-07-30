<script lang="ts">
	import { visibilityStore } from '$lib/common/stores/visibilityStore';
	import { get } from 'svelte/store';
	import { onDestroy, onMount } from 'svelte';
	import { tokenizeProtectedText, type Token } from '$lib/utils/tokenizer';
	import { MotionEntropyDetector, type EnforcementStage, type DetectionState } from '$lib/utils/motionEntropyDetector';
	import { PlaceholderAnimator, type AnimationConfig, type AnimatedChar } from '$lib/utils/placeholderAnimator';
	import { animationScheduler } from '$lib/utils/animationScheduler';
	import { animationControlStore, shouldAnimate } from '$lib/common/stores/animationControlStore';

	type MAPCRSConfig = boolean | {
		enabled: boolean;
		enforcement?: EnforcementStage;
		debug?: boolean;
	};

	type PlaceholderAnimationConfig = {
		enabled: boolean;
		type?: AnimationConfig['type'];
		speed?: number;
		intensity?: number;
		phaseShift?: boolean;
	};

	const {
		value,
		placeholder = '**********',
		mapcrs = true,
		placeholderAnimation = { enabled: true }
	} = $props<{
		value: string;
		placeholder?: string;
		mapcrs?: MAPCRSConfig;
		placeholderAnimation?: PlaceholderAnimationConfig;
	}>();

	// Initialize with current store value
	let visible = $state(get(visibilityStore));

	// Parse MAPCRS config
	const mapcrsEnabled = typeof mapcrs === 'boolean' ? mapcrs : mapcrs.enabled;
	const enforcement = typeof mapcrs === 'object' ? (mapcrs.enforcement || 'learning') : 'learning';
	const debug = typeof mapcrs === 'object' ? (mapcrs.debug || false) : false;

	// MAPCRS state
	const tokenMap = new Map<string, string>();
	let tokens = $state<Token[]>([]);
	let revealedTokenId = $state<string | null>(null);
	let revealTimer: number | null = null;
	let hoverTimer: number | null = null;
	let cooldownActive = $state(false);
	let lastRevealTime = 0;

	// Motion detection state
	let detector: MotionEntropyDetector | null = null;
	let detectionState = $state<DetectionState>('normal');
	let baseCooldown = 300; // Base cooldown in ms
	let currentCooldown = $state(baseCooldown);

	// Placeholder animation state
	let componentId = crypto.randomUUID();
	let placeholderAnimator: PlaceholderAnimator | null = null;
	let animatedPlaceholder = $state<AnimatedChar[]>([]);
	let placeholderElement = $state<HTMLElement | null>(null);

	// Subscribe to visibility store changes without causing infinite loops
	$effect(() => {
		const unsubscribe = visibilityStore.subscribe((newValue) => {
			// Only update if value actually changed to prevent loops
			if (visible !== newValue) {
				visible = newValue;
			}
		});

		return unsubscribe;
	});

	// Initialize motion detector and animation
	onMount(() => {
		if (mapcrsEnabled) {
			detector = new MotionEntropyDetector(enforcement, debug);
		}

		// Setup placeholder animation
		if (placeholderAnimation?.enabled && shouldAnimate(componentId)) {
			placeholderAnimator = new PlaceholderAnimator();

			// Build animation config
			const animConfig: AnimationConfig = {
				type: placeholderAnimation.type || 'wave',
				speed: placeholderAnimation.speed || 3,
				intensity: placeholderAnimation.intensity || 0.3,
				phaseShift: placeholderAnimation.phaseShift !== false
			};

			// Register with animation scheduler
			animationScheduler.register(componentId, (time) => {
				if (!visible && placeholder && shouldAnimate(componentId)) {
					animatedPlaceholder = placeholderAnimator!.calculate(
						placeholder,
						time,
						animConfig
					);
				}
			});

			// Setup intersection observer for performance
			if (placeholderElement && 'IntersectionObserver' in window) {
				const observer = new IntersectionObserver((entries) => {
					entries.forEach(entry => {
						if (entry.isIntersecting) {
							if (!animationScheduler.isRegistered(componentId) && shouldAnimate(componentId)) {
								animationScheduler.register(componentId, (time) => {
									if (!visible && placeholder) {
										animatedPlaceholder = placeholderAnimator!.calculate(
											placeholder,
											time,
											animConfig
										);
									}
								});
							}
						} else {
							animationScheduler.unregister(componentId);
						}
					});
				});

				observer.observe(placeholderElement);

				return () => observer.disconnect();
			}
		}
	});

	// Track previous value to prevent unnecessary re-tokenization
	let previousValue = '';
	let previousMapcrsEnabled = mapcrsEnabled;
	
	// Tokenize value when it changes or when MAPCRS is toggled
	$effect(() => {
		// Only re-tokenize if value or mapcrs setting actually changed
		if (value !== previousValue || mapcrsEnabled !== previousMapcrsEnabled) {
			previousValue = value;
			previousMapcrsEnabled = mapcrsEnabled;
			
			if (mapcrsEnabled && value) {
				tokenMap.clear();
				const newTokens = tokenizeProtectedText(value);

				// Assign IDs and store values securely
				newTokens.forEach(token => {
					if (token.type === 'word') {
						token.id = crypto.randomUUID();
						tokenMap.set(token.id, token.value);
					}
				});
				
				// Update tokens after all processing is done
				tokens = newTokens;
			} else {
				tokens = [];
				tokenMap.clear();
			}
		}
	});

	function handleMouseEnter(tokenId: string, event: MouseEvent) {
		// Clear any existing timers
		if (hoverTimer) clearTimeout(hoverTimer);
		if (revealTimer) clearTimeout(revealTimer);

		// Track motion if detector exists
		if (detector) {
			detector.trackMouseEnter(tokenId, { x: event.clientX, y: event.clientY });

			// Analyze pattern and update state
			const result = detector.analyzePattern();
			detectionState = result.state;
			currentCooldown = baseCooldown * result.cooldownMultiplier;

			// If locked, prevent all reveals
			if (result.isLocked) {
				cooldownActive = true;
				return;
			}
		}

		// If cooldown is active, don't allow new reveals
		if (cooldownActive) {
			return;
		}

		// If a word is currently revealed, hide it immediately and enforce cooldown
		if (revealedTokenId && revealedTokenId !== tokenId) {
			revealedTokenId = null;
			cooldownActive = true;

			// Calculate remaining cooldown time with multiplier
			const timeSinceLastReveal = Date.now() - lastRevealTime;
			const remainingCooldown = Math.max(currentCooldown - timeSinceLastReveal, 100);

			// Set cooldown timer
			setTimeout(() => {
				cooldownActive = false;
			}, remainingCooldown);

			// Don't process this hover - user must hover again after cooldown
			return;
		}

		// Add delay before revealing to prevent accidental reveals
		hoverTimer = window.setTimeout(() => {
			// Double-check cooldown hasn't been activated while waiting
			if (!cooldownActive && detectionState !== 'locked') {
				revealedTokenId = tokenId;
				lastRevealTime = Date.now();
			}
		}, currentCooldown);
	}

	function handleMouseLeave(event: MouseEvent) {
		// Clear hover timer if still waiting
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}

		// Track motion if detector exists
		if (detector && revealedTokenId) {
			detector.trackMouseLeave(revealedTokenId, { x: event.clientX, y: event.clientY });
		}

		// Don't set auto-hide timer - word should hide immediately when hovering another
		// This prevents multiple words being visible at once
	}

	function handleMouseMove(event: MouseEvent) {
		// Track mouse movements for entropy detection
		if (detector && revealedTokenId) {
			detector.trackMouseMove({ x: event.clientX, y: event.clientY });
		}
	}

	onDestroy(() => {
		tokenMap.clear();
		if (revealTimer) clearTimeout(revealTimer);
		if (hoverTimer) clearTimeout(hoverTimer);
		if (detector) detector.reset();

		// Cleanup animation
		animationScheduler.unregister(componentId);
		animationControlStore.enableComponent(componentId); // Re-enable in case it was disabled
	});
</script>

<span class="protected-value" class:detection-suspicious={detectionState === 'suspicious'} class:detection-locked={detectionState === 'locked'}>
	{#if detectionState === 'locked' && mapcrsEnabled}
		<span class="lock-indicator" title="Suspicious activity detected - reveal disabled">🔒</span>
	{/if}
	{#if visible}
		{value}
	{:else if mapcrsEnabled && tokens.length > 0}
		{#each tokens as token}
			{#if token.type === 'word' && token.id}
				<span
					class="word-token"
					class:cooldown={cooldownActive}
					onmouseenter={(e) => handleMouseEnter(token.id!, e)}
					onmouseleave={handleMouseLeave}
					onmousemove={handleMouseMove}
					role="button"
					tabindex="0"
				>
					{#if revealedTokenId === token.id}
						<span class="revealed-word">{tokenMap.get(token.id)}</span>
						<span class="redacted-word invisible">{token.redacted}</span>
					{:else}
						<span class="redacted-word">{token.redacted}</span>
					{/if}
				</span>
			{:else}
				{token.value}
			{/if}
		{/each}
	{:else if placeholderAnimation?.enabled && animatedPlaceholder.length > 0 && shouldAnimate(componentId)}
		<span class="animated-placeholder" bind:this={placeholderElement}>
			{#each animatedPlaceholder as char}
				<span class="animated-char" style={char.style}>
					{char.char}
				</span>
			{/each}
		</span>
	{:else}
		<span bind:this={placeholderElement}>{placeholder}</span>
	{/if}
</span>

<style>
	.protected-value {
		display: inline;
	}

	.word-token {
		position: relative;
		display: inline-block;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.word-token:hover {
		background-color: rgba(0, 0, 0, 0.05);
		border-radius: 3px;
	}

	.word-token.cooldown {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.word-token.cooldown:hover {
		background-color: transparent;
	}

	:global(.dark) .word-token:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .word-token.cooldown:hover {
		background-color: transparent;
	}

	.redacted-word {
		display: inline-block;
	}

	.redacted-word.invisible {
		visibility: hidden;
	}

	.revealed-word {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		bottom: 100%;
		margin-bottom: 8px;
		background-color: var(--color-surface-200);
		color: var(--color-text-900);
		padding: 6px 10px;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		font-size: 1.1em;
		font-weight: 500;
		white-space: nowrap;
		z-index: 1000;
		pointer-events: none;
		animation: revealFadeIn 200ms ease-out;
	}

	:global(.dark) .revealed-word {
		background-color: var(--color-surface-700);
		color: var(--color-text-100);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.revealed-word::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 6px 6px 0 6px;
		border-color: var(--color-surface-200) transparent transparent transparent;
	}

	:global(.dark) .revealed-word::after {
		border-color: var(--color-surface-700) transparent transparent transparent;
	}

	@keyframes revealFadeIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	/* Accessibility */
	.word-token:focus {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
		border-radius: 3px;
	}

	.word-token:focus:not(:focus-visible) {
		outline: none;
	}

	/* Detection state indicators */
	.protected-value.detection-suspicious {
		position: relative;
		padding: 2px 4px;
		background-color: rgba(255, 193, 7, 0.1);
		border-radius: 4px;
	}

	.protected-value.detection-locked {
		position: relative;
		padding: 2px 4px;
		background-color: rgba(244, 67, 54, 0.1);
		border-radius: 4px;
	}

	.lock-indicator {
		display: inline-block;
		margin-right: 4px;
		font-size: 0.9em;
		opacity: 0.8;
		cursor: help;
	}

	/* Adjust word token opacity based on detection state */
	.detection-suspicious .word-token {
		opacity: 0.8;
	}

	.detection-locked .word-token {
		cursor: not-allowed !important;
		opacity: 0.5;
	}

	.detection-locked .word-token:hover {
		background-color: transparent !important;
	}

	:global(.dark) .protected-value.detection-suspicious {
		background-color: rgba(255, 193, 7, 0.2);
	}

	:global(.dark) .protected-value.detection-locked {
		background-color: rgba(244, 67, 54, 0.2);
	}

	/* Animated placeholder styles */
	.animated-placeholder {
		display: inline-block;
		letter-spacing: 0.05em;
		user-select: none;
		-webkit-user-select: none;
		pointer-events: none;
	}

	.animated-char {
		display: inline-block;
		transform-origin: center center;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		will-change: transform, opacity;
	}

	/* Disable animations if user prefers reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.animated-char {
			animation: none !important;
			transform: none !important;
		}
	}

	/* Add anti-aliasing for smoother animations */
	.animated-placeholder {
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: optimizeLegibility;
	}
</style>
