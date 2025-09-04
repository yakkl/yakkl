<script lang="ts">
  import { onMount } from 'svelte';
  import { ispStorage, type AlternativeConnection } from '$lib/services/isp-storage.service';
  import { currentPlan } from '$lib/stores/plan.store';
  import { log } from '$lib/common/logger-wrapper';
  
  interface Props {
    show?: boolean;
    onClose?: () => void;
    className?: string;
  }
  
  let { show = false, onClose, className = '' }: Props = $props();
  
  let connections = $state<AlternativeConnection | null>(null);
  let isLoading = $state(true);
  let activeTab = $state<'hotspot' | 'backup' | 'emergency' | 'vpn'>('hotspot');
  let showPassword = $state<Record<string, boolean>>({});
  
  // Plan checking
  let plan = $state<string>('explorer_member');
  let isProPlus = $derived(plan?.includes('founding') || plan?.includes('early'));
  
  onMount(async () => {
    // Subscribe to plan
    const unsubPlan = currentPlan.subscribe(value => {
      plan = value || 'explorer_member';
    });
    
    // Load alternative connections
    await loadConnections();
    
    return () => {
      unsubPlan();
    };
  });
  
  async function loadConnections() {
    try {
      isLoading = true;
      connections = await ispStorage.loadAlternativeConnections();
      
      // If no connections saved, provide defaults
      if (!connections) {
        connections = getDefaultConnections();
      }
    } catch (error) {
      log.error('Failed to load alternative connections:', false, error);
      connections = getDefaultConnections();
    } finally {
      isLoading = false;
    }
  }
  
  function getDefaultConnections(): AlternativeConnection {
    return {
      mobileHotspot: {
        enabled: true,
        carrier: 'Your Carrier',
        setupInstructions: [
          'Open Settings on your phone',
          'Go to Network & Internet > Hotspot & Tethering',
          'Enable Wi-Fi Hotspot',
          'Note the network name and password',
          'Connect your computer to this network'
        ],
        dataLimit: 'Check with carrier'
      },
      backupNetworks: [],
      emergencyLocations: [
        {
          name: 'Local Coffee Shop',
          address: 'Find nearest with WiFi',
          hours: 'Usually 6am-10pm',
          wifiAvailable: true,
          notes: 'Buy a coffee first'
        }
      ]
    };
  }
  
  function togglePassword(key: string) {
    showPassword[key] = !showPassword[key];
  }
  
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  }
  
  function handleClose() {
    show = false;
    onClose?.();
  }
</script>

