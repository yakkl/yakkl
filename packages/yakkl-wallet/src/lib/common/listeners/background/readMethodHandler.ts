// src/lib/extensions/chrome/handlers/readMethodHandler.ts

import { log } from '$lib/managers/Logger';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import { sendErrorResponse } from '$contexts/background/extensions/chrome/errorResponseHandler';
import { extractSecureDomain } from '$lib/common/security';
import {
	verifyDomainConnected,
	getAddressesForDomain
} from '$contexts/background/extensions/chrome/verifyDomainConnected';
import type { Runtime } from 'webextension-polyfill';
import type { YakklResponse } from '$lib/common/interfaces';
import { VERSION } from '$lib/common/constants';
import { BlockchainExplorer } from '$lib/managers/providers/explorer/BlockchainExplorer';
import { getAlchemyProvider } from '$lib/managers/providers/network/ethereum_provider/alchemy';

/**
 * Handles read-only RPC methods that don't require user approval
 */
export async function handleReadOnlyRequest(request: any, port: Runtime.Port): Promise<void> {
	const { id, method, params } = request;

	try {
		log.debug('Processing read-only request:', false, {
			id,
			method,
			timestamp: new Date().toISOString()
		});

		// Get current chain configuration
		const currentlySelected = await getYakklCurrentlySelected();
		const chainId = currentlySelected?.shortcuts?.chainId || 1;

		let result;

		// Handle methods that don't require an external provider
		switch (method) {
			case 'eth_chainId':
				result = `0x${chainId.toString(16)}`;
				break;

			case 'net_version':
				result = chainId.toString();
				break;

			case 'eth_accounts':
				result = await handleGetAccounts(request);
				break;

			case 'web3_clientVersion':
				result = 'YAKKL/' + VERSION;
				break;

			case 'yakkl_getTransactionHistory':
				result = await handleGetTransactionHistory(params, chainId);
				break;

			case 'yakkl_trackActivity':
				// Just acknowledge tracking - actual storage handled elsewhere
				result = true;
				break;

			default:
				// For all other read methods, use the RPC provider
				result = await callRPCProvider(method, params, chainId);
		}

		// Send successful response
		const response: YakklResponse = {
			type: 'YAKKL_RESPONSE:EIP6963',
			id,
			result,
			jsonrpc: '2.0',
			method
		};

		log.debug('Sending read-only response:', false, {
			id,
			method,
			hasResult: result !== undefined
		});

		port.postMessage(response);
	} catch (error) {
		log.error('Error in read-only request:', false, { id, method, error });
		sendErrorResponse(port, id, error);
	}
}

/**
 * Special handler for eth_accounts that checks domain connection status
 */
async function handleGetAccounts(request: any): Promise<string[]> {
	try {
		// Extract origin from request
		let origin = request.origin;

		// Try to get origin from various possible locations
		if (!origin && request.params && request.params.length > 0) {
			const lastParam = request.params[request.params.length - 1];
			if (typeof lastParam === 'object' && lastParam.origin) {
				origin = lastParam.origin;
			}
		}

		if (!origin) {
			log.debug('No origin provided for eth_accounts, returning empty array');
			return [];
		}

		// Extract domain from origin
		const domain = extractSecureDomain(origin);

		// Check if domain is connected
		const isConnected = await verifyDomainConnected(domain);

		if (!isConnected) {
			log.debug('Domain not connected:', false, { domain });
			return [];
		}

		// Get addresses for this domain
		const addresses = await getAddressesForDomain(domain);

		log.debug('Returning accounts for domain:', false, {
			domain,
			addressCount: addresses.length
		});

		return addresses;
	} catch (error) {
		log.error('Error getting accounts:', false, error);
		return [];
	}
}

/**
 * Calls the RPC provider for methods that need external data
 */
async function callRPCProvider(method: string, params: any[], chainId: number): Promise<any> {
	try {
		// Import your RPC provider
		const provider = getAlchemyProvider();

		// Make the RPC call
		const result = await provider.request({ method, params });

		return result;
	} catch (error) {
		log.error('RPC provider error:', false, { method, error });
		throw error;
	}
}

/**
 * Handles yakkl_getTransactionHistory method to fetch transaction history from blockchain explorers
 */
async function handleGetTransactionHistory(params: any[], chainId: number): Promise<any[]> {
	try {
		// Extract address and limit from parameters
		const [address, limit = 10] = params;

		if (!address || typeof address !== 'string') {
			log.warn('Invalid address provided for transaction history:', false, { address });
			return [];
		}

		log.debug('Fetching transaction history:', false, {
			address,
			chainId,
			limit
		});

		const explorer = BlockchainExplorer.getInstance();
		const transactions = await explorer.getTransactionHistory(address, chainId, limit);

		log.debug('Transaction history fetched:', false, {
			address,
			count: transactions.length
		});

		return transactions;
	} catch (error) {
		log.error('Error fetching transaction history:', false, { error, params, chainId });
		return [];
	}
}
