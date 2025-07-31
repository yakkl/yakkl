<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browserSvelte } from '$lib/common/environment';
  import {
    getSettings,
    setSettingsStorage,
    getYakklAccounts,
    setYakklAccountsStorage,
    getYakklPrimaryAccounts,
    getProfile
  } from '$lib/common/stores';
  import { currentAccount, accounts as accountsStore, accountStore } from '$lib/stores/account.store';
  import {
    PATH_WELCOME,
    type YakklAccount,
    type YakklPrimaryAccount,
    type AccountData,
    type PrimaryAccountData,
    type EmergencyKitAccountData,
    AccessSourceType,
    PromoClassificationType,
    PlanType
  } from '$lib/common';
  import { log } from '$lib/common/logger-wrapper';
  import { EmergencyKitManager } from '$lib/managers/EmergencyKitManager';
  import { createPortfolioAccount } from '$lib/managers/networks/ethereum/createPortfolioAccount';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';

  // State
  let showEmergencyKit = $state(false);
  let emergencyKitData = $state<any>(null);
  let isCreating = $state(false);
  let showError = $state(false);
  let errorValue = $state('');
  let showPassword = $state(false);
  let showPin = $state(false);
  let registrationData: any = null;
  let createdAccount: YakklAccount | null = null;
  let primaryAccount: YakklPrimaryAccount | undefined = undefined;

  onMount(async () => {
    // Get registration data from session
    const regData = sessionStorage.getItem('registration');
    if (!regData) {
      errorValue = 'Registration data not found. Please start over.';
      showError = true;
      setTimeout(() => goto('/register'), 3000);
      return;
    }

    registrationData = JSON.parse(regData);
    await createFirstAccount();
  });

  async function createFirstAccount() {
    isCreating = true;
    try {
      // Get profile
      const profile = await getProfile();
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Create the first account using the portfolio account function
      await createPortfolioAccount(registrationData.digest, profile);

      // Get the created accounts
      const accounts = await getYakklAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('Failed to create account');
      }

      // The last account is the newly created one
      const newAccount = accounts[accounts.length - 1];
      createdAccount = newAccount;

      // Set as current account (if not already done by createPortfolioAccount)
      accountStore.setCurrentAccount({
        address: newAccount.address,
        username: newAccount.name,
        isActive: true,
        balance: newAccount.quantity?.toString() || '0'
      });

      // Get primary accounts to access mnemonic
      const primaryAccounts = await getYakklPrimaryAccounts();
      primaryAccount = primaryAccounts.find(acc => acc.address === newAccount.address);

      // Get account data (assuming it's already decrypted by createPortfolioAccount)
      const accountData = newAccount.data as AccountData; // Type assertion since it could be encrypted
      const primaryAccountData = primaryAccount?.data as PrimaryAccountData | undefined;

      // Generate emergency kit data
      const emergencyKitManager = new EmergencyKitManager();
      emergencyKitData = {
        username: registrationData.username,
        accountName: newAccount.name,
        address: newAccount.address,
        privateKey: accountData.privateKey || '',
        mnemonic: primaryAccountData?.mnemonic || '',
        derivedPath: accountData.path || '',
        createdAt: new Date().toISOString(),
        email: (profile as any).email || '', // Email might not be in the interface
        type: 'single'
      };

      // Show emergency kit
      showEmergencyKit = true;

      // Clear registration data
      sessionStorage.removeItem('registration');
    } catch (error) {
      log.error('Account creation error:', error as any);
      errorValue = 'Failed to create account. Please try again.';
      showError = true;
    } finally {
      isCreating = false;
    }
  }

  async function downloadEmergencyKit() {
    if (!emergencyKitData || !registrationData || !createdAccount) return;

    try {
      // Create account data for emergency kit
      const accountData = createdAccount.data as AccountData;
      const primaryAccountData = primaryAccount?.data as PrimaryAccountData | undefined;

      // Get profile again for emergency kit
      const profile = await getProfile();

      const emergencyAccountData: EmergencyKitAccountData = {
        id: createdAccount.id,
        registered: {
          id: profile?.id || '',
          key: '', // License key if any
          plan: {
            type: PlanType.EXPLORER_MEMBER,
            source: AccessSourceType.STANDARD,
            promo: PromoClassificationType.NONE,
            trialEndDate: '',
            upgradeDate: ''
          },
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
          version: '1.0.0'
        },
        email: (profile as any)?.email || '',
        username: registrationData.username,
        blockchain: createdAccount.blockchain,
        portfolioAddress: createdAccount.address,
        portfolioName: createdAccount.name,
        privateKey: accountData.privateKey,
        mnemonic: primaryAccountData?.mnemonic || '',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        version: '1.0.0',
        hash: ''
      };

      const encryptedKit = await EmergencyKitManager.createEmergencyKit(
        [emergencyAccountData],
        true,
        registrationData.digest
      );

      // Download the encrypted kit
      const blob = new Blob([JSON.stringify(encryptedKit, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yakkl-emergency-kit-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      log.error('Download emergency kit error:', error as any);
      errorValue = 'Failed to download emergency kit';
      showError = true;
    }
  }

  function printEmergencyKit() {
    if (!emergencyKitData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const showSensitive = showPassword && showPin;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>YAKKL Emergency Kit</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .warning h3 { margin: 0 0 10px 0; color: #856404; }
          .info-section { margin: 20px 0; }
          .info-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
          .info-label { font-weight: bold; color: #495057; }
          .info-value { font-family: monospace; color: #212529; word-break: break-all; }
          .sensitive { background: #fee; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>YAKKL Smart Wallet - Emergency Kit</h1>

        <div class="warning">
          <h3>⚠️ CRITICAL SECURITY INFORMATION</h3>
          <p><strong>This document contains sensitive information that provides full access to your wallet.</strong></p>
          <ul>
            <li>Store this document in a secure location (safe, safety deposit box, etc.)</li>
            <li>Never share this information with anyone</li>
            <li>Never store this digitally or take photos of it</li>
            <li>Consider making multiple copies for different secure locations</li>
          </ul>
        </div>

        <div class="info-section">
          <h2>Account Information</h2>
          <div class="info-item">
            <span class="info-label">Username:</span>
            <span class="info-value">${emergencyKitData.username}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Account Name:</span>
            <span class="info-value">${emergencyKitData.accountName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Wallet Address:</span>
            <span class="info-value">${emergencyKitData.address}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Created:</span>
            <span class="info-value">${new Date(emergencyKitData.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div class="info-section">
          <h2>Recovery Information</h2>
          <div class="info-item sensitive">
            <span class="info-label">Secret Recovery Phrase (Mnemonic):</span><br>
            <span class="info-value">${showSensitive ? emergencyKitData.mnemonic : '***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****'}</span>
          </div>
          <div class="info-item sensitive">
            <span class="info-label">Private Key:</span><br>
            <span class="info-value">${showSensitive ? emergencyKitData.privateKey : '********************************'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Derivation Path:</span>
            <span class="info-value">${emergencyKitData.derivedPath}</span>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>YAKKL Smart Wallet © ${new Date().getFullYear()}</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  async function continueToWallet() {
    // Ensure everything is saved
    const settings = await getSettings();
    if (settings) {
      settings.isLocked = false;
      await setSettingsStorage(settings);
    }

    // Navigate to dashboard
    await goto(PATH_WELCOME);
  }

  function onClose() {
    showError = false;
    errorValue = '';
  }
</script>

<ErrorNoAction bind:show={showError} title="Account Creation Error" value={errorValue} {onClose} />

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
  <div class="max-w-3xl w-full">
    {#if isCreating}
      <!-- Creating Account State -->
      <div class="yakkl-card p-8 text-center">
        <svg class="animate-spin h-12 w-12 mx-auto mb-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Creating Your Account...</h2>
        <p class="text-zinc-600 dark:text-zinc-400 mt-2">Please wait while we set up your wallet</p>
      </div>
    {:else if showEmergencyKit && emergencyKitData}
      <!-- Emergency Kit Display -->
      <div class="yakkl-card p-8">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full mb-4">
            <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Emergency Recovery Kit
          </h1>
          <p class="text-zinc-600 dark:text-zinc-400">
            Save this information securely - it's the only way to recover your wallet
          </p>
        </div>

        <!-- Critical Warning -->
        <div class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 class="font-semibold text-red-800 dark:text-red-200 mb-2">Critical Security Notice</h3>
              <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
                <li>• This is the ONLY way to recover your wallet if you lose access</li>
                <li>• Anyone with this information can access your funds</li>
                <li>• Store it offline in a secure location (safe, safety deposit box)</li>
                <li>• Never share it or store it digitally</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Account Info -->
        <div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-6 mb-6 space-y-4">
          <h3 class="font-semibold text-zinc-900 dark:text-white mb-4">Account Information</h3>

          <div>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">Username</span>
            <p class="font-mono text-zinc-900 dark:text-white">{emergencyKitData.username}</p>
          </div>

          <div>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">Account Name</span>
            <p class="font-mono text-zinc-900 dark:text-white">{emergencyKitData.accountName}</p>
          </div>

          <div>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">Wallet Address</span>
            <p class="font-mono text-sm text-zinc-900 dark:text-white break-all">{emergencyKitData.address}</p>
          </div>
        </div>

        <!-- Recovery Info -->
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 mb-6 space-y-4">
          <h3 class="font-semibold text-zinc-900 dark:text-white mb-4">Recovery Information</h3>

          <!-- Secret Recovery Phrase -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Secret Recovery Phrase</span>
              <SimpleTooltip content={showPassword ? "Hide phrase" : "Show phrase"}>
                <button
                  type="button"
                  onclick={() => showPassword = !showPassword}
                  class="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {#if showPassword}
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  {:else}
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  {/if}
                </button>
              </SimpleTooltip>
            </div>
            <div class="font-mono text-sm bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-300 dark:border-zinc-600">
              {#if showPassword}
                {emergencyKitData.mnemonic}
              {:else}
                ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** ***** *****
              {/if}
            </div>
          </div>

          <!-- Private Key -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Private Key</span>
              <SimpleTooltip content={showPin ? "Hide key" : "Show key"}>
                <button
                  type="button"
                  onclick={() => showPin = !showPin}
                  class="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {#if showPin}
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  {:else}
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  {/if}
                </button>
              </SimpleTooltip>
            </div>
            <div class="font-mono text-xs bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-300 dark:border-zinc-600 break-all">
              {#if showPin}
                {emergencyKitData.privateKey}
              {:else}
                ****************************************************************************************
              {/if}
            </div>
          </div>

          <div>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">Derivation Path</span>
            <p class="font-mono text-sm text-zinc-900 dark:text-white">{emergencyKitData.derivedPath}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <div class="flex gap-3">
            <button
              onclick={printEmergencyKit}
              class="yakkl-btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Kit
            </button>
            <button
              onclick={downloadEmergencyKit}
              class="yakkl-btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Encrypted
            </button>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-zinc-700"
                required
              />
              <span class="text-sm text-zinc-700 dark:text-zinc-300">
                I have securely saved my Emergency Recovery Kit and understand that losing this information means losing access to my wallet permanently.
              </span>
            </label>
          </div>

          <button
            onclick={continueToWallet}
            class="yakkl-btn-primary w-full"
          >
            Continue to Wallet
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
