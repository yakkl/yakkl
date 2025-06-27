<!-- Upgrade.svelte -->
<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';
	import Modal from './Modal.svelte';
	import Login from './Login.svelte';
	import RegistrationPrompt from './RegistrationPrompt.svelte';
	import { getProfile, getSettings, yakklMiscStore } from '$lib/common/stores';
	import { log } from '$lib/managers/Logger';
	import { dateString } from '$lib/common/datetime';
	import ErrorNoAction from './ErrorNoAction.svelte';
	import Confirmation from './Confirmation.svelte';
	import { safeLogout } from '$lib/common/safeNavigate';
	import Notification from './Notification.svelte';
	import { UpgradeManager, type UpgradeResponseMessage } from '$lib/managers/UpgradeManager';
	import { canUpgrade } from '$lib/common/utils';
	import type { ProfileData } from '$lib/common/interfaces';
	import { decryptData } from '$lib/common/encryption';
	import { isEncryptedData } from '$lib/common';
	import { getAvailableMemberUpgradePlanLevel } from '$lib/common/member_pricing';
	import {
		checkRegistrationStatus,
		isUserLoggedIn,
		type RegistrationStatus
	} from '$lib/common/auth-utils';
	import { authStore, isAuthenticated, isRegistered } from '$lib/stores/auth-store';
	import AuthError from './AuthError.svelte';
	import AuthLoading from './AuthLoading.svelte';
	import { closeModal } from '$lib/common/stores/modal';
	import { getContextTypeStore } from '$lib/common/stores';

	interface Props {
		show?: boolean;
		onComplete?: () => void;
		onClose?: () => void;
		onCancel?: () => void;
		openWallet?: () => void;
		useAuthStore?: boolean; // Optional flag to use auth store for state management
	}

	let {
		show = $bindable(false),
		onComplete = $bindable(() => {}),
		onClose = $bindable(() => {
			safeLogout();
		}),
		onCancel = $bindable(() => {
			(show = false), (showConfirmation = false), (showNotification = false), (showError = false);
		}),
		openWallet,
		useAuthStore = false
	}: Props = $props();

	// Detect if we're in sidepanel context
	const contextType = $state(getContextTypeStore());
	const isSidepanel = $derived(
		contextType === 'sidepanel' || (contextType?.includes?.('sidepanel') ?? false)
	);

	// Local state
	let showError = $state(false);
	let errorMessage = $state('');
	let isUpgrading = $state(false);
	let isProUser = $state(false);
	let showConfirmation = $state(false);
	let showNotification = $state(false);
	let showRegistrationPrompt = $state(false);
	let showLoginModal = $state(false);
	let progress = $state(0);
	let statusMessage = $state('');
	let isInitializing = $state(false);
	let retryCount = $state(0);
	const maxRetries = 3;
	let formValues = {
		userName: '',
		password: '',
		email: ''
	};
	let isLoggedIn = $state(false);
	let registrationStatus = $state<RegistrationStatus | null>(null);
	let planLevelAvailable = $state(
		getAvailableMemberUpgradePlanLevel()?.toString()?.toUpperCase()?.replace('_', ' ') ??
			'YAKKL PRO'
	);

	const upgradeManager = UpgradeManager.getInstance();
	let unregisterHandler: (() => void) | null = null;

	// Initialize upgrade flow when modal is shown
	$effect(() => {
		if (show) {
			isInitializing = true;
			if (useAuthStore) {
				// Ensure auth store is initialized
				authStore
					.initialize()
					.then(() => {
						initializeUpgradeFlow();
					})
					.catch((error) => {
						log.error('Failed to initialize auth store:', false, error);
						initializeUpgradeFlow(); // Continue with fallback
					})
					.finally(() => {
						isInitializing = false;
					});
			} else {
				initializeUpgradeFlow().finally(() => {
					isInitializing = false;
				});
			}
		}
	});

	// Sync internal show state with global modal state
	$effect(() => {
		if (!show && isSidepanel) {
			// If internal show becomes false and we're in sidepanel, ensure global modal state is closed
			closeModal();
		}
	});

	// Register message handler when component mounts
	$effect(() => {
		unregisterHandler = upgradeManager.registerMessageHandler(handleUpgradeMessage);
		return () => {
			if (unregisterHandler) {
				unregisterHandler();
			}
		};
	});

	function handleUpgradeMessage(message: UpgradeResponseMessage) {
		switch (message.type) {
			case 'UPGRADE_STARTED':
				isUpgrading = true;
				progress = 0;
				statusMessage = 'Starting upgrade process...';
				break;
			case 'UPGRADE_PROGRESS':
				progress = message.progress;
				statusMessage = message.status;
				break;
			case 'UPGRADE_COMPLETED':
				isUpgrading = false;
				show = false;
				showNotification = true;
				break;
			case 'UPGRADE_ERROR':
				isUpgrading = false;
				errorMessage = message.error;
				showError = true;
				break;
		}
	}

	// Enhanced close handler for sidepanel context
	function handleSidepanelClose() {
		show = false; // Ensure internal show state is false
		closeModal(); // Close the modal
		if (!isSidepanel) {
			onClose();
		}
		// Don't logout in sidepanel - just close the modal
	}

	// Enhanced cancel handler for sidepanel context
	function handleSidepanelCancel() {
		show = false; // Ensure internal show state is false
		closeModal(); // Close the modal
		showConfirmation = false;
		showNotification = false;
		showError = false;

		if (!isSidepanel) {
			onCancel();
		}
		// Don't logout in sidepanel - just close the modal
	}

	// Enhanced notification close for sidepanel context
	function handleNotificationClose() {
		showNotification = false;
		closeModal(); // Close the modal

		// Add delay to ensure proper cleanup
		setTimeout(() => {
			if (!isSidepanel) {
				onClose();
			}
			// Don't logout in sidepanel - just close the modal
		}, 50);
	}

	async function initializeUpgradeFlow() {
		try {
			retryCount = 0; // Reset retry count on new initialization

			// First check registration status
			registrationStatus = await checkRegistrationStatus();

			if (!registrationStatus.isRegistered) {
				showRegistrationPrompt = true;
				return;
			}

			// Check login status
			isLoggedIn = useAuthStore ? $isAuthenticated : isUserLoggedIn($yakklMiscStore);

			if (!isLoggedIn) {
				showLoginModal = true;
				return;
			}

			// Continue with pro status check if already logged in
			await checkProLevelStatus();
		} catch (error) {
			retryCount++;
			log.error('Error initializing upgrade flow:', false, error);

			// More specific error messages
			if (error instanceof Error) {
				errorMessage = `Initialization failed: ${error.message}`;
			} else {
				errorMessage = 'Failed to initialize upgrade process';
			}

			if (retryCount < maxRetries) {
				errorMessage += ` (Attempt ${retryCount}/${maxRetries})`;
			}

			showError = true;
		}
	}

	// Retry initialization
	async function handleInitRetry() {
		if (retryCount < maxRetries) {
			showError = false;
			errorMessage = '';
			isInitializing = true;
			try {
				await initializeUpgradeFlow();
			} finally {
				isInitializing = false;
			}
		}
	}

	// Dismiss initialization error
	function handleInitDismiss() {
		showError = false;
		errorMessage = '';
		retryCount = 0;

		if (isSidepanel) {
			closeModal();
			// Don't logout in sidepanel - just close the modal
		}
	}

	async function checkProLevelStatus() {
		try {
			const upgradeAllowed = await canUpgrade();
			isProUser = !upgradeAllowed;
			if (!upgradeAllowed) {
				showError = true;
			}
		} catch (error) {
			log.error('Error checking upgrade eligibility:', false, error);
		}
	}

	const { form, handleSubmit } = createForm({
		initialValues: formValues,
		validationSchema: yup.object().shape({
			userName: yup.string().required('Member username is required'),
			password: yup.string().required('Password is required'),
			email: yup.string().email('Must be a valid email.').required('Email is required.')
		}),
		onSubmit: async (values) => {
			formValues = values;
			showConfirmation = true;
		}
	});

	function handleLoginSuccess(
		profile: any,
		digest: string,
		_isMinimal: boolean,
		jwtToken?: string
	) {
		isLoggedIn = true;
		showLoginModal = false;

		// Log JWT token availability
		if (jwtToken) {
			log.debug('JWT token received in upgrade flow', false, {
				hasToken: true,
				username: profile.userName
			});
		}

		// Pre-populate form with profile data
		if (profile) {
			formValues.userName = profile.userName;
			if (profile.data?.email) {
				// Handle encrypted or unencrypted profile data
				if (isEncryptedData(profile.data)) {
					// The digest is already set by the Login component's verify function
					decryptData(profile.data, digest)
						.then((profileData) => {
							const data = profileData as ProfileData;
							formValues.email = data.email;
						})
						.catch((error) => {
							log.warn('Error decrypting profile data:', false, error);
							formValues.email = '';
						});
				} else {
					formValues.email = profile.data.email;
				}
			}
		}

		// Continue with upgrade flow
		checkProLevelStatus();
	}

	function handleLoginError(error: any) {
		errorMessage = typeof error === 'string' ? error : 'Authentication failed';
		showError = true;

		if (isSidepanel) {
			// In sidepanel, just close modal on login error after delay
			setTimeout(() => {
				closeModal();
				// Don't logout - user can try again
			}, 2000); // Give user time to see error
		}
	}

	async function onProcessUpgrade() {
		try {
			const profile = await getProfile();
			if (!profile) {
				// This should never happen
				log.warn('Profile not found', false, 'Upgrade');
				errorMessage = 'Profile not found';
				showError = true;
				return;
			}

			formValues = {
				userName: '',
				password: '',
				email: ''
			};

			if (isEncryptedData(profile.data)) {
				const profileData = (await decryptData(profile.data, $yakklMiscStore)) as ProfileData;
				formValues.userName = profile.userName;
				formValues.email = profileData.email;
			} else {
				formValues.userName = profile.userName;
				formValues.email = (profile.data as ProfileData).email;
			}

			showConfirmation = true;
		} catch (error) {
			log.warn('Error in onProcessUpgrade:', false, error);
			errorMessage = error instanceof Error ? error.message : 'An error occurred during upgrade';
			showError = true;
		}
	}

	async function processUpgrade() {
		try {
			const analyticsData = {
				utm_source: 'wallet',
				utm_campaign: 'yakkl_pro_upgrade',
				user_location: navigator.language,
				upgrade_date: dateString(),
				current_version: (await getSettings())?.version ?? 'unknown',
				platform: (navigator as any)?.userAgentData?.platform ?? navigator?.platform ?? 'unknown',
				user_agent: navigator?.userAgent ?? 'unknown'
			};

			const planLevel = planLevelAvailable?.replace(' ', '_ ')?.toLowerCase() ?? 'yakkl_pro';
			analyticsData.utm_campaign = planLevel.includes('_upgrade')
				? planLevel
				: planLevel + '_upgrade';

			await upgradeManager.processUpgrade({
				userName: formValues.userName,
				email: formValues.email,
				analytics: analyticsData,
				profileId: (await getSettings())?.id ?? '',
				encryptionKey: $yakklMiscStore
			});
		} catch (error) {
			log.error('Error in upgrade process:', false, error);
			errorMessage = error instanceof Error ? error.message : 'An error occurred during upgrade';
			showError = true;
		}
	}

	function onConfirm() {
		processUpgrade();
	}

	// Determine current context for registration prompt
	function getCurrentContext() {
		if (typeof window !== 'undefined') {
			const pathIncludes = window.location.pathname.includes('sidepanel');
			return pathIncludes ? 'sidepanel' : 'wallet';
		}
		return 'wallet';
	}

	// Update login status when miscStore changes or auth store changes
	$effect(() => {
		if (useAuthStore) {
			isLoggedIn = $isAuthenticated;
		} else {
			isLoggedIn = isUserLoggedIn($yakklMiscStore);
		}
	});
