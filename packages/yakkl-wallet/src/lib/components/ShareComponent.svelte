<script lang="ts">
  import { X, Twitter, Facebook, Mail, MessageCircle, Send, Link2, Check } from 'lucide-svelte';
  import { isClient } from '$lib/common/environment';
  
  interface Props {
    show?: boolean;
    onClose?: () => void;
  }
  
  let { 
    show = $bindable(false),
    onClose = () => { show = false; }
  }: Props = $props();
  
  interface SocialPlatform {
    id: string;
    name: string;
    icon: any;
    color: string;
    shareUrl: (message: string, url: string, imageUrl?: string) => string;
  }
  
  const EXTENSION_URL = 'https://chrome.google.com/webstore/detail/yakkl-smart-wallet/ldahblmkifdnfhiclbpbgmhcplldlipp';
  const LOGO_URL = 'https://yakkl.com/images/logoBullFav128x128.png';
  
  const platforms: SocialPlatform[] = [
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: Twitter,
      color: 'hover:bg-black dark:hover:bg-gray-800',
      shareUrl: (message, url) => {
        const text = `${message}\n\n${url}`;
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      }
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'hover:bg-blue-600',
      shareUrl: (message, url) => {
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`;
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: Send,
      color: 'hover:bg-blue-500',
      shareUrl: (message, url) => {
        return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;
      }
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'hover:bg-green-600',
      shareUrl: (message, url) => {
        const text = `${message}\n\n${url}`;
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
      }
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'hover:bg-gray-600',
      shareUrl: (message, url) => {
        const subject = 'Check out YAKKL Smart Wallet!';
        const body = `${message}\n\nGet it here: ${url}\n\nBest regards`;
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    }
  ];
  
  let selectedPlatforms = $state<Set<string>>(new Set());
  let sharing = $state(false);
  let shared = $state(false);
  let copied = $state(false);
  
  const messages = {
    twitter: "🚀 I'm using YAKKL Smart Wallet - the secure, user-friendly crypto wallet with enterprise-grade security! No more seed phrases to worry about. Check it out! 🔐 #YAKKL #CryptoWallet #Web3",
    facebook: "I just discovered YAKKL Smart Wallet and I'm loving it! 🎉 It's a secure crypto wallet that doesn't require managing seed phrases. Perfect for both beginners and pros. Highly recommend checking it out!",
    telegram: "Hey! I'm using YAKKL Smart Wallet for my crypto transactions. It's super secure and easy to use - no complicated seed phrases! You should definitely try it out. 🚀",
    whatsapp: "Hi! I wanted to share this amazing crypto wallet I'm using - YAKKL Smart Wallet. It's really secure and you don't need to worry about seed phrases. Perfect for managing your crypto! Check it out 👇",
    email: "Hi there!\n\nI wanted to share an amazing crypto wallet I've been using - YAKKL Smart Wallet. It offers enterprise-grade security without the hassle of managing seed phrases.\n\nKey features:\n• Secure key management\n• User-friendly interface\n• Multi-chain support\n• No seed phrases to lose\n\nI think you'll really like it!"
  };
  
  function togglePlatform(platformId: string) {
    if (selectedPlatforms.has(platformId)) {
      selectedPlatforms.delete(platformId);
    } else {
      selectedPlatforms.add(platformId);
    }
    selectedPlatforms = selectedPlatforms; // Trigger reactivity
  }
  
  async function shareToSelected() {
    if (selectedPlatforms.size === 0) {
      alert('Please select at least one platform to share to.');
      return;
    }
    
    sharing = true;
    
    // Open each selected platform in sequence
    for (const platformId of selectedPlatforms) {
      const platform = platforms.find(p => p.id === platformId);
      if (platform) {
        const message = messages[platformId as keyof typeof messages];
        const shareUrl = platform.shareUrl(message, EXTENSION_URL, LOGO_URL);
        
        if (isClient) {
          window.open(shareUrl, '_blank', 'width=600,height=400');
        }
        
        // Small delay between opening windows to prevent popup blockers
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    sharing = false;
    shared = true;
    
    // Reset after 3 seconds
    setTimeout(() => {
      shared = false;
      selectedPlatforms.clear();
      selectedPlatforms = selectedPlatforms;
    }, 3000);
  }
  
  async function copyLink() {
    if (isClient && navigator.clipboard) {
      await navigator.clipboard.writeText(EXTENSION_URL);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    }
  }
  
  function handleClose() {
    selectedPlatforms.clear();
    shared = false;
    onClose();
  }
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
      <!-- Close button -->
      <button
        onclick={handleClose}
        class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <X class="w-5 h-5" />
      </button>
      
      <!-- Header -->
      <div class="text-center mb-6">
        <img src="/images/logoBullFav96x96.png" alt="YAKKL Logo" class="w-16 h-16 mx-auto mb-4" />
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Share YAKKL Wallet</h2>
        <p class="text-gray-600 dark:text-gray-300 mt-2">
          Help others discover the secure way to manage crypto
        </p>
      </div>
      
      <!-- Platform Selection -->
      <div class="space-y-3 mb-6">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Select platforms to share on:</p>
        <div class="grid grid-cols-2 gap-3">
          {#each platforms as platform}
            <button
              onclick={() => togglePlatform(platform.id)}
              class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200
                     {selectedPlatforms.has(platform.id) 
                       ? 'border-primary bg-primary/10 dark:bg-primary/20' 
                       : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}"
            >
              <platform.icon class="w-5 h-5" />
              <span class="text-sm font-medium">{platform.name}</span>
              {#if selectedPlatforms.has(platform.id)}
                <Check class="w-4 h-4 ml-auto text-primary" />
              {/if}
            </button>
          {/each}
        </div>
      </div>
      
      <!-- Extension Link -->
      <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Chrome Extension Link:</p>
        <div class="flex items-center gap-2">
          <input
            type="text"
            value={EXTENSION_URL}
            readonly
            class="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
          />
          <button
            onclick={copyLink}
            class="btn btn-sm btn-ghost"
            title="Copy link"
          >
            {#if copied}
              <Check class="w-4 h-4 text-green-500" />
            {:else}
              <Link2 class="w-4 h-4" />
            {/if}
          </button>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          onclick={handleClose}
          class="flex-1 btn btn-ghost"
        >
          Cancel
        </button>
        <button
          onclick={shareToSelected}
          disabled={selectedPlatforms.size === 0 || sharing}
          class="flex-1 btn btn-primary"
        >
          {#if sharing}
            <span class="loading loading-spinner loading-sm"></span>
            Sharing...
          {:else if shared}
            <Check class="w-4 h-4 mr-2" />
            Shared!
          {:else}
            Share to Selected
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}