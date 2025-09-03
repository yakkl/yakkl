/**
 * Cache Protection Utilities
 * 
 * Ensures cache data integrity by preventing overwrites with zero or invalid values.
 * Core principle: Cache should preserve the last known valid state.
 */

import { BigNumber } from '$lib/common/bignumber';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import type { TokenCache } from '$lib/types';

// Extended token interface that includes additional fields used in various parts of the app
// These fields are commonly used in the codebase but not part of the core TokenCache interface
interface ExtendedTokenCache extends Omit<TokenCache, 'priceLastUpdated' | 'balanceLastUpdated'> {
  qty?: string;          // Alternative field for balance used in some components
  quantity?: string;     // Another alternative field for balance
  chainName?: string;    // Human-readable chain name
  logoURI?: string;      // Token logo URL
  priceLastUpdated: Date | string;    // Can be Date or ISO string
  balanceLastUpdated: Date | string;  // Can be Date or ISO string
}

/**
 * Safely update a token's properties without losing valid cached data
 * Only updates properties that have valid new values (> 0)
 */
export function safeUpdateToken(
  existingToken: ExtendedTokenCache | undefined,
  newData: Partial<ExtendedTokenCache>
): ExtendedTokenCache {
  // If no existing token, return new data as-is
  if (!existingToken) {
    return newData as ExtendedTokenCache;
  }

  // Create a copy of the existing token
  const updatedToken = { ...existingToken };

  // Update balance only if new value is valid (> 0)
  if (newData.balance !== undefined) {
    const newBalance = BigNumberishUtils.toBigInt(newData.balance);
    if (newBalance && newBalance > 0n) {
      updatedToken.balance = newData.balance;
      // Keep alternative balance fields in sync if they exist
      if ('qty' in updatedToken) updatedToken.qty = newData.balance;
      if ('quantity' in updatedToken) updatedToken.quantity = newData.balance
    }
    // If new balance is 0 but we have a valid cached balance, keep the cached value
    // This preserves the last known state
  }

  // Update price only if new value is valid (> 0)
  if (newData.price !== undefined && newData.price !== null) {
    const newPrice = typeof newData.price === 'number' ? newData.price : 
                     BigNumberishUtils.toNumber(newData.price);
    if (newPrice && newPrice > 0) {
      updatedToken.price = newData.price;
      updatedToken.priceLastUpdated = new Date().toISOString(); // Store as ISO string
    }
    // If new price is 0 but we have a valid cached price, keep the cached value
  }

  // Recalculate value if we have valid balance and price
  const balance = BigNumberishUtils.toBigInt(updatedToken.balance);
  const price = typeof updatedToken.price === 'number' ? updatedToken.price : 
                BigNumberishUtils.toNumber(updatedToken.price);
  
  if (balance && balance > 0n && price && price > 0) {
    // Calculate value in cents as BigInt
    const balanceInEther = BigNumberishUtils.fromWeiToNumber(balance, updatedToken.decimals || 18).toString();
    const valueInDollars = parseFloat(balanceInEther) * price;
    const valueInCents = Math.floor(valueInDollars * 100);
    
    // Only update value if it's valid (> 0)
    if (valueInCents > 0) {
      updatedToken.value = valueInCents.toString();
    }
  }

  // Update other properties that don't have the zero-protection requirement
  if (newData.symbol) updatedToken.symbol = newData.symbol;
  if (newData.name) updatedToken.name = newData.name;
  if (newData.address) updatedToken.address = newData.address;
  if (newData.decimals !== undefined) updatedToken.decimals = newData.decimals;
  if (newData.isNative !== undefined) updatedToken.isNative = newData.isNative;
  if (newData.chainId !== undefined) updatedToken.chainId = newData.chainId;
  // Update extended properties if they exist
  if (newData.chainName && 'chainName' in updatedToken) updatedToken.chainName = newData.chainName;
  if (newData.logoURI && 'logoURI' in updatedToken) updatedToken.logoURI = newData.logoURI;

  return updatedToken;
}

/**
 * Merge token arrays preserving valid cached data
 */
