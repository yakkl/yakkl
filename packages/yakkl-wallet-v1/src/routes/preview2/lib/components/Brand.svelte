<script lang="ts">
  let { logo = '/images/logoBullFav32x32.png', name = '', className = '' } = $props();
  let isLogoOnly = !name || name === '';
</script>

<div class={`flex items-center font-bold text-lg tracking-wide text-indigo-400 select-none ${isLogoOnly ? 'w-10 max-w-[42px]' : ''} ${className}`}>
  <img src={logo} class="h-7 w-7 rounded-none" alt="Logo" />
  {#if !isLogoOnly}
    <span class="ml-2">{name}</span>
  {/if}
</div>
