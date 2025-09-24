<script lang="ts">
  // /legal/subscription
  import { browserSvelte } from '$lib/common/environment';
  import { browserAPI } from '$lib/services/browser-api.service';
  import { PATH_REGISTER, PlanType, AccessSourceType, VERSION } from '$lib/common';
  import type { YakklSettings } from '$lib/common';
  import { getYakklSettings, setYakklSettingsStorage } from '$lib/common/stores';
  import { goto } from '$app/navigation';
  import { log } from '$lib/common/logger-wrapper';
  import { dateString } from '$lib/common/datetime';
  import { DEFAULT_PERSONA, PATH_HOME } from '$lib/common/constants';
	import { onMount } from 'svelte';

  let yakklSettings: YakklSettings | null = null;
  let isAgreed = $state(false);
  let isViewOnly = $state(false);

  onMount(async () => {
    yakklSettings = await getYakklSettings();
    isAgreed = yakklSettings?.legal?.termsAgreed ?? false;
    isViewOnly = yakklSettings?.legal?.privacyViewed ?? false;
  });

  async function update() {
    try {
      if (browserSvelte) {
        yakklSettings = await getYakklSettings();

        // If no settings exist, create default settings
        if (!yakklSettings) {
          console.log('[Legal] Creating initial settings for new user');
          yakklSettings = {
            id: '', // Will be set during registration
            persona: DEFAULT_PERSONA,
            version: VERSION,
            isLockedHow: '',
            previousVersion: '',
            plan: {
              type: PlanType.EXPLORER_MEMBER,
              source: AccessSourceType.STANDARD,
              promo: null,
              trialEndDate: null,
              upgradeDate: ''
            },
            trialCountdownPinned: false,
            legal: {
              termsAgreed: true,
              privacyViewed: true,
              updated: false
            },
            platform: {
              arch: '',
              nacl_arch: '',
              os: '',
              osVersion: '',
              platform: ''
            },
            init: false, // Will be set to true after registration
            isLocked: true,
            // security: {},
            // connections: [],
            transactions: {
              retry: {
                enabled: true,
                howManyAttempts: 3,
                seconds: 30,
                baseFeeIncrease: 0.1,
                priorityFeeIncrease: 0.1
              },
              retain: {
                enabled: true,
                days: -1,
                includeRaw: true
              }
            },
            meta: {},
            upgradeDate: '',
            lastAccessDate: dateString(),
            createDate: dateString(),
            updateDate: dateString()
          };
        } else {
          // Update existing settings
          yakklSettings.legal.privacyViewed = true;
          yakklSettings.legal.termsAgreed = true;
          yakklSettings.isLocked = true;
        }

        await setYakklSettingsStorage(yakklSettings);
        await goto(PATH_REGISTER);
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

  async function handleLink(e: { srcElement: { href: any } }) {
    if (browserSvelte) {
      await browserAPI.tabsCreate({ url: e.srcElement.href });
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
          Subscription Policy
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400">
          Please review our subscription policy
        </p>
      </div>

      <!-- Terms Content -->
       <!-- prose dark:prose-invert -->
      <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-6 mb-6 h-[400px] overflow-y-auto border border-zinc-200 dark:border-zinc-700">
        <div class="prose dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-400">
          {@html `___HTML_SNIPPET_SUBSCRIPTION_POLICY___`}
        </div>
      </div>

      <div class="flex justify-center">
        <button
          onclick={() => goto(PATH_HOME)}
          class="yakkl-btn-primary">
          Close
        </button>
      </div>
    </div>
  </div>
</div>
