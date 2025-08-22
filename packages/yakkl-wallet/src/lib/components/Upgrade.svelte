<script lang="ts">
  import { onMount } from 'svelte';
  import { planStore, currentPlan, isOnTrial } from '../stores/plan.store';
  import { canUseFeature } from '../utils/features';
  import { PlanType } from '../common';

  let {
    show = $bindable(false),
    onComplete = () => {},
    onClose = () => { show = false; },
    onCancel = () => { show = false; },
    className = ''
  } = $props();

  // Reactive state
  let plan = $derived($currentPlan);
  let trial = $derived($isOnTrial);
  let upgradeStep = $state('overview'); // 'overview', 'selecting', 'processing', 'success'
  let isProcessing = $state(false);
  let progress = $state(0);
  let selectedPlan = $state(PlanType.YAKKL_PRO); // TODO: Update to Pro Plus if needed
  let statusMessage = $state('');

  // Plan features configuration
  const planFeatures = {
    [PlanType.EXPLORER_MEMBER]: [
      'Basic wallet functionality',
      'Up to 3 accounts',
      'Standard networks',
      'Full Swap Functionality',
      'Strong Security',
      'Community support'
    ],
    [PlanType.FOUNDING_MEMBER]: [
      'Everything in Pro',
      'Founding member benefits',
      'Lifetime features',
      'Special recognition',
      'Direct founder access'
    ],
    [PlanType.EARLY_ADOPTER]: [
      'Everything in Pro',
      'Early adopter benefits',
      'Special pricing',
      'Beta access',
      'Priority feedback'
    ],
    [PlanType.YAKKL_PRO]: [
      'AI Assistant',
      'Unlimited accounts',
      'Advanced analytics',
      'Advanced security',
      'Custom networks',
      'Pro extensions',
      'Priority support',
      'Early access features',
      'Enhanced security',
      'DeFi integrations',
      'Portfolio tracking',
      'Advanced trading tools'
    ],
    [PlanType.YAKKL_PRO_PLUS]: [ // TODO: Maybe we add a Plus Plan Add-on? or MAX Plan?
      'Everything in Pro',
      'AI Assistant Plus',
      'Multiple Visualizations to data',
      'Rapid Support',
      'Custom Features',
      'Access to Innovation Lab',
      'Advanced Pro+ Security'
    ],
    [PlanType.ENTERPRISE]: [
      'Everything in Pro',
      'Multi-signature support',
      'White label solutions',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'Advanced compliance',
      'Audit trails',
      'Team management',
      'Enterprise SSO'
    ],
  };

  const planPricing = {
    [PlanType.EXPLORER_MEMBER]: { monthly: 0, yearly: 0 },
    [PlanType.FOUNDING_MEMBER]: { monthly: 0, yearly: 0 }, // Special pricing
    [PlanType.EARLY_ADOPTER]: { monthly: 7.99, yearly: 79.99 }, // Discounted
    [PlanType.YAKKL_PRO]: { monthly: 9.99, yearly: 99.99 },
    [PlanType.ENTERPRISE]: { monthly: 49.99, yearly: 499.99 },
  };

  const planColors = {
    [PlanType.EXPLORER_MEMBER]: 'from-gray-500 to-gray-600',
    [PlanType.FOUNDING_MEMBER]: 'from-purple-600 to-pink-600',
    [PlanType.EARLY_ADOPTER]: 'from-blue-600 to-cyan-600',
    [PlanType.YAKKL_PRO]: 'from-indigo-500 to-purple-600',
    [PlanType.ENTERPRISE]: 'from-yellow-500 to-orange-600',
  };

  function getAvailableUpgrades() {
    const plans = [PlanType.EXPLORER_MEMBER, PlanType.YAKKL_PRO, PlanType.ENTERPRISE];
    const currentIndex = plans.indexOf(plan);
    return plans.slice(currentIndex + 1);
  }

  function formatPlanName(planType: PlanType): string {
    return planType.replace(/_/g, ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  function getPlanIcon(planType: PlanType): string {
    switch (planType) {
      case PlanType.EXPLORER_MEMBER: return '🌟';
      case PlanType.FOUNDING_MEMBER: return '👑';
      case PlanType.EARLY_ADOPTER: return '🚀';
      case PlanType.YAKKL_PRO: return '💎';
      case PlanType.ENTERPRISE: return '🏢';
      default: return '📦';
    }
  }

  async function processUpgrade() {
    upgradeStep = 'processing';
    isProcessing = true;
    progress = 0;
    statusMessage = 'Initiating upgrade...';

    try {
      // Simulate upgrade process with progress updates
      const steps = [
        { message: 'Validating plan selection...', duration: 1000 },
        { message: 'Processing payment...', duration: 2000 },
        { message: 'Updating account permissions...', duration: 1500 },
        { message: 'Enabling new features...', duration: 1000 },
        { message: 'Finalizing upgrade...', duration: 500 }
      ];

      let totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
      let elapsed = 0;

      for (const step of steps) {
        statusMessage = step.message;

        // Animate progress during this step
        const startProgress = (elapsed / totalDuration) * 100;
        const endProgress = ((elapsed + step.duration) / totalDuration) * 100;

        const progressInterval = setInterval(() => {
          progress = Math.min(progress + 2, endProgress);
        }, 50);

        await new Promise(resolve => setTimeout(resolve, step.duration));
        clearInterval(progressInterval);

        elapsed += step.duration;
        progress = endProgress;
      }

      // Update plan store
      await planStore.upgradeTo(selectedPlan);

      upgradeStep = 'success';
      progress = 100;
      statusMessage = 'Upgrade completed successfully!';

      // Delay before calling completion callback
      setTimeout(() => {
        onComplete();
        show = false;
      }, 2000);

    } catch (error) {
      console.error('Upgrade failed:', error);
      statusMessage = 'Upgrade failed. Please try again.';
      isProcessing = false;
      upgradeStep = 'overview';
    }
  }

  function handleSelectPlan(planType: PlanType) {
    selectedPlan = planType;
    upgradeStep = 'selecting';
  }

  function confirmUpgrade() {
    processUpgrade();
  }

  function goBack() {
    upgradeStep = 'overview';
  }
</script>

{#if show}
  <div class="fixed inset-0 z-[1000] overflow-y-auto">
    <div class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <button class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick={() => show = false} aria-label="Close modal"></button>

      <!-- Modal content -->
      <div class="relative inline-block align-bottom bg-white dark:bg-zinc-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">

        {#if upgradeStep === 'overview'}
          <!-- Plan Overview -->
          <div class="text-center mb-6">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br {planColors[selectedPlan]} mb-4">
              <span class="text-2xl">{getPlanIcon(selectedPlan)}</span>
            </div>
            <h3 class="text-lg font-medium text-zinc-900 dark:text-white">
              Upgrade Your YAKKL Wallet
            </h3>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {trial ? 'Your trial is ending soon. ' : ''}Choose a plan that fits your needs
            </p>
          </div>

          <!-- Current Plan Status -->
          <div class="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm font-medium text-zinc-900 dark:text-white">Current Plan:</span>
                <span class="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  {formatPlanName(plan)}
                </span>
              </div>
              {#if trial}
                <div class="text-right">
                  <span class="text-xs text-orange-600 dark:text-orange-400">Trial</span>
                  <div class="text-xs text-zinc-500">
                    {$planStore.plan.trialEndsAt ? new Date($planStore.plan.trialEndsAt).toLocaleDateString() : 'Soon'}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Available Upgrades -->
          <div class="space-y-4 mb-6">
            {#each getAvailableUpgrades() as planType}
              {@const pricing = planPricing[planType]}
              <button
                class="w-full text-left border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer transition-colors"
                onclick={() => handleSelectPlan(planType)}
                onkeydown={(e) => e.key === 'Enter' && handleSelectPlan(planType)}
                aria-label={`Select ${formatPlanName(planType)} plan`}
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center">
                    <span class="text-2xl mr-3">{getPlanIcon(planType)}</span>
                    <div>
                      <h4 class="font-medium text-zinc-900 dark:text-white">
                        {formatPlanName(planType)}
                      </h4>
                      <p class="text-sm text-zinc-600 dark:text-zinc-400">
                        Perfect for {planType === PlanType.YAKKL_PRO ? 'advanced users' :
                                    planType === PlanType.ENTERPRISE ? 'businesses' :
                                    'getting started'}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold text-zinc-900 dark:text-white">
                      {pricing.monthly > 0 ? `$${pricing.monthly}` : 'Free'}
                    </div>
                    {#if pricing.monthly > 0}
                      <div class="text-xs text-zinc-500">/month</div>
                    {/if}
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  {#each planFeatures[planType].slice(0, 4) as feature}
                    <div class="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                      <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </div>
                  {/each}
                </div>
              </button>
            {/each}
          </div>

        {:else if upgradeStep === 'selecting'}
          <!-- Plan Selection Details -->
          <div class="text-center mb-6">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br {planColors[selectedPlan]} mb-4">
              <span class="text-2xl">{getPlanIcon(selectedPlan)}</span>
            </div>
            <h3 class="text-lg font-medium text-zinc-900 dark:text-white">
              {formatPlanName(selectedPlan)} Plan
            </h3>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Review your plan selection
            </p>
          </div>

          <!-- Plan Details -->
          <div class="bg-gradient-to-br {planColors[selectedPlan]} rounded-lg p-6 text-white mb-6">
            <div class="text-center">
              <div class="text-3xl font-bold mb-2">
                ${planPricing[selectedPlan].monthly}/month
              </div>
              <div class="text-sm opacity-80">
                or ${planPricing[selectedPlan].yearly}/year (save 17%)
              </div>
            </div>
          </div>

          <!-- Features List -->
          <div class="space-y-3 mb-6">
            <h4 class="font-medium text-zinc-900 dark:text-white">Included Features:</h4>
            {#each planFeatures[selectedPlan] as feature}
              <div class="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                <svg class="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </div>
            {/each}
          </div>

        {:else if upgradeStep === 'processing'}
          <!-- Processing -->
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 mb-4">
              <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-4">
              Processing Upgrade
            </h3>

            <!-- Progress Bar -->
            <div class="w-full max-w-md mx-auto mb-4">
              <div class="flex mb-2 items-center justify-between">
                <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {statusMessage}
                </span>
                <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {Math.round(progress)}%
                </span>
              </div>
              <div class="overflow-hidden h-2 text-xs flex rounded bg-indigo-200 dark:bg-indigo-800">
                <div
                  style="width: {progress}%"
                  class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-300"
                ></div>
              </div>
            </div>
          </div>

        {:else if upgradeStep === 'success'}
          <!-- Success -->
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2">
              Upgrade Successful!
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Welcome to {formatPlanName(selectedPlan)}! Your new features are now available.
            </p>
            <div class="text-xs text-zinc-500">
              Redirecting to your wallet...
            </div>
          </div>
        {/if}

        <!-- Actions -->
        {#if upgradeStep === 'overview'}
          <div class="flex justify-end space-x-3">
            <button
              onclick={() => onCancel()}
              class="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        {:else if upgradeStep === 'selecting'}
          <div class="flex justify-between">
            <button
              onclick={goBack}
              class="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              Back
            </button>
            <div class="space-x-3">
              <button
                onclick={() => onCancel()}
                class="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onclick={confirmUpgrade}
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        {:else if upgradeStep === 'processing'}
          <!-- No actions during processing -->
        {:else if upgradeStep === 'success'}
          <!-- Auto-closes -->
        {/if}
      </div>
    </div>
  </div>
{/if}
