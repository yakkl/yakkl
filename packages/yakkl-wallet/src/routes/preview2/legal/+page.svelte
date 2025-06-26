<script lang="ts">
  import { browserSvelte, browser_ext } from '$lib/common/environment';
  import { PATH_REGISTER } from '$lib/common';
  import type { Settings } from '$lib/common';
  import { getSettings, setSettingsStorage } from '$lib/common/stores';
  import { goto } from '$app/navigation';
  import { log } from '$lib/common/logger-wrapper';

  let yakklSettings: Settings | null = null;
  let isAgreed = $state(false);

  async function update() {
    try {
      if (browserSvelte) {
        yakklSettings = await getSettings();
        if (yakklSettings) {
          yakklSettings.legal.privacyViewed = true;
          yakklSettings.legal.termsAgreed = true;
          yakklSettings.isLocked = true;
          await setSettingsStorage(yakklSettings);
          await goto('/preview2/register');
        }
      }
    } catch (error) {
      log.error(error);
    }
  }

  async function handleSubmit() {
    if (isAgreed) {
      await update();
    }
  }

  function handleLink(e: { srcElement: { href: any } }) {
    if (browserSvelte) {
      browser_ext.tabs.create({ url: e.srcElement.href });
    }
  }
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
  <div class="max-w-3xl w-full">
    <div class="yakkl-card p-8">
      <!-- Header -->
      <div class="text-center mb-6">
        <img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-16 h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          Legal Agreements
        </h1>
        <p class="text-zinc-600 dark:text-zinc-400">
          Please review and accept our terms of service to continue
        </p>
      </div>

      <!-- Terms Content -->
      <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-6 mb-6 h-[400px] overflow-y-auto border border-zinc-200 dark:border-zinc-700">
        <div class="prose dark:prose-invert max-w-none text-sm">
          {@html `___HTML_SNIPPET___`}
        </div>
      </div>

      <!-- Agreement Checkbox -->
      <div class="mb-6">
        <label class="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            bind:checked={isAgreed}
            class="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-zinc-700"
          />
          <div class="flex-1">
            <span class="text-zinc-900 dark:text-white font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              I have read and agree to the terms of service
            </span>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              By checking this box, you agree to our Terms of Service and Privacy Policy. 
              You can find more information at yakkl.com.
            </p>
          </div>
        </label>
      </div>

      <!-- Actions -->
      <div class="flex justify-between">
        <button
          onclick={() => window.close()}
          class="yakkl-btn-secondary"
        >
          Cancel
        </button>
        <button
          onclick={handleSubmit}
          disabled={!isAgreed}
          class="yakkl-btn-primary"
        >
          Continue to Registration
        </button>
      </div>
    </div>
  </div>
</div>