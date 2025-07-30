// Note: requestManager is only available in background context
// This file contains UI-safe functions that use storage APIs
import { log } from '$lib/managers/Logger';
// import { getYakklConnectedDomains } from "$lib/common/stores";
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { STORAGE_YAKKL_CONNECTED_DOMAINS, STORAGE_YAKKL_ACCOUNTS } from '$lib/common/constants';
import type { YakklAccount } from '$lib/common/interfaces';

interface YakklConnectedDomain {
	domain: string;
	status: 'approved' | 'pending' | 'rejected';
	addresses?: string[];
}

// UI-safe version that works with storage directly
export async function verifyDomainConnected(
	domain: string | null,
	method?: string
): Promise<boolean> {
	try {
		if (!domain) {
			log.warn('verifyDomainConnected: Domain is null', false);
			return false;
		}

		// For eth_accounts, we need to check if domain is registered and approved
		if (method === 'eth_accounts') {
			const connectedDomains = await getObjectFromLocalStorage<YakklConnectedDomain[]>(
				STORAGE_YAKKL_CONNECTED_DOMAINS
			);
			if (!connectedDomains) {
				log.debug('verifyDomainConnected: No connected domains found', false);
				return false;
			}

			const domainInfo = connectedDomains.find((d) => d.domain === domain);
			if (!domainInfo) {
				log.debug('verifyDomainConnected: Domain not found in connected domains', false, {
					domain
				});
				return false;
			}

			// Check if domain is approved
			if (domainInfo.status !== 'approved') {
				log.debug('verifyDomainConnected: Domain not approved', false, {
					domain,
					status: domainInfo.status
				});
				return false;
			}

			return true;
		}

		// For other methods, just check if domain exists in connected domains
		const connectedDomains = await getObjectFromLocalStorage<YakklConnectedDomain[]>(
			STORAGE_YAKKL_CONNECTED_DOMAINS
		);
		if (!connectedDomains) {
			log.debug('verifyDomainConnected: No connected domains found', false);
			return false;
		}

		const exists = connectedDomains.some((d) => d.domain === domain);
		log.debug('verifyDomainConnected: Domain check result', false, { domain, exists });
		return exists;
	} catch (error) {
		log.error('Error in verifyDomainConnected:', false, error);
		return false;
	}
}

// This function should only be used in background context
// Moved to contexts/background/extensions/chrome/verifyDomainConnectedBackground.ts

export async function revokeDomainConnection(domain: string) {
	try {
		// First, remove from connected domains
		const connectedDomains = await getObjectFromLocalStorage<YakklConnectedDomain[]>(
			STORAGE_YAKKL_CONNECTED_DOMAINS
		);
		if (connectedDomains) {
			const existingDomainIndex = connectedDomains.findIndex((d) => d.domain === domain);
			if (existingDomainIndex !== -1) {
				connectedDomains.splice(existingDomainIndex, 1);
				await setObjectInLocalStorage(STORAGE_YAKKL_CONNECTED_DOMAINS, connectedDomains);
			}
		}

		// Then, remove domain from all accounts' connectedDomains array
		const accounts = await getObjectFromLocalStorage<YakklAccount[]>(STORAGE_YAKKL_ACCOUNTS);
		if (accounts) {
			let accountsModified = false;
			accounts.forEach((account) => {
				if (Array.isArray(account.connectedDomains)) {
					const domainIndex = account.connectedDomains.indexOf(domain);
					if (domainIndex !== -1) {
						account.connectedDomains.splice(domainIndex, 1);
						accountsModified = true;
					}
				}
			});

			if (accountsModified) {
				await setObjectInLocalStorage(STORAGE_YAKKL_ACCOUNTS, accounts);
				log.info('Removed domain from accounts:', false, { domain, accounts });
			}
		}
	} catch (error) {
		log.error('Error in revokeDomainConnection:', false, error);
	}
}

export async function getAddressesForDomain(domain: string) {
	const connectedDomains = await getObjectFromLocalStorage<YakklConnectedDomain[]>(
		STORAGE_YAKKL_CONNECTED_DOMAINS
	);
	if (connectedDomains) {
		const existingDomainIndex = connectedDomains.findIndex((d) => d.domain === domain);
		if (existingDomainIndex !== -1) {
			return connectedDomains[existingDomainIndex].addresses;
		}
	}
	return [];
}

// This function should only be used in background context
// Moved to contexts/background/extensions/chrome/verifyDomainConnectedBackground.ts