{#if show}
  <div class="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="max-w-2xl w-full bg-base-100 rounded-2xl shadow-2xl overflow-hidden {className}">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-base-300">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold">Alternative Connection Guide</h2>
            <p class="text-sm text-base-content/60 mt-1">
              Quick access to backup connection methods during outages
            </p>
          </div>
          <button
            onclick={handleClose}
            class="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {#if !isProPlus}
        <!-- Pro+ Upgrade Prompt -->
        <div class="p-4 bg-warning/10 border-b border-warning/20">
          <p class="text-sm">
            <span class="font-semibold">Pro+ Feature:</span> Save encrypted connection details and custom instructions. 
            <a href="/upgrade" class="link link-primary ml-1">Upgrade now</a>
          </p>
        </div>
      {/if}
      
      <!-- Tab Navigation -->
      <div class="flex border-b border-base-300">
        <button
          onclick={() => activeTab = 'hotspot'}
          class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                 {activeTab === 'hotspot' ? 'bg-base-200 border-b-2 border-primary' : 'hover:bg-base-200/50'}"
        >
          📱 Mobile Hotspot
        </button>
        <button
          onclick={() => activeTab = 'backup'}
          class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                 {activeTab === 'backup' ? 'bg-base-200 border-b-2 border-primary' : 'hover:bg-base-200/50'}"
        >
          📡 Backup Networks
        </button>
        <button
          onclick={() => activeTab = 'emergency'}
          class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                 {activeTab === 'emergency' ? 'bg-base-200 border-b-2 border-primary' : 'hover:bg-base-200/50'}"
        >
          ☕ Emergency Locations
        </button>
        <button
          onclick={() => activeTab = 'vpn'}
          class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                 {activeTab === 'vpn' ? 'bg-base-200 border-b-2 border-primary' : 'hover:bg-base-200/50'}"
        >
          🔒 VPN Config
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="p-6 max-h-96 overflow-y-auto">
        {#if isLoading}
          <div class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        {:else if activeTab === 'hotspot'}
          <!-- Mobile Hotspot Tab -->
          <div class="space-y-4">
            {#if connections?.mobileHotspot}
              <div class="alert alert-info">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Carrier: <strong>{connections.mobileHotspot.carrier}</strong> | 
                      Data Limit: {connections.mobileHotspot.dataLimit || 'Unknown'}</span>
              </div>
              
              <div>
                <h3 class="font-semibold mb-2">Setup Instructions:</h3>
                <ol class="list-decimal list-inside space-y-2">
                  {#each connections.mobileHotspot.setupInstructions as step}
                    <li class="text-sm">{step}</li>
                  {/each}
                </ol>
              </div>
              
              {#if connections.mobileHotspot.password && isProPlus}
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Hotspot Password</span>
                  </label>
                  <div class="input-group">
                    <input
                      type={showPassword['hotspot'] ? 'text' : 'password'}
                      value={connections.mobileHotspot.password}
                      readonly
                      class="input input-bordered flex-1"
                    />
                    <button
                      onclick={() => togglePassword('hotspot')}
                      class="btn btn-square"
                    >
                      {showPassword['hotspot'] ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onclick={() => copyToClipboard(connections.mobileHotspot.password || '')}
                      class="btn btn-square"
                    >
                      📋
                    </button>
                  </div>
                </div>
              {/if}
            {:else}
              <p class="text-base-content/60">No mobile hotspot configured</p>
            {/if}
          </div>
          
        {:else if activeTab === 'backup'}
          <!-- Backup Networks Tab -->
          <div class="space-y-4">
            {#if connections?.backupNetworks && connections.backupNetworks.length > 0}
              {#each connections.backupNetworks as network, idx}
                <div class="card bg-base-200">
                  <div class="card-body p-4">
                    <h3 class="font-semibold">{network.name}</h3>
                    <p class="text-sm text-base-content/60">SSID: {network.ssid}</p>
                    {#if network.location}
                      <p class="text-sm text-base-content/60">Location: {network.location}</p>
                    {/if}
                    {#if network.password && isProPlus}
                      <div class="mt-2">
                        <div class="input-group input-group-sm">
                          <input
                            type={showPassword[`backup-${idx}`] ? 'text' : 'password'}
                            value={network.password}
                            readonly
                            class="input input-bordered input-sm flex-1"
                          />
                          <button
                            onclick={() => togglePassword(`backup-${idx}`)}
                            class="btn btn-square btn-sm"
                          >
                            {showPassword[`backup-${idx}`] ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </div>
                    {/if}
                    {#if network.notes}
                      <p class="text-xs mt-2">{network.notes}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            {:else}
              <div class="text-center py-8">
                <p class="text-base-content/60 mb-4">No backup networks configured</p>
                {#if isProPlus}
                  <button class="btn btn-primary btn-sm">
                    Add Backup Network
                  </button>
                {/if}
              </div>
            {/if}
          </div>
          
        {:else if activeTab === 'emergency'}
          <!-- Emergency Locations Tab -->
          <div class="space-y-4">
            {#if connections?.emergencyLocations && connections.emergencyLocations.length > 0}
              {#each connections.emergencyLocations as location}
                <div class="card bg-base-200">
                  <div class="card-body p-4">
                    <h3 class="font-semibold flex items-center gap-2">
                      {location.name}
                      {#if location.wifiAvailable}
                        <span class="badge badge-success badge-sm">WiFi</span>
                      {/if}
                    </h3>
                    <p class="text-sm text-base-content/60">{location.address}</p>
                    <p class="text-sm text-base-content/60">Hours: {location.hours}</p>
                    {#if location.notes}
                      <p class="text-xs italic mt-2">{location.notes}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            {:else}
              <p class="text-base-content/60">No emergency locations configured</p>
            {/if}
          </div>
          
        {:else if activeTab === 'vpn'}
          <!-- VPN Configuration Tab -->
          <div class="space-y-4">
            {#if connections?.vpnConfig}
              <div class="alert alert-warning">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Use a reputable VPN service for secure public WiFi connections</span>
              </div>
              
              <div>
                <p class="text-sm mb-2">Provider: <strong>{connections.vpnConfig.provider}</strong></p>
                {#if connections.vpnConfig.servers && connections.vpnConfig.servers.length > 0}
                  <div class="mb-4">
                    <h4 class="text-sm font-semibold mb-1">Recommended Servers:</h4>
                    <ul class="list-disc list-inside text-sm text-base-content/80">
                      {#each connections.vpnConfig.servers as server}
                        <li>{server}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
              
              {#if isProPlus && connections.vpnConfig.username}
                <div class="space-y-2">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Username</span>
                    </label>
                    <input
                      type="text"
                      value={connections.vpnConfig.username}
                      readonly
                      class="input input-bordered input-sm"
                    />
                  </div>
                  {#if connections.vpnConfig.password}
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">Password</span>
                      </label>
                      <div class="input-group input-group-sm">
                        <input
                          type={showPassword['vpn'] ? 'text' : 'password'}
                          value={connections.vpnConfig.password}
                          readonly
                          class="input input-bordered input-sm flex-1"
                        />
                        <button
                          onclick={() => togglePassword('vpn')}
                          class="btn btn-square btn-sm"
                        >
                          {showPassword['vpn'] ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            {:else}
              <div class="text-center py-8">
                <p class="text-base-content/60 mb-4">No VPN configured</p>
                <a href="/settings/security" class="btn btn-primary btn-sm">
                  Configure VPN
                </a>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="p-4 bg-base-200/50 border-t border-base-300">
        <div class="flex justify-between items-center">
          <p class="text-xs text-base-content/60">
            {#if isProPlus}
              All data encrypted locally
            {:else}
              Upgrade to Pro+ to save custom configurations
            {/if}
          </p>
          <button
            onclick={handleClose}
            class="btn btn-ghost btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure proper z-indexing */
  :global(.alternative-connection-guide) {
    z-index: 9990;
  }
</style>