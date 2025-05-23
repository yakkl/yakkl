<!-- AccountListing.svelte -->
<script lang="ts">
  import type { YakklAccount } from '$lib/common';
  import { onMount } from 'svelte';
  import { yakklAccountsStore, yakklCurrentlySelectedStore, yakklPricingStore, yakklPrimaryAccountsStore } from '$lib/common/stores';
  import AccountForm from './AccountForm.svelte';
  import Confirmation from './Confirmation.svelte';
  import { dateString } from '$lib/common/datetime';
  import { setYakklAccountsStorage, setYakklPrimaryAccountsStorage } from '$lib/common/stores';
  import { AccountTypeCategory } from '$lib/common/types';
  import EditControls from './EditControls.svelte';
	import WalletManager from '$lib/plugins/WalletManager';
  import type { Wallet } from '$lib/plugins/Wallet';
	import { log } from '$lib/plugins/Logger';
  import { collectAccountData, type AccountData } from '$lib/utilities/accountData';

  interface Props {
    accounts?: YakklAccount[];
    onAccountSelect?: (account: YakklAccount) => void;
  }

  let { accounts = $bindable([]), onAccountSelect = () => {} }: Props = $props();

  let editMode = $state(false);
  let showDeleteModal = $state(false);
  let selectedAccount: YakklAccount | null = $state(null);
  let wallet: Wallet | null = $state(null);
  let accountData: AccountData[] = $state([]);

  $effect(() => {
    (async () => {
      if (wallet && $yakklPricingStore && accounts.length > 0) {
        if ($yakklPricingStore.price === $yakklPricingStore.prevPrice) {
          log.info('Price has not changed.');
          return;
        }
        accountData = await collectAccountData(accounts, wallet);
      }
    })();
  });

  onMount(() => {
    if (!accounts.length) {
      accounts = $yakklAccountsStore;
    }
    wallet = WalletManager.getInstance(['Alchemy'], ['Ethereum'], $yakklCurrentlySelectedStore!.shortcuts.chainId ?? 1, import.meta.env.VITE_ALCHEMY_API_KEY_PROD);
  });

  function handleEdit(account: YakklAccount) {
    selectedAccount = account;
    editMode = true;
  }

  function handleDelete(account: YakklAccount) {
    selectedAccount = account;
    showDeleteModal = true;
  }

  async function confirmDelete() {
    if (selectedAccount) {
      const balance = await checkBalances(selectedAccount);
      if (balance) { // Any balances found, return early
        alert('Your account or sub-account has a balance.');
        // TODO: Add a modal to handle confirmation of deletion of the account/sub-account.
        return;
      }
      // TODO: Add a modal to handle confirmation of any accounts that are confirmed to be connected to a dApp.
      
      if (selectedAccount.accountType === AccountTypeCategory.PRIMARY) {
        let subAccounts = accounts.filter(a => a.primaryAccount?.address === selectedAccount!.address);
        subAccounts.forEach(subAccount => {
          const index = accounts.findIndex(a => a.address === subAccount.address);
          if (index !== -1) {
            accounts.splice(index, 1);
          }
        });
      }
      accounts = accounts.filter(a => a.address !== selectedAccount!.address);
      setYakklAccountsStorage(accounts);
      $yakklAccountsStore = accounts;

      if (selectedAccount.accountType === AccountTypeCategory.PRIMARY) {
        let primaryAccounts = $yakklPrimaryAccountsStore.filter(a => a.address !== selectedAccount!.address);
        setYakklPrimaryAccountsStorage(primaryAccounts);
        selectedAccount = null;
      } else {
        if (selectedAccount.address === $yakklCurrentlySelectedStore!.shortcuts.address) {
          selectedAccount = selectedAccount!.primaryAccount?.account as YakklAccount;
          onAccountSelect(selectedAccount); // This will update the currently selected account to the primary account if the sub-account is deleted and it's the currently selected account too.
        }
      }
      showDeleteModal = false;
    }
  }

  async function checkBalances(account: YakklAccount) {
    let balance = 0n;
    if (account.accountType === AccountTypeCategory.PRIMARY) {
      let subAccounts = accounts.filter(a => a.primaryAccount?.address === account.address);
      subAccounts.forEach(async subAccount => {
        balance = await wallet.getBalance(subAccount.address);
        if (balance > 0n) {
          alert(`Sub-account ${subAccount.name} has a balance of ${balance}. Please transfer the balance to another account before deleting!`);
          return true;
        }
      });
    } else {
      balance = await wallet.getBalance(account.address);
      if (balance > 0n) {
        alert(`Account ${account.name} has a balance of ${balance}. Please transfer the balance to another account before deleting!`);
        return true;
      }
    }
    return false;
  }

  function updateAccount(updatedAccount: YakklAccount) {
    const index = accounts.findIndex(a => a.address === updatedAccount.address);
    if (index !== -1) {
      accounts[index] = { ...updatedAccount, updateDate: dateString() };
      if (updatedAccount.accountType === AccountTypeCategory.PRIMARY) {
        updatePrimaryAndSubAccounts(updatedAccount);
      }
      setYakklAccountsStorage(accounts);
      $yakklAccountsStore = accounts;
      selectedAccount = updatedAccount;
    }
    editMode = false;
  }

  function updatePrimaryAndSubAccounts(updatedPrimaryAccount: YakklAccount) {
    let primaryAccount = $yakklPrimaryAccountsStore.find(a => a.address === updatedPrimaryAccount.address);
    if (primaryAccount) {
      primaryAccount.name = updatedPrimaryAccount.name;
      primaryAccount.updateDate = dateString();
      setYakklPrimaryAccountsStorage($yakklPrimaryAccountsStore);
    }
    let subAccounts = accounts.filter(a => a.primaryAccount?.address === updatedPrimaryAccount.address);
    subAccounts.forEach(subAccount => {
      const index = accounts.findIndex(a => a.address === subAccount.address);
      if (index !== -1) {
        accounts[index].primaryAccount!.name = updatedPrimaryAccount.name;
        accounts[index].primaryAccount!.updateDate = dateString();
      }
    });
  }

  function handleCopy(account: YakklAccount) {
    navigator.clipboard.writeText(account.address);
  }
</script>

<ul>
  {#each accountData as { account, quantityFormatted, totalValueFormatted }}
    <li class="mb-4 relative">
      <button class="w-full flex items-start rounded-lg p-4 transition-colors duration-200 {account.accountType === AccountTypeCategory.PRIMARY ? 'bg-purple-100 hover:bg-purple-200' : account.accountType === AccountTypeCategory.SUB ? 'bg-blue-100 hover:bg-blue-200' : 'bg-green-100 hover:bg-green-200'}" onclick={() => onAccountSelect(account)}>
        <div class="w-8 h-8 flex items-center justify-center rounded-full {account.accountType === AccountTypeCategory.PRIMARY ? 'bg-purple-500' : account.accountType === AccountTypeCategory.SUB ? 'bg-blue-500' : 'bg-green-500'} text-white mr-4 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="flex-1 -ml-2">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-md font-bold">{account.accountType === AccountTypeCategory.PRIMARY ? 'PORTFOLIO' : account.accountType === AccountTypeCategory.SUB ? 'SUB-PORTFOLIO' : 'IMPORTED'}</h3>
          </div>
          <p class="text-sm font-medium text-gray-600">{account.name}</p>
          {#if account.accountType === AccountTypeCategory.SUB}
          <span class="text-xs text-gray-500 mt-1">Derived from {account.primaryAccount?.name}</span>
          {/if}
          <p class="text-xs text-gray-500 mt-1">{account.address}</p>
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-medium text-gray-600">Quantity:</span>
              <span class="text-xs font-semibold">{quantityFormatted} ETH</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs font-medium text-gray-600">Total Value:</span>
              <span class="text-xs font-semibold">{totalValueFormatted}</span>
            </div>
          </div>
        </div>
      </button>
      <EditControls onEdit={() => handleEdit(account)} onDelete={() => handleDelete(account)} onCopy={() => handleCopy(account)} controls={['copy', 'edit', 'delete']}/>
    </li>
  {/each}
</ul>

<AccountForm
  bind:show={editMode}
  account={selectedAccount}
  onSubmit={updateAccount}
/>

<Confirmation
  bind:show={showDeleteModal}
  onConfirm={confirmDelete}
  title="Delete Account"
  message="Are you sure you want to delete this account? This action cannot be undone! If this is a primary account, all sub-accounts will also be deleted!"
/>

