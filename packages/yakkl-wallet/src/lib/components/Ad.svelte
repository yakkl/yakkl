<script lang="ts">
  let {
    useGoogleAd = false,
    customContent,
    onCallToAction = null
  } = $props<{
    useGoogleAd?: boolean;
    customContent?: () => string;
    onCallToAction?: ((index: number) => void) | null;
  }>();
</script>

<div class="bg-primary text-primary-content p-2">
  {#if useGoogleAd}
    <!-- Google AdSense placeholder -->
    <div class="h-[100px] flex items-center justify-center">
      Ad Space
    </div>
  {:else if customContent}
    {@html customContent()}
  {/if}
</div>
