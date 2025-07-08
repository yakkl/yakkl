<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
    color?: string;
  }

  let { size = 14, class: className = '', color = 'currentColor' }: Props = $props();
</script>

<svg 
  xmlns="http://www.w3.org/2000/svg" 
  width={size} 
  height={size} 
  viewBox="0 0 24 24" 
  fill="none" 
  stroke={color} 
  stroke-width="1.7142857142857142" 
  stroke-linecap="round" 
  stroke-linejoin="round" 
  class="tabler-icon tabler-icon-adjustments {className}"
>
  <path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
  <path d="M6 4v4"></path>
  <path d="M6 12v8"></path>
  <path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
  <path d="M12 4v10"></path>
  <path d="M12 18v2"></path>
  <path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"></path>
  <path d="M18 4v1"></path>
  <path d="M18 9v11"></path>
</svg>