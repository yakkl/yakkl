<script lang="ts">
  const { className = '' }: { className?: string } = $props();

  function setTheme(mode: 'light' | 'dark' | 'system') {
    sessionStorage.setItem('class', mode);
    document.documentElement.classList.remove('light', 'dark');
    if (mode === 'light') {
      document.documentElement.classList.add('light');
    } else if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.add('light');
      }
    }
  }
</script>

<div class="group z-50 {className}">
  <div class="bg-zinc-800 text-white w-full h-full rounded-xl shadow-lg text-xl flex items-center justify-center cursor-pointer">
    🌓
  </div>
  <div class="absolute z-50 top-16 right-2 bg-zinc-900 rounded-xl shadow-lg p-2 space-y-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-28">
    <button class="w-full text-left px-3 py-2 hover:bg-zinc-800" onclick={() => setTheme('light')}>🌞 Light</button>
    <button class="w-full text-left px-3 py-2 hover:bg-zinc-800" onclick={() => setTheme('dark')}>🌚 Dark</button>
    <button class="w-full text-left px-3 py-2 hover:bg-zinc-800" onclick={() => setTheme('system')}>🖥️ System</button>
  </div>
</div>
