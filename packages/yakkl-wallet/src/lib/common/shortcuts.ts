import { getBalance, getCode, getLatestBlock } from "$contexts/background/extensions/chrome/legacy";
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from "./constants";
import { ProviderRpcError } from "./errors";
import type { Shortcuts, YakklCurrentlySelected } from "./interfaces";
import { browser_ext } from '$lib/common/environment';

// Helper functions to get data from currentlySelected.shortcuts
export async function getCurrentlySelectedData(): Promise<Shortcuts | null> {
  if (!browser_ext) {
    return null;
  }

	const result = await browser_ext.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
	const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;

	if (!yakklCurrentlySelected?.shortcuts) {
		throw new ProviderRpcError(4100, 'Wallet shortcuts not initialized');
	}

	return yakklCurrentlySelected.shortcuts;
}

// Read-only method handlers
export async function getCurrentlySelectedChainId(): Promise<string> {
	const shortcuts = await getCurrentlySelectedData();
  if (!shortcuts) {
    return '0x1'; // default to mainnet
  }

	return `0x${shortcuts.chainId.toString(16)}`;
}

export async function getCurrentlySelectedAccounts(): Promise<string[]> {
	const shortcuts = await getCurrentlySelectedData();
  if (!shortcuts) {
    return [];
  }

	return shortcuts.address ? [shortcuts.address] : [];
}

export async function getCurrentlySelectedNetworkVersion(): Promise<string> {
	const shortcuts = await getCurrentlySelectedData();
  if (!shortcuts) {
    return '1'; // default to mainnet
  }

	return shortcuts.chainId.toString();
}

export async function getCurrentlySelectedBlockNumber(): Promise<string> {
	const shortcuts = await getCurrentlySelectedData();
  if (!shortcuts) {
    return '0';
  }

	const block = await getLatestBlock(shortcuts.chainId);
	return block.number.toString();
}

export async function getCurrentlySelectedBalance(address: string): Promise<string> {
	const shortcuts = await getCurrentlySelectedData();
  if (!shortcuts) {
    return '0';
  }

	const balance = await getBalance(shortcuts.chainId, address);
	return balance.toString();
}

export async function getCurrentlySelectedCode(address: string): Promise<string> {
	const shortcuts = await getCurrentlySelectedData();
  if (!shortcuts) {
    return '0x0';
  }

	return await getCode(shortcuts.chainId, address);
}