</script>

<!-- Registration Prompt -->
<RegistrationPrompt
	bind:show={showRegistrationPrompt}
	context={getCurrentContext()}
	{openWallet}
	onCancel={() => {
		showRegistrationPrompt = false;
		show = false;
		if (isSidepanel) {
			closeModal();
			// Don't logout in sidepanel - just close the modal
		}
	}}
/>

<!-- Login Modal -->
{#if showLoginModal}
	<Modal bind:show={showLoginModal} title="Login Required" className="z-[701] text-base-content">
		<div class="p-6">
			<p class="text-center mb-4 text-gray-600">Please login to upgrade your account</p>
			<Login
				onSuccess={handleLoginSuccess}
				onError={handleLoginError}
				onCancel={() => {
					showLoginModal = false;
					show = false;
					if (isSidepanel) {
						closeModal();
						// Don't logout in sidepanel - just close the modal
					}
				}}
				loginButtonText="Login to Upgrade"
				cancelButtonText="Cancel"
				{useAuthStore}
				generateJWT={!useAuthStore}
				inputTextClass="text-base-content"
				inputBgClass="bg-base-100"
			/>
		</div>
	</Modal>
{/if}

<ErrorNoAction
	bind:show={showError}
	value="You are already using a {planLevelAvailable.toUpperCase()} level plan"
	title="Congratulations!"
	onClose={isSidepanel ? handleSidepanelCancel : onCancel}
/>
<Confirmation
	bind:show={showConfirmation}
	title="Upgrading to {planLevelAvailable.toUpperCase()}!"
	message="Are you sure you want to upgrade to {planLevelAvailable.toUpperCase()}?"
	{onConfirm}
	onCancel={isSidepanel ? handleSidepanelCancel : onCancel}
/>
<Notification
	bind:show={showNotification}
	title="Upgraded to {planLevelAvailable.toUpperCase()}!"
	message="You are now using the {planLevelAvailable.toUpperCase()} plan. You can now access all the features of the {planLevelAvailable.toUpperCase()} plan."
	onClose={isSidepanel ? handleNotificationClose : onClose}
/>

<Modal
	bind:show
	title="Upgrade to {planLevelAvailable.toUpperCase()}"
	onClose={isSidepanel ? handleSidepanelClose : onClose}
>
	<div class="space-y-6 p-6">
		<div class="text-center">
			<h3 class="text-lg font-medium text-gray-900">
				YAKKL Smart Wallet - {planLevelAvailable.toUpperCase()}
			</h3>
			<p class="mt-2 text-sm text-gray-500">
				Unlock advanced features and enhanced security for your crypto assets.
			</p>
		</div>

		{#if isInitializing}
			<AuthLoading
				message="Initializing upgrade process..."
				variant="spinner"
				size="md"
				className="py-8"
			/>
		{:else if isUpgrading}
			<div class="flex flex-col items-center justify-center space-y-4">
				<div class="w-full max-w-md">
					<div class="relative pt-1">
						<div class="flex mb-2 items-center justify-between">
							<div>
								<span
									class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200"
								>
									{statusMessage}
								</span>
							</div>
							<div class="text-right">
								<span class="text-xs font-semibold inline-block text-indigo-600">
									{progress}%
								</span>
							</div>
						</div>
						<div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
							<div
								style="width: {progress}%"
								class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
							></div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="bg-gray-50 p-4 rounded-lg">
				<h4 class="font-medium text-gray-900">Pro Features</h4>
				<ul class="mt-2 space-y-2 text-sm text-gray-600">
					<li class="flex items-center">
						<svg
							class="h-5 w-5 text-green-500 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Automatic price updates with full analytics
					</li>
					<li class="flex items-center">
						<svg
							class="h-5 w-5 text-green-500 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Participate in early access to new features and products
					</li>
					<li class="flex items-center">
						<svg
							class="h-5 w-5 text-green-500 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Reduced swap fees for DeFi platforms
					</li>
					<li class="flex items-center">
						<svg
							class="h-5 w-5 text-green-500 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Advanced market analytics and charting
					</li>
					<li class="flex items-center">
						<svg
							class="h-5 w-5 text-green-500 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Full Emergency Kit for wallet recovery
					</li>
					<li class="flex items-center">
						<svg
							class="h-5 w-5 text-green-500 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Unlimited accounts
					</li>
					<li class="flex items-center">
						<svg
							class="h-5 w-5 text-green-500 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Advanced security features and more...
					</li>
				</ul>
			</div>

			{#if !isLoggedIn && !showLoginModal && !showRegistrationPrompt}
				<div class="text-center py-8">
					<p class="text-gray-600 mb-4">Please login to upgrade your account</p>
					<button
						onclick={() => (showLoginModal = true)}
						class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
					>
						Login to Continue
					</button>
				</div>
			{:else if isLoggedIn}
				<div class="pt-5">
					<div class="flex justify-end space-x-4">
						<button
							type="button"
							class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
							onclick={isSidepanel ? handleSidepanelCancel : onCancel}
						>
							Cancel
						</button>
						<button
							type="button"
							class="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
							disabled={isUpgrading}
							onclick={onProcessUpgrade}
						>
							{isUpgrading ? 'Upgrading...' : 'Upgrade to Pro Level'}
						</button>
					</div>
				</div>
			{/if}
		{/if}

		<!-- Enhanced error handling -->
		<AuthError
			error={showError ? errorMessage : null}
			onRetry={retryCount < maxRetries && !isUpgrading && !isInitializing
				? handleInitRetry
				: undefined}
			onDismiss={!isUpgrading && !isInitializing ? handleInitDismiss : undefined}
		/>
	</div>
</Modal>
