<script lang="ts">
  import { onMount } from 'svelte';
  import { currentAccount, accounts } from '$lib/stores/account.store';
  import { visibleChains } from '$lib/stores/chain.store';
  import { getProfile, getSettings, getYakklPrimaryAccounts } from '$lib/common/stores';
  import { VERSION, type Profile, type Settings, type YakklPrimaryAccount } from '$lib/common';
  import { sensitiveOperations } from '$lib/services/sensitiveOperations.service';
  import { notificationService } from '$lib/services/notification.service';
  import QRCode from 'qrcode';

  // State
  let profile = $state<Profile | null>(null);
  let settings = $state<Settings | null>(null);
  let qrCodeUrl = $state('');
  let generatedDate = new Date().toLocaleDateString();
  let generatedTime = new Date().toLocaleTimeString();
  let printReady = $state(false);
  let showConfirmation = $state(true);
  let userConsent = $state(false);
  let privateKeys = $state<Map<string, string>>(new Map());
  let recoveryPhrases = $state<Map<string, string[]>>(new Map());
  let primaryAccounts = $state<YakklPrimaryAccount[]>([]);

  // Derived values
  let account = $derived($currentAccount);
  let allAccounts = $derived($accounts);
  let allChains = $derived($visibleChains);

  // Generate QR code placeholder or actual wallet info
  async function generateQRCode() {
    try {
      // For security, we don't put the actual private key in QR
      // Instead, put wallet address and a reference
      const qrData = JSON.stringify({
        wallet: 'YAKKL',
        address: account?.address,
        version: '2.0',
        type: 'emergency-kit',
        generated: new Date().toISOString()
      });

      qrCodeUrl = await QRCode.toDataURL(qrData);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  async function loadSensitiveData() {
    try {
      // Load primary accounts which contain mnemonics
      primaryAccounts = await getYakklPrimaryAccounts() || [];
      
      // Load private keys for all accounts
      for (const acc of allAccounts) {
        try {
          const privateKey = await sensitiveOperations.getPrivateKey(acc.address);
          privateKeys.set(acc.address, privateKey);
        } catch (err) {
          console.error(`Failed to get private key for ${acc.address}:`, err);
        }
      }

      // Map primary accounts to their mnemonics (recovery phrases)
      for (const primaryAcc of primaryAccounts) {
        // Check if data is decrypted and contains mnemonic
        if (primaryAcc.data && 'mnemonic' in primaryAcc.data && primaryAcc.data.mnemonic) {
          // Store mnemonic as array of words
          const words = primaryAcc.data.mnemonic.split(' ');
          recoveryPhrases.set(primaryAcc.address, words);
        }
      }
    } catch (error) {
      console.error('Failed to load sensitive data:', error);
      await notificationService.show({
        message: 'Failed to load some account data. Please try again.',
        type: 'error'
      });
    }
  }

  function handleConsentChange(event: Event) {
    userConsent = (event.target as HTMLInputElement).checked;
  }

  async function proceedToPrint() {
    if (!userConsent) {
      await notificationService.show({
        message: 'Please acknowledge the security warning before proceeding.',
        type: 'warning'
      });
      return;
    }

    showConfirmation = false;
    
    // Load sensitive data
    await loadSensitiveData();
    
    // Mark as ready for print
    printReady = true;

    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      window.print();
    }, 500);
  }

  onMount(async () => {
    // Load profile and settings
    profile = await getProfile();
    settings = await getSettings();

    // Generate QR code
    if (account) {
      await generateQRCode();
    }
  });
</script>

