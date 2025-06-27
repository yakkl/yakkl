<!--
  UpgradeBanner - Shows upgrade prompts for trial users or basic plan users
-->

<script lang="ts">
  import { currentPlan, isOnTrial, planStore } from '../stores/plan.store';
  import { PlanType } from '../types';
  import Upgrade from './Upgrade.svelte';

  let { 
    showOnBasic = true,
    showOnTrial = true,
    className = '',
    position = 'top', // 'top', 'bottom', 'inline'
    autoShowInterval = 300000, // 5 minutes in ms
    fadeDuration = 10000 // 10 seconds to show
  } = $props();

  let plan = $derived($currentPlan);
  let trial = $derived($isOnTrial);
  let showUpgrade = $state(false);
  let dismissed = $state(false);
  let autoVisible = $state(false);
  let autoTimer: number | null = null;
  let fadeTimer: number | null = null;
  let isAnimating = $state(false);
  let hasInitialized = false;
  
  // Check dismissal immediately on component creation
  const initialDismissalData = typeof window !== 'undefined' ? localStorage.getItem('yakkl:upgrade-banner-dismissed') : null;
  if (initialDismissalData) {
    try {
      const data = JSON.parse(initialDismissalData);
      dismissed = true; // Set immediately to prevent flash
    } catch (e) {
      dismissed = true; // Set immediately to prevent flash
    }
  }
  
  // Constants for easy configuration
  const AUTO_SHOW_INTERVAL = autoShowInterval; // 5 minutes
  const FADE_DURATION = fadeDuration; // 10 seconds

  // Calculate trial days remaining
  let trialDaysLeft = $derived(() => {
    if (!trial || !$planStore.plan.trialEndsAt) return 0;
    const now = new Date();
    const trialEnd = new Date($planStore.plan.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  });

  // Determine if banner should show
  let shouldShow = $derived(() => {
    // If dismissed, only show if auto-triggered
    if (dismissed) {
      return autoVisible;
    }
    
    // Not dismissed, check if should show based on plan
    if (trial && showOnTrial && trialDaysLeft <= 7) return true; // Show in last 7 days
    if (plan === PlanType.Basic && showOnBasic) return true;
    
    return false;
  });

  function getBannerMessage() {
    if (trial) {
      if (trialDaysLeft <= 0) {
        return 'Your trial has expired. Upgrade to continue using Pro features.';
      } else if (trialDaysLeft === 1) {
        return 'Your trial expires tomorrow. Upgrade to keep Pro features.';
      } else {
        return `Your trial expires in ${trialDaysLeft} days. Upgrade to keep Pro features.`;
      }
    } else {
      return 'Upgrade to Pro to unlock advanced features and enhanced security.';
    }
  }

  function getBannerType() {
    if (trial && trialDaysLeft <= 1) return 'urgent';
    if (trial && trialDaysLeft <= 3) return 'warning';
    return 'info';
  }

  function getBannerColors() {
    const type = getBannerType();
    switch (type) {
      case 'urgent':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200';
    }
  }

  function handleUpgrade() {
    showUpgrade = true;
  }

  function handleDismiss() {
    console.log('UpgradeBanner: Dismissing banner');
    isAnimating = true;
    autoVisible = false;
    dismissed = true;
    
    // Clear any active timers
    clearAutoTimers();
    
    // Immediately store dismissal in localStorage with more permanent flag
    const dismissalData = {
      timestamp: Date.now(),
      dismissCount: (parseInt(localStorage.getItem('yakkl:upgrade-banner-dismiss-count') || '0') + 1)
    };
    localStorage.setItem('yakkl:upgrade-banner-dismissed', JSON.stringify(dismissalData));
    localStorage.setItem('yakkl:upgrade-banner-dismiss-count', dismissalData.dismissCount.toString());
    
    console.log('UpgradeBanner: Saved dismissal data:', dismissalData);
    
    setTimeout(() => {
      isAnimating = false;
    }, 300); // Wait for animation to complete
  }

  function onUpgradeComplete() {
    showUpgrade = false;
    dismissed = true;
    autoVisible = false;
    clearAutoTimers();
  }
  
  function clearAutoTimers() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
  }
  
  function startAutoShow() {
    // Only start auto-show for basic users who haven't permanently dismissed
    if (plan === PlanType.Basic && !dismissed) {
      autoTimer = setInterval(() => {
        // Check if user hasn't dismissed and not in upgrade flow
        if (!dismissed && !showUpgrade && !autoVisible) {
          // Double-check dismissal status from localStorage
          const dismissedTime = localStorage.getItem('yakkl:upgrade-banner-dismissed');
          if (!dismissedTime) {
            autoVisible = true;
            
            // Auto-hide after fade duration
            fadeTimer = setTimeout(() => {
              autoVisible = false;
            }, FADE_DURATION);
          }
        }
      }, AUTO_SHOW_INTERVAL);
    }
  }

  // Initialize dismissal status only once
  $effect(() => {
    if (!hasInitialized) {
      hasInitialized = true;
      
      const dismissedData = localStorage.getItem('yakkl:upgrade-banner-dismissed');
      console.log('UpgradeBanner: Checking dismissal status, data:', dismissedData);
      
      if (dismissedData) {
        try {
          const data = JSON.parse(dismissedData);
          const dismissedDate = new Date(data.timestamp || parseInt(dismissedData));
          const now = new Date();
          const hoursSinceDismissed = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60));
          const dismissCount = data.dismissCount || 1;
          
          console.log('UpgradeBanner: Hours since dismissed:', hoursSinceDismissed, 'Dismiss count:', dismissCount);
          
          // More aggressive dismissal for users who have dismissed multiple times
          let resetHours = trial ? 24 : 168; // Default: 24h for trial, 7 days for basic
          if (dismissCount >= 3) {
            resetHours = trial ? 168 : 720; // 7 days for trial, 30 days for basic after 3 dismissals
          }
          
          if (hoursSinceDismissed >= resetHours) {
            console.log('UpgradeBanner: Reset time reached, clearing dismissal');
            localStorage.removeItem('yakkl:upgrade-banner-dismissed');
            localStorage.removeItem('yakkl:upgrade-banner-dismiss-count');
            dismissed = false;
          } else {
            console.log('UpgradeBanner: Still within dismissal period, hiding banner');
            dismissed = true;
          }
        } catch (e) {
          // Handle old format
          const dismissedDate = new Date(parseInt(dismissedData));
          const now = new Date();
          const hoursSinceDismissed = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60));
          const resetHours = trial ? 24 : 168;
          
          if (hoursSinceDismissed >= resetHours) {
            localStorage.removeItem('yakkl:upgrade-banner-dismissed');
            localStorage.removeItem('yakkl:upgrade-banner-dismiss-count');
            dismissed = false;
          } else {
            dismissed = true;
          }
        }
      }
      
      // Start auto-show timer only if not dismissed
      if (!dismissed) {
        startAutoShow();
      }
    }
    
    // Cleanup on unmount
    return () => {
      clearAutoTimers();
    };
  });
</script>

{#if typeof window !== 'undefined' && shouldShow}
  <div 
    class={`upgrade-banner ${className} ${position === 'top' ? 'fixed top-0 left-0 right-0 z-40' : position === 'bottom' ? 'fixed bottom-0 left-0 right-0 z-40' : ''} 
           ${autoVisible ? 'animate-slideDown' : ''} ${isAnimating ? 'animate-slideUp' : ''}`}
  >
    <div class={`border-l-4 p-4 ${getBannerColors()} relative`}>
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            {#if getBannerType() === 'urgent'}
              <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            {:else if getBannerType() === 'warning'}
              <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {:else}
              <svg class="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            {/if}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium">
              {getBannerMessage()}
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <button
            onclick={handleUpgrade}
            class="bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-md text-sm font-medium shadow-sm border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors
              {getBannerType() === 'urgent' ? 'text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100' :
               getBannerType() === 'warning' ? 'text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100' :
               'text-indigo-800 dark:text-indigo-200 hover:text-indigo-900 dark:hover:text-indigo-100'}"
          >
            {trial ? 'Upgrade Now' : 'Upgrade to Pro'}
          </button>
          
          <button
            onclick={handleDismiss}
            class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            title="Dismiss"
            aria-label="Dismiss upgrade banner"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Upgrade Modal -->
<Upgrade bind:show={showUpgrade} onComplete={onUpgradeComplete} />

<style>
  .upgrade-banner {
    transition: all 0.3s ease-out;
  }
  
  .upgrade-banner.fixed {
    transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  }
  
  .animate-slideDown {
    animation: slideDown 0.5s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.3s ease-in forwards;
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(-100%);
      opacity: 0;
    }
  }
  
  /* Auto-fade animation for non-aggressive showing */
  .upgrade-banner.auto-show {
    animation: autoFadeIn 0.8s ease-out, autoFadeOut 0.8s ease-in 9.2s;
  }
  
  @keyframes autoFadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes autoFadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-20px); }
  }
</style>