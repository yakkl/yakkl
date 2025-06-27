<script lang="ts">
	import Back from '$lib/components/Back.svelte';
	import Pincode from '$lib/components/Pincode.svelte';
	import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
	import Welcome from '$lib/components/Welcome.svelte';
	import ButtonGridItem from '$lib/components/ButtonGridItem.svelte';
	import ButtonGrid from '$lib/components/ButtonGrid.svelte';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';

	import EmergencyKitModal from '$lib/components/EmergencyKitModal.svelte';
	import { onMount } from 'svelte';
	import { getSettings } from '$lib/common/stores';
	import { shouldShowProFeatures } from '$lib/common/token-analytics';
	import { PlanType } from '$lib/common/types';
	import type { Settings } from '$lib/common/interfaces';

	let error = $state(false);
	let errorValue: any = $state();
	// let showComingSoon = $state(false);
	let showPin = $state(false);
	let showEmergencyKit = $state(false);
	let settings: Settings | null = $state(null);
	let isProUser = $state(false);

	onMount(async () => {
		settings = await getSettings();
		isProUser = shouldShowProFeatures(settings?.plan?.type || PlanType.BASIC_MEMBER);
	});

	// function handleComingSoon() {
	//   showComingSoon = true;
	// }

	function handleEmergencyKit(e: any) {
		if (!isProUser) return;
		showEmergencyKit = true;
	}
</script>

<Back defaultClass="left-3 top-[.8rem] absolute" href="" />
<Pincode bind:show={showPin} />
<ErrorNoAction bind:show={error} value={errorValue} />
<!-- <ComingSoon bind:show={showComingSoon} /> -->
<EmergencyKitModal bind:show={showEmergencyKit} mode="export" />

<!-- Top band on page using the bg of wherever this is - could be component but not sure we will keep it -->
<div
	class="bg-secondary absolute top-[0.1rem] left-[.1rem] rounded-tl-xl rounded-tr-xl w-[99%] h-2"
></div>

<Welcome title1="" title2="Security" title3="" value1="" value2="" />

<ButtonGrid>
	<ButtonGridItem
		handle={() => {
			showPin = true;
		}}
		title="Pincode"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="w-10 h-10 m-0"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
			/>
		</svg>
	</ButtonGridItem>

	<!-- <ButtonGridItem handle={handleComingSoon} title="Password">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 m-0">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
    </svg>
  </ButtonGridItem> -->
	<!-- Emergency Kit Export -->
	{#if isProUser}
		<ButtonGridItem handle={handleEmergencyKit} title="Emergency Kit Export">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="currentColor"
				viewBox="0 0 24 24"
				class="w-10 h-10 m-0"
			>
				<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
			</svg>
		</ButtonGridItem>
	{:else}
		<SimpleTooltip content="Upgrade to Pro for full Emergency Kit features">
			<ButtonGridItem handle={() => {}} title="Emergency Kit Export" disabled={true}>
				<div class="relative">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						viewBox="0 0 24 24"
						class="w-10 h-10 m-0 text-gray-400"
					>
						<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
					</svg>
					<div class="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center">
						<svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
					</div>
				</div>
			</ButtonGridItem>
		</SimpleTooltip>
	{/if}
</ButtonGrid>
