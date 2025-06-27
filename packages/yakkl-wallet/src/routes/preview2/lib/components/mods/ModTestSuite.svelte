<!--
  ModTestSuite - Tests the mod system end-to-end
  
  This component provides a comprehensive test of the mod system:
  - Core availability
  - Mod discovery
  - Mod loading
  - Enhancement checking
  - Component rendering
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    isCoreAvailable, 
    initializeCore,
    discoverMods, 
    loadMod, 
    mods, 
    discoveredMods,
    checkEnhancements 
  } from '../../core/integration';
  import { systemModRegistry } from '../../mods/registry';

  let testResults = $state({
    coreAvailable: false,
    coreInitialized: false,
    modsDiscovered: 0,
    systemModsLoaded: 0,
    enhancementsFound: 0,
    networkManagerLoaded: false,
    accountManagerLoaded: false,
    componentTests: [],
    errors: []
  });

  let testRunning = $state(false);
  let testOutput = $state([]);

  // Reactive stores
  let loadedMods = $derived($mods);
  let discovered = $derived($discoveredMods);

  function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    testOutput = [...testOutput, { timestamp, message, type }];
    console.log(`[ModTest] ${message}`);
  }

  async function runFullTest() {
    testRunning = true;
    testOutput = [];
    testResults.errors = [];

    try {
      log('🧪 Starting comprehensive mod system test', 'info');

      // Test 1: Core Availability
      log('📋 Test 1: Core Availability');
      testResults.coreAvailable = isCoreAvailable();
      if (testResults.coreAvailable) {
        log('✅ YAKKL Core is available', 'success');
      } else {
        log('⚠️ YAKKL Core not available, initializing...', 'warning');
        try {
          await initializeCore();
          testResults.coreInitialized = true;
          testResults.coreAvailable = isCoreAvailable();
          log('✅ YAKKL Core initialized successfully', 'success');
        } catch (error) {
          log(`❌ Core initialization failed: ${error.message}`, 'error');
          testResults.errors.push(`Core init: ${error.message}`);
        }
      }

      // Test 2: System Mod Registry
      log('📋 Test 2: System Mod Registry');
      const availableMods = systemModRegistry.getAvailableMods();
      log(`📦 Found ${availableMods.length} mods in registry`, 'info');
      
      for (const mod of availableMods) {
        log(`   - ${mod.name} (${mod.id}) - ${mod.enabled ? 'enabled' : 'disabled'}`, 'info');
      }

      // Test 3: Mod Discovery
      log('📋 Test 3: Mod Discovery');
      try {
        const discoveredMods = await discoverMods();
        testResults.modsDiscovered = discoveredMods.length;
        log(`🔍 Discovered ${discoveredMods.length} mods`, 'success');
        
        for (const mod of discoveredMods) {
          const modName = mod.manifest?.name || mod.name || mod.id;
          log(`   - ${modName}`, 'info');
        }
      } catch (error) {
        log(`❌ Discovery failed: ${error.message}`, 'error');
        testResults.errors.push(`Discovery: ${error.message}`);
      }

      // Test 4: System Mod Loading
      log('📋 Test 4: System Mod Loading');
      
      // Test Network Manager
      try {
        const networkMod = await loadMod('system-network-manager');
        if (networkMod) {
          testResults.networkManagerLoaded = true;
          testResults.systemModsLoaded++;
          log('✅ Network Manager mod loaded', 'success');
          
          // Test mod interface
          if (networkMod.isLoaded && networkMod.isLoaded()) {
            log('   ✓ Network Manager is loaded', 'success');
          }
          if (networkMod.manifest) {
            log(`   ✓ Manifest: ${networkMod.manifest.name} v${networkMod.manifest.version}`, 'success');
          }
        } else {
          log('❌ Network Manager mod failed to load', 'error');
          testResults.errors.push('Network Manager loading failed');
        }
      } catch (error) {
        log(`❌ Network Manager error: ${error.message}`, 'error');
        testResults.errors.push(`Network Manager: ${error.message}`);
      }

      // Test Account Manager
      try {
        const accountMod = await loadMod('system-account-manager');
        if (accountMod) {
          testResults.accountManagerLoaded = true;
          testResults.systemModsLoaded++;
          log('✅ Account Manager mod loaded', 'success');
          
          // Test mod interface
          if (accountMod.isLoaded && accountMod.isLoaded()) {
            log('   ✓ Account Manager is loaded', 'success');
          }
          if (accountMod.manifest) {
            log(`   ✓ Manifest: ${accountMod.manifest.name} v${accountMod.manifest.version}`, 'success');
          }
        } else {
          log('❌ Account Manager mod failed to load', 'error');
          testResults.errors.push('Account Manager loading failed');
        }
      } catch (error) {
        log(`❌ Account Manager error: ${error.message}`, 'error');
        testResults.errors.push(`Account Manager: ${error.message}`);
      }

      // Test 5: Enhancement Discovery
      log('📋 Test 5: Enhancement Discovery');
      try {
        const networkEnhancements = await checkEnhancements('network');
        const accountEnhancements = await checkEnhancements('account');
        const coreEnhancements = await checkEnhancements('wallet-core');
        
        testResults.enhancementsFound = networkEnhancements.length + accountEnhancements.length + coreEnhancements.length;
        
        log(`🔧 Found ${networkEnhancements.length} network enhancements`, 'info');
        log(`👤 Found ${accountEnhancements.length} account enhancements`, 'info');
        log(`⚙️ Found ${coreEnhancements.length} core enhancements`, 'info');
        
        if (testResults.enhancementsFound > 0) {
          log('✅ Enhancement system working', 'success');
        }
      } catch (error) {
        log(`❌ Enhancement check failed: ${error.message}`, 'error');
        testResults.errors.push(`Enhancements: ${error.message}`);
      }

      // Test 6: Component System
      log('📋 Test 6: Component System');
      testResults.componentTests = [];
      
      for (const mod of loadedMods) {
        if (mod.getComponent) {
          try {
            // Test network manager components
            if (mod.manifest?.id === 'system-network-manager') {
              const switcher = mod.getComponent('network-switcher-enhanced');
              testResults.componentTests.push({
                mod: 'Network Manager',
                component: 'network-switcher-enhanced',
                success: !!switcher
              });
              
              const form = mod.getComponent('custom-network-form');
              testResults.componentTests.push({
                mod: 'Network Manager',
                component: 'custom-network-form',
                success: !!form
              });
            }
            
            // Test account manager components
            if (mod.manifest?.id === 'system-account-manager') {
              const switcher = mod.getComponent('account-switcher-enhanced');
              testResults.componentTests.push({
                mod: 'Account Manager',
                component: 'account-switcher-enhanced',
                success: !!switcher
              });
              
              const wizard = mod.getComponent('account-creation-wizard');
              testResults.componentTests.push({
                mod: 'Account Manager',
                component: 'account-creation-wizard',
                success: !!wizard
              });
            }
          } catch (error) {
            log(`❌ Component test failed for ${mod.manifest?.name}: ${error.message}`, 'error');
            testResults.errors.push(`Component ${mod.manifest?.id}: ${error.message}`);
          }
        }
      }

      const successfulComponents = testResults.componentTests.filter(t => t.success).length;
      log(`🧩 Component tests: ${successfulComponents}/${testResults.componentTests.length} passed`, 
          successfulComponents === testResults.componentTests.length ? 'success' : 'warning');

      // Test 7: Registry Statistics
      log('📋 Test 7: Registry Statistics');
      const stats = systemModRegistry.getStatistics();
      log(`📊 Registry Stats:`, 'info');
      log(`   - Total mods: ${stats.total}`, 'info');
      log(`   - Enabled: ${stats.enabled}`, 'info');
      log(`   - Loaded: ${stats.loaded}`, 'info');
      log(`   - System mods: ${stats.system}`, 'info');
      log(`   - Categories: ${Object.keys(stats.byCategory).join(', ')}`, 'info');

      // Final Results
      log('📋 Test Summary', 'info');
      if (testResults.errors.length === 0) {
        log('🎉 All tests passed successfully!', 'success');
      } else {
        log(`⚠️ Tests completed with ${testResults.errors.length} errors`, 'warning');
      }

    } catch (error) {
      log(`💥 Test suite failed: ${error.message}`, 'error');
      testResults.errors.push(`Test suite: ${error.message}`);
    } finally {
      testRunning = false;
    }
  }

  function getLogIcon(type: string) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }

  function getLogColor(type: string) {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  }

  onMount(() => {
    // Auto-run test on mount
    runFullTest();
  });
