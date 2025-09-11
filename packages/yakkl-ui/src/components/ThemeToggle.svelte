<script lang="ts">
  interface Props {
    className?: string;
    storageKey?: string;
    showLabels?: boolean;
    icons?: {
      light?: string;
      dark?: string;
      system?: string;
      toggle?: string;
    };
  }
  
  const { 
    className = '',
    storageKey = 'theme',
    showLabels = true,
    icons = {
      light: '🌞',
      dark: '🌚',
      system: '🖥️',
      toggle: '🌓'
    }
  }: Props = $props();

  function setTheme(mode: 'light' | 'dark' | 'system') {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // Store preference
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(storageKey, mode);
    }
    
    // Update document classes
    document.documentElement.classList.remove('light', 'dark');
    
    if (mode === 'light') {
      document.documentElement.classList.add('light');
    } else if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.add('light');
      }
    }
    
    // Dispatch custom event for other components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: mode } }));
    }
  }
  
  // Initialize theme on component mount
  $effect(() => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const savedTheme = sessionStorage.getItem(storageKey) as 'light' | 'dark' | 'system' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme('system');
      }
    }
  });
</script>

<div class="group relative {className}">
  <div class="bg-zinc-800 text-white w-full h-full rounded-xl shadow-lg text-xl flex items-center justify-center cursor-pointer">
    {icons.toggle}
  </div>
  <div class="absolute z-50 top-16 right-2 bg-zinc-900 rounded-xl shadow-lg p-2 space-y-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-28">
    <button 
      class="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded transition-colors text-white"
      onclick={() => setTheme('light')}
      aria-label="Switch to light theme"
    >
      {icons.light} {#if showLabels}Light{/if}
    </button>
    <button 
      class="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded transition-colors text-white"
      onclick={() => setTheme('dark')}
      aria-label="Switch to dark theme"
    >
      {icons.dark} {#if showLabels}Dark{/if}
    </button>
    <button 
      class="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded transition-colors text-white"
      onclick={() => setTheme('system')}
      aria-label="Use system theme"
    >
      {icons.system} {#if showLabels}System{/if}
    </button>
  </div>
</div>

<style>
  /* Ensure dropdown is visible when hovered */
  .group:hover .group-hover\:visible {
    visibility: visible;
  }
  
  .group:hover .group-hover\:opacity-100 {
    opacity: 1;
  }
</style>