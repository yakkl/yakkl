/**
 * Updates for transaction store to show all transactions
 * Created to avoid modifying the existing store directly
 */

import { derived } from 'svelte/store';
import { transactionStore } from './transaction.store';

/**
 * Derived store that returns ALL transactions (not limited to 5)
 */
export const allRecentTransactions = derived(
  transactionStore,
  $store => $store.transactions
);

/**
 * Get total transaction count
 */
export const totalTransactionCount = derived(
  transactionStore,
  $store => $store.transactions.length
);