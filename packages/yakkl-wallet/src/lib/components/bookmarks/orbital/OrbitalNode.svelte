<script lang="ts">
  import { spring } from 'svelte/motion';
  import { scale, fade } from 'svelte/transition';
  
  interface Props {
    icon: string;
    label: string;
    angle: number;
    radius?: number;
    isActive?: boolean;
    color?: string;
    tooltip?: string;
    onClick?: () => void;
    onHover?: (hovering: boolean) => void;
  }
  
  let {
    icon,
    label,
    angle,
    radius = 120,
    isActive = false,
    color = 'primary',
    tooltip,
    onClick,
    onHover
  }: Props = $props();
  
  let hovering = $state(false);
  let pressed = $state(false);
  
  // Calculate position based on angle
  const x = $derived(Math.cos(angle * Math.PI / 180) * radius);
  const y = $derived(Math.sin(angle * Math.PI / 180) * radius);
  
  // Spring animation for smooth movement
  const position = spring({ x: 0, y: 0 }, {
    stiffness: 0.2,
    damping: 0.5
  });
  
  $effect(() => {
    position.set({ x, y });
  });
  
  const scale_value = spring(1, {
    stiffness: 0.3,
    damping: 0.4
  });
  
  $effect(() => {
    if (pressed) {
      scale_value.set(0.9);
    } else if (hovering || isActive) {
      scale_value.set(1.15);
    } else {
      scale_value.set(1);
    }
  });
  
  function handleMouseEnter() {
    hovering = true;
    onHover?.(true);
  }
  
  function handleMouseLeave() {
    hovering = false;
    onHover?.(false);
  }
  
  function handleMouseDown() {
    pressed = true;
  }
  
  function handleMouseUp() {
    pressed = false;
    onClick?.();
  }
</script>

<g
  transform="translate({$position.x}, {$position.y})"
  class="orbital-node"
  role="button"
  tabindex="0"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onmousedown={handleMouseDown}
  onmouseup={handleMouseUp}
  onkeydown={(e) => e.key === 'Enter' && onClick?.()}
>
  <!-- Glow effect when hovering -->
  {#if hovering || isActive}
    <circle
      r="35"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      opacity="0.3"
      class="text-{color}"
      in:fade={{ duration: 200 }}
    />
  {/if}
  
  <!-- Main circle -->
  <circle
    r="28"
    fill="currentColor"
    class="text-{color}/10"
    stroke="currentColor"
    stroke-width="2"
    class:text-{color}={true}
    transform="scale({$scale_value})"
    style="transform-origin: center;"
  />
  
  <!-- Icon -->
  <text
    x="0"
    y="5"
    text-anchor="middle"
    font-size="20"
    transform="scale({$scale_value})"
    style="transform-origin: center;"
  >
    {icon}
  </text>
  
  <!-- Label and Tooltip -->
  {#if hovering || isActive}
    <g in:fade={{ duration: 200 }}>
      <text
        x="0"
        y="45"
        text-anchor="middle"
        font-size="12"
        fill="currentColor"
        class="text-base-content"
      >
        {label}
      </text>
      {#if tooltip && hovering}
        <!-- Tooltip background -->
        <rect
          x="-80"
          y="55"
          width="160"
          height="30"
          rx="4"
          fill="black"
          opacity="0.8"
        />
        <!-- Tooltip text -->
        <text
          x="0"
          y="73"
          text-anchor="middle"
          font-size="10"
          fill="white"
        >
          {tooltip}
        </text>
      {/if}
    </g>
  {/if}
</g>

<style>
  .orbital-node {
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .orbital-node:hover {
    filter: brightness(1.1);
  }
  
  .orbital-node:focus {
    outline: none;
  }
  
  .orbital-node:focus-visible circle:first-of-type {
    stroke-width: 3;
    opacity: 0.5;
  }
</style>