<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { spring } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import RadialNavigation from '$lib/components/RadialNavigation.svelte';
  import OrbitalViewSelector from '$lib/components/views/OrbitalViewSelector.svelte';
  import AccountOrbital from '$lib/components/views/innovative/AccountOrbital.svelte';
  import TokenConstellation from '$lib/components/views/innovative/TokenConstellation.svelte';
  import NetworkMesh from '$lib/components/views/innovative/NetworkMesh.svelte';
  import ExpenseSankey from '$lib/components/views/innovative/ExpenseSankey.svelte';
  import TransactionFlow from '$lib/components/views/innovative/TransactionFlow.svelte';
  import PortfolioGalaxy from '$lib/components/views/innovative/PortfolioGalaxy.svelte';
  import { innovationVotesStore, voteCounts } from '$lib/stores/innovation-votes.store';
  import { currentPlan } from '$lib/stores/plan.store';
  
  // State
  let useRealData = $state(false);
  let animationSpeed = $state(1);
  let showPerformance = $state(false);
  let selectedCategory = $state<'all' | 'navigation' | 'portfolio' | 'network'>('all');
  let fps = $state(60);
  let memory = $state(0);
  let quality = $state<'low' | 'medium' | 'high'>('high');

  // Demo navigation items for RadialNavigation
  const demoNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      action: () => console.log('Dashboard clicked'),
      color: '#3B82F6',
      tooltip: 'View Dashboard'
    },
    {
      id: 'tokens',
      label: 'Tokens',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      action: () => console.log('Tokens clicked'),
      color: '#10B981',
      tooltip: 'Token Portfolio'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      action: () => console.log('Settings clicked'),
      color: '#EC4899',
      tooltip: 'Wallet Settings'
    }
  ];
  
  // Performance monitoring
  let frameCount = 0;
  let lastTime = performance.now();
  
  function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
    }
    if (showPerformance) {
      requestAnimationFrame(updateFPS);
    }
  }
  
  function updateMemory() {
    if ('memory' in performance) {
      // @ts-ignore - memory is not in TypeScript types but exists in Chrome
      memory = Math.round(performance.memory.usedJSHeapSize / 1048576);
    }
  }
  
  onMount(() => {
    if (showPerformance) {
      updateFPS();
      const memoryInterval = setInterval(updateMemory, 1000);
      return () => clearInterval(memoryInterval);
    }
  });
  
  $effect(() => {
    if (showPerformance) {
      updateFPS();
      const memoryInterval = setInterval(updateMemory, 1000);
      return () => clearInterval(memoryInterval);
    }
  });
  
  // Component cards configuration with categories
  const visualizations = [
    {
      id: 'radial',
      title: 'Radial Navigation',
      description: 'Circular menu with expandable items and smooth animations',
      component: 'RadialNavigation',
      category: 'navigation',
      ready: true,
      votes: 142,
      featured: false
    },
    {
      id: 'orbital',
      title: 'Orbital View Selector',
      description: 'Portfolio value with orbiting view options',
      component: 'OrbitalViewSelector',
      category: 'portfolio',
      ready: true,
      votes: 89,
      featured: false
    },
    {
      id: 'account-orbital',
      title: 'Account Orbital',
      description: 'Accounts orbiting around total balance like planets',
      component: 'AccountOrbital',
      category: 'portfolio',
      ready: true,
      votes: 76,
      featured: false
    },
    {
      id: 'constellation',
      title: 'Token Constellation',
      description: '3D star field visualization of your token portfolio',
      component: 'TokenConstellation',
      category: 'portfolio',
      ready: true,
      votes: 234,
      featured: true
    },
    {
      id: 'mesh',
      title: 'Network Mesh',
      description: 'Interactive topology of blockchain networks and bridges',
      component: 'NetworkMesh',
      category: 'network',
      ready: true,
      votes: 156,
      featured: false
    },
    {
      id: 'sankey',
      title: 'Expense Flow',
      description: 'Sankey diagram showing income sources and expense flows',
      component: 'ExpenseSankey',
      category: 'portfolio',
      ready: true,
      votes: 145,
      featured: true
    },
    {
      id: 'flow',
      title: 'Transaction Flow',
      description: 'Animated particle paths showing transaction movements',
      component: 'TransactionFlow',
      category: 'network',
      ready: true,
      votes: 198,
      featured: false
    },
    {
      id: 'galaxy',
      title: 'Portfolio Galaxy',
      description: 'Your entire portfolio as a cosmic system with orbiting assets',
      component: 'PortfolioGalaxy',
      category: 'portfolio',
      ready: true,
      votes: 312,
      featured: true
    }
  ];

  // Filter visualizations by category
  let filteredVisualizations = $derived.by(() => {
    if (selectedCategory === 'all') return visualizations;
    return visualizations.filter(v => v.category === selectedCategory);
  });

  // Handle voting
  function handleVote(vizId: string) {
    if (!$currentPlan || $currentPlan === 'explorer_member') {
      alert('Voting is available for Pro members. Upgrade to vote on features!');
      return;
    }
    
    if (innovationVotesStore.hasVotedToday(vizId)) {
      alert('You have already voted for this feature today. Come back tomorrow!');
      return;
    }
    
    innovationVotesStore.vote(vizId);
  }

  // Get vote count with live updates
  function getVoteCount(vizId: string): number {
    const baseVotes = visualizations.find(v => v.id === vizId)?.votes || 0;
    const localVotes = $voteCounts[vizId] || 0;
    return baseVotes + localVotes;
  }

  // Check if user has voted
  function hasVoted(vizId: string): boolean {
    return innovationVotesStore.hasVotedToday(vizId);
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
  <!-- Animated background particles -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
    <div class="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse"></div>
  </div>

  <!-- Header -->
  <div class="relative px-6 py-8 text-center" in:fly={{ y: -20, duration: 500 }}>
    <div class="inline-block">
      <h1 class="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient">
        Innovation Lab
      </h1>
      <div class="h-1 w-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full mt-2 animate-gradient"></div>
    </div>
    <p class="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
      Experience the future of wallet visualization. Vote for your favorite features to shape our roadmap.
    </p>
    <div class="mt-6 flex items-center justify-center gap-4">
      <div class="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm">
        <span class="text-purple-300 text-sm font-medium">
          {#if $currentPlan === 'founding_member'}
            Founding Member - Full Voting Power
          {:else if $currentPlan === 'early_adopter'}
            Early Adopter - Enhanced Voting
          {:else if $currentPlan === 'yakkl_pro'}
            Pro Member - Voting Enabled
          {:else}
            Explorer - View Only (Upgrade to Vote)
          {/if}
        </span>
      </div>
    </div>
  </div>
  
  <!-- Controls Panel -->
  <div class="px-6 mb-8">
    <div class="max-w-6xl mx-auto">
      <!-- Category Filter -->
      <div class="flex justify-center gap-2 mb-6">
        {#each (['all', 'navigation', 'portfolio', 'network'] as const) as category}
          <button
            class="px-6 py-2 rounded-full font-medium transition-all duration-300 {
              selectedCategory === category 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20 backdrop-blur-sm'
            }"
            onclick={() => selectedCategory = category}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        {/each}
      </div>

      <!-- Settings Bar -->
      <div class="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <div class="flex flex-wrap items-center justify-between gap-6">
          <!-- Data Toggle -->
          <div class="flex items-center gap-4">
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                bind:checked={useRealData}
                class="sr-only peer"
              />
              <div class="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
              <span class="ml-3 text-sm font-medium text-gray-300">
                {useRealData ? 'Real Data' : 'Demo Data'}
              </span>
            </label>
          </div>
          
          <!-- Animation Speed -->
          <div class="flex items-center gap-3">
            <label for="animation-speed" class="text-sm font-medium text-gray-300">
              Animation
            </label>
            <div class="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1">
              <input
                id="animation-speed"
                type="range"
                bind:value={animationSpeed}
                min="0"
                max="2"
                step="0.1"
                class="w-32 accent-purple-500"
              />
              <span class="text-sm text-purple-400 font-mono min-w-[3ch]">
                {animationSpeed.toFixed(1)}x
              </span>
            </div>
          </div>

          <!-- Quality Settings -->
          <div class="flex items-center gap-2">
            {#each (['low', 'medium', 'high'] as const) as q}
              <button
                class="px-3 py-1 rounded-lg text-xs font-medium transition-all {
                  quality === q 
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                    : 'bg-black/30 text-gray-400 hover:text-gray-300'
                }"
                onclick={() => quality = q}
              >
                {q.toUpperCase()}
              </button>
            {/each}
          </div>
          
          <!-- Performance Toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showPerformance}
              class="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 focus:ring-offset-0 bg-gray-700 border-gray-600"
            />
            <span class="text-sm font-medium text-gray-300">
              Performance
            </span>
          </label>
        </div>
        
        {#if showPerformance}
          <div class="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
            <div class="flex items-center gap-3">
              <span class="text-gray-400">FPS</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    class="h-full transition-all duration-300 {
                      fps >= 50 ? 'bg-green-500' : fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }"
                    style="width: {Math.min(100, (fps / 60) * 100)}%"
                  ></div>
                </div>
                <span class="font-mono font-bold {fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}">
                  {fps}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-gray-400">Memory</span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-blue-500 transition-all duration-300"
                    style="width: {Math.min(100, (memory / 500) * 100)}%"
                  ></div>
                </div>
                <span class="font-mono font-bold text-blue-400">
                  {memory}MB
                </span>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Visualization Grid -->
  <div class="px-6 pb-12">
    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      {#each filteredVisualizations as viz, index}
        {@const voteCount = getVoteCount(viz.id)}
        {@const hasUserVoted = hasVoted(viz.id)}
        <div
          class="group relative bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10"
          in:scale={{ delay: index * 50, duration: 500, easing: cubicOut }}
        >
          {#if viz.featured}
            <div class="absolute top-4 right-4 z-10">
              <span class="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-black">
                FEATURED
              </span>
            </div>
          {/if}
          
          <!-- Card Header -->
          <div class="p-6 border-b border-white/10">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
                  {viz.title}
                </h3>
                <p class="mt-1 text-sm text-gray-400">
                  {viz.description}
                </p>
              </div>
              <div class="flex flex-col items-end gap-2">
                {#if viz.ready}
                  <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    LIVE
                  </span>
                {:else}
                  <span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    COMING SOON
                  </span>
                {/if}
              </div>
            </div>
          </div>
          
          <!-- Visualization Area -->
          <div class="relative h-96 bg-gradient-to-br from-slate-900/50 to-purple-900/20">
            {#if viz.id === 'radial' && viz.ready}
              <div class="flex items-center justify-center h-full">
                <RadialNavigation
                  items={demoNavItems}
                  centerContent={{ label: 'Y', icon: null }}
                  radius={120}
                  enableAnimation={animationSpeed > 0}
                  expandOnHover={true}
                  className="scale-90"
                />
              </div>
            {:else if viz.id === 'orbital' && viz.ready}
              <div class="flex items-center justify-center h-full">
                <OrbitalViewSelector
                  showTotal={true}
                  enableAnimations={animationSpeed > 0}
                  className="scale-75"
                />
              </div>
            {:else if viz.id === 'account-orbital' && viz.ready}
              <AccountOrbital
                {useRealData}
                {animationSpeed}
                showLabels={true}
                enableInteraction={true}
                className="w-full h-full"
              />
            {:else if viz.id === 'constellation' && viz.ready}
              <TokenConstellation
                {useRealData}
                {animationSpeed}
                {quality}
                className="w-full h-full"
              />
            {:else if viz.id === 'mesh' && viz.ready}
              <NetworkMesh
                {useRealData}
                {animationSpeed}
                className="w-full h-full"
              />
            {:else if viz.id === 'sankey' && viz.ready}
              <ExpenseSankey
                {useRealData}
                period="month"
                className="w-full h-full"
              />
            {:else if viz.id === 'flow' && viz.ready}
              <TransactionFlow
                {useRealData}
                {animationSpeed}
                particleCount={quality === 'high' ? 50 : quality === 'medium' ? 30 : 15}
                className="w-full h-full"
              />
            {:else if viz.id === 'galaxy' && viz.ready}
              <PortfolioGalaxy
                {useRealData}
                {animationSpeed}
                className="w-full h-full"
              />
            {:else}
              <div class="flex items-center justify-center h-full">
                <div class="text-center">
                  <div class="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse flex items-center justify-center">
                    <span class="text-4xl">🚀</span>
                  </div>
                  <p class="text-gray-400">
                    Component in development
                  </p>
                </div>
              </div>
            {/if}
          </div>
          
          <!-- Card Footer with Voting -->
          <div class="p-4 bg-black/60 backdrop-blur-sm border-t border-white/10">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <button
                  class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 {
                    viz.ready 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25' 
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }"
                  disabled={!viz.ready}
                >
                  {viz.ready ? 'Try Fullscreen' : 'Coming Soon'}
                </button>
                
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-400">Category:</span>
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                    {viz.category}
                  </span>
                </div>
              </div>
              
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span class="text-white font-semibold">{voteCount}</span>
                </div>
                
                <button
                  onclick={() => handleVote(viz.id)}
                  class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2 {
                    hasUserVoted
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }"
                  disabled={hasUserVoted}
                >
                  {#if hasUserVoted}
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    Voted
                  {:else}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                    </svg>
                    Vote
                  {/if}
                </button>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  
  <!-- Footer -->
  <div class="px-6 pb-8">
    <div class="max-w-4xl mx-auto text-center">
      <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20 backdrop-blur-sm">
        <h3 class="text-lg font-semibold text-white mb-2">
          Shape the Future of YAKKL
        </h3>
        <p class="text-sm text-gray-300 mb-4">
          Your votes directly influence our development roadmap. Pro members get exclusive early access to new features.
        </p>
        <div class="flex justify-center gap-4">
          {#if $currentPlan === 'explorer_member'}
            <a href="/settings#upgrade" class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300">
              Upgrade to Vote
            </a>
          {/if}
          <button class="px-6 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-all duration-300">
            View Roadmap
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Gradient animation */
  @keyframes gradient {
    0%, 100% { 
      background-position: 0% 50%;
    }
    50% { 
      background-position: 100% 50%;
    }
  }
  
  .animate-gradient {
    background-size: 200% auto;
    animation: gradient 3s linear infinite;
  }

  /* Custom scrollbar */
  :global(.innovation-lab::-webkit-scrollbar) {
    width: 8px;
  }
  
  :global(.innovation-lab::-webkit-scrollbar-track) {
    background: rgba(0, 0, 0, 0.2);
  }
  
  :global(.innovation-lab::-webkit-scrollbar-thumb) {
    background: linear-gradient(to bottom, #a855f7, #ec4899);
    border-radius: 4px;
  }
</style>