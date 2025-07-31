<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser_ext } from '$lib/common/environment';
  const browser = browser_ext;
  
  interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    status: 'good' | 'warning' | 'bad';
  }
  
  interface OperationTiming {
    name: string;
    duration: number;
    timestamp: Date;
  }
  
  let metrics = $state<PerformanceMetric[]>([]);
  let operations = $state<OperationTiming[]>([]);
  let monitoring = $state(false);
  let updateInterval: number;
  
  function getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1048576); // Convert to MB
    }
    return 0;
  }
  
  async function updateMetrics() {
    const memoryUsage = getMemoryUsage();
    const domNodes = document.getElementsByTagName('*').length;
    const tabCount = await getActiveTabCount();
    const listenerCount = await countEventListeners();
    
    metrics = [
      {
        name: 'Memory Usage',
        value: memoryUsage,
        unit: 'MB',
        status: memoryUsage < 100 ? 'good' : memoryUsage < 200 ? 'warning' : 'bad'
      },
      {
        name: 'DOM Nodes',
        value: domNodes,
        unit: 'nodes',
        status: domNodes < 1500 ? 'good' : domNodes < 3000 ? 'warning' : 'bad'
      },
      {
        name: 'Browser Tabs',
        value: tabCount,
        unit: 'tabs',
        status: tabCount < 20 ? 'good' : tabCount < 50 ? 'warning' : 'bad'
      },
      {
        name: 'Event Listeners',
        value: listenerCount,
        unit: 'listeners',
        status: listenerCount < 200 ? 'good' : listenerCount < 500 ? 'warning' : 'bad'
      }
    ];
  }
  
  async function getActiveTabCount(): Promise<number> {
    // Try to use browser extension API to get real tab count
    try {
      if (browser?.tabs?.query) {
        const tabs = await browser.tabs.query({});
        return tabs.length;
      }
    } catch (e) {
      // Not in extension context
    }
    // Fallback: estimate based on performance metrics
    return 1;
  }
  
  async function countEventListeners(): Promise<number> {
    // Use Chrome DevTools protocol if available
    if (window.chrome?.devtools) {
      try {
        const listeners = await new Promise<number>((resolve) => {
          chrome.devtools.inspectedWindow.eval(
            `Array.from(document.querySelectorAll('*')).reduce((count, el) => {
              const listeners = getEventListeners(el);
              return count + Object.keys(listeners || {}).reduce((sum, type) => sum + listeners[type].length, 0);
            }, 0)`,
            (result) => resolve(result as number)
          );
        });
        return listeners;
      } catch (e) {
        // DevTools not available
      }
    }
    
    // Fallback: count known event attributes and estimate
    const allElements = document.getElementsByTagName('*');
    let count = 0;
    const eventAttributes = ['onclick', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'];
    
    for (const element of allElements) {
      // Count inline event handlers
      for (const attr of eventAttributes) {
        if (element.getAttribute(attr)) count++;
      }
      
      // Estimate addEventListener usage (can't access directly for security)
      // Svelte components typically add 2-3 listeners per interactive element
      if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || element.tagName === 'A') {
        count += 2; // Conservative estimate
      }
    }
    
    return count;
  }
  
  let performanceObserver: PerformanceObserver | null = null;
  
  function startMonitoring() {
    monitoring = true;
    operations = [];
    
    // Use Performance Observer API to track real operations
    if ('PerformanceObserver' in window) {
      performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!monitoring) break;
          
          // Filter for relevant operations
          if (entry.entryType === 'measure' || 
              (entry.entryType === 'resource' && entry.name.includes('api')) ||
              entry.entryType === 'navigation') {
            
            operations.unshift({
              name: formatOperationName(entry.name),
              duration: Math.round(entry.duration),
              timestamp: new Date(entry.startTime + performance.timeOrigin)
            });
            
            // Keep only last 10 operations
            if (operations.length > 10) {
              operations = operations.slice(0, 10);
            }
          }
        }
      });
      
      // Observe different performance entry types
      try {
        performanceObserver.observe({ entryTypes: ['measure', 'resource', 'navigation'] });
      } catch (e) {
        // Some entry types might not be supported
        performanceObserver.observe({ entryTypes: ['resource'] });
      }
    }
    
    // Also track custom performance marks
    if (window.performance?.mark) {
      // Mark the start of monitoring
      performance.mark('monitoring-start');
    }
  }
  
  function formatOperationName(name: string): string {
    // Extract meaningful operation names from URLs and performance entries
    if (name.includes('/api/')) {
      const parts = name.split('/api/')[1].split('?')[0];
      return `API: ${parts}`;
    }
    if (name.startsWith('http')) {
      const url = new URL(name);
      return `Fetch: ${url.pathname.split('/').pop() || url.hostname}`;
    }
    return name;
  }
  
  function stopMonitoring() {
    monitoring = false;
    if (performanceObserver) {
      performanceObserver.disconnect();
      performanceObserver = null;
    }
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'good': return 'text-success';
      case 'warning': return 'text-warning';
      case 'bad': return 'text-error';
      default: return '';
    }
  }
  
  onMount(async () => {
    await updateMetrics();
    updateInterval = window.setInterval(() => updateMetrics(), 1000);
  });
  
  onDestroy(() => {
    if (updateInterval) clearInterval(updateInterval);
    stopMonitoring();
  });
