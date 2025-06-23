<script lang="ts">
	import EIP6963Provider from '$lib/components/EIP6963Provider.svelte';
</script>

<div class="container">
	<h1>EIP-6963 Wallet Connection</h1>
	<p>Connect your wallet using the EIP-6963 standard</p>

	<EIP6963Provider />
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		color: #333;
		margin-bottom: 1rem;
	}

	p {
		color: #666;
		margin-bottom: 2rem;
	}
</style>