</script>

<div class="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-xl font-bold text-zinc-900 dark:text-white">Mod System Test Suite</h2>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">Comprehensive testing of mod loading, discovery, and enhancements</p>
    </div>
    
    <button
      onclick={runFullTest}
      disabled={testRunning}
      class="yakkl-btn-primary {testRunning ? 'opacity-50' : ''}"
    >
      {#if testRunning}
        <svg class="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Running Tests...
      {:else}
        🧪 Run Tests
      {/if}
    </button>
  </div>

  <!-- Test Results Summary -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
      <div class="text-2xl font-bold text-zinc-900 dark:text-white">
        {testResults.coreAvailable ? '✅' : '❌'}
      </div>
      <div class="text-sm text-zinc-600 dark:text-zinc-400">Core Available</div>
    </div>
    
    <div class="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
      <div class="text-2xl font-bold text-zinc-900 dark:text-white">
        {testResults.systemModsLoaded}
      </div>
      <div class="text-sm text-zinc-600 dark:text-zinc-400">System Mods Loaded</div>
    </div>
    
    <div class="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
      <div class="text-2xl font-bold text-zinc-900 dark:text-white">
        {testResults.modsDiscovered}
      </div>
      <div class="text-sm text-zinc-600 dark:text-zinc-400">Mods Discovered</div>
    </div>
    
    <div class="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
      <div class="text-2xl font-bold text-zinc-900 dark:text-white">
        {testResults.enhancementsFound}
      </div>
      <div class="text-sm text-zinc-600 dark:text-zinc-400">Enhancements</div>
    </div>
  </div>

  <!-- Component Test Results -->
  {#if testResults.componentTests.length > 0}
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Component Tests</h3>
      <div class="space-y-2">
        {#each testResults.componentTests as test}
          <div class="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <div>
              <span class="font-medium text-zinc-900 dark:text-white">{test.mod}</span>
              <span class="text-zinc-600 dark:text-zinc-400"> → {test.component}</span>
            </div>
            <div class="text-lg">
              {test.success ? '✅' : '❌'}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Errors -->
  {#if testResults.errors.length > 0}
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">Errors ({testResults.errors.length})</h3>
      <div class="space-y-2">
        {#each testResults.errors as error}
          <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <span class="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Test Output Log -->
  <div>
    <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Test Output</h3>
    <div class="bg-zinc-900 dark:bg-black rounded-lg p-4 max-h-96 overflow-y-auto">
      <div class="font-mono text-sm space-y-1">
        {#each testOutput as log}
          <div class="flex items-start gap-2">
            <span class="text-zinc-500 text-xs mt-0.5">{log.timestamp}</span>
            <span class="text-lg leading-none">{getLogIcon(log.type)}</span>
            <span class={getLogColor(log.type)}>{log.message}</span>
          </div>
        {/each}
        
        {#if testRunning}
          <div class="flex items-center gap-2 mt-4">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span class="text-blue-400">Running tests...</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>