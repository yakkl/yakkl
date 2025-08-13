<!-- Login.svelte -->
<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import { verify } from '$lib/common/security';
	import { getContextTypeStore, getMiscStore, getYakklSettings } from '$lib/common/stores';
	import { log } from '$lib/common/logger-wrapper';
	import { authStore } from '$lib/stores/auth-store';
	import AuthError from '$lib/components/AuthError.svelte';
	import AuthenticationLoader from '$lib/components/AuthenticationLoader.svelte';
	import { sessionManager } from '$lib/managers/SessionManager';
	import { jwtManager } from '$lib/utilities/jwt';

	// Props using runes syntax
	const props = $props<{
		onSuccess: (profile: any, digest: string, isMinimal: boolean, jwtToken?: string) => void;
		onError: (error: any) => void;
		onCancel: () => void;
		loginButtonText?: string;
		cancelButtonText?: string;
		minimumAuth?: boolean;
		requestId?: string;
		method?: string;
		useAuthStore?: boolean; // Optional flag to update auth store on login
		generateJWT?: boolean; // Optional flag to generate JWT token on login
		inputTextClass?: string; // Custom text color class for inputs
		inputBgClass?: string; // Custom background class for inputs
	}>();

	const loginButtonText = $derived(props.loginButtonText ?? 'Unlock');
	const cancelButtonText = $derived(props.cancelButtonText ?? 'Exit/Logout');

	// Fix: Ensure proper theme-aware colors for inputs
	const inputTextClass = $derived(props.inputTextClass ?? 'text-base-content');
	const inputBgClass = $derived(props.inputBgClass ?? '');

	// Local state
	const contextType = $state(getContextTypeStore());
	const isDappContext = $derived(
		contextType === 'popup-dapp' || (contextType?.includes?.('dapp') ?? false)
	);
	const minimumAuth = $derived(props.minimumAuth !== undefined ? props.minimumAuth : isDappContext);

	// Form state
	let showError = $state(false);
	let errorMessage = $state('');
	let pweyeOpen = $state(false);
	let isLoggingIn = $state(false);
	let retryCount = $state(0);
	const maxRetries = 3;

	// Form setup with svelte-forms-lib
	const { form, errors, handleSubmit } = createForm({
		initialValues: { username: '', password: '' },
		onSubmit: async (data) => {
			isLoggingIn = true;
			try {
				await verifyUser(data.username, data.password);
			} finally {
				// Clear form data for security regardless of outcome
				$form.username = '';
				$form.password = '';
				isLoggingIn = false;
			}
		}
	});

	async function verifyUser(username: string, password: string) {
		try {
			let jwtToken: string | undefined;

			// SIMPLIFIED FAST LOGIN - Skip auth store for speed
			// We'll handle session management after navigation
			if (false && props.useAuthStore) {
				// Skip auth store for now - it's too slow
				const profile = await authStore.login(username, password);
				const digest = getMiscStore();

				if (!digest) {
					throw 'Authentication succeeded but failed to retrieve security digest';
				}

				// Get JWT token from auth store if available
				jwtToken = authStore.getCurrentJWTToken() || undefined;

				props.onSuccess(profile, digest, minimumAuth, jwtToken);
				return;
			}

			// Original verification method
			// Format the username properly (removing .nfs.id if already present, then adding it)
			const normalizedUsername = username.toLowerCase().trim().replace('.nfs.id', '');
			const loginString = normalizedUsername + '.nfs.id' + password;

			// Call the existing verify function - this is your core authentication
			log.info('Login.svelte: Starting verification for user:', false, normalizedUsername);
			const profile = await verify(loginString);

			if (!profile) {
				log.warn('Login.svelte: Verification returned no profile');
				throw 'Invalid credentials or profile not found';
			}

			log.info('Login.svelte: Verification successful, profile received');

			// Get the digest that was set during verification
			// This is important as it's used for decryption throughout the app
			const digest = getMiscStore();

			if (!digest) {
				throw 'Authentication succeeded but failed to retrieve security digest';
			}

			log.info('Login.svelte: profile =', false, profile, digest);
			// Skip JWT generation for speed - do it after navigation
			// This was causing 15-second delays
			if (false && props.generateJWT) {
				// Skip for now - handle after navigation
			}

			// Call success handler with profile, digest, minimal flag, and optional JWT
			props.onSuccess(profile, digest, minimumAuth, jwtToken);
		} catch (e) {
			// Increment retry count
			retryCount++;

			// Format error for display with more specific messages
			if (typeof e === 'string') {
				errorMessage = e;
			} else if (e instanceof Error) {
				errorMessage = e.message;
			} else {
				errorMessage = 'Authentication failed';
			}

			// Add retry guidance if max retries not reached
			if (retryCount < maxRetries) {
				errorMessage += ` (Attempt ${retryCount}/${maxRetries})`;
			} else {
				errorMessage += ' - Maximum retry attempts reached.';
			}

			showError = true;
			log.error('Login verification failed', false, { error: e, retryCount, maxRetries });
			props.onError(e);
		}
	}

	function togglePasswordVisibility() {
		if (!document) return;

		const pwField = document.getElementById('password') as HTMLInputElement;
		const pwEyeOpen = document.getElementById('pweye-open');
		const pwEyeClosed = document.getElementById('pweye-closed');

		if (!pwField || !pwEyeOpen || !pwEyeClosed) return;

		if (pwField.type === 'password') {
			pwField.type = 'text';
			pwEyeOpen.removeAttribute('hidden');
			pwEyeClosed.setAttribute('hidden', 'hidden');
			pweyeOpen = true;
		} else {
			pwField.type = 'password';
			pwEyeOpen.setAttribute('hidden', 'hidden');
			pwEyeClosed.removeAttribute('hidden');
			pweyeOpen = false;
		}
	}

	// Retry function
	async function handleRetry() {
		if (retryCount < maxRetries) {
			showError = false;
			errorMessage = '';
			// Re-enable form and try again with current form values
			await verifyUser($form.username, $form.password);
		}
	}

	// Dismiss error
	function handleDismiss() {
		showError = false;
		errorMessage = '';
		retryCount = 0; // Reset retry count on manual dismiss
	}

	// Initialize eye icons on component mount
	$effect(() => {
		if (!document) return;
		const pwEyeOpen = document.getElementById('pweye-open');
		const pwEyeClosed = document.getElementById('pweye-closed');

		if (pwEyeOpen && pwEyeClosed) {
			pwEyeOpen.setAttribute('tabindex', '-1');
			pwEyeClosed.setAttribute('tabindex', '-1');
			pwEyeOpen.setAttribute('hidden', 'hidden');
		}
	});