<svelte:head>
  <title>YAKKL Shield - Emergency Kit - Print</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
        font-family: system-ui, -apple-system, sans-serif;
      }

      .no-print {
        display: none !important;
      }

      .print-container {
        margin: 0;
        padding: 15mm 20mm;
        font-size: 11pt;
        color: black !important;
        background: white !important;
        line-height: 1.4;
      }

      .page-break {
        page-break-after: always;
        min-height: 100vh;
      }

      .recovery-box {
        width: 45mm;
        height: 20mm;
        border: 1px solid #333;
        display: inline-block;
        margin: 2mm;
        padding: 2mm;
        position: relative;
        vertical-align: top;
      }

      .recovery-box.grid {
        width: auto;
        min-width: 35mm;
        height: 18mm;
      }

      .box-number {
        position: absolute;
        top: 1mm;
        left: 2mm;
        font-size: 7pt;
        color: #666;
      }

      .box-content {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-family: 'Courier New', monospace;
        font-size: 9pt;
        font-weight: 600;
        color: #000;
        padding: 2mm;
      }

      /* Color overrides for print */
      .text-red-600, .text-red-800 {
        color: #000 !important;
        font-weight: bold;
      }

      .bg-red-50, .bg-yellow-50, .bg-gray-50, .bg-gray-100 {
        background: #f5f5f5 !important;
      }

      .border-red-600, .border-yellow-600 {
        border-color: #000 !important;
        border-width: 2px !important;
      }

      /* Table styling */
      table {
        width: 100%;
        border-collapse: collapse;
      }

      td {
        padding: 4mm 0;
        border-bottom: 1px solid #ddd;
      }

      /* Private key styling */
      .font-mono {
        font-family: 'Courier New', monospace;
        font-size: 9pt;
      }

      .break-all {
        word-break: break-all;
      }
    }

    @media screen {
      .print-container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
        background: white;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }

      .recovery-box {
        width: 140px;
        height: 80px;
        border: 2px solid #e5e7eb;
        display: inline-block;
        margin: 4px;
        padding: 8px;
        position: relative;
        background: #f9fafb;
        border-radius: 4px;
      }

      .recovery-box.grid {
        width: auto;
        min-width: 120px;
        height: 60px;
      }

      .box-number {
        position: absolute;
        top: 4px;
        left: 8px;
        font-size: 10px;
        color: #6b7280;
      }

      .box-content {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-family: ui-monospace, monospace;
        font-size: 14px;
        padding: 8px;
      }
    }
  </style>
</svelte:head>

