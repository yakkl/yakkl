<script lang="ts">
  // /legal/privacy
  import { browserSvelte } from '$lib/common/environment';
  import { goto } from '$app/navigation';
  import { log } from '$lib/common/logger-wrapper';
  import { PATH_HOME } from '$lib/common/constants';

  let isAgreed = $state(true); // Always agree to privacy policy - for now

  async function update() {
    try {
      if (browserSvelte) {
        // Can an approval here if needed
        await goto(PATH_HOME);
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
        <h2 class="text-lg font-bold text-zinc-900 dark:text-white mb-2">
          Privacy Policy
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400">
          Please review our privacy policy
        </p>
      </div>

      <!-- Privacy Policy Content -->
       <!-- prose dark:prose-invert -->
      <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-6 mb-6 h-[400px] overflow-y-auto border border-zinc-200 dark:border-zinc-700">
        <div class="prose dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-400">
          {@html `___HTML_SNIPPET_PRIVACY___`}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-center">
        <button
          onclick={() => goto(PATH_HOME)}
          class="yakkl-btn-primary"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>
