/**
 * Blockchain Bridge
 * Provides blockchain utilities to UI components without direct ethers imports
 * All actual blockchain operations happen in the background service
 */

import { sendMessage } from '$lib/messaging/client-messaging';

/**
 * Validate an Ethereum address
 * @param address Address to validate
 * @returns True if valid address
 */
export async function isValidAddress(address: string): Promise<boolean> {
  try {
    // Basic client-side validation first
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return false;
    }
    
    // For thorough validation, ask background service
    const response = await sendMessage({
      type: 'VALIDATE_ADDRESS',
      data: { address }
    });
    
    return response?.valid || false;
  } catch {
    return false;
  }
}

/**
 * Format wei value to ETH
 * @param weiValue Value in wei (string or bigint)
 * @returns Formatted ETH value
 */
export function formatEther(weiValue: string | bigint): string {
  try {
    const wei = BigInt(weiValue);
    const eth = Number(wei) / 1e18;
    return eth.toFixed(6);
  } catch {
    return '0.000000';
  }
}

/**
 * Parse ETH value to wei
 * @param etherValue Value in ETH
 * @returns Value in wei as string
 */
export function parseEther(etherValue: string | number): string {
  try {
    const eth = typeof etherValue === 'string' ? parseFloat(etherValue) : etherValue;
    const wei = BigInt(Math.floor(eth * 1e18));
    return wei.toString();
  } catch {
    return '0';
  }
}

/**
 * Format units with decimals
 * @param value Value to format
 * @param decimals Number of decimals
 * @returns Formatted value
 */
export function formatUnits(value: string | bigint, decimals: number): string {
  try {
    const val = BigInt(value);
    const divisor = BigInt(10 ** decimals);
    const result = Number(val) / Number(divisor);
    return result.toFixed(Math.min(decimals, 6));
  } catch {
    return '0';
  }
}

/**
 * Parse units with decimals
 * @param value Value to parse
 * @param decimals Number of decimals
 * @returns Parsed value as string
 */
export function parseUnits(value: string | number, decimals: number): string {
  try {
    const val = typeof value === 'string' ? parseFloat(value) : value;
    const multiplier = BigInt(10 ** decimals);
    const result = BigInt(Math.floor(val * Number(multiplier)));
    return result.toString();
  } catch {
    return '0';
  }
}

/**
 * Get transaction gas estimate
 * @param transaction Transaction object
 * @returns Gas estimate in ETH
 */
export async function estimateGas(transaction: any): Promise<string> {
  try {
    const response = await sendMessage({
      type: 'ESTIMATE_GAS',
      data: transaction
    });
    
    if (response?.success && response?.data) {
      return formatEther(response.data);
    }
    return '0';
  } catch {
    return '0';
  }
}

/**
 * Format address for display (shortened)
 * @param address Full address
 * @returns Shortened address
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if two addresses are equal (case-insensitive)
 * @param addr1 First address
 * @param addr2 Second address
 * @returns True if addresses are equal
 */
export function addressesEqual(addr1: string, addr2: string): boolean {
  if (!addr1 || !addr2) return false;
  return addr1.toLowerCase() === addr2.toLowerCase();
}