<script lang="ts">
  import SimpleTooltip from '../SimpleTooltip.svelte';
  
  interface Props {
    content: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    alignOffset?: number;
    triggerClass?: string;
    contentClass?: string;
    children?: any;
  }

  let {
    content,
    side = 'top',
    align = 'center',
    sideOffset = 4,
    alignOffset = 0,
    triggerClass = '',
    contentClass = '',
    children
  }: Props = $props();

  // Map side prop to position for SimpleTooltip
  let position = $derived(side as 'top' | 'bottom' | 'left' | 'right');
</script>

<SimpleTooltip content={content} position={position}>
  <span class={triggerClass}>
    {@render children?.()}
  </span>
</SimpleTooltip>