# YAKKL Wallet Authentication Flow Improvement Plan

## Overview

This document outlines a comprehensive plan to improve the authentication flow across the YAKKL wallet, with special focus on the Upgrade component UX. The plan is broken into discrete phases that can be implemented and tested independently.

## Current State Analysis

### Authentication Flow Overview

1. **Initial Load** (`/routes/(wallet)/+page.svelte`):

   - Checks `settings.legal.termsAgreed` → redirects to legal page
   - Checks `settings.init` → redirects to register page
   - Otherwise → redirects to login page

2. **Login Component** (`Login.svelte`):

   - Simple username/password form
   - Calls `verify()` function for authentication
   - Passes profile and digest to success handler
   - Has error handling but limited user feedback

3. **Upgrade Component** (`Upgrade.svelte`):

   - Checks login state using `$yakklMiscStore` (digest)
   - Shows different forms for logged-in vs non-logged-in users
   - Duplicates login form code instead of reusing Login component
   - Handles upgrade process with progress tracking

4. **Sidepanel** (`/routes/(sidepanel)/sidepanel/sidepanel/+page.svelte`):
   - Checks `settings.init` and `settings.legal.termsAgreed`
   - Shows "Open Smart Wallet" button
   - No direct login flow - relies on opening main wallet

### Identified Gaps

1. **No unified authentication state management**

   - Login state determined by presence of `$yakklMiscStore` (digest)
   - No clear `isLoggedIn` flag in settings or stores
   - Registration vs authentication state confusion

2. **Upgrade Component Issues**

   - Duplicates login UI instead of using Login component
   - No check for registration status before showing login
   - Poor UX for unregistered users in sidepanel

3. **Sidepanel lacks direct authentication**

   - Only shows "Open Smart Wallet" button
   - No inline login capability
   - No registration prompt for new users

4. **Limited feedback during authentication**
   - Basic error messages
   - No loading states in some areas
   - No clear path for unregistered users

## Implementation Phases

### Phase 1: Create Registration Check Component

**Priority**: High  
**Estimated Time**: 2-3 hours

#### Tasks:

1. Create `RegistrationPrompt.svelte` component
2. Create `RegistrationCheck` utility function
3. Update Upgrade component to check registration status

#### Implementation:

**File: `/lib/components/RegistrationPrompt.svelte`**

```svelte
<script lang="ts">
	import Modal from './Modal.svelte';
	import { browser_ext } from '$lib/common/environment';

	interface Props {
		show: boolean;
		title?: string;
		message?: string;
		context?: 'sidepanel' | 'wallet' | 'popup';
		openWallet?: () => void;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let {
		show = $bindable(false),
		title = 'Registration Required',
		message = 'You need to register your YAKKL wallet before proceeding.',
		context = 'wallet',
		openWallet,
		onConfirm,
		onCancel
	}: Props = $props();

	function handleConfirm() {
		if (onConfirm) {
			onConfirm();
		} else if (context === 'sidepanel' && openWallet) {
			openWallet();
		} else if (context === 'sidepanel') {
			browser_ext.runtime.sendMessage({ type: 'popout' });
		}
		show = false;
	}

	function handleCancel() {
		if (onCancel) onCancel();
		show = false;
	}
</script>

<Modal bind:show {title} className="z-[700]">
	<div class="p-6 space-y-4">
		<p class="text-base">{message}</p>
		<p class="text-sm text-gray-600">
			{#if context === 'sidepanel'}
				Would you like to open the wallet to complete registration?
			{:else}
				Please complete the registration process to continue.
			{/if}
		</p>

		<div class="flex justify-end gap-4 mt-6">
			<button
				onclick={handleCancel}
				class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
			>
				Cancel
			</button>
			<button
				onclick={handleConfirm}
				class="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
			>
				{context === 'sidepanel' ? 'Open Wallet' : 'Continue'}
			</button>
		</div>
	</div>
</Modal>
```

**File: `/lib/common/auth-utils.ts`**

```typescript
import { getSettings } from '$lib/common/stores';
import type { Settings } from '$lib/common/interfaces';

export interface RegistrationStatus {
	isRegistered: boolean;
	hasAgreedToTerms: boolean;
	isInitialized: boolean;
	requiresAction: 'terms' | 'register' | 'login' | null;
}

export async function checkRegistrationStatus(): Promise<RegistrationStatus> {
	try {
		const settings = await getSettings();

		const hasAgreedToTerms = settings?.legal?.termsAgreed ?? false;
		const isInitialized = settings?.init ?? false;

		let requiresAction: RegistrationStatus['requiresAction'] = null;

		if (!hasAgreedToTerms) {
			requiresAction = 'terms';
		} else if (!isInitialized) {
			requiresAction = 'register';
		} else {
			requiresAction = 'login';
		}

		return {
			isRegistered: hasAgreedToTerms && isInitialized,
			hasAgreedToTerms,
			isInitialized,
			requiresAction
		};
	} catch (error) {
		console.error('Error checking registration status:', error);
		return {
			isRegistered: false,
			hasAgreedToTerms: false,
			isInitialized: false,
			requiresAction: 'terms'
		};
	}
}

export function isUserLoggedIn(miscStore: string | null): boolean {
	return !!miscStore && miscStore.length > 0;
}
```

#### Testing Checklist:

- [ ] Component renders correctly
- [ ] Modal shows/hides properly
- [ ] Buttons trigger correct actions
- [ ] Works in sidepanel context
- [ ] Works in wallet context

---

### Phase 2: Refactor Upgrade Component to Use Login Component

**Priority**: High  
**Estimated Time**: 3-4 hours

#### Tasks:

1. Remove duplicate login form from Upgrade.svelte
2. Integrate Login component with proper callbacks
3. Add registration check flow
4. Update state management

#### Implementation:

**Updates to `Upgrade.svelte`:**

```svelte
<script lang="ts">
  // Add new imports
  import Login from './Login.svelte';
  import RegistrationPrompt from './RegistrationPrompt.svelte';
  import { checkRegistrationStatus, isUserLoggedIn } from '$lib/common/auth-utils';
  
  // Add new state
  let showRegistrationPrompt = $state(false);
  let showLoginModal = $state(false);
  let registrationStatus = $state<RegistrationStatus | null>(null);
  
  // Update the existing effect
  $effect(() => {
    if (show) {
      initializeUpgradeFlow();
    }
  });
  
  async function initializeUpgradeFlow() {
    // Check registration first
    registrationStatus = await checkRegistrationStatus();
    
    if (!registrationStatus.isRegistered) {
      showRegistrationPrompt = true;
      return;
    }
    
    // Check login status
    isLoggedIn = isUserLoggedIn($yakklMiscStore);
    
    if (!isLoggedIn) {
      showLoginModal = true;
      return;
    }
    
    // Continue with pro status check
    checkProLevelStatus();
  }
  
  function handleLoginSuccess(profile: any, digest: string, isMinimal: boolean) {
    isLoggedIn = true;
    showLoginModal = false;
    
    // Pre-populate form with profile data
    if (profile) {
      formValues.userName = profile.userName;
      if (profile.data?.email) {
        formValues.email = isEncryptedData(profile.data) 
          ? (await decryptData(profile.data, digest) as ProfileData).email
          : profile.data.email;
      }
    }
    
    // Continue with upgrade flow
    checkProLevelStatus();
  }
  
  function handleLoginError(error: any) {
    errorMessage = typeof error === 'string' ? error : 'Authentication failed';
    showError = true;
  }
  
  function handleLoginCancel() {
    showLoginModal = false;
    show = false; // Close upgrade modal too
  }
</script>

<!-- Add Registration Prompt -->
<RegistrationPrompt
	bind:show={showRegistrationPrompt}
	context={$page.route.id?.includes('sidepanel') ? 'sidepanel' : 'wallet'}
	openWallet={props.openWallet}
	onCancel={() => {
		showRegistrationPrompt = false;
		show = false;
	}}
/>

<!-- Add Login Modal -->
{#if showLoginModal}
	<Modal bind:show={showLoginModal} title="Login Required" className="z-[701]">
		<div class="p-6">
			<p class="text-center mb-4 text-gray-600">Please login to upgrade your account</p>
			<Login
				onSuccess={handleLoginSuccess}
				onError={handleLoginError}
				onCancel={handleLoginCancel}
				loginButtonText="Login to Upgrade"
				cancelButtonText="Cancel"
			/>
		</div>
	</Modal>
{/if}

<!-- Update main modal content -->
<Modal bind:show title="Upgrade to {planLevelAvailable.toUpperCase()}">
	<div class="space-y-6 p-6">
		<!-- Remove the duplicate login form section -->
		{#if !isLoggedIn && !showLoginModal && !showRegistrationPrompt}
			<div class="text-center py-8">
				<button
					onclick={() => (showLoginModal = true)}
					class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
				>
					Login to Continue
				</button>
			</div>
		{:else if isLoggedIn}
			<!-- Existing upgrade content -->
			<!-- Pro features list, etc. -->
		{/if}
	</div>
</Modal>
```

#### Testing Checklist:

- [ ] Registration check works correctly
- [ ] Login modal appears when needed
- [ ] Login success flows to upgrade
- [ ] Cancel buttons work properly
- [ ] Error handling displays correctly

---

### Phase 3: Update Sidepanel Integration

**Priority**: High  
**Estimated Time**: 2-3 hours

#### Tasks:

1. Update sidepanel to pass openWallet prop
2. Add proper context detection
3. Ensure modal cleanup on wallet open

#### Implementation:

**Update `/routes/(sidepanel)/sidepanel/sidepanel/+page.svelte`:**

```svelte
<script lang="ts">
	// In the existing Upgrade component usage
	let showUpgradeModal = $state(false);

	function handleUpgradeComplete() {
		showUpgradeModal = false;
		// Refresh any necessary data
	}

	function handleUpgradeClose() {
		showUpgradeModal = false;
		// Handle any cleanup
	}
</script>

<!-- Update Upgrade component usage -->
<Upgrade
	bind:show={showUpgradeModal}
	{openWallet}
	onComplete={handleUpgradeComplete}
	onClose={handleUpgradeClose}
	onCancel={() => (showUpgradeModal = false)}
/>
```

#### Testing Checklist:

- [ ] Upgrade modal opens from sidepanel
- [ ] Registration prompt shows for unregistered users
- [ ] Wallet opens correctly when prompted
- [ ] All modals close properly

---

### Phase 4: Create Unified Auth State Store

**Priority**: Medium  
**Estimated Time**: 4-5 hours

#### Tasks:

1. Create AuthStore with reactive state
2. Add session management
3. Implement auth events
4. Update components to use AuthStore

#### Implementation:

**File: `/lib/stores/auth-store.ts`**

```typescript
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { verify } from '$lib/common/security';
import { getSettings, getMiscStore, setMiscStore } from '$lib/common/stores';
import type { Profile } from '$lib/common/interfaces';

interface AuthState {
	isAuthenticated: boolean;
	isRegistered: boolean;
	profile: Profile | null;
	lastActivity: number;
	sessionTimeout: number; // in minutes
}

const defaultAuthState: AuthState = {
	isAuthenticated: false,
	isRegistered: false,
	profile: null,
	lastActivity: Date.now(),
	sessionTimeout: 30 // 30 minutes default
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(defaultAuthState);

	// Activity tracker
	if (browser) {
		['mousedown', 'keydown', 'scroll', 'touchstart'].forEach((event) => {
			document.addEventListener(event, () => {
				update((state) => ({ ...state, lastActivity: Date.now() }));
			});
		});
	}

	return {
		subscribe,

		async initialize() {
			const settings = await getSettings();
			const miscStore = getMiscStore();

			update((state) => ({
				...state,
				isRegistered: settings?.init && settings?.legal?.termsAgreed,
				isAuthenticated: !!miscStore && miscStore.length > 0
			}));
		},

		async login(username: string, password: string): Promise<Profile> {
			const normalizedUsername = username.toLowerCase().trim().replace('.nfs.id', '');
			const loginString = normalizedUsername + '.nfs.id' + password;

			const profile = await verify(loginString);

			if (!profile) {
				throw new Error('Invalid credentials');
			}

			update((state) => ({
				...state,
				isAuthenticated: true,
				profile,
				lastActivity: Date.now()
			}));

			return profile;
		},

		logout() {
			setMiscStore('');
			set(defaultAuthState);
		},

		checkSession() {
			const state = get(authStore);
			const now = Date.now();
			const timeoutMs = state.sessionTimeout * 60 * 1000;

			if (state.isAuthenticated && now - state.lastActivity > timeoutMs) {
				this.logout();
				return false;
			}
			return true;
		}
	};
}

export const authStore = createAuthStore();

// Derived stores
export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);
export const isRegistered = derived(authStore, ($auth) => $auth.isRegistered);
export const authProfile = derived(authStore, ($auth) => $auth.profile);
```

#### Testing Checklist:

- [ ] Auth store initializes correctly
- [ ] Login updates state properly
- [ ] Session timeout works
- [ ] Activity tracking updates lastActivity
- [ ] Derived stores react to changes

---

### Phase 5: Enhanced Error Handling and Loading States

**Priority**: Medium  
**Estimated Time**: 2-3 hours

#### Tasks:

1. Add loading states to all auth flows
2. Improve error messages
3. Add retry mechanisms
4. Create consistent error display

#### Implementation:

**File: `/lib/components/AuthError.svelte`**

```svelte
<script lang="ts">
	interface Props {
		error: string | Error | null;
		onRetry?: () => void;
		onDismiss?: () => void;
	}

	let { error, onRetry, onDismiss }: Props = $props();

	const errorMessage = $derived(
		error instanceof Error ? error.message : error || 'An error occurred'
	);
</script>

{#if error}
	<div class="rounded-md bg-red-50 p-4 mt-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3 flex-1">
				<p class="text-sm font-medium text-red-800">{errorMessage}</p>
			</div>
			<div class="ml-auto pl-3 flex gap-2">
				{#if onRetry}
					<button onclick={onRetry} class="text-sm font-medium text-red-600 hover:text-red-500">
						Retry
					</button>
				{/if}
				{#if onDismiss}
					<button onclick={onDismiss} class="text-sm font-medium text-gray-600 hover:text-gray-500">
						Dismiss
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
```

**Update Login.svelte to include better error handling:**

```svelte
<script lang="ts">
	import AuthError from './AuthError.svelte';

	// Add retry logic
	let retryCount = $state(0);
	const maxRetries = 3;

	async function handleRetry() {
		if (retryCount < maxRetries) {
			retryCount++;
			showError = false;
			errorMessage = '';
			// Re-enable form
		} else {
			errorMessage = 'Maximum retry attempts reached. Please try again later.';
		}
	}
</script>

<!-- Add to template -->
<AuthError
	error={showError ? errorMessage : null}
	onRetry={retryCount < maxRetries ? handleRetry : undefined}
	onDismiss={() => {
		showError = false;
		errorMessage = '';
	}}
/>
```

#### Testing Checklist:

- [ ] Error component displays correctly
- [ ] Retry mechanism works
- [ ] Max retries enforced
- [ ] Error dismissal works
- [ ] Loading states show properly

---

### Phase 6: Session Management and Auto-lock

**Priority**: Low  
**Estimated Time**: 3-4 hours

#### Tasks:

1. Implement idle timer
2. Add auto-lock functionality
3. Create session warning modal
4. Add quick unlock option

#### Testing Checklist:

- [ ] Idle timer triggers correctly
- [ ] Warning modal appears before timeout
- [ ] Auto-lock works properly
- [ ] Quick unlock functions
- [ ] Session extends on activity

---

## Thread Continuity Solution

To ensure this plan survives thread breaks:

1. **This document is saved at**: `/packages/yakkl-wallet/docs/AUTH_FLOW_IMPROVEMENT_PLAN.md`
2. **Progress tracking**: After completing each phase, update this section:

### Progress Tracker

- [x] Phase 1: Registration Check Component - Status: COMPLETED (2025-06-20)
- [x] Phase 2: Refactor Upgrade Component - Status: COMPLETED (2025-06-20)
- [x] Phase 3: Sidepanel Integration - Status: COMPLETED (2025-06-20)
- [x] Phase 4: Auth State Store - Status: COMPLETED (2025-06-20)
- [x] Phase 5: Error Handling - Status: COMPLETED (2025-06-20)
- [x] Phase 6: Session Management & JWT Tokens - Status: COMPLETED (2025-06-20)

### Completed Code Files

Track files created/modified after each phase:

- Phase 1:
  - [x] `/lib/components/RegistrationPrompt.svelte` - Created
  - [x] `/lib/common/auth-utils.ts` - Created
  - [x] `/routes/(test)/test-registration-prompt/+page.svelte` - Created for testing
- Phase 2:
  - [x] `/lib/components/Upgrade.svelte` - Refactored to use Login component
  - [x] `/lib/components/Login.svelte` - Fixed prop name inconsistencies
- Phase 3:
  - [x] `/routes/(sidepanel)/sidepanel/sidepanel/+page.svelte` - Updated to pass openWallet prop and proper callbacks
- Phase 4:
  - [x] `/lib/stores/auth-store.ts` - Created unified auth state management
  - [x] `/lib/components/Login.svelte` - Added optional auth store integration
  - [x] `/lib/components/Upgrade.svelte` - Added optional auth store usage
- Phase 5:
  - [x] `/lib/components/AuthError.svelte` - Created reusable error component with retry functionality
  - [x] `/lib/components/AuthLoading.svelte` - Created loading state component with multiple variants
  - [x] `/lib/components/Login.svelte` - Enhanced with retry logic, better error handling, and loading states
  - [x] `/lib/components/Upgrade.svelte` - Enhanced with initialization loading, error handling, and retry mechanisms
- Phase 6:
  - [x] `/lib/components/SessionWarning.svelte` - Created session warning modal with countdown and keyboard shortcuts
  - [x] `/lib/utilities/jwt.ts` - Created JWT token manager for Cloudflare Workers API authentication
  - [x] `/lib/managers/SessionManager.ts` - Created session lifecycle manager with browser extension support
  - [x] `/lib/stores/auth-store.ts` - Enhanced with session management and JWT token integration
  - [x] `/lib/components/SessionProvider.svelte` - Created global session provider component
  - [x] `/routes/+layout.svelte` - Added session provider to global layout

### Notes for Next Session

Add any important notes or decisions made during implementation:

- **Browser Extension Context Constraint**: Svelte stores (including auth-store) only work in client context, not in background service worker. The auth store implementation respects this limitation.
- **Backward Compatibility**: All enhancements maintain backward compatibility - existing components work unchanged without the new features.
- **JWT Token Implementation**: JWT tokens are generated for API authentication with Cloudflare Workers. Tokens include user profile info, plan level, and session data. Tokens auto-refresh when close to expiration.
- **Session Management**: Comprehensive session lifecycle with activity tracking, automatic timeouts, warning modals, and secure storage. Sessions persist across browser extension contexts.
- **Security**: JWT signing keys are generated from user settings and rotate daily. Session data is encrypted in storage. Activity tracking respects user privacy.

## Getting Started

When starting a new session:

1. Read this document
2. Check the Progress Tracker
3. Review completed files
4. Continue with the next incomplete phase

Each phase is self-contained and can be implemented, tested, and committed independently.
