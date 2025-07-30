<script lang="ts">
  import JWTValidationModal from './JWTValidationModal.svelte';
  import { jwtValidationModalStore } from '$lib/services/ui-jwt-validator.service';
  import { uiJWTValidatorService } from '$lib/services/ui-jwt-validator.service';

  // Subscribe to the modal store
  let modalState = $state({
    show: false,
    status: 'checking' as 'checking' | 'valid' | 'invalid' | 'grace_period' | 'error',
    message: '',
    gracePeriodRemaining: 0
  });

  // Track the store reactively
  $effect(() => {
    const unsubscribe = jwtValidationModalStore.subscribe(state => {
      modalState = state;
    });

    return unsubscribe;
  });

  // Modal event handlers
  async function handleRetry() {
    await uiJWTValidatorService.handleModalRetry();
  }

  function handleLogout() {
    // Check if this is a security countdown modal (invalid status with countdown)
    if (modalState.status === 'invalid' && modalState.gracePeriodRemaining > 0) {
      // This is a security countdown - use security handler
      uiJWTValidatorService.handleSecurityModalLogout();
    } else {
      // Regular logout
      uiJWTValidatorService.handleModalLogout();
    }
  }

  function handleClose() {
    // Check if this is a security countdown modal (invalid status with countdown)
    if (modalState.status === 'invalid' && modalState.gracePeriodRemaining > 0) {
      // This is a security countdown - use security handler
      uiJWTValidatorService.handleSecurityModalClose();
    } else {
      // Regular close
      uiJWTValidatorService.handleModalClose();
    }
  }
</script>

<JWTValidationModal
  bind:show={modalState.show}
  status={modalState.status}
  message={modalState.message}
  gracePeriodRemaining={modalState.gracePeriodRemaining}
  onRetry={handleRetry}
  onLogout={handleLogout}
  onClose={handleClose}
/>
