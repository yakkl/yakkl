<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';
	import Modal from './Modal.svelte';
	import { VERSION, type TokenData } from '$lib/common';
	import { log } from '$lib/managers/Logger';
	import Tooltip from './Tooltip.svelte';

	interface Props {
		show?: boolean;
		token?: TokenData | null;
		className?: string;
		onSubmit?: (token: TokenData) => void;
	}

	let { show = $bindable(false), token = null, className = 'z-[999]', onSubmit }: Props = $props();

	const { form, errors, handleChange, handleSubmit, updateInitialValues } = createForm({
		initialValues: {
			address: '',
			name: '',
			alias: '',
			symbol: '',
			decimals: 18,
			chainId: 1,
			sidepanel: true,
			evmCompatible: true,
			logoURI: '',
			url: '',
			customDefault: 'custom',
			isNative: false,
			isStablecoin: false,
			description: '',
			// Enhanced fields for multi-blockchain support
			blockchain: 'ethereum',
			network: 'mainnet',
			standard: 'ERC20',
			isWatchOnly: false,
			portfolioIncluded: true,
			coingeckoId: '',
			website: '',
			exchange: '',
			exchangeSymbol: '',
			isExchangeBalance: false
		},
		validationSchema: yup.object().shape({
			address: yup.string().required('Please enter a token address'),
			name: yup.string().required('Please enter a token name'),
			alias: yup.string().optional(),
			symbol: yup.string().required('Please enter a token symbol'),
			decimals: yup.number().required('Please enter the token decimals'),
			chainId: yup.number().when('blockchain', {
				is: (val: string) => ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'].includes(val),
				then: (schema) => schema.required('Please enter the chain ID'),
				otherwise: (schema) => schema.optional()
			}),
			blockchain: yup.string().required('Please select a blockchain'),
			network: yup.string().required('Please select a network'),
			standard: yup.string().required('Please select a token standard'),
			sidepanel: yup.boolean().optional().default(true),
			evmCompatible: yup.boolean().optional().default(true),
			logoURI: yup.string().url('Must be a valid URL').optional().nullable(),
			url: yup.string().url('Must be a valid URL').optional().nullable(),
			website: yup.string().url('Must be a valid URL').optional().nullable(),
			coingeckoId: yup.string().optional(),
			exchange: yup.string().optional(),
			exchangeSymbol: yup.string().optional(),
			isWatchOnly: yup.boolean().optional().default(false),
			portfolioIncluded: yup.boolean().optional().default(true),
			isExchangeBalance: yup.boolean().optional().default(false)
		}),
		onSubmit: (values) => {
			try {
				const updatedToken: TokenData = {
					...values,
					sidepanel: values.sidepanel ?? true,
					evmCompatible: values.evmCompatible ?? (values.blockchain === 'ethereum' || values.standard === 'ERC20'),
					customDefault: 'custom', // Ensure customDefault is always 'custom'
					symbol: values.symbol.toUpperCase(), // Ensure symbol is always uppercase
					balance: token?.balance ?? 0n,
					quantity: token?.quantity ?? 0,
					price: {
						price: 0,
						isNative: false,
						provider: '',
						lastUpdated: new Date(),
						chainId: token?.chainId ?? values.chainId ?? 1,
						currency: '',
						status: token?.price?.status ?? 0,
						message: token?.price?.message ?? ''
					},
					change: token?.change ?? [],
					value: token?.value ?? 0,
					tags: token?.tags ?? [],
					version: token?.version ?? VERSION,
					// Enhanced multi-blockchain fields
					blockchain: values.blockchain,
					network: values.network,
					standard: values.standard,
					isWatchOnly: values.isWatchOnly,
					portfolioIncluded: values.portfolioIncluded,
					watchedAt: token?.watchedAt ?? new Date().toISOString(),
					exchangeInfo: values.isExchangeBalance ? {
						exchange: values.exchange,
						exchangeSymbol: values.exchangeSymbol || values.symbol,
						isExchangeBalance: values.isExchangeBalance
					} : undefined,
					metadata: {
						coingeckoId: values.coingeckoId || undefined,
						website: values.website || undefined,
						lastUpdated: new Date().toISOString()
					}
				};

				onSubmit(updatedToken);
				resetForm();
				show = false;
			} catch (error) {
				log.error('TokenForm: Error:', false, error);
			}
		}
	});

	function resetForm() {
		updateInitialValues({
			address: '',
			name: '',
			alias: '',
			symbol: '',
			decimals: 18,
			chainId: 1,
			sidepanel: true,
			evmCompatible: true,
			logoURI: '',
			url: '',
			customDefault: 'custom',
			isNative: false,
			isStablecoin: false,
			description: '',
			// Enhanced fields for multi-blockchain support
			blockchain: 'ethereum',
			network: 'mainnet',
			standard: 'ERC20',
			isWatchOnly: false,
			portfolioIncluded: true,
			coingeckoId: '',
			website: '',
			exchange: '',
			exchangeSymbol: '',
			isExchangeBalance: false
		});
	}

	$effect(() => {
		if (token) {
			updateInitialValues({
				address: token.address,
				name: token.name,
				alias: token.alias ?? '',
				symbol: token.symbol,
				decimals: token.decimals,
				chainId: token.chainId ?? 1,
				sidepanel: token.sidepanel ?? true,
				evmCompatible: token.evmCompatible ?? true,
				logoURI: token.logoURI ?? '',
				url: token.url ?? '',
				customDefault: 'custom',
				isNative: token.isNative ?? false,
				isStablecoin: token.isStablecoin ?? false,
				description: token.description ?? '',
				// Enhanced fields
				blockchain: token.blockchain ?? 'ethereum',
				network: token.network ?? 'mainnet',
				standard: token.standard ?? 'ERC20',
				isWatchOnly: token.isWatchOnly ?? false,
				portfolioIncluded: token.portfolioIncluded ?? true,
				coingeckoId: token.metadata?.coingeckoId ?? '',
				website: token.metadata?.website ?? '',
				exchange: token.exchangeInfo?.exchange ?? '',
				exchangeSymbol: token.exchangeInfo?.exchangeSymbol ?? '',
				isExchangeBalance: token.exchangeInfo?.isExchangeBalance ?? false
			});
		}
	});
</script>

<Modal bind:show title={token ? 'Edit Token' : 'Add Token'}>
	<form onsubmit={handleSubmit} class="space-y-4 p-6">
		<div>
			<div class="flex items-center gap-2">
				<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>Name <span class="text-red-500">*</span></label
				>
				<Tooltip content="The full name of the token (e.g., Ethereum, Bitcoin)">
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="text"
				id="name"
				required
				placeholder="Enter the token name"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
				bind:value={$form.name}
				onchange={handleChange}
			/>
			{#if $errors.name}
				<p class="mt-2 text-sm text-red-600">{$errors.name}</p>
			{/if}
		</div>

		<div>
			<div class="flex items-center gap-2">
				<label for="address" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>Address <span class="text-red-500">*</span></label
				>
				<Tooltip content="The contract address of the token on the blockchain">
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="text"
				id="address"
				required
				placeholder="Enter the token contract address"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focusring:indigo-500 sm:text-sm text-gray-800"
				bind:value={$form.address}
				onchange={handleChange}
			/>
			{#if $errors.address}
				<p class="mt-2 text-sm text-red-600">{$errors.address}</p>
			{/if}
		</div>

		<div>
			<div class="flex items-center gap-2">
				<label for="alias" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>Alias</label
				>
				<Tooltip content="An optional alias for the token (e.g., ENS name)">
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="text"
				id="alias"
				placeholder="Enter an alias like an ENS (optional)"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
				bind:value={$form.alias}
				onchange={handleChange}
			/>
			{#if $errors.alias}
				<p class="mt-2 text-sm text-red-600">{$errors.alias}</p>
			{/if}
		</div>

		<div>
			<div class="flex items-center gap-2">
				<label for="symbol" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>Symbol <span class="text-red-500">*</span></label
				>
				<Tooltip content="The token's ticker symbol (e.g., ETH, BTC)">
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="text"
				id="symbol"
				required
				placeholder="Enter the token symbol"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focusring:indigo-500 sm:text-sm text-gray-800"
				bind:value={$form.symbol}
				onchange={handleChange}
			/>
			{#if $errors.symbol}
				<p class="mt-2 text-sm text-red-600">{$errors.symbol}</p>
			{/if}
		</div>

		<div>
			<div class="flex items-center gap-2">
				<label for="decimals" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>Decimals <span class="text-red-500">*</span></label
				>
				<Tooltip
					content="The number of decimal places the token uses (e.g., 18 for most ERC20 tokens)"
				>
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="number"
				id="decimals"
				step="1"
				required
				placeholder="Enter the decimals token uses"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focusring:indigo-500 sm:text-sm text-gray-800"
				bind:value={$form.decimals}
				onchange={handleChange}
			/>
			{#if $errors.decimals}
				<p class="mt-2 text-sm text-red-600">{$errors.decimals}</p>
			{/if}
		</div>

		<!-- Blockchain and Network Selection -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<div class="flex items-center gap-2">
					<label for="blockchain" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
						>Blockchain <span class="text-red-500">*</span></label
					>
					<Tooltip content="The blockchain network this token exists on">
						<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>
				<select
					id="blockchain"
					bind:value={$form.blockchain}
					onchange={handleChange}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
				>
					<option value="ethereum">Ethereum</option>
					<option value="solana">Solana</option>
					<option value="bitcoin">Bitcoin</option>
					<option value="cosmos">Cosmos</option>
					<option value="polygon">Polygon</option>
					<option value="arbitrum">Arbitrum</option>
					<option value="optimism">Optimism</option>
					<option value="base">Base</option>
					<option value="avalanche">Avalanche</option>
					<option value="bsc">Binance Smart Chain</option>
				</select>
				{#if $errors.blockchain}
					<p class="mt-2 text-sm text-red-600">{$errors.blockchain}</p>
				{/if}
			</div>

			<div>
				<div class="flex items-center gap-2">
					<label for="network" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
						>Network <span class="text-red-500">*</span></label
					>
					<Tooltip content="The specific network (mainnet, testnet, etc.)">
						<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>
				<select
					id="network"
					bind:value={$form.network}
					onchange={handleChange}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
				>
					{#if $form.blockchain === 'ethereum'}
						<option value="mainnet">Mainnet</option>
						<option value="sepolia">Sepolia Testnet</option>
						<option value="goerli">Goerli Testnet</option>
					{:else if $form.blockchain === 'solana'}
						<option value="mainnet-beta">Mainnet Beta</option>
						<option value="testnet">Testnet</option>
						<option value="devnet">Devnet</option>
					{:else if $form.blockchain === 'bitcoin'}
						<option value="mainnet">Mainnet</option>
						<option value="testnet">Testnet</option>
					{:else}
						<option value="mainnet">Mainnet</option>
						<option value="testnet">Testnet</option>
					{/if}
				</select>
				{#if $errors.network}
					<p class="mt-2 text-sm text-red-600">{$errors.network}</p>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<div class="flex items-center gap-2">
					<label for="standard" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
						>Token Standard <span class="text-red-500">*</span></label
					>
					<Tooltip content="The token standard (ERC20, SPL, etc.)">
						<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>
				<select
					id="standard"
					bind:value={$form.standard}
					onchange={handleChange}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
				>
					{#if $form.blockchain === 'ethereum' || $form.blockchain === 'polygon' || $form.blockchain === 'arbitrum' || $form.blockchain === 'optimism' || $form.blockchain === 'base'}
						<option value="ERC20">ERC20</option>
						<option value="ERC721">ERC721 (NFT)</option>
						<option value="ERC1155">ERC1155</option>
					{:else if $form.blockchain === 'solana'}
						<option value="SPL">SPL Token</option>
						<option value="NFT">Solana NFT</option>
					{:else if $form.blockchain === 'bitcoin'}
						<option value="BRC20">BRC20</option>
						<option value="RUNES">Runes</option>
					{:else if $form.blockchain === 'cosmos'}
						<option value="CW20">CW20</option>
						<option value="IBC">IBC Token</option>
					{:else}
						<option value="NATIVE">Native Token</option>
						<option value="CUSTOM">Custom</option>
					{/if}
				</select>
				{#if $errors.standard}
					<p class="mt-2 text-sm text-red-600">{$errors.standard}</p>
				{/if}
			</div>

			{#if ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'].includes($form.blockchain)}
				<div>
					<div class="flex items-center gap-2">
						<label for="chainid" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
							>Chain ID <span class="text-red-500">*</span></label
						>
						<Tooltip content="The ID of the blockchain network (e.g., 1 for Ethereum Mainnet)">
							<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
						</Tooltip>
					</div>
					<input
						type="number"
						id="chainid"
						step="1"
						required
						placeholder="Enter the chain ID"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
						bind:value={$form.chainId}
						onchange={handleChange}
					/>
					{#if $errors.chainId}
						<p class="mt-2 text-sm text-red-600">{$errors.chainId}</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Watch and Portfolio Options -->
		<div class="space-y-4 p-4 bg-gray-50 rounded-lg">
			<h3 class="text-sm font-medium text-gray-900">Token Options</h3>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="flex items-center">
					<input
						type="checkbox"
						id="isWatchOnly"
						bind:checked={$form.isWatchOnly}
						onchange={handleChange}
						class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
					/>
					<label for="isWatchOnly" class="ml-2 block text-sm text-gray-900">
						Watch-only (track price but no transactions)
					</label>
					<Tooltip content="Enable this for tokens you want to track but can't transact with">
						<span class="ml-1 text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>

				<div class="flex items-center">
					<input
						type="checkbox"
						id="portfolioIncluded"
						bind:checked={$form.portfolioIncluded}
						onchange={handleChange}
						class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
					/>
					<label for="portfolioIncluded" class="ml-2 block text-sm text-gray-900">
						Include in portfolio total
					</label>
					<Tooltip content="Include this token's value in your total portfolio calculation">
						<span class="ml-1 text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>

				<div class="flex items-center">
					<input
						type="checkbox"
						id="sidepanel"
						bind:checked={$form.sidepanel}
						onchange={handleChange}
						class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
					/>
					<label for="sidepanel" class="ml-2 block text-sm text-gray-900">
						Show in sidepanel
					</label>
					<Tooltip content="Show this token in the sidepanel view">
						<span class="ml-1 text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>

				<div class="flex items-center">
					<input
						type="checkbox"
						id="isExchangeBalance"
						bind:checked={$form.isExchangeBalance}
						onchange={handleChange}
						class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
					/>
					<label for="isExchangeBalance" class="ml-2 block text-sm text-gray-900">
						Exchange balance
					</label>
					<Tooltip content="This represents a balance on a centralized exchange">
						<span class="ml-1 text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>
			</div>
		</div>

		<!-- Exchange Information (conditional) -->
		{#if $form.isExchangeBalance}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<div class="flex items-center gap-2">
						<label for="exchange" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
							Exchange
						</label>
						<Tooltip content="Which exchange this balance is on">
							<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
						</Tooltip>
					</div>
					<select
						id="exchange"
						bind:value={$form.exchange}
						onchange={handleChange}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
					>
						<option value="">Select Exchange</option>
						<option value="binance">Binance</option>
						<option value="coinbase">Coinbase</option>
						<option value="kraken">Kraken</option>
						<option value="okx">OKX</option>
						<option value="bybit">Bybit</option>
						<option value="kucoin">KuCoin</option>
						<option value="gemini">Gemini</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div>
					<div class="flex items-center gap-2">
						<label for="exchangeSymbol" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
							Exchange Symbol
						</label>
						<Tooltip content="Symbol used on the exchange (may differ from token symbol)">
							<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
						</Tooltip>
					</div>
					<input
						type="text"
						id="exchangeSymbol"
						placeholder="Exchange-specific symbol"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
						bind:value={$form.exchangeSymbol}
						onchange={handleChange}
					/>
				</div>
			</div>
		{/if}

		<!-- Additional Metadata -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<div class="flex items-center gap-2">
					<label for="coingeckoId" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						CoinGecko ID
					</label>
					<Tooltip content="CoinGecko API identifier for price tracking">
						<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>
				<input
					type="text"
					id="coingeckoId"
					placeholder="e.g., bitcoin, ethereum"
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
					bind:value={$form.coingeckoId}
					onchange={handleChange}
				/>
			</div>

			<div>
				<div class="flex items-center gap-2">
					<label for="website" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						Website
					</label>
					<Tooltip content="Official website URL">
						<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
					</Tooltip>
				</div>
				<input
					type="url"
					id="website"
					placeholder="https://example.com"
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
					bind:value={$form.website}
					onchange={handleChange}
				/>
				{#if $errors.website}
					<p class="mt-2 text-sm text-red-600">{$errors.website}</p>
				{/if}
			</div>
		</div>

		<div>
			<div class="flex items-center gap-2">
				<label
					for="evmCompatible"
					class="block text-sm font-medium text-gray-700 dark:text-gray-200">EVM compatible</label
				>
				<Tooltip content="Whether this token follows the Ethereum Virtual Machine standard">
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="checkbox"
				id="evmCompatible"
				bind:checked={$form.evmCompatible}
				onchange={handleChange}
			/>
			{#if $errors.evmCompatible}
				<p class="mt-2 text-sm text-red-600">{$errors.evmCompatible}</p>
			{/if}
		</div>

		<div>
			<div class="flex items-center gap-2">
				<label for="logoURI" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>Logo URI</label
				>
				<Tooltip content="URL to the token's logo image (should be a direct link to an image)">
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="text"
				id="logoURI"
				placeholder="Enter the URL (https://...) for the logo"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
				bind:value={$form.logoURI}
				onchange={handleChange}
			/>
			{#if $errors.logoURI}
				<p class="mt-2 text-sm text-red-600">{$errors.logoURI}</p>
			{/if}
		</div>

		<div>
			<div class="flex items-center gap-2">
				<label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-200"
					>URL</label
				>
				<Tooltip content="URL to the token's explorer or website (optional)">
					<span class="text-gray-400 hover:text-gray-600 cursor-help">ⓘ</span>
				</Tooltip>
			</div>
			<input
				type="text"
				id="url"
				placeholder="Optional:Enter the URL (https://...) for the token"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-800"
				bind:value={$form.url}
				onchange={handleChange}
			/>
			{#if $errors.url}
				<p class="mt-2 text-sm text-red-600">{$errors.url}</p>
			{/if}
		</div>

		<div class="pt-5">
			<div class="flex justify-end space-x-4">
				<button
					type="button"
					class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
					onclick={() => (show = false)}>Cancel</button
				>
				<button
					type="button"
					class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
					onclick={resetForm}>Reset</button
				>
				<button
					type="submit"
					class="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
					>Save</button
				>
			</div>
		</div>
	</form>
</Modal>