</script>

<div class="space-y-4">
  <!-- Info Card -->
  <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
    <div class="flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-purple-600 dark:stroke-purple-400 shrink-0 w-6 h-6 mt-0.5">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <div>
        <h3 class="font-bold text-purple-800 dark:text-purple-200">Performance Metrics</h3>
        <div class="text-sm text-purple-700 dark:text-purple-300">Monitor performance metrics and identify potential bottlenecks.</div>
      </div>
    </div>
  </div>
  
  <div class="grid grid-cols-2 gap-4">
    {#each metrics as metric}
      <div class="bg-base-100 dark:bg-gray-800 rounded-lg p-4 border border-base-300 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
        <div class="text-sm text-base-content/60 dark:text-gray-400 mb-1">{metric.name}</div>
        <div class="font-bold text-xl {getStatusColor(metric.status)} mb-2">
          {metric.value} {metric.unit}
        </div>
        <div class="text-xs">
          {#if metric.status === 'bad'}
            <span class="text-error dark:text-red-400">⚠️ Poor performance</span>
          {:else if metric.status === 'warning'}
            <span class="text-warning dark:text-yellow-400">⚡ Could be better</span>
          {:else}
            <span class="text-success dark:text-green-400">✅ Good</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
  
  <div class="divider dark:before:bg-gray-700 dark:after:bg-gray-700">Operation Timings</div>
  
  {#if operations.length > 0}
    <div class="bg-base-100 dark:bg-gray-800 rounded-lg shadow-sm border border-base-300 dark:border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead class="bg-base-200 dark:bg-gray-700">
            <tr>
              <th class="text-sm font-semibold text-base-content dark:text-gray-200">Operation</th>
              <th class="text-sm font-semibold text-base-content dark:text-gray-200">Duration</th>
              <th class="text-sm font-semibold text-base-content dark:text-gray-200">Time</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-base-300 dark:divide-gray-700">
          {#each operations as op}
            <tr class="hover:bg-base-200/50 dark:hover:bg-gray-700/50 transition-colors">
              <td class="text-base-content dark:text-gray-200">{op.name}</td>
              <td class="font-mono {op.duration > 300 ? 'text-error dark:text-red-400' : op.duration > 150 ? 'text-warning dark:text-yellow-400' : 'text-success dark:text-green-400'}">
                {op.duration}ms
              </td>
              <td class="text-xs text-base-content/60 dark:text-gray-400">
                {op.timestamp.toLocaleTimeString()}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      </div>
    </div>
  {:else if monitoring}
    <p class="text-sm text-base-content/60 dark:text-gray-400">Monitoring... Operations will appear here.</p>
  {/if}
</div>

<!-- Component Footer -->
<div class="flex justify-start mt-6 pt-4 border-t border-base-300 dark:border-gray-700">
  {#if !monitoring}
    <button class="btn btn-primary shadow-sm hover:shadow-md transition-all duration-200" onclick={startMonitoring}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
      Start Monitoring
    </button>
  {:else}
    <button class="btn btn-error shadow-sm hover:shadow-md transition-all duration-200" onclick={stopMonitoring}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
      </svg>
      Stop Monitoring
    </button>
  {/if}
</div>