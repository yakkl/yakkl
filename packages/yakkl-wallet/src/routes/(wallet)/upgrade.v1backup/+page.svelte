<!--
  Upgrade Page - Comprehensive overview of all plan tiers and features
-->

<script lang="ts">
  import { currentPlan, isOnTrial } from '$lib/stores/plan.store';
  import { PlanType } from '$lib/types';
  import ProFeatures from '$lib/components/showcase/ProFeatures.svelte';
  import PrivateFeatures from '$lib/components/showcase/PrivateFeatures.svelte';
  import Upgrade from '$lib/components/Upgrade.svelte';

  let plan = $derived($currentPlan);
  let trial = $derived($isOnTrial);
  let showUpgradeModal = $state(false);

  const planComparison = [
    {
      name: 'Basic',
      price: 'Free',
      description: 'Essential wallet features for getting started',
      features: [
        'View balance and transactions',
        'Send and receive tokens',
        'Up to 3 accounts',
        'Basic security features',
        'Community support'
      ],
      highlight: false,
      planType: PlanType.Basic
    },
    {
      name: 'Pro',
      price: '$9.99/month',
      description: 'Advanced features for power users',
      features: [
        'Everything in Basic',
        'Advanced analytics',
        'AI assistant',
        'Token swapping',
        'Buy/sell crypto',
        'DeFi integrations',
        'Priority support',
        'Unlimited accounts'
      ],
      highlight: true,
      planType: PlanType.Pro
    },
    {
      name: 'Enterprise',
      price: '$49.99/month',
      description: 'Business features and team management',
      features: [
        'Everything in Pro',
        'Team management',
        'Multi-signature wallets',
        'White label solutions',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantees'
      ],
      highlight: false,
      planType: PlanType.Enterprise
    },
    {
      name: 'Private',
      price: '$199.99/month',
      description: 'Maximum privacy and security',
      features: [
        'Everything in Enterprise',
        'Air-gapped signing',
        'Zero-knowledge proofs',
        'Private node access',
        'Anonymous transactions',
        'Military-grade encryption',
        'Private cloud deployment'
      ],
      highlight: false,
      planType: PlanType.Private
    }
  ];

  function handlePlanUpgrade(targetPlan: PlanType) {
    showUpgradeModal = true;
  }
</script>

<div class="p-4 space-y-8">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-3xl font-bold mb-4">Choose Your Plan</h1>
    <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
      {#if trial}
        Your trial is active! Choose a plan to continue enjoying premium features.
      {:else if plan === PlanType.Basic}
        Unlock the full potential of your crypto wallet with advanced features and enhanced security.
      {:else}
        You're currently on the <strong>{plan}</strong> plan. Upgrade for even more features!
      {/if}
    </p>
  </div>

  <!-- Current Plan Status -->
  {#if trial}
    <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div class="flex items-center gap-3">
        <div class="text-orange-500">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 class="font-medium text-orange-700 dark:text-orange-300">Trial Active</h3>
          <p class="text-sm text-orange-600 dark:text-orange-400">
            You're currently enjoying Pro features. Choose a plan to continue after your trial ends.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Plan Comparison Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {#each planComparison as planOption}
      <div class="yakkl-card p-6 relative {planOption.highlight ? 'border-2 border-indigo-500 dark:border-indigo-400' : ''}">
        {#if planOption.highlight}
          <div class="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span class="bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              Most Popular
            </span>
          </div>
        {/if}

        <div class="text-center mb-6">
          <h3 class="text-xl font-bold mb-2">{planOption.name}</h3>
          <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
            {planOption.price}
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {planOption.description}
          </p>
        </div>

        <ul class="space-y-2 mb-6">
          {#each planOption.features as feature}
            <li class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          {/each}
        </ul>

        <div class="text-center">
          {#if plan === planOption.planType}
            <div class="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm font-medium">
              Current Plan
            </div>
          {:else if planOption.planType === PlanType.Basic}
            <button
              disabled
              class="w-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Downgrade Not Available
            </button>
          {:else}
            <button
              onclick={() => handlePlanUpgrade(planOption.planType)}
              class="w-full {planOption.highlight ?
                'bg-indigo-600 hover:bg-indigo-700 text-white' :
                'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
              } px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {trial && planOption.planType === PlanType.Pro ? 'Continue with Pro' : 'Upgrade'}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Feature Showcases -->
  <div class="space-y-8">
    <!-- Pro Features -->
    <ProFeatures variant="card" />

    <!-- Private Features -->
    <PrivateFeatures variant="card" />
  </div>

  <!-- FAQ Section -->
  <div class="yakkl-card p-6">
    <h2 class="text-xl font-bold mb-4">Frequently Asked Questions</h2>
    <div class="space-y-4">
      <div>
        <h3 class="font-medium mb-2">Can I change my plan anytime?</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
        </p>
      </div>

      <div>
        <h3 class="font-medium mb-2">Is there a free trial?</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          New users get a 14-day free trial of Pro features. No credit card required.
        </p>
      </div>

      <div>
        <h3 class="font-medium mb-2">What payment methods do you accept?</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          We accept all major credit cards, bank transfers, and cryptocurrency payments.
        </p>
      </div>

      <div>
        <h3 class="font-medium mb-2">Is my data secure?</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Absolutely. We use bank-grade encryption and never store your private keys or personal data.
        </p>
      </div>
    </div>
  </div>
</div>

<!-- Upgrade Modal -->
<Upgrade
  bind:show={showUpgradeModal}
  onComplete={() => showUpgradeModal = false}
  onCancel={() => showUpgradeModal = false}
/>