</script>

<div class="login-container">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit(e);
		}}
	>
		<div class="mt-5 flex flex-row justify-center">
			<div class="form-control w-[22rem]">
				<div class="join">
					<input
						id="username"
						type="text"
						class="input input-bordered input-primary w-full join-item {inputTextClass} {inputBgClass}"
						placeholder="Username"
						autocomplete="off"
						bind:value={$form.username}
						required
					/>
					<span class="label-text bg-slate-900 join-item w-[60px]">
						<div class="mt-[.9rem]">.nfs.id</div>
					</span>
				</div>
			</div>
		</div>

		<div class="mt-5 flex flex-row justify-center">
			<div class="form-control w-[22rem]">
				<input
					id="password"
					type="password"
					class="input input-bordered input-primary w-full mt-2 {inputTextClass} {inputBgClass}"
					placeholder="Password"
					autocomplete="off"
					bind:value={$form.password}
					required
				/>

				<!-- Password visibility toggle icons -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<svg
					id="pweye-closed"
					onclick={togglePasswordVisibility}
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-6 h-6 ml-1 fill-gray-200 absolute right-12 z-10 mt-5 cursor-pointer"
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

				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<svg
					id="pweye-open"
					onclick={togglePasswordVisibility}
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-6 h-6 ml-1 fill-gray-200 absolute right-12 z-10 mt-5 cursor-pointer"
				>
					<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
					<path
						fill-rule="evenodd"
						d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
		</div>

		<div class="inline-block text-center">
			<button
				type="submit"
				class="bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-full mt-3 w-64"
				disabled={isLoggingIn}
			>
				<div class="inline-flex items-center align-middle">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 mr-2 ml-2"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
						/>
					</svg>
					<span>{isLoggingIn ? 'Unlocking...' : loginButtonText}</span>
				</div>
			</button>

			<button
				type="button"
				onclick={props.onCancel}
				class="bg-slate-400 hover:bg-slate-500 w-64 rounded-full py-2 px-4 mt-3 font-bold text-white"
			>
				<div class="inline-flex items-center align-middle">
					<svg
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						stroke="currentColor"
						class="w-6 h-6 mx-2"
					>
						<path
							fill-rule="evenodd"
							d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
							clip-rule="evenodd"
						/>
						<path
							fill-rule="evenodd"
							d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>{cancelButtonText}</span>
				</div>
			</button>
		</div>
	</form>

	<!-- Loading state -->
	{#if isLoggingIn}
		<AuthenticationLoader message="Authenticating..." />
	{/if}

	<!-- Error handling with retry -->
	<AuthError
		error={showError ? errorMessage : null}
		onRetry={retryCount < maxRetries && !isLoggingIn ? handleRetry : undefined}
		onDismiss={!isLoggingIn ? handleDismiss : undefined}
	/>
</div>
