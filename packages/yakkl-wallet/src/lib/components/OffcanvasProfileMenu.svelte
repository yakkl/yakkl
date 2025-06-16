<script lang="ts">
  import { goto } from '$app/navigation';
  import { PATH_LOGOUT } from '$lib/common';
  import { showProfileSettingsModal } from '$lib/common/stores/ui';
	import Avatar from './Avatar.svelte';

  const props = $props<{
    userName?: string;
    avatarUrl?: string;
  }>();

  function handleLogout() {
    goto(PATH_LOGOUT);
  }

  function openSettings() {
    showProfileSettingsModal.set(true);
  }
</script>

<div
  class="z-100 offcanvas offcanvas-end top-0 right-0 fixed bottom-auto flex flex-col min-w-[200px] max-w-[280px] font-sans antialiased invisible bg-clip-padding shadow-sm outline-none transition duration-300 ease-in-out border-none rounded-l-md bg-primary text-base-content"
  tabindex="-1"
  id="offcanvasProfileMenu"
  aria-labelledby="offcanvasProfileMenuLabel"
>
  <!-- Header -->
  <div class="offcanvas-header flex items-center justify-between px-4 pt-2 pb-2 bg-primary-200">
    <h5 class="offcanvas-title font-semibold" id="offcanvasProfileMenuLabel">Profile</h5>
    <button
      type="button"
      class="text-base-content opacity-60 hover:opacity-100"
      data-bs-dismiss="offcanvas"
      aria-label="Close"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <hr class="my-1 border-base-content/20" />

  <!-- User Info -->
  <div class="flex items-center gap-3 px-4 py-3">
    <Avatar url={props.avatarUrl} ariaLabel="Profile" className="w-10 h-10 rounded-full ring-2 ring-offset-1" />
    <div class="text-sm font-semibold">{props.userName ?? 'Anonymous Yakker'}</div>
  </div>

  <hr class="my-1 border-base-content/20" />

  <!-- Menu Items -->
  <ul class="px-2 space-y-1">
    <li data-bs-dismiss="offcanvas">
      <button onclick={openSettings} class="w-full text-left px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition">
        ⚙️ Account Settings
      </button>
    </li>
    <li data-bs-dismiss="offcanvas">
      <a
        href="https://yakkl.com/university/profile"
        class="block px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition"
        target="_blank"
        rel="noreferrer"
      >
        🧠 Profile Help
      </a>
    </li>
    <li data-bs-dismiss="offcanvas">
      <button onclick={handleLogout} class="w-full text-left px-4 py-2 rounded-md text-sm text-red-600 hover:text-red-800 hover:bg-primary-100 transition">
        🔒 Logout
      </button>
    </li>
  </ul>

  <hr class="my-1 border-base-content/20" />

  <div class="text-center py-2 bg-primary">
    <a
      class="text-sm font-semibold text-base-content hover:underline"
      href="https://yakkl.com/?utm_source=yakkl&utm_medium=extension&utm_campaign=extension&utm_content=profile&utm_term=extension"
      target="_blank"
      rel="noreferrer"
    >
      yakkl.com
    </a>
  </div>
</div>
