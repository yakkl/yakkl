<script lang="ts">
  let { class: className = '' } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  class="w-5 h-5 {className}"
  fill="currentColor"
>
  <circle cx="12" cy="12" r="10" fill="#FF0420"/>
  <path d="M12 6C8.69 6 6 8.69 6 12s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white"/>
</svg>