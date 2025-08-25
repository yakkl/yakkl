<script lang="ts">
  import { currentAccount } from '../stores/account.store';
  import { currentPlan } from '../stores/plan.store';
  import { getProfile } from '$lib/common/stores';
  import { getGravatarUrl } from '$lib/utils/gravatar';
  import { onMount } from 'svelte';
  import { PATH_LEGAL_PRIVACY, PATH_LEGAL_TOS, type ProfileData } from '$lib/common';
  import { goto } from '$app/navigation';
  import Menu from './menu/Menu.svelte';
  import AccountHeader from './menu/AccountHeader.svelte';
  import type { MenuItem } from './menu/types';

  let {
    account = { username: '', address: '', ens: null, avatar: null },
    onManage = null, onTheme = null, onSettings = null, onLogout = null, onExit = null, onEmergencyKit = null, onManageAccounts = null,
    className = ''
  } = $props();

  // Use store data if available
  let storeAccount = $derived($currentAccount);
  let plan = $derived($currentPlan);

  let effectiveAccount = $derived(storeAccount || account);

  let menuOpen = $state(false);
  let closeTimeout: number | null = null;
  let menuButtonElement: HTMLElement | undefined = $state();

  // Profile and avatar state
  let userEmail = $state<string | null>(null);
  let avatarUrl = $state<string | null>(null);

  // Debug: Check if button element is set
  $effect(() => {
    console.log('[Menu] UserMenu - menuButtonElement:', !!menuButtonElement, 'menuOpen:', menuOpen);
    if (menuOpen && !menuButtonElement) {
      console.warn('Menu is open but button element is not set!');
    }
  });

  $effect(() => {
    console.log('[Menu] UserMenu - plan:', plan);
  });

  // Load user profile data
  onMount(async () => {
    try {
      const profile = await getProfile();
      if (profile?.data) {
        const profileData = profile.data as ProfileData;
        userEmail = profileData.email || null;

        // Generate Gravatar URL if email exists
        if (userEmail) {
          avatarUrl = getGravatarUrl(userEmail, 80);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  });

  // Add keyboard listener for Escape key
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && menuOpen) {
      menuOpen = false;
    }
  }

  function shortAddr(addr: string | undefined) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  let username = $derived.by(() => {
    const acc = effectiveAccount;
    if (!acc) return 'Wallet';
    return acc.ens || acc.username || shortAddr(acc.address) || 'Wallet';
  });

  let displayName = $derived.by(() => {
    const acc = effectiveAccount;
    if (!acc) return 'Wallet';
    if (acc.ens) return acc.ens;
    if (acc.username) return acc.username;
    return shortAddr(acc.address) || 'Wallet';
  });

  let avatarInitial = $derived.by(() => {
    // Use username first letter if available
    if (username) return username[0].toUpperCase();
    const acc = effectiveAccount;
    if (!acc) return 'W';
    if (acc.username) return acc.username[0].toUpperCase();
    if (acc.ens) return acc.ens[0].toUpperCase();
    return 'W'; // Default to W if no username or ENS
  });

  // Membership plan colors for rings
  let ringColor = $derived.by(() => {
    const planLower = plan?.toLowerCase() || 'explorer_member';

    if (planLower.includes('founding')) {
      return 'oklch(71.97% 0.149 81.37 / 1)'; // Founding member color
    } else if (planLower.includes('early')) {
      return '#10b981'; // Green for early adopter
    } else if (planLower === 'yakkl_pro' || planLower === 'pro' || planLower === 'yakkl_pro_plus') {
      return '#14b8a6'; // Teal for pro
    } else {
      return '#a16207'; // Brown for basic
    }
  });

  // Plan tag for avatar
  let planTag = $derived.by(() => {
    const planLower = plan?.toLowerCase() || 'explorer_member';

    if (planLower.includes('founding')) {
      return 'fpro';
    } else if (planLower.includes('early')) {
      return 'epro';
    } else if (planLower === 'yakkl_pro' || planLower === 'pro' || planLower === 'yakkl_pro_plus') {
      return 'pro';
    } else {
      return 'explorer_member';
    }
  });

  // Build menu items structure with sub-menus
  const menuItems = $derived.by((): MenuItem[] => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    const platform = isMac ? '⌘' : 'Ctrl';

    const items: MenuItem[] = [
      {
        type: 'custom' as const,
        component: AccountHeader as any, // Cast to any to avoid Svelte 5 type issues
        props: {
          displayName,
          shortAddr: shortAddr(effectiveAccount?.address),
          avatarUrl: avatarUrl || effectiveAccount?.avatar,
          avatarInitial,
          ringColor,
          plan: plan || 'Explorer'
        }
      } as MenuItem,
      {
        type: 'header' as const,
        content: 'Account Management',
        children: [
          {
            type: 'item',
            label: 'Emergency Kit',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>' },
            action: () => { menuOpen = false; onEmergencyKit && onEmergencyKit(); }
          },
          {
            type: 'item',
            label: 'Profile',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>' },
            action: () => { menuOpen = false; onManage && onManage(); }
          },
          {
            type: 'item',
            label: 'Manage Accounts',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>' },
            children: [
              {
                type: 'item',
                label: 'Import Account',
                icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>' },
                href: '/accounts/import'
              },
              {
                type: 'item',
                label: 'Export Account',
                icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' },
                href: '/accounts/export'
              },
              {
                type: 'divider' as const
              },
              {
                type: 'item',
                label: 'View All Accounts',
                icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>' },
                action: () => { menuOpen = false; onManageAccounts && onManageAccounts(); }
              }
            ]
          }
        ]
      } as MenuItem,
      {
        type: 'divider' as const
      } as MenuItem,
      {
        type: 'header' as const,
        content: 'Configuration',
        children: [
          {
            type: 'item',
            label: 'Settings',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>' },
            action: () => { menuOpen = false; onSettings && onSettings(); }
          },
          {
            type: 'item',
            label: 'Toggle Theme',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>' },
            action: () => { menuOpen = false; onTheme && onTheme(); }
          },
          {
            type: 'item',
            label: 'Legal',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>' },
            children: [
          {
            type: 'item',
            label: 'Terms of Service',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' },
            action: () => { menuOpen = false; goto(PATH_LEGAL_TOS); }
          },
          {
            type: 'item',
            label: 'Privacy Policy',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>' },
            action: () => { menuOpen = false; goto(PATH_LEGAL_PRIVACY); }
          },
          {
            type: 'item',
            label: 'Compliance',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' },
            children: [
              {
                type: 'item',
                label: 'GDPR',  // test - remove
                action: () => { menuOpen = false; goto(PATH_LEGAL_PRIVACY); }
                // href: '/legal/gdpr'
              } //,
              // {
              //   type: 'item',
              //   label: 'CCPA',
              //   href: '/legal/ccpa'
              // },
              // {
              //   type: 'item',
              //   label: 'AML/KYC',
              //   href: '/legal/aml-kyc'
              // }
            ]
          }
            ]
          }
        ]
      } as MenuItem,
      {
        type: 'header' as const,
        content: 'Features',
        children: [
          {
            type: 'item',
            label: 'Innovation Lab',
            icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>' },
            href: '/innovation',
            badge: 'NEW',
            badgeClass: 'gradient-badge'
          }
        ]
      } as MenuItem,
      {
        type: 'divider' as const
      } as MenuItem,
      {
        type: 'item',
        label: 'Logout',
        icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>' },
        action: () => { menuOpen = false; onLogout && onLogout(); },
        shortcut: `${platform}+Shift+L`,
        className: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
      } as MenuItem,
      {
        type: 'item',
        label: 'Exit',
        icon: { svg: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>' },
        action: () => { menuOpen = false; onExit && onExit(); },
        shortcut: `${platform}+Shift+X`,
        className: 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
      } as MenuItem
    ];

    return items;
  });

  function handleMouseEnter() {
    console.log('[Menu] handleMouseEnter called');
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
    menuOpen = true;
    console.log('[Menu] menuOpen set to true');
  }

  function handleMouseLeave(e: MouseEvent) {
    console.log('[Menu] handleMouseLeave called');

    // Check if we're moving to the menu itself
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && (relatedTarget.closest('.yakkl-dropdown') || relatedTarget.closest('.yakkl-menu-portal'))) {
      console.log('[Menu] Moving to menu, keeping open');
      return;
    }

    closeTimeout = window.setTimeout(() => {
      // Double-check menu isn't being hovered
      const menuEl = document.querySelector('.yakkl-dropdown');
      if (menuEl && menuEl.matches(':hover')) {
        console.log('[Menu] Menu is being hovered, keeping open');
        return;
      }

      menuOpen = false;
      closeTimeout = null;
      console.log('[Menu] menuOpen set to false after timeout');
    }, 300);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class={`relative flex items-center justify-center ${className}`}
  role="navigation"
  aria-label="User menu"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onkeydown={handleKeyDown}
>
  <div class="relative">
    <button
      bind:this={menuButtonElement}
      class="h-10 w-10 rounded-full flex items-center justify-center relative"
      aria-label={`Manage account for ${username}`}
      title={`${displayName} (${plan || 'Basic'})`}
      onclick={() => {
        console.log('[Menu] Button clicked, toggling menuOpen from', menuOpen, 'to', !menuOpen);
        menuOpen = !menuOpen;
      }}
      tabindex="0"
      style={`box-shadow: 0 0 0 3px transparent, 0 0 0 3px ${ringColor}, 0 0 0 5px rgba(255,255,255,0.2)`}
    >
      {#if avatarUrl || effectiveAccount?.avatar}
        <img
          src={avatarUrl || effectiveAccount.avatar}
          alt="avatar"
          class="h-full w-full rounded-full object-cover"
        />
      {:else}
        <div class="h-full w-full rounded-full bg-indigo-600 flex items-center justify-center">
          <span class="text-white text-base font-bold select-none">
            {avatarInitial}
          </span>
        </div>
      {/if}
    </button>
    {#if planTag !== 'explorer_member'}
      <span class="absolute -bottom-1 -right-1 text-[8px] font-semibold px-1 rounded text-white"
            style={`background-color: ${ringColor}`}>
        {planTag.toUpperCase()}
      </span>
    {/if}
  </div>

  <!-- Remove debug elements -->

  <Menu
    items={menuItems}
    open={menuOpen}
    onClose={() => menuOpen = false}
    anchorElement={menuButtonElement}
    className="animate-in fade-in"
  />
</div>
