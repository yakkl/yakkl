// Account utility functions to break circular dependencies
// This file contains functions that are used by both account.store.ts and common/stores.ts

import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import type { YakklCurrentlySelected } from '$lib/common/interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from '$lib/common/constants';
import { log } from '$lib/common/logger-wrapper';
import { AccountTypeCategory, NetworkType } from '$lib/common/types';

/**
 * Get the currently selected account data
 * @param id - Optional user ID
 * @param persona - Optional persona
 * @returns Promise with currently selected data
 */
export async function getYakklCurrentlySelected(
	id?: string,
	persona?: string
): Promise<YakklCurrentlySelected> {
	try {
		const value = await getObjectFromLocalStorage<YakklCurrentlySelected>(
			STORAGE_YAKKL_CURRENTLY_SELECTED
		);

		if (id && persona) {
			// TODO: Implement this later
		}

		// If no value or value is a string, return default values
		if (!value || typeof value === 'string') {
			log.warn('No currently selected Yakkl found, using defaults', false, value);
			return {
				id: '',
				shortcuts: {
					quantity: 0n,
					accountType: AccountTypeCategory.PRIMARY,
					accountName: 'YAKKL_ZERO_ACCOUNT',
					smartContract: false,
					address: '',
					alias: '',
					primary: null,
					init: false,
					legal: false,
					isLocked: true,
					showTestNetworks: false,
					profile: {
						username: '',
						name: null,
						email: ''
					},
					gasLimit: 21000,
					networks: [
						{
							blockchain: 'Ethereum',
							name: 'Mainnet',
							chainId: 1,
							symbol: 'ETH',
							type: NetworkType.MAINNET,
							explorer: 'https://etherscan.io',
							decimals: 18
						}
					],
					network: {
						blockchain: 'Ethereum',
						name: 'Mainnet',
						chainId: 1,
						symbol: 'ETH',
						type: NetworkType.MAINNET,
						explorer: 'https://etherscan.io',
						decimals: 18
					},
					blockchain: 'Ethereum',
					type: NetworkType.MAINNET,
					chainId: 1,
					symbol: 'ETH',
					explorer: 'https://etherscan.io'
				},
				preferences: {
					locale: 'en_US',
					currency: { code: 'USD', symbol: '$' }
				},
				data: {},
				version: '1.0.0',
				createDate: new Date().toISOString(),
				updateDate: new Date().toISOString()
			};
		}
		return value;
	} catch (error) {
		log.error('Error in getYakklCurrentlySelected:', false, error);
		throw error;
	}
}

/**
 * Set the currently selected account data
 * @param values - The currently selected data to store
 * @param id - Optional user ID
 * @param persona - Optional persona
 */
export async function setYakklCurrentlySelectedStorage(
	values: YakklCurrentlySelected,
	id?: string,
	persona?: string
): Promise<void> {
	try {
		if (
			values.shortcuts.address.trim().length === 0 ||
			values.shortcuts.accountName.trim().length === 0
		) {
			throw new Error(
				'Attempting to save yakklCurrentlySelected with no address or no account name. Select a default account and retry.'
			);
		}

		// For now, skip encryption verification to avoid circular dependency
		// TODO: Move verification logic to a separate utility module
		const newValues = values;

		// Update localStorage
		await setObjectInLocalStorage('yakklCurrentlySelected', newValues);
	} catch (error) {
		log.error('Error in setYakklCurrentlySelectedStorage:', false, error);
		throw error;
	}
}
