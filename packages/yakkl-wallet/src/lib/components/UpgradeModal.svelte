<!-- UpgradeModal.svelte - Shows upgrade options when accessing Pro features -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { planLevelService } from '$lib/services/plan-level.service';

  interface Props {
    show: boolean;
    feature?: string;
    onClose: () => void;
    onUpgrade: () => void;
  }

  let { show = $bindable(), feature = '', onClose, onUpgrade }: Props = $props();

  const planComparison = planLevelService.getPlanComparison();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

{#if show}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    onclick={handleBackdropClick}
  >
    <!-- Modal -->
    <div
      class="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      transition:fly={{ y: 20, duration: 300 }}
      onclick|stopPropagation
    >
      <!-- Header -->
      <div class="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
        <button
          onclick={onClose}
          class="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="text-center">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold mb-2">Unlock Premium Features</h2>
          {#if feature}
            <p class="text-white/90">{feature} is a Pro feature</p>
          {:else}
            <p class="text-white/90">Get access to advanced security and authentication</p>
          {/if}
        </div>
      </div>

      <!-- Content -->
      <div class="p-8 overflow-y-auto max-h-[60vh]">
        <!-- Plan Comparison -->
        <div class="grid md:grid-cols-3 gap-6 mb-8">
          <!-- Explorer Plan -->
          <div class="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <div class="mb-4">
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white">{planComparison.explorer.name}</h3>
              <p class="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{planComparison.explorer.price}</p>
            </div>
            <ul class="space-y-3">
              {#each planComparison.explorer.features as feature}
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">{feature}</span>
                </li>
              {/each}
            </ul>
          </div>

          <!-- Pro Plan (Highlighted) -->
          <div class="rounded-xl border-2 border-indigo-500 bg-gradient-to-b from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 relative">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full">
              RECOMMENDED
            </div>
            <div class="mb-4">
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white">{planComparison.pro.name}</h3>
              <p class="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{planComparison.pro.price}</p>
            </div>
            <ul class="space-y-3">
              {#each planComparison.pro.features as feature}
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">{feature}</span>
                </li>
              {/each}
            </ul>
          </div>

          <!-- Enterprise Plan -->
          <div class="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <div class="mb-4">
              <h3 class="text-lg font-bold text-zinc-900 dark:text-white">{planComparison.enterprise.name}</h3>
              <p class="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{planComparison.enterprise.price}</p>
            </div>
            <ul class="space-y-3">
              {#each planComparison.enterprise.features as feature}
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">{feature}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <!-- Special Offers -->
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 mb-8">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h4 class="font-bold text-zinc-900 dark:text-white mb-1">Limited Time Offer</h4>
              <p class="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                Become a Founding Member and get lifetime Pro features at a discounted rate!
              </p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">
                Only available for the first 1,000 users. 423 spots remaining.
              </p>
            </div>
          </div>
        </div>

        <!-- Security Benefits -->
        <div class="text-center mb-6">
          <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">Why Upgrade?</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">Enhanced Security</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">Faster Access</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">Advanced Protection</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">Priority Support</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-zinc-200 dark:border-zinc-700 p-6 bg-zinc-50 dark:bg-zinc-800/50">
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            onclick={onUpgrade}
            class="flex-1 py-3 px-6 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Upgrade to Pro Now
          </button>
          <button
            onclick={onClose}
            class="flex-1 sm:flex-initial py-3 px-6 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Maybe Later
          </button>
        </div>
        <p class="text-xs text-center text-zinc-500 dark:text-zinc-500 mt-4">
          Cancel anytime. No hidden fees. Secure payment processing.
        </p>
      </div>
    </div>
  </div>
{/if}