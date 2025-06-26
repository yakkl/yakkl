<script lang="ts">
  import { onMount } from 'svelte';
  import DockLauncher from './lib/components/DockLauncher.svelte';
  import AIHelpButton from './lib/components/AIHelpButton.svelte';
  import Header from './lib/components/Header.svelte';
  import Footer from './lib/components/Footer.svelte';
  import { accountStore, currentAccount } from './lib/stores/account.store';
  import { chainStore, currentChain, visibleChains } from './lib/stores/chain.store';
  import { planStore, currentPlan, isOnTrial } from './lib/stores/plan.store';
  import { canUseFeature } from './lib/stores/plan.store';
  
  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

  // State
  let loading = $state(true);
  let showTestnets = $state(false);
  
  // Computed from stores
  let account = $derived($currentAccount || { address: '', ens: null });
  let selectedChain = $derived($currentChain);
  let chains = $derived($visibleChains);
  let plan = $derived($currentPlan);
  let trialEnds = $derived($planStore.plan.trialEndsAt);

  // Initialize stores on mount
  onMount(async () => {
    loading = true;
    
    // Load data in parallel
    await Promise.all([
      accountStore.loadAccounts(),
      chainStore.loadChains(),
      planStore.loadPlan()
    ]);
    
    loading = false;
  });

  function handleSwitchChain(chain: any) {
    chainStore.switchChain(chain.chainId);
  }

  function handleManageAccount() {
    // Navigate to accounts page
    window.location.href = '/preview2/accounts';
  }
  
  function handleSettings() {
    window.location.href = '/preview2/settings';
  }
  
  function handleTheme() {
    // Toggle theme
    document.documentElement.classList.toggle('dark');
  }
  
  function handleLogout() {
    // TODO: Implement proper logout
    accountStore.reset();
    chainStore.reset();
    window.location.href = '/';
  }
</script>

<div class="yakkl-body h-screen flex flex-col overflow-hidden">
  <!-- Fixed Header -->
  <Header
    link="/preview2"
    account={account}
    chains={chains}
    selectedChain={selectedChain}
    showTestnets={showTestnets}
    onSwitchChain={handleSwitchChain}
    onManageAccount={handleManageAccount}
    onSettings={handleSettings}
    onTheme={handleTheme}
    onLogout={handleLogout}
    className="flex-shrink-0"
  />
  
  <!-- Scrollable Content Area -->
  <main class="flex-1 overflow-y-auto overflow-x-hidden">
    {#if loading}
      <div class="min-h-full flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading wallet...</p>
        </div>
      </div>
    {:else}
      <div class="min-h-full pb-16">
        {@render children?.()}
      </div>
    {/if}
  </main>
  
  <!-- Fixed Footer -->
  <Footer
    plan={plan}
    trialEnds={trialEnds}
    appName="YAKKL"
    className="flex-shrink-0"
  />
  
  <!-- Floating Elements above footer - only show if features are available -->
  {#if canUseFeature('basic_features')}
    <DockLauncher className="fixed bottom-12 left-4 z-50" />
  {/if}
  
  {#if canUseFeature('ai_assistant')}
    <AIHelpButton className="fixed bottom-12 right-4 z-50" />
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    background-color: #f8fafc;
  }
  :global(html.dark body) {
    background-color: #0e0e11;
  }
</style>