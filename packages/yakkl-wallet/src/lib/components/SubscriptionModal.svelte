<script lang="ts">
  import { SubscriptionService } from '../features/payment/subscription/subscription.service';
  import { planStore, currentPlan, isOnTrial } from '../stores/plan.store';
  import { currentAccount } from '../stores/account.store';
  import { uiStore } from '../stores/ui.store';
  import { PlanType } from '../config/features';

  let {
    show = $bindable(false),
    onClose = null
  } = $props();

  const subscriptionService = SubscriptionService.getInstance();

  // State
  let step = $state('plans'); // 'plans' | 'payment' | 'confirmation'
  let availablePlans = $state([]);
  let currentSubscription = $state(null);
  let selectedPlan = $state(null);
  let paymentMethods = $state([]);
  let selectedPaymentMethod = $state(null);
  let couponCode = $state('');
  let couponDiscount = $state(null);
  let loading = $state(false);
  let error = $state('');

  // Reactive values
  let account = $derived($currentAccount);
  let userPlan = $derived($currentPlan);
  let onTrial = $derived($isOnTrial);

  // Load data when modal opens
  $effect(() => {
    if (show) {
      loadSubscriptionData();
    }
  });

  async function loadSubscriptionData() {
    loading = true;
    try {
      const [plansRes, subscriptionRes, paymentMethodsRes] = await Promise.all([
        subscriptionService.getAvailablePlans(),
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getPaymentMethods()
      ]);

      if (plansRes.success && plansRes.data) {
        availablePlans = plansRes.data;
      }

      if (subscriptionRes.success && subscriptionRes.data) {
        currentSubscription = subscriptionRes.data;
      }

      if (paymentMethodsRes.success && paymentMethodsRes.data) {
        paymentMethods = paymentMethodsRes.data;
      }
    } catch (err) {
      error = 'Failed to load subscription data';
    } finally {
      loading = false;
    }
  }

  async function selectPlan(plan: any) {
    selectedPlan = plan;
    
    if (plan.price === 0) {
      // Free plan, no payment needed
      await subscribeToPlan();
    } else {
      step = 'payment';
    }
  }

  async function subscribeToPlan() {
    if (!selectedPlan) return;

    loading = true;
    error = '';

    try {
      let response;
      
      if (selectedPlan.price === 0) {
        // Cancel current subscription for free plan
        if (currentSubscription) {
          response = await subscriptionService.cancelSubscription(true);
        } else {
          // Already on free plan
          response = { success: true };
        }
      } else {
        if (!selectedPaymentMethod) {
          error = 'Please select a payment method';
          return;
        }
        
        response = await subscriptionService.subscribeToPlan(
          selectedPlan.id,
          selectedPaymentMethod.id,
          couponCode || undefined
        );
      }

      if (response.success) {
        // Update plan store
        await planStore.upgradeTo(selectedPlan.type);
        
        step = 'confirmation';
        
        uiStore.showSuccess(
          'Subscription Updated',
          `Successfully ${selectedPlan.price === 0 ? 'downgraded to' : 'upgraded to'} ${selectedPlan.name} plan!`
        );
      } else {
        error = response.error?.message || 'Subscription failed';
      }
    } catch (err) {
      error = 'Subscription failed';
    } finally {
      loading = false;
    }
  }

  async function startTrial(planId: string) {
    loading = true;
    error = '';

    try {
      const response = await subscriptionService.startTrial(planId);

      if (response.success) {
        // Update plan store
        await planStore.upgradeTo(PlanType.PRO);
        
        step = 'confirmation';
        
        uiStore.showSuccess(
          'Trial Started',
          'Your Pro trial has been activated!'
        );
      } else {
        error = response.error?.message || 'Failed to start trial';
      }
    } catch (err) {
      error = 'Failed to start trial';
    } finally {
      loading = false;
    }
  }

  async function validateCoupon() {
    if (!couponCode.trim()) return;

    loading = true;
    try {
      const response = await subscriptionService.validateCoupon(couponCode);
      
      if (response.success && response.data?.valid) {
        couponDiscount = response.data;
        uiStore.showSuccess('Coupon Applied', `${response.data.discount}% discount applied!`);
      } else {
        error = 'Invalid coupon code';
        couponDiscount = null;
      }
    } catch (err) {
      error = 'Failed to validate coupon';
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    step = 'plans';
    selectedPlan = null;
    selectedPaymentMethod = null;
    couponCode = '';
    couponDiscount = null;
    error = '';
    if (onClose) onClose();
  }

  function formatPrice(price: number, currency: string, interval: string): string {
    if (price === 0) return 'Free';
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price);
    return `${formatted}/${interval}`;
  }

  function calculateDiscountedPrice(plan: any): number {
    if (!couponDiscount) return plan.price;
    
    if (couponDiscount.type === 'percent') {
      return plan.price * (1 - couponDiscount.discount / 100);
    } else {
      return Math.max(0, plan.price - couponDiscount.discount);
    }
  }

  function getPlanFeatureColor(plan: any): string {
    switch (plan.type) {
      case PlanType.BASIC:
        return 'text-gray-600 dark:text-gray-400';
      case PlanType.PRO:
        return 'text-blue-600 dark:text-blue-400';
      case PlanType.ENTERPRISE:
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }
</script>

{#if show}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
    onclick={closeModal}
    onkeydown={e => e.key === 'Escape' && closeModal()}
    role="button"
    tabindex="0">
    <div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 min-w-[500px] w-full max-w-4xl flex flex-col gap-4 animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto"
      onclick={e => e.stopPropagation()}
      onkeydown={e => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="0">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xl">⭐</span>
          <span class="font-bold text-xl">Subscription Plans</span>
        </div>
        <button 
          class="text-2xl text-gray-400 hover:text-red-500 transition-colors" 
          onclick={closeModal}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>

      {#if !account}
        <!-- No Account -->
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No account selected</p>
        </div>
      {:else}
        <!-- Current Subscription Status -->
        {#if currentSubscription || onTrial}
          <div class="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4 mb-4">
            <h4 class="font-semibold mb-2">Current Subscription</h4>
            {#if onTrial}
              <p class="text-sm">🎉 You're currently on a Pro trial!</p>
            {:else if currentSubscription}
              <div class="text-sm space-y-1">
                <p><strong>Plan:</strong> {currentSubscription.planId}</p>
                <p><strong>Status:</strong> {currentSubscription.status}</p>
                <p><strong>Next billing:</strong> {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Step 1: Plan Selection -->
        {#if step === 'plans'}
          <div class="grid md:grid-cols-3 gap-4">
            {#each availablePlans as plan}
              <div class="border rounded-xl p-4 relative hover:shadow-lg transition-shadow {plan.popular ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'} {userPlan === plan.type ? 'ring-2 ring-green-500' : ''}">
                {#if plan.popular}
                  <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </div>
                {/if}
                
                {#if userPlan === plan.type}
                  <div class="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Current Plan
                  </div>
                {/if}

                <div class="text-center mb-4">
                  <h3 class="text-xl font-bold mb-2">{plan.name}</h3>
                  <div class="text-3xl font-bold {getPlanFeatureColor(plan)} mb-1">
                    {formatPrice(plan.price, plan.currency, plan.interval)}
                  </div>
                  {#if plan.discount}
                    <div class="text-sm text-green-600 dark:text-green-400">
                      Save {plan.discount}%
                    </div>
                  {/if}
                </div>

                <ul class="space-y-2 mb-6 text-sm">
                  {#each plan.features as feature}
                    <li class="flex items-center gap-2">
                      <span class="text-green-500">✓</span>
                      <span>{feature}</span>
                    </li>
                  {/each}
                </ul>

                <div class="space-y-2">
                  {#if userPlan === plan.type}
                    <button class="w-full p-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg cursor-not-allowed">
                      Current Plan
                    </button>
                  {:else if plan.type === PlanType.PRO && !onTrial && userPlan === PlanType.BASIC}
                    <!-- Show trial option for Pro plan -->
                    <button 
                      class="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                      onclick={() => startTrial(plan.id)}
                      disabled={loading}
                    >
                      Start Free Trial
                    </button>
                    <button 
                      class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                      onclick={() => selectPlan(plan)}
                      disabled={loading}
                    >
                      Subscribe Now
                    </button>
                  {:else}
                    <button 
                      class="w-full p-3 {plan.price === 0 ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-semibold transition-colors"
                      onclick={() => selectPlan(plan)}
                      disabled={loading}
                    >
                      {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Step 2: Payment Method -->
        {#if step === 'payment'}
          <div class="space-y-4">
            <!-- Selected Plan Summary -->
            {#if selectedPlan}
              <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h4 class="font-semibold mb-2">Selected Plan: {selectedPlan.name}</h4>
                <div class="flex justify-between items-center">
                  <span>Price:</span>
                  <span class="font-semibold">
                    {formatPrice(calculateDiscountedPrice(selectedPlan), selectedPlan.currency, selectedPlan.interval)}
                    {#if couponDiscount}
                      <span class="text-sm text-green-600 line-through ml-2">
                        {formatPrice(selectedPlan.price, selectedPlan.currency, selectedPlan.interval)}
                      </span>
                    {/if}
                  </span>
                </div>
              </div>
            {/if}

            <!-- Coupon Code -->
            <div>
              <label class="block text-sm font-medium mb-2">Coupon Code (Optional)</label>
              <div class="flex gap-2">
                <input 
                  type="text" 
                  bind:value={couponCode} 
                  placeholder="Enter coupon code" 
                  class="flex-1 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-white"
                />
                <button 
                  class="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  onclick={validateCoupon}
                  disabled={!couponCode.trim() || loading}
                >
                  Apply
                </button>
              </div>
              {#if couponDiscount}
                <div class="text-sm text-green-600 mt-1">
                  ✓ {couponDiscount.discount}% discount applied
                </div>
              {/if}
            </div>

            <!-- Payment Methods -->
            <div>
              <label class="block text-sm font-medium mb-2">Payment Method</label>
              {#if paymentMethods.length === 0}
                <div class="text-center py-8 text-gray-500">
                  <p class="mb-4">No payment methods found</p>
                  <button class="text-blue-500 hover:text-blue-600">
                    Add Payment Method
                  </button>
                </div>
              {:else}
                <div class="space-y-2">
                  {#each paymentMethods as method}
                    <button 
                      class="w-full p-3 border rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors {selectedPaymentMethod?.id === method.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}"
                      onclick={() => selectedPaymentMethod = method}
                    >
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="font-medium">{method.details.brand} •••• {method.details.last4}</div>
                          <div class="text-sm text-gray-500">Expires {method.details.exp_month}/{method.details.exp_year}</div>
                        </div>
                        {#if method.isDefault}
                          <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            Default
                          </span>
                        {/if}
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button 
                class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onclick={() => step = 'plans'}
              >
                Back
              </button>
              <button 
                class="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
                onclick={subscribeToPlan}
                disabled={!selectedPaymentMethod || loading}
              >
                {#if loading}
                  Processing...
                {:else}
                  Subscribe
                {/if}
              </button>
            </div>
          </div>
        {/if}

        <!-- Step 3: Confirmation -->
        {#if step === 'confirmation'}
          <div class="text-center py-8">
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-xl font-semibold mb-2">Subscription Updated!</h3>
            {#if selectedPlan}
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                You're now on the {selectedPlan.name} plan.
              </p>
              {#if selectedPlan.price > 0}
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <div class="text-sm">
                    <div><strong>Next billing:</strong> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                    <div><strong>Amount:</strong> {formatPrice(selectedPlan.price, selectedPlan.currency, selectedPlan.interval)}</div>
                  </div>
                </div>
              {/if}
            {/if}
            <button 
              class="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              onclick={closeModal}
            >
              Done
            </button>
          </div>
        {/if}

        <!-- Error Display -->
        {#if error}
          <div class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        {/if}

        <!-- Loading Overlay -->
        {#if loading}
          <div class="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center rounded-2xl">
            <div class="flex items-center gap-3">
              <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading...</span>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}