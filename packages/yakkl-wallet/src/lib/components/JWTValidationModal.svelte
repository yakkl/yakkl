<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Clock, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-svelte';
  import { log } from '$lib/common/logger-wrapper';

  // JWT validation status types
  type ValidationStatus = 'checking' | 'valid' | 'invalid' | 'grace_period' | 'error';

  interface Props {
    show?: boolean;
    status?: ValidationStatus;
    message?: string;
    gracePeriodRemaining?: number;
    onClose?: () => void;
    onRetry?: () => void;
    onLogout?: () => void;
  }

  let {
    show = $bindable(false),
    status = 'checking',
    message = '',
    gracePeriodRemaining = 0,
    onClose = () => { show = false; },
    onRetry = () => {},
    onLogout = () => {}
  }: Props = $props();

  let countdown: ReturnType<typeof setInterval> | null = null;
  let timeRemaining = $state(gracePeriodRemaining);

  // Auto-hide for valid status
  let autoHideTimeout: ReturnType<typeof setTimeout> | null = null;

  // Format time as MM:SS
  const formattedTime = $derived(() => {
    try {
      const validTimeRemaining = Math.max(0, Math.floor(timeRemaining));
      const minutes = Math.floor(validTimeRemaining / 60);
      const seconds = validTimeRemaining % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      log.error('Error formatting time:', false, error);
      return '0:00';
    }
  });

  // Status-based styling
  const statusConfig = $derived(() => {
    switch (status) {
      case 'checking':
        return {
          icon: Shield,
          iconClass: 'text-blue-500 animate-spin',
          titleClass: 'text-blue-800 dark:text-blue-200',
          borderClass: 'border-blue-500',
          bgClass: 'bg-blue-50 dark:bg-blue-900/20',
          textClass: 'text-blue-800 dark:text-blue-200',
          title: 'Validating Authentication',
          showActions: false
        };
      case 'valid':
        return {
          icon: CheckCircle,
          iconClass: 'text-green-500',
          titleClass: 'text-green-800 dark:text-green-200',
          borderClass: 'border-green-500',
          bgClass: 'bg-green-50 dark:bg-green-900/20',
          textClass: 'text-green-800 dark:text-green-200',
          title: 'Authentication Valid',
          showActions: false
        };
      case 'grace_period':
        return {
          icon: Clock,
          iconClass: 'text-orange-500',
          titleClass: 'text-orange-800 dark:text-orange-200',
          borderClass: 'border-orange-500',
          bgClass: 'bg-orange-50 dark:bg-orange-900/20',
          textClass: 'text-orange-800 dark:text-orange-200',
          title: 'Authentication Grace Period',
          showActions: true
        };
      case 'invalid':
        return {
          icon: XCircle,
          iconClass: 'text-red-500',
          titleClass: 'text-red-800 dark:text-red-200',
          borderClass: 'border-red-500',
          bgClass: 'bg-red-50 dark:bg-red-900/20',
          textClass: 'text-red-800 dark:text-red-200',
          title: gracePeriodRemaining > 0 ? 'Security Alert - Auto-Closing' : 'Authentication Invalid',
          showActions: true
        };
      case 'error':
        return {
          icon: AlertTriangle,
          iconClass: 'text-yellow-500',
          titleClass: 'text-yellow-800 dark:text-yellow-200',
          borderClass: 'border-yellow-500',
          bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
          textClass: 'text-yellow-800 dark:text-yellow-200',
          title: 'Authentication Error',
          showActions: true
        };
    }
  });

  // Handle countdown for grace period
  $effect(() => {
    if (status === 'grace_period' && gracePeriodRemaining > 0) {
      timeRemaining = gracePeriodRemaining;

      if (countdown) {
        clearInterval(countdown);
      }

      countdown = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
          if (countdown) {
            clearInterval(countdown);
            countdown = null;
          }
          // Grace period ended - close modal
          show = false;
        }
      }, 1000);

      return () => {
        if (countdown) {
          clearInterval(countdown);
          countdown = null;
        }
      };
    }
  });

  // Auto-hide for valid status
  $effect(() => {
    if (status === 'valid' && show) {
      autoHideTimeout = setTimeout(() => {
        show = false;
      }, 2000); // Hide after 2 seconds for valid status

      return () => {
        if (autoHideTimeout) {
          clearTimeout(autoHideTimeout);
          autoHideTimeout = null;
        }
      };
    }
  });

  // Cleanup on destroy
  onDestroy(() => {
    if (countdown) {
      clearInterval(countdown);
    }
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
    }
  });

  function handleRetry() {
    onRetry();
    show = false;
  }

  function handleLogout() {
    onLogout();
    show = false;
  }

  function handleClose() {
    onClose();
    show = false;
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (!show) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
        } else if (event.key === 'Enter' && statusConfig().showActions) {
      event.preventDefault();
      event.stopPropagation();
      handleRetry();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" transition:fade>
    <div class="w-full max-w-md p-4">
      <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 border {statusConfig().borderClass}">
        <div class="flex items-start gap-3">
          {#if statusConfig().icon}
            {@const Icon = statusConfig().icon}
            <Icon class="h-5 w-5 {statusConfig().iconClass} mt-0.5" />
          {/if}
          <div class="flex-1">
            <h3 class="text-lg font-semibold {statusConfig().titleClass} mb-2">
              {statusConfig().title}
            </h3>

            <div class="space-y-4">
                             <!-- Main message -->
               <div class="{statusConfig().textClass}">
                 {#if status === 'checking'}
                   <p>Verifying your authentication credentials...</p>
                 {:else if status === 'valid'}
                   <p>Your session is authenticated and secure.</p>
                 {:else if status === 'grace_period'}
                   <p>Authentication is being verified. Grace period active for <strong>{formattedTime}</strong>.</p>
                 {:else if status === 'invalid'}
                   {#if gracePeriodRemaining > 0}
                     <!-- Security countdown mode -->
                     <p><span class="font-semibold">Security Alert:</span> {message}</p>
                     <div class="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-500">
                       <p class="font-bold text-red-700 dark:text-red-300">
                         Closing in <span class="text-xl font-mono">{gracePeriodRemaining}</span> seconds
                       </p>
                     </div>
                   {:else}
                     <p>Your session has expired or is invalid. Please log in again.</p>
                   {/if}
                 {:else if status === 'error'}
                   <p>There was an error validating your authentication.</p>
                 {/if}
               </div>

              <!-- Custom message if provided -->
              {#if message}
                <p class="text-sm {statusConfig().textClass} opacity-75">
                  {message}
                </p>
              {/if}

                             <!-- Grace period info -->
               {#if status === 'grace_period'}
                 <div class="{statusConfig().bgClass} p-4 rounded-lg">
                   <p class="text-sm {statusConfig().textClass}">
                     We're ensuring your session is secure. This verification helps protect your wallet from unauthorized access.
                   </p>
                 </div>
               {:else if status === 'invalid' && gracePeriodRemaining > 0}
                 <!-- Security countdown info -->
                 <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                   <p class="text-sm text-red-800 dark:text-red-200">
                     <span class="font-semibold">Security Protection:</span> Your session authentication has failed.
                     The wallet will automatically close to protect your funds and data. You can close this dialog
                     to continue the countdown in the background, or logout immediately.
                   </p>
                 </div>
               {/if}

                             <!-- Actions -->
               {#if statusConfig().showActions}
                 <div class="flex gap-3 mt-4">
                   {#if status === 'invalid' && gracePeriodRemaining > 0}
                     <!-- Security countdown mode actions -->
                     <button
                       onclick={handleClose}
                       class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                     >
                       Close & Continue Countdown
                     </button>
                     <button
                       onclick={handleLogout}
                       class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                     >
                       Logout Now
                     </button>
                   {:else}
                     <!-- Regular modal actions -->
                     {#if status === 'grace_period' || status === 'error'}
                       <button
                         onclick={handleRetry}
                         class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                       >
                         Retry Validation
                       </button>
                     {/if}

                     {#if status === 'invalid' || status === 'error'}
                       <button
                         onclick={handleLogout}
                         class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                       >
                         Log Out
                       </button>
                     {/if}

                     {#if status === 'grace_period'}
                       <button
                         onclick={handleClose}
                         class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                       >
                         Continue
                       </button>
                     {/if}
                   {/if}
                 </div>
               {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
