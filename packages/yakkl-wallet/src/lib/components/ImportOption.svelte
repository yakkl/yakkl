<!-- ImportOption.svelte -->
<script lang="ts">
	import Modal from './Modal.svelte';
	import ImportPrivateKey from './ImportPrivateKey.svelte';
	import ImportPhrase from './ImportPhrase.svelte';
	import KeyIcon from '$lib/components/icons/KeyIcon.svelte';
	import LockIcon from '$lib/components/icons/LockIcon.svelte';

	interface Props {
		show?: boolean;
		className?: string;
		onComplete?: () => void;
		onCancel?: () => void;
	}

	let {
		show = $bindable(false),
		className = '',
		onComplete = () => {
			show = false;
		},
		onCancel = () => {
			show = false;
		}
	}: Props = $props();

	let showPrivateKeyImport = $state(false);
	let showPhraseImport = $state(false);

	function handlePrivateKeyImport() {
		show = false;
		showPrivateKeyImport = true;
	}

	function handlePhraseImport() {
		show = false;
		showPhraseImport = true;
	}

	function handleImportComplete() {
		showPrivateKeyImport = false;
		showPhraseImport = false;
		onComplete();
	}

	function handleImportCancel() {
		showPrivateKeyImport = false;
		showPhraseImport = false;
		show = true;
	}
</script>

<!-- Import option selection modal -->
<Modal bind:show title="Import Account" onClose={onCancel} {className}>
	{#snippet children()}
		<div class="space-y-4 p-4">
			<p class="text-sm text-secondary-light dark:text-secondary-dark">
				Choose how you'd like to import your account:
			</p>

			<button
				class="w-full p-4 border border-neutral-light dark:border-neutral-dark rounded-lg
				       hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark
				       transition-colors flex items-center gap-4 text-left"
				onclick={handlePhraseImport}
			>
				<div class="p-3 bg-accent-primary/10 rounded-lg">
					<LockIcon className="w-6 h-6 text-accent-primary" />
				</div>
				<div class="flex-1">
					<h3 class="font-medium text-primary-light dark:text-primary-dark">
						Secret Recovery Phrase
					</h3>
					<p class="text-sm text-secondary-light dark:text-secondary-dark mt-1">
						Import using your 12 or 24 word recovery phrase
					</p>
				</div>
			</button>

			<button
				class="w-full p-4 border border-neutral-light dark:border-neutral-dark rounded-lg
				       hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark
				       transition-colors flex items-center gap-4 text-left"
				onclick={handlePrivateKeyImport}
			>
				<div class="p-3 bg-accent-primary/10 rounded-lg">
					<KeyIcon className="w-6 h-6 text-accent-primary" />
				</div>
				<div class="flex-1">
					<h3 class="font-medium text-primary-light dark:text-primary-dark">
						Private Key
					</h3>
					<p class="text-sm text-secondary-light dark:text-secondary-dark mt-1">
						Import a single account using its private key
					</p>
				</div>
			</button>

			<div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mt-4">
				<p class="text-xs text-amber-700 dark:text-amber-300">
					<strong>Note:</strong> Imported accounts won't be recovered automatically when you restore 
					your wallet using your secret recovery phrase. You'll need to import them again.
				</p>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-end">
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium border border-neutral-light dark:border-neutral-dark 
				       rounded-lg hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark
				       text-primary-light dark:text-primary-dark transition-colors"
				onclick={onCancel}
			>
				Cancel
			</button>
		</div>
	{/snippet}
</Modal>

<!-- Import components -->
{#if showPrivateKeyImport}
	<ImportPrivateKey 
		bind:show={showPrivateKeyImport} 
		onComplete={handleImportComplete}
		onCancel={handleImportCancel}
	/>
{/if}

{#if showPhraseImport}
	<ImportPhrase 
		bind:show={showPhraseImport} 
		onComplete={handleImportComplete}
		onCancel={handleImportCancel}
	/>
{/if}