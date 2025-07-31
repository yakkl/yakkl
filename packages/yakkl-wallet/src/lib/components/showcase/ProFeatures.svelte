<!--
  Pro Features Showcase - Displays Pro tier features and benefits
-->

<script lang="ts">
  import { canUseFeature, currentPlan, isOnTrial } from '../../stores/plan.store';
  import { PlanType } from '$lib/common/types';
  import Upgrade from '../Upgrade.svelte';

  let {
    className = '',
    variant = 'card' // 'card', 'banner', 'modal'
  } = $props();

  let plan = $derived($currentPlan);
  let trial = $derived($isOnTrial);
  let showUpgradeModal = $state(false);

  const proFeatures = [
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Detailed portfolio insights, performance metrics, and market analysis',
      feature: 'advanced_analytics'
    },
    {
      icon: '🤖',
      title: 'AI Assistant',
      description: 'Smart recommendations and automated portfolio management',
      feature: 'ai_assistant'
    },
    {
      icon: '🔄',
      title: 'Token Swapping',
      description: 'Swap tokens with better rates and lower fees',
      feature: 'swap_tokens'
    },
    {
      icon: '💳',
      title: 'Buy/Sell Crypto',
      description: 'Purchase crypto with credit card or bank transfer',
      feature: 'buy_crypto'
    },
    {
      icon: '🔔',
      title: 'Price Alerts',
      description: 'Get notified when your tokens reach target prices',
      feature: 'price_alerts'
    },
    {
      icon: '🏦',
      title: 'DeFi Integration',
      description: 'Access staking, yield farming, and lending protocols',
      feature: 'staking'
    },
    {
      icon: '📱',
      title: 'API Access',
      description: 'Programmatic access to your wallet and portfolio data',
      feature: 'api_access'
    },
    {
      icon: '🔐',
      title: 'Enhanced Security',
      description: 'Multi-signature support and advanced security features',
      feature: 'multi_sig'
    }
  ];

  function handleUpgrade() {
    showUpgradeModal = true;
  }

  function getFeatureStatus(feature: string) {
    if (canUseFeature(feature)) return 'available';
    if (plan === PlanType.EXPLORER_MEMBER) return 'locked';
    return 'upgrade'; // Pro user looking at higher tier features
  }
</script>

<div class="pro-features-showcase {className}">
  {#if variant === 'banner'}
    <!-- Banner Style -->
    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-lg mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">🌟 Unlock Pro Features</h2>
          <p class="text-indigo-100">Get advanced analytics, AI assistance, and enhanced security</p>
        </div>
        <button
          onclick={handleUpgrade}
          class="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
        >
          Upgrade Now
        </button>
      </div>
    </div>

  {:else if variant === 'card'}
    <!-- Card Style -->
    <div class="yakkl-card p-6">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">💎</span>
        </div>
        <h2 class="text-xl font-bold mb-2">YAKKL Pro Features</h2>
        <p class="text-gray-600 dark:text-gray-400">
          {#if trial}
            You're currently on a trial. Upgrade to keep these features!
          {:else if plan === PlanType.EXPLORER_MEMBER}
            Unlock advanced features with YAKKL Pro
          {:else}
            You have access to all Pro features!
          {/if}
        </p>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {#each proFeatures as feature}
          {@const status = getFeatureStatus(feature.feature)}
          <div class="flex items-start gap-3 p-3 rounded-lg border {
            status === 'available' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' :
            status === 'locked' ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50' :
            'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20'
          }">
            <div class="text-2xl">{feature.icon}</div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-medium text-sm">{feature.title}</h3>
                {#if status === 'available'}
                  <span class="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                    ✓ Active
                  </span>
                {:else if status === 'locked'}
                  <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    🔒 Pro
                  </span>
                {:else}
                  <span class="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    ⭐ Upgrade
                  </span>
                {/if}
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          </div>
        {/each}
      </div>

      <!-- Action Buttons -->
      {#if plan === PlanType.EXPLORER_MEMBER || trial}
        <div class="text-center">
          <button
            onclick={handleUpgrade}
            class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            {trial ? 'Upgrade to Keep Pro Features' : 'Upgrade to Pro - $9.99/month'}
          </button>
          <p class="text-xs text-gray-500 mt-2">
            {trial ? 'Your trial expires soon' : '14-day free trial included'}
          </p>
        </div>
      {:else}
        <div class="text-center text-green-600 dark:text-green-400">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <p class="font-medium">You have Pro access!</p>
          <p class="text-xs text-gray-500 mt-1">Enjoying all premium features</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Upgrade Modal -->
<Upgrade
  bind:show={showUpgradeModal}
  onComplete={() => showUpgradeModal = false}
  onCancel={() => showUpgradeModal = false}
/>

