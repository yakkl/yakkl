<!--
  Private Features Showcase - Displays Private tier features for maximum security
-->

<script lang="ts">
  import { canUseFeature, currentPlan, isProUser } from '../../stores/plan.store';
  import { PlanType } from '../../types';
  import Upgrade from '../Upgrade.svelte';

  let { 
    className = '',
    variant = 'card' // 'card', 'banner', 'modal'
  } = $props();

  let plan = $derived($currentPlan);
  let isProOrHigher = $derived($isProUser);
  let showUpgradeModal = $state(false);

  const privateFeatures = [
    {
      icon: '🔒',
      title: 'Air-Gapped Signing',
      description: 'Sign transactions offline for maximum security',
      feature: 'air_gapped_signing'
    },
    {
      icon: '🛡️',
      title: 'Zero-Knowledge Proofs',
      description: 'Private transaction verification with mathematical proofs',
      feature: 'zero_knowledge_proofs'
    },
    {
      icon: '💾',
      title: 'Secure Key Backup',
      description: 'Military-grade encrypted backup and recovery',
      feature: 'private_key_backup'
    },
    {
      icon: '🔐',
      title: 'Hardware Integration',
      description: 'Deep integration with hardware security modules',
      feature: 'hardware_integration'
    },
    {
      icon: '🕵️',
      title: 'Anonymous Transactions',
      description: 'Enhanced privacy for all blockchain interactions',
      feature: 'anonymous_transactions'
    },
    {
      icon: '🏗️',
      title: 'Private Node Access',
      description: 'Connect to your own private blockchain nodes',
      feature: 'private_node_access'
    },
    {
      icon: '🔍',
      title: 'Advanced Forensics',
      description: 'Detailed transaction analysis and compliance tools',
      feature: 'advanced_forensics'
    },
    {
      icon: '☁️',
      title: 'Private Cloud',
      description: 'Dedicated secure cloud infrastructure',
      feature: 'private_cloud_deployment'
    }
  ];

  function handleUpgrade() {
    showUpgradeModal = true;
  }

  function getFeatureStatus(feature: string) {
    if (canUseFeature(feature)) return 'available';
    if (plan === PlanType.Private) return 'available';
    return 'locked';
  }
</script>

<div class="private-features-showcase {className}">
  {#if variant === 'banner'}
    <!-- Banner Style -->
    <div class="bg-gradient-to-r from-red-600 to-pink-700 text-white p-6 rounded-lg mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">🔒 Maximum Privacy & Security</h2>
          <p class="text-red-100">Enterprise-grade privacy features for ultimate protection</p>
        </div>
        <button
          onclick={handleUpgrade}
          class="bg-white text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
        >
          Upgrade to Private
        </button>
      </div>
    </div>
  
  {:else if variant === 'card'}
    <!-- Card Style -->
    <div class="yakkl-card p-6 border-2 border-red-200 dark:border-red-800">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-gradient-to-br from-red-600 to-pink-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">🔒</span>
        </div>
        <h2 class="text-xl font-bold mb-2">YAKKL Private</h2>
        <p class="text-gray-600 dark:text-gray-400">
          {#if plan === PlanType.Private}
            You have access to all Private security features!
          {:else if isProOrHigher}
            Upgrade to Private for maximum security and privacy
          {:else}
            Ultimate privacy and security features for enterprises
          {/if}
        </p>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {#each privateFeatures as feature}
          {@const status = getFeatureStatus(feature.feature)}
          <div class="flex items-start gap-3 p-3 rounded-lg border {
            status === 'available' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' :
            'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
          }">
            <div class="text-2xl">{feature.icon}</div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-medium text-sm">{feature.title}</h3>
                {#if status === 'available'}
                  <span class="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                    ✓ Active
                  </span>
                {:else}
                  <span class="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                    🔒 Private
                  </span>
                {/if}
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          </div>
        {/each}
      </div>

      <!-- Security Guarantee -->
      <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6">
        <div class="flex items-center gap-3">
          <div class="text-red-500 dark:text-red-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 class="font-medium text-red-700 dark:text-red-300">Security Guarantee</h4>
            <p class="text-sm text-red-600 dark:text-red-400">
              Bank-grade encryption, zero-knowledge architecture, and compliance with the highest security standards.
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      {#if plan !== PlanType.Private}
        <div class="text-center">
          <button
            onclick={handleUpgrade}
            class="bg-gradient-to-r from-red-600 to-pink-700 text-white px-6 py-3 rounded-lg font-medium hover:from-red-700 hover:to-pink-800 transition-all"
          >
            Upgrade to Private - $199.99/month
          </button>
          <p class="text-xs text-gray-500 mt-2">
            Enterprise-grade security and privacy
          </p>
        </div>
      {:else}
        <div class="text-center text-green-600 dark:text-green-400">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p class="font-medium">Maximum Security Enabled</p>
          <p class="text-xs text-gray-500 mt-1">All private features active</p>
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

<style>
  .private-features-showcase {
    /* Base styling for the showcase component */
  }
</style>