<script lang="ts">
  import { browserSvelte } from '$lib/common/environment';
  import { resetStores, setMiscStore, setYakklTokenDataCustomStorage, yakklCurrentlySelectedStore, yakklSettingsStore, yakklTokenDataCustomStore } from '$lib/common/stores';
  import { setIconLock } from '$lib/utilities/utilities';

  import { type Settings, type YakklCurrentlySelected } from '$lib/common';
	import { removeTimers } from '$lib/common/timers';
	import { removeListeners } from '$lib/common/listeners';
	import { setLocks } from '$lib/common/locks';
	import { resetTokenDataStoreValues } from '$lib/common/resetTokenDataStoreValues';
  import { log } from '$lib/common/logger-wrapper';
	import { stopActivityTracking } from '../../../hooks.client';
  import { ErrorHandler } from '$lib/plugins/ErrorHandler';

  // Initialize error handler
  if (browserSvelte) {
    ErrorHandler.getInstance();
  }

  // Reactive State
  let yakklCurrentlySelected: YakklCurrentlySelected | null = $state(null);
  let yakklSettings: Settings | null = $state(null);

  $effect(() => { yakklCurrentlySelected = $yakklCurrentlySelectedStore; });
  $effect(() => { yakklSettings = $yakklSettingsStore; });

  let isUpdating = false; // Prevent concurrent executions

  async function update() {
    if (!browserSvelte) return;
    if (isUpdating) return; // Prevent multiple updates
    isUpdating = true;

    try {
      await stopActivityTracking();
      // Set lock icon
      await setIconLock();
      setLocks(true);

      // Clear session-specific state
      removeTimers();
      removeListeners();
      setMiscStore('');
      resetTokenDataStoreValues();
      setYakklTokenDataCustomStorage($yakklTokenDataCustomStore); // Zero out values in custom token storage
      resetStores();

    } catch (error) {
      log.error('Logout failed:', false, error);
      alert('Logout encountered an error. Please try again or refresh the extension manually.');
    } finally {
      isUpdating = false;
      window.close();
    }
  }

  if (browserSvelte) {
    update();
  }
</script>
