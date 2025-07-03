<!-- File: src/lib/components/Sponsorship.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cn } from '$lib/utils';

	export interface Sponsor {
		id: string;
		name: string;
		url?: string;
		content: string | HTMLElement;
		weight: number;
		maxImpressions?: number;
		duration: number;
		startDate?: Date;
		endDate?: Date;
		targetAudience?: string[];
		category?: string;
		analytics?: {
			clicks: number;
			impressions: number;
			lastShown?: Date;
		};
	}

	interface Props {
		sponsors: Sponsor[];
		show?: boolean;
		autoRotate?: boolean;
		className?: string;
		onSponsorClick?: (sponsor: Sponsor) => void;
		onSponsorImpression?: (sponsor: Sponsor) => void;
		analyticsEnabled?: boolean;
		overrideHeight?: string;
	}

	let {
		sponsors = [],
		show = $bindable(true),
		autoRotate = true,
		className = '',
		onSponsorClick = () => {},
		onSponsorImpression = () => {},
		analyticsEnabled = true,
		overrideHeight = ''
	}: Props = $props();

	let currentIndex = $state(0);
	let isTransitioning = $state(false);
	let currentSponsor = $state<Sponsor | null>(null);
	let rotationInterval: number | null = null;
	let containerElement: HTMLElement;

	// Calculate weighted random selection
	function getNextSponsor(): Sponsor {
		const validSponsors = sponsors.filter((sponsor) => {
			const now = new Date();
			const hasValidDates =
				(!sponsor.startDate || now >= sponsor.startDate) &&
				(!sponsor.endDate || now <= sponsor.endDate);
			const hasValidImpressions =
				!sponsor.maxImpressions || (sponsor.analytics?.impressions || 0) < sponsor.maxImpressions;
			return hasValidDates && hasValidImpressions;
		});

		if (validSponsors.length === 0) return null;

		const totalWeight = validSponsors.reduce((sum, sponsor) => sum + sponsor.weight, 0);
		let random = Math.random() * totalWeight;

		for (const sponsor of validSponsors) {
			random -= sponsor.weight;
			if (random <= 0) return sponsor;
		}

		return validSponsors[0];
	}

	function rotateSponsor() {
		if (isTransitioning || sponsors.length <= 1) return;

		isTransitioning = true;
		const nextSponsor = getNextSponsor();

		if (nextSponsor) {
			setTimeout(() => {
				currentSponsor = nextSponsor;
				if (analyticsEnabled) {
					trackImpression(nextSponsor);
				}
				isTransitioning = false;
			}, 300);
		}
	}

	function trackImpression(sponsor: Sponsor) {
		if (!sponsor.analytics) {
			sponsor.analytics = { clicks: 0, impressions: 0 };
		}

		// Only count as impression if it's been at least 30 seconds since last shown
		const now = new Date();
		const lastShown = sponsor.analytics.lastShown;
		const timeSinceLastImpression = lastShown ? now.getTime() - lastShown.getTime() : Infinity;

		if (timeSinceLastImpression >= 30000) {
			// 30 seconds
			sponsor.analytics.impressions++;
			sponsor.analytics.lastShown = now;
			onSponsorImpression(sponsor);
		}
	}

	function handleClick() {
		if (currentSponsor?.url) {
			if (analyticsEnabled && currentSponsor.analytics) {
				currentSponsor.analytics.clicks++;
			}
			onSponsorClick(currentSponsor);
			window.open(currentSponsor.url, '_blank');
		}
	}

	function startRotation() {
		if (!autoRotate || !currentSponsor || sponsors.length <= 1) return;

		rotationInterval = window.setInterval(() => {
			rotateSponsor();
		}, currentSponsor.duration);
	}

	function stopRotation() {
		if (rotationInterval) {
			clearInterval(rotationInterval);
			rotationInterval = null;
		}
	}

	onMount(() => {
		currentSponsor = getNextSponsor();
		if (currentSponsor && analyticsEnabled) {
			trackImpression(currentSponsor);
		}
		startRotation();
	});

	onDestroy(() => {
		stopRotation();
	});

	// Watch for changes in the show prop
	$effect(() => {
		if (show) {
			startRotation();
		} else {
			stopRotation();
		}
	});

	// Watch for changes in sponsors array
	$effect(() => {
		if (sponsors.length > 0 && !currentSponsor) {
			currentSponsor = getNextSponsor();
			if (currentSponsor && analyticsEnabled) {
				trackImpression(currentSponsor);
			}
		}
	});
</script>

<div
	bind:this={containerElement}
	class={cn(
		'relative w-full overflow-hidden rounded-lg',
		'transition-all duration-300 ease-in-out',
		className
	)}
	style={overrideHeight ? `height: ${overrideHeight}` : ''}
>
	{#if show && currentSponsor}
		<div
			class="w-full h-full cursor-pointer"
			onclick={handleClick}
			onkeydown={(e) => e.key === 'Enter' && handleClick()}
			role="button"
			tabindex="0"
			transition:fade={{ duration: 300 }}
		>
			{@html currentSponsor.content}
		</div>
	{/if}
</div>

<!-- Example usage -->
<!--
<script>
  import SectionCard from '$lib/components/SectionCard.svelte';
  import Sponsorship from '$lib/components/Sponsorship.svelte';

  const sponsors = [
    {
      id: 'sponsor1',
      name: 'Example Sponsor',
      url: 'https://example.com',
      content: '<img src="sponsor1.png" alt="Sponsor 1" class="w-full h-auto" />',
      weight: 1,
      duration: 5000,
      category: 'premium'
    },
    // Add more sponsors...
  ];

  function handleSponsorClick(sponsor) {
    console.log('Sponsor clicked:', sponsor.name);
  }

  function handleSponsorImpression(sponsor) {
    console.log('Sponsor impression:', sponsor.name);
  }
</script>

<SectionCard title="Sponsors" icon={SponsorIcon}>
  <Sponsorship
    {sponsors}
    onSponsorClick={handleSponsorClick}
    onSponsorImpression={handleSponsorImpression}
    className="min-h-[200px]"
  />
</SectionCard> -->