export function safeMergeTokens(
  existingTokens: ExtendedTokenCache[],
  newTokens: ExtendedTokenCache[]
): ExtendedTokenCache[] {
  const tokenMap = new Map<string, ExtendedTokenCache>();

  // First, add all existing tokens to the map
  existingTokens.forEach(token => {
    const key = `${token.chainId}-${token.address?.toLowerCase() || token.symbol}`;
    tokenMap.set(key, token);
  });

  // Then, safely update with new token data
  newTokens.forEach(newToken => {
    const key = `${newToken.chainId}-${newToken.address?.toLowerCase() || newToken.symbol}`;
    const existingToken = tokenMap.get(key);
    const updatedToken = safeUpdateToken(existingToken, newToken);
    tokenMap.set(key, updatedToken);
  });

  return Array.from(tokenMap.values());
}

/**
 * Validate if a token has valid data worth caching
 */
export function isValidTokenData(token: ExtendedTokenCache): boolean {
  const balance = BigNumberishUtils.toBigInt(token.balance);
  const price = typeof token.price === 'number' ? token.price : 
                BigNumberishUtils.toNumber(token.price);
  const value = BigNumberishUtils.toBigInt(token.value);

  // A token is valid if it has:
  // 1. A valid balance > 0, OR
  // 2. A valid price > 0 (for price tracking), OR  
  // 3. A valid cached value > 0 (historical data)
  return (balance && balance > 0n) || 
         (price && price > 0) || 
         (value && value > 0n);
}

/**
 * Fix zero values in token data by recalculating if possible
 */
export function fixZeroValues(token: ExtendedTokenCache): ExtendedTokenCache {
  const fixedToken = { ...token };
  
  // Try to fix balance/qty/quantity consistency
  const balance = BigNumberishUtils.toBigInt(token.balance || (token as any).qty || (token as any).quantity);
  if (balance && balance > 0n) {
    const balanceStr = balance.toString();
    fixedToken.balance = balanceStr;
    // Update alternative balance fields if they exist
    if ('qty' in fixedToken) fixedToken.qty = balanceStr;
    if ('quantity' in fixedToken) fixedToken.quantity = balanceStr;
  }

  // Recalculate value if we have balance and price but value is 0
  const value = BigNumberishUtils.toBigInt(token.value);
  if ((!value || value === 0n) && balance && balance > 0n) {
    const price = typeof token.price === 'number' ? token.price : 
                  BigNumberishUtils.toNumber(token.price);
    
    if (price && price > 0) {
      const balanceInEther = BigNumberishUtils.fromWeiToNumber(balance, token.decimals || 18).toString();
      const valueInDollars = parseFloat(balanceInEther) * price;
      const valueInCents = Math.floor(valueInDollars * 100);
      
      if (valueInCents > 0) {
        fixedToken.value = valueInCents.toString();
      }
    }
  }

  return fixedToken;
}

/**
 * Check if token update would cause data loss
 */
export function wouldCauseDataLoss(
  existingToken: ExtendedTokenCache,
  newToken: Partial<ExtendedTokenCache>
): boolean {
  // Check if we're trying to overwrite valid data with zeros
  const existingBalance = BigNumberishUtils.toBigInt(existingToken.balance);
  const newBalance = newToken.balance ? BigNumberishUtils.toBigInt(newToken.balance) : null;
  
  const existingPrice = typeof existingToken.price === 'number' ? existingToken.price : 
                        BigNumberishUtils.toNumber(existingToken.price);
  const newPrice = newToken.price !== undefined ? 
                   (typeof newToken.price === 'number' ? newToken.price : 
                    BigNumberishUtils.toNumber(newToken.price)) : null;
  
  const existingValue = BigNumberishUtils.toBigInt(existingToken.value);
  const newValue = newToken.value ? BigNumberishUtils.toBigInt(newToken.value) : null;

  // Data loss occurs if:
  // 1. Existing balance > 0 but new balance is 0
  // 2. Existing price > 0 but new price is 0
  // 3. Existing value > 0 but new value is 0
  const balanceDataLoss = existingBalance && existingBalance > 0n && 
                          newBalance !== null && newBalance === 0n;
  const priceDataLoss = existingPrice && existingPrice > 0 && 
                        newPrice !== null && newPrice === 0;
  const valueDataLoss = existingValue && existingValue > 0n && 
                        newValue !== null && newValue === 0n;

  return balanceDataLoss || priceDataLoss || valueDataLoss;
}