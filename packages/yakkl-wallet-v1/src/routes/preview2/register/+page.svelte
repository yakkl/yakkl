<script lang="ts">
  import RegistrationOption from '../lib/components/RegistrationOption.svelte';
  import { goto } from '$app/navigation';
  import { log } from '$lib/common/logger-wrapper';

  function handleCreate() {
    log.info('Creating new account');
    goto('/preview2/register/create');
  }

  function handleImport() {
    log.info('Importing existing account');
    goto('/preview2/register/import');
  }

  function handleRestore() {
    log.info('Restoring from emergency kit');
    goto('/preview2/register/restore');
  }
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <div class="text-center mb-6">
      <img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-20 h-20 mx-auto mb-4" />
      <h1 class="text-3xl font-bold text-zinc-900 dark:text-white">Welcome to YAKKL</h1>
      <p class="text-zinc-600 dark:text-zinc-400 mt-2">Let's get your wallet set up</p>
    </div>

    <RegistrationOption
      title="Choose Setup Method"
      onCreate={handleCreate}
      onImport={handleImport}
      onRestore={handleRestore}
    />

    <div class="mt-6 text-center">
      <a 
        href="/preview2/login" 
        class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
      >
        Already have an account? Sign in
      </a>
    </div>
  </div>
</div>