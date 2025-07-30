<script lang="ts">
  let { logo = '/images/logoBullFav32x32.png', name = '', className = '', imgClass = 'h-10 w-10' } = $props();
  let isLogoOnly = !name || name === '';
</script>

<div class={`flex items-center font-bold text-lg tracking-wide text-indigo-400 select-none ${isLogoOnly ? 'w-10 max-w-[42px]' : ''} ${className}`}>
  <img src={logo} class={`h-7 w-7 rounded-none ${imgClass}`} alt="Logo" />
  {#if !isLogoOnly}
    <span class="ml-2">{name}</span>
  {/if}
</div>
