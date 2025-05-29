import { derived, type Readable } from 'svelte/store';
import { yakklCombinedTokenStore } from '$lib/common/stores';
import { log } from "$lib/plugins/Logger";
import { DEBUG_ALL_LOGS } from '../constants';
import { computeTokenValue } from '$lib/common/computeTokenValue'; // Utility function to ensure accurate calculations

// Type definition for the store value
export type TokenTotals = {
  portfolioTotal: number;
  formattedTotal: string;
  chainTotals: {
    byChain: Record<number, number>;
    formatted: Record<string, string>;
  };
};

// Debugging flag (set to true when troubleshooting)
const DEBUG_LOGS = DEBUG_ALL_LOGS;

export const tokenTotals: Readable<TokenTotals> = derived(
  yakklCombinedTokenStore,
  (tokens, set) => {
    if (!tokens || tokens.length === 0) {
      log.warn("No tokens found in yakklCombinedTokenStore. Skipping calculations.");
      set({
        portfolioTotal: 0,
        formattedTotal: "-------",
        chainTotals: { byChain: {}, formatted: {} }
      });
      return;
    }

    let portfolioTotal = 0;
    const chainTotals: Record<number, number> = {};

    // Process all tokens
    tokens.forEach(token => {
      if (!token) return;

      const { value } = computeTokenValue(token); // Compute accurate token value
      portfolioTotal += value;

      const chainId = token.chainId ?? -1; // Default to -1 if undefined
      chainTotals[chainId] = (chainTotals[chainId] ?? 0) + value;
    });

    // Format portfolio total
    const formattedTotal = portfolioTotal > 0 ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(portfolioTotal) : "-------";

    // Format totals per blockchain
    const formattedChainTotals = Object.entries(chainTotals).reduce(
      (acc, [chainId, total]) => {
        acc[chainId] = total > 0 ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(total) : "-------";
        return acc;
      },
      {} as Record<string, string>
    );

    // Update store
    set({
      portfolioTotal,
      formattedTotal,
      chainTotals: {
        byChain: chainTotals,
        formatted: formattedChainTotals
      }
    });
  },
  { // Initial Value
    portfolioTotal: 0,
    formattedTotal: "-------",
    chainTotals: { byChain: {}, formatted: {} }
  }
);
