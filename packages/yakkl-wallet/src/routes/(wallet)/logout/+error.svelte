<script>
  import { page } from '$app/stores';
  import { log } from '$lib/common/logger-wrapper';

  $effect(() => {
    if ($page.error) {
      log.error('Logout page error:', false, $page.error);
    }
  });
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4">
  <div class="text-center max-w-md">
    <h1 class="text-2xl font-bold mb-4 text-red-600">Logout Error</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-6">
      An error occurred during logout. The wallet has been locked for your security.
    </p>
    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <p class="text-sm text-yellow-800 dark:text-yellow-200">
        Please close this window and reopen the wallet extension to continue.
      </p>
    </div>
    {#if $page.error?.message}
      <details class="text-left">
        <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          Technical details
        </summary>
        <pre class="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">{$page.error.message}</pre>
      </details>
    {/if}
  </div>
</div>