<script lang="ts">
  let {
    displayName = '',
    shortAddr = '',
    avatarUrl = null as string | null,
    avatarInitial = 'W',
    ringColor = '#a16207',
    plan = 'Explorer'
  } = $props();
</script>

<div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
  <div class="flex items-center gap-3">
    <div class="relative">
      {#if avatarUrl}
        <img
          src={avatarUrl}
          alt="avatar"
          class="w-8 h-8 rounded-full object-cover"
          style={`box-shadow: 0 0 0 2px ${ringColor}`}
        />
      {:else}
        <div
          class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold"
          style={`box-shadow: 0 0 0 2px ${ringColor}`}
        >
          {avatarInitial}
        </div>
      {/if}
    </div>
    <div class="flex-1 min-w-0">
      <div class="font-medium text-sm truncate">{displayName}</div>
      <div class="text-xs text-zinc-500 truncate">{shortAddr}</div>
      <div class="text-xs capitalize" style={`color: ${ringColor}`}>
        {plan} Membership
      </div>
    </div>
  </div>
</div>
