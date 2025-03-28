import type { YakklAccount } from '$lib/common';
import type { Wallet } from '$lib/plugins/Wallet';
import { yakklPricingStore } from '$lib/common/stores';
import { get } from 'svelte/store';

export interface AccountData {
  account: YakklAccount;
  quantity: bigint;
  quantityFormatted: string;
  totalValue: number;
  totalValueFormatted: string;
}

export async function collectAccountData(accounts: YakklAccount[], wallet: Wallet): Promise<AccountData[]> {
  const price = get(yakklPricingStore)?.price ?? 0;
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const accountDataPromises = accounts.map(async (account) => {
    const quantity = await wallet.getBalance(account.address);
    const quantityFormatted = (Number(quantity) / 1e18).toFixed(6);
    const totalValue = (Number(quantity) / 1e18) * price;
    const totalValueFormatted = currency.format(totalValue);

    return {
      account,
      quantity,
      quantityFormatted,
      totalValue,
      totalValueFormatted
    };
  });

  return Promise.all(accountDataPromises);
}
