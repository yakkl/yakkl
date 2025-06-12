<script lang="ts">
  import { handleOpenInTab } from '$lib/utilities';

  function handleUniversity() {
    handleOpenInTab('https://yakkl.com/university/support?utm_source=yakkl&utm_medium=extension&utm_campaign=extension&utm_content=university&utm_term=extension');
  }

</script>

<button
  class="flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-sm bg-white/20 dark:bg-zinc-800/30 hover:bg-white/30 dark:hover:bg-zinc-700/50 transition"
  aria-label="YAKKL University"
  onclick={() => handleUniversity()}
>
  <svg xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    class="w-5 h-5 text-white dark:text-purple-400">
    <path
      d="M12 2L1 7l11 5 9-4.09V17h2V7L12 2zm-1 14.74l-5-2.27v2l5 2.27 5-2.27v-2l-5 2.27z" />
  </svg>

</button>