{#if showConfirmation && !printReady}
  <!-- Confirmation Screen -->
  <div class="flex items-center justify-center min-h-screen p-4 bg-gray-50">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8">
      <div class="text-center mb-8">
        <div class="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Emergency Recovery Kit</h1>
        <p class="text-lg text-gray-600">Critical Security Information</p>
      </div>

      <div class="space-y-6 mb-8">
        <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h2 class="text-lg font-bold text-red-800 mb-3">⚠️ EXTREME SECURITY WARNING</h2>
          <ul class="space-y-2 text-sm text-red-700">
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span>This document will contain your <strong>private keys</strong> and <strong>recovery phrases</strong></span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span>Anyone with access to this information can <strong>steal all your funds</strong></span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span><strong>NEVER</strong> share this document with anyone</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span><strong>NEVER</strong> take photos or store digitally</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span>Store in a <strong>fireproof safe</strong> or <strong>safety deposit box</strong></span>
            </li>
          </ul>
        </div>

        <div class="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
          <h3 class="font-bold text-amber-800 mb-2">What will be included:</h3>
          <ul class="space-y-1 text-sm text-amber-700">
            <li>• Your wallet recovery phrase(s)</li>
            <li>• Private keys for all accounts</li>
            <li>• Account addresses and details</li>
            <li>• Wallet configuration and settings</li>
          </ul>
        </div>

        <div class="border-2 border-gray-300 rounded-lg p-4">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={userConsent}
              onchange={handleConsentChange}
              class="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span class="text-sm text-gray-700">
              I understand the security risks and confirm that I am in a secure, private location. 
              I will store this document safely and will never share it with anyone.
            </span>
          </label>
        </div>
      </div>

      <div class="flex gap-4">
        <button
          onclick={proceedToPrint}
          class="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={!userConsent}
        >
          I Understand - Proceed to Print
        </button>
        <button
          onclick={() => window.close()}
          class="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{:else if !printReady}
  <div class="flex items-center justify-center h-screen">
    <div class="text-center">
      <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p>Loading sensitive data...</p>
    </div>
  </div>
{:else}
  <!-- Print Header (No-print for screen) -->
  <div class="no-print p-4 bg-gray-100 border-b">
    <div class="max-w-4xl mx-auto flex justify-between items-center">
      <h1 class="text-2xl font-bold">YAKKL Shield - Emergency Kit</h1>
      <button
        onclick={() => window.print()}
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Print Emergency Kit
      </button>
    </div>
  </div>

  <!-- Print Content -->
  <div class="print-container">
    <!-- Page 1: Cover Page -->
    <div class="page-break">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">YAKKL Smart Wallet</h1>
        <h2 class="text-xl">YAKKL Shield - Emergency Kit</h2>
        <p class="text-gray-600 mt-4">Generated on: {generatedDate}</p>
      </div>

      <div class="border-2 border-red-600 p-6 mb-8 bg-red-50">
        <h3 class="text-lg font-bold text-red-600 mb-2">⚠️ CRITICAL SECURITY INFORMATION</h3>
        <ul class="list-disc list-inside space-y-2 text-sm">
          <li>This document contains sensitive information to recover your wallet</li>
          <li>Store it in a secure location (safe, safety deposit box, etc.)</li>
          <li>Never share this information with anyone</li>
          <li>Never store digitally or take photos of this document</li>
          <li>Consider making multiple copies for different secure locations</li>
          <li>The YAKKL Shield - Emergency Kit data file is fully encrypted and stored in your local storage</li>
        </ul>
      </div>

      <div class="mb-8">
        <h3 class="text-lg font-bold mb-4">Account Information</h3>
        <table class="w-full border-collapse">
          <tbody>
            <tr class="border-b">
              <td class="py-2 font-medium">Username:</td>
              <td class="py-2">{profile?.userName || 'Not set'}</td>
            </tr>
          <tr class="border-b">
            <td class="py-2 font-medium">Plan Type:</td>
            <td class="py-2">{settings?.plan?.type || 'Basic'}</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-medium">Kit Version:</td>
            <td class="py-2">{VERSION}</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- QR Code -->
      {#if qrCodeUrl}
        <div class="text-center">
          <h3 class="text-lg font-bold mb-4">Wallet Reference QR Code</h3>
          <img src={qrCodeUrl} alt="Wallet QR Code" class="mx-auto" />
          <p class="text-sm text-gray-600 mt-2">Scan to identify this wallet</p>
        </div>
      {/if}
    </div>

    <!-- Page 2: Recovery Phrase(s) -->
    <div class="page-break">
      <h2 class="text-2xl font-bold mb-6">Recovery Phrase(s)</h2>

      <div class="border-2 border-yellow-600 p-4 mb-6 bg-yellow-50">
        <p class="text-sm">
          <strong>Critical:</strong> These recovery phrases can restore your entire wallet. Store them securely and never share them with anyone.
        </p>
      </div>

      {#each primaryAccounts as primaryAcc, accIndex}
        {#if recoveryPhrases.has(primaryAcc.address)}
          <div class="mb-8">
            <h3 class="font-bold mb-4">Primary Account {accIndex + 1}</h3>
            <p class="text-xs text-gray-600 mb-4">Address: {primaryAcc.address}</p>
            
            <!-- Recovery Phrase Grid -->
            <div class="grid grid-cols-4 gap-2 mb-4">
              {#each recoveryPhrases.get(primaryAcc.address) || [] as word, i}
                <div class="recovery-box grid">
                  <span class="box-number">{i + 1}</span>
                  <div class="box-content">{word}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      {#if recoveryPhrases.size === 0}
        <!-- Empty boxes for manual writing if no phrases loaded -->
        <div class="mb-8">
          <p class="text-sm text-gray-600 mb-4">No recovery phrases found. Write your recovery phrase in the boxes below:</p>
          {#each Array(24) as _, i}
            <div class="recovery-box">
              <span class="box-number">{i + 1}</span>
              <div class="box-content"></div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="mt-8 p-4 bg-gray-100">
        <h4 class="font-bold mb-2">Recovery Instructions:</h4>
        <ol class="list-decimal list-inside text-sm space-y-1">
          <li>Install YAKKL Smart Wallet extension</li>
          <li>Select "Import Wallet" during setup</li>
          <li>Enter your recovery phrase in the exact order</li>
          <li>Set a new password for the wallet</li>
          <li>Verify your accounts are restored</li>
        </ol>
      </div>
    </div>

    <!-- Page 3: Account Details -->
    <div class="page-break">
      <h2 class="text-2xl font-bold mb-6">Account Details</h2>

      <div class="space-y-6">
        {#each allAccounts as acc, index}
          <div class="border p-4 rounded">
            <h3 class="font-bold mb-2">Account {index + 1}: {acc.address.slice(0, 10) + '...'}</h3>
            <table class="w-full text-sm">
              <tbody>
                <tr>
                  <td class="py-1 font-medium w-1/3">Address:</td>
                  <td class="py-1 font-mono text-xs">{acc.address}</td>
                </tr>
                <tr>
              </tr>
              <tr>
                <td class="py-1 font-medium">Networks:</td>
                <td class="py-1">{acc.chainIds?.join(', ') || 'All'}</td>
              </tr>
              </tbody>
            </table>
          </div>
        {/each}
      </div>

      <div class="mt-8">
        <h3 class="font-bold mb-4">Supported Networks</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          {#each allChains as chain}
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>{chain.name} (ID: {chain.chainId})</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Page 4: Private Keys -->
    <div class="page-break">
      <h2 class="text-2xl font-bold mb-6">Private Key Storage</h2>

      <div class="border-2 border-red-600 p-4 mb-6 bg-red-50">
        <p class="text-sm font-bold text-red-600">
          ⚠️ EXTREME CAUTION: Private keys provide complete access to your accounts.
          Never share them or enter them on any website. YAKKL will never ask for your private keys!
        </p>
      </div>

      <div class="space-y-6">
        {#each allAccounts as acc, index}
          <div class="border-2 border-gray-300 p-4">
            <h4 class="font-bold mb-2">Account {index + 1}</h4>
            <p class="text-xs text-gray-600 mb-2">Address: {acc.address}</p>
            
            {#if privateKeys.has(acc.address)}
              <div class="bg-gray-50 p-4 rounded border border-gray-200">
                <p class="text-xs text-gray-600 mb-1">Private Key:</p>
                <p class="font-mono text-xs break-all">{privateKeys.get(acc.address)}</p>
              </div>
            {:else}
              <div class="border border-dashed border-gray-400 p-8 text-center text-gray-400">
                <p>Write your private key here</p>
                <p class="text-xs mt-2">(64 characters, starts with 0x)</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Page 5: Additional Information -->
    <div>
      <h2 class="text-2xl font-bold mb-6">Additional Recovery Information</h2>

      <div class="space-y-6">
        <div>
          <h3 class="font-bold mb-2">Password Hint</h3>
          <div class="border p-4 h-20">
            <p class="text-gray-400 text-sm">Write a hint for your wallet password (not the password itself)</p>
          </div>
        </div>

        <div>
          <h3 class="font-bold mb-2">Important Contacts</h3>
          <table class="w-full border-collapse">
            <tbody>
              <tr class="border-b">
                <td class="py-2 font-medium">YAKKL Support:</td>
                <td class="py-2">support@yakkl.com</td>
              </tr>
              <tr class="border-b">
              <td class="py-2 font-medium">Website:</td>
              <td class="py-2">https://yakkl.com</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 font-medium">Documentation:</td>
              <td class="py-2">https://docs.yakkl.com</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 class="font-bold mb-2">Notes</h3>
          <div class="border p-4 h-40">
            <p class="text-gray-400 text-sm">Additional notes or information</p>
          </div>
        </div>

        <div class="mt-8 p-4 bg-gray-100">
          <h4 class="font-bold mb-2">Security Reminders:</h4>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Store this document in a fireproof safe or safety deposit box</li>
            <li>Consider using Shamir's Secret Sharing to split this information</li>
            <li>Never store this information digitally</li>
            <li>Review and update this kit when you add new accounts</li>
            <li>Inform a trusted person of this kit's location (but not its contents)</li>
          </ul>
        </div>
      </div>

      <div class="mt-12 text-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} YAKKL Smart Wallet - YAKKL Shield - Emergency Kit v2.0</p>
        <p class="mt-2">This document was generated on {generatedDate}</p>
      </div>
    </div>
  </div>
{/if}
