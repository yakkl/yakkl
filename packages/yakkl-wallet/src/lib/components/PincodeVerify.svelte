<script lang="ts">
	import { onMount } from 'svelte';
	import { yakklMiscStore } from '$lib/common/stores';
	import { getProfile } from '$lib/common/profile';
	import { decryptData, digestMessage, isEncryptedData, isProfileData } from '$lib/common';
	import type { EncryptedData, ProfileData, Profile } from '$lib/common';
	import Modal from '@yakkl/ui/src/components/Modal.svelte';
	import { log } from '$lib/managers/Logger';

	interface Props {
		show?: boolean;
		className?: string;
		onRejected?: (rejection: string) => void;
		onVerified?: (pincode: string) => void;
	}

	let {
		show = $bindable(false),
		className = 'z-[899]',
		onRejected = () => {},
		onVerified = () => {}
	}: Props = $props();

	let pincode = $state('');
	let eyeOpen = $state(false);
	let pincodeDigits = $state(['', '', '', '', '', '', '', '']);
	let inputRefs = $state<HTMLInputElement[]>([]);

	onMount(() => {
		pincode = '';
		pincodeDigits = ['', '', '', '', '', '', '', ''];
		show = false;
		// Focus first input when modal opens
		if (show && inputRefs[0]) {
			setTimeout(() => inputRefs[0]?.focus(), 100);
		}
	});

	// Watch for show changes to focus first input
	$effect(() => {
		if (show && inputRefs[0]) {
			setTimeout(() => inputRefs[0]?.focus(), 100);
		}
	});

	async function handleVerify() {
		try {
			// Combine all digits into pincode
			pincode = pincodeDigits.join('');

			if (pincode.length < 8) {
				alert('Please enter a valid pincode');
				return;
			}

			const profile: Profile | null = await getProfile();

			if (!profile) {
				show = false;
				onRejected('No profile found');
			}

			if (isEncryptedData(profile.data)) {
				await decryptData(profile.data as unknown as EncryptedData, $yakklMiscStore).then(
					(result) => {
						profile.data = result as ProfileData;
					}
				);
			}

			const digestedPincode = await digestMessage(pincode);
			if (
				isProfileData(profile.data) &&
				(profile.data as ProfileData)?.pincode === digestedPincode
			) {
				onVerified(digestedPincode); // Send the verified digested pincode and not the actual pincode
			} else {
				log.debug(
					'Invalid pincode(s):',
					false,
					(profile.data as ProfileData)?.pincode,
					digestedPincode
				);
				alert('Invalid pincode');
			}

			pincode = '';
			pincodeDigits = ['', '', '', '', '', '', '', ''];
			show = false;
		} catch (e) {
			log.error(e);
			onRejected('Pincode verification failed');
		}
		// finally {
		//   show = false;
		//   onRejected("Pincode verification failed");
		// }
	}

	function closeModal() {
		pincode = '';
		pincodeDigits = ['', '', '', '', '', '', '', ''];
		show = false;
		onRejected('Pincode verification failed');
	}

	function resetForm() {
		pincode = '';
		pincodeDigits = ['', '', '', '', '', '', '', ''];
		if (inputRefs[0]) {
			inputRefs[0].focus();
		}
	}

	function togglePinVisibility() {
		eyeOpen = !eyeOpen;
	}

	function handleInput(index: number, event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;

		// Only allow single digit
		if (value.length > 1) {
			input.value = value.slice(-1);
		}

		// Update the digit
		pincodeDigits[index] = input.value;

		// Auto-advance to next input
		if (input.value && index < 7) {
			inputRefs[index + 1]?.focus();
		}
	}

	function handleKeydown(index: number, event: KeyboardEvent) {
		// Handle backspace to go to previous input
		if (event.key === 'Backspace' && !pincodeDigits[index] && index > 0) {
			event.preventDefault();
			inputRefs[index - 1]?.focus();
		}

		// Handle arrow keys
		if (event.key === 'ArrowLeft' && index > 0) {
			event.preventDefault();
			inputRefs[index - 1]?.focus();
		}
		if (event.key === 'ArrowRight' && index < 7) {
			event.preventDefault();
			inputRefs[index + 1]?.focus();
		}

		// Handle Enter to submit
		if (event.key === 'Enter' && pincodeDigits.every(d => d)) {
			handleVerify();
		}
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const paste = event.clipboardData?.getData('text');
		if (paste && /^\d{8}$/.test(paste)) {
			pincodeDigits = paste.split('');
			// Focus last input
			inputRefs[7]?.focus();
		}
	}
</script>

<!-- <div class="relative {className}"> -->
<Modal bind:show title="Pincode Authorization" onClose={closeModal}>
	<div class="p-4 text-primary-light dark:text-primary-dark">
		<p class="mb-3 text-secondary-light dark:text-secondary-dark">
			Please verify your pincode to move forward. Thank you.
		</p>
		<div class="space-y-3">
			<!-- 8 digit input boxes -->
			<div class="flex justify-center gap-1.5">
				{#each pincodeDigits as digit, i}
					<input
						bind:this={inputRefs[i]}
						type={eyeOpen ? 'text' : 'password'}
						inputmode="numeric"
						maxlength="1"
						class="w-9 h-9 text-center text-base font-bold border-2 border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition-all"
						value={digit}
						oninput={(e) => handleInput(i, e)}
						onkeydown={(e) => handleKeydown(i, e)}
						onpaste={i === 0 ? handlePaste : undefined}
						autocomplete="off"
						aria-label={`Pin digit ${i + 1}`}
					/>
				{/each}
			</div>

			<!-- Eye toggle button -->
			<div class="flex justify-center">
				<button
					type="button"
					class="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
					onclick={togglePinVisibility}
				>
					{#if eyeOpen}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="w-5 h-5"
						>
							<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
							<path
								fill-rule="evenodd"
								d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
								clip-rule="evenodd"
							/>
						</svg>
						<span>Hide PIN</span>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="w-5 h-5"
						>
							<path
								d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z"
							/>
							<path
								d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z"
							/>
							<path
								d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z"
							/>
						</svg>
						<span>Show PIN</span>
					{/if}
				</button>
			</div>
		</div>
		<div class="mt-4 flex justify-end space-x-3">
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				onclick={closeModal}>Cancel/Reject</button
			>
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				onclick={resetForm}>Reset</button
			>
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				onclick={handleVerify}>Verify</button
			>
		</div>
	</div>
</Modal>
<!-- </div> -->
