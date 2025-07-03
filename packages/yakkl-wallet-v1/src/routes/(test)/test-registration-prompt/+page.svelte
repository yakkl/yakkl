<script lang="ts">
	import RegistrationPrompt from '$lib/components/RegistrationPrompt.svelte';
	import { checkRegistrationStatus, isUserLoggedIn } from '$lib/common/auth-utils';
	import { getSettings, getMiscStore } from '$lib/common/stores';

	let showRegistrationPrompt = $state(false);
	let registrationStatus = $state<any>(null);
	let settings = $state<any>(null);
	let isLoggedIn = $state(false);

	async function testRegistrationCheck() {
		registrationStatus = await checkRegistrationStatus();
		settings = await getSettings();
		isLoggedIn = isUserLoggedIn(getMiscStore());
	}

	function openWallet() {
		console.log('Opening wallet...');
		alert('openWallet function called');
	}
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Registration Prompt Test</h1>

	<div class="space-y-4">
		<button
			onclick={() => (showRegistrationPrompt = true)}
			class="px-4 py-2 bg-blue-600 text-white rounded"
		>
			Show Registration Prompt (Sidepanel)
		</button>

		<button onclick={testRegistrationCheck} class="px-4 py-2 bg-green-600 text-white rounded">
			Check Registration Status
		</button>

		{#if registrationStatus}
			<div class="p-4 bg-gray-100 rounded">
				<h2 class="font-bold">Registration Status:</h2>
				<pre>{JSON.stringify(registrationStatus, null, 2)}</pre>
			</div>
		{/if}

		{#if settings}
			<div class="p-4 bg-gray-100 rounded">
				<h2 class="font-bold">Settings:</h2>
				<p>init: {settings.init}</p>
				<p>termsAgreed: {settings.legal?.termsAgreed}</p>
				<p>isLoggedIn: {isLoggedIn}</p>
			</div>
		{/if}
	</div>

	<RegistrationPrompt
		bind:show={showRegistrationPrompt}
		context="sidepanel"
		{openWallet}
		onCancel={() => console.log('Cancelled')}
	/>
</div>
