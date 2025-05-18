<script lang="ts">
  import { getYakklCombinedToken, yakklCombinedTokenStore, getSettings } from '$lib/common/stores';
  import type { Settings, TokenData } from '$lib/common';
  import { onMount } from 'svelte';
	import { log } from '$lib/plugins/Logger';
  import { browser_ext } from '$lib/common/environment';
	import { handleOnMessageForPricing } from '$lib/common/listeners/ui/uiListeners';
	import { startPricingChecks } from '$lib/tokens/prices';
	import { updateTokenPrices } from '$lib/common/tokenPriceManager';
  import TokenLineView from './TokenLineView.svelte';
  import * as Accordion from './ui/accordion';
  import { cn } from '$lib/utils';

  interface Props {
    maxVisibleTokens?: number; // 0 means show all
    className?: string;
  }

  let { maxVisibleTokens = 0, className = '' }: Props = $props();

  let tokens: TokenData[] = $state([]);
  let visibleTokens: TokenData[] = $state([]);
  let remainingTokens: TokenData[] = $state([]);
  let isExpanded = $state(false);

  log.info('TokenComponentList', false, 'Mounting');

  onMount(async(): Promise<any> => {
    log.info('TokenComponentList', false, 'onMount');

    const settings: Settings = await getSettings();
    if (!settings.init || !settings.legal.termsAgreed) {
      tokens = [];
      updateTokenDisplay();
    } else {
      getYakklCombinedToken().then((initialTokens) => {
        tokens = initialTokens;
        updateTokenDisplay();
      });
    }

    if (browser_ext) {
      browser_ext.runtime.onMessage.addListener(handleOnMessageForPricing);
      browser_ext.runtime.sendMessage({ action: 'getTokenData' });

      startPricingChecks();
      updateTokenPrices(); // Initial token price update
    }

    // Subscribe to store changes
    const unsubscribe = yakklCombinedTokenStore.subscribe((newTokens) => {
      tokens = newTokens;
      updateTokenDisplay();
    });

    return () => {
      unsubscribe();
      if (browser_ext) {
        browser_ext.runtime.onMessage.removeListener(handleOnMessageForPricing);
      }
    };
  });

  function updateTokenDisplay() {
    if (maxVisibleTokens === 0 || tokens.length <= maxVisibleTokens) {
      visibleTokens = tokens;
      remainingTokens = [];
    } else {
      visibleTokens = tokens.slice(0, maxVisibleTokens);
      remainingTokens = tokens.slice(maxVisibleTokens);
    }
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
  }
</script>

<div class={cn("flex flex-col", className)}>
  <div class="space-y-1">
    {#each visibleTokens as token}
      <TokenLineView {token} />
    {/each}
  </div>

  {#if remainingTokens.length > 0}
    <Accordion.Root type="single">
      <Accordion.Item value="remaining-tokens">
        <Accordion.Trigger class="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          {isExpanded ? 'Show Less' : `Show ${remainingTokens.length} More Tokens`}
        </Accordion.Trigger>
        <Accordion.Content>
          <div class="space-y-1">
          {#each remainingTokens as token}
            {log.info('TokenComponentList', false, { token })}
            <TokenLineView {token} />
          {/each}
        </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  {/if}
</div>
