// src/lib/extensions/chrome/handlers/writeMethodHandler.ts

import { log } from '$lib/managers/Logger';
import { sendErrorResponse } from '$lib/extensions/chrome/errorResponseHandler';
import { pendingRequests, type BackgroundPendingRequest } from '$lib/extensions/chrome/background';
import { showEIP6963Popup } from '$lib/extensions/chrome/eip-6963';
import type { Runtime } from 'webextension-polyfill';
import type { YakklRequest, YakklResponse } from '$lib/common/interfaces';
import { extractSecureDomain } from '$lib/common/security';
import browser from 'webextension-polyfill';
import { verifyDomainConnected } from '$lib/extensions/chrome/verifyDomainConnectedBackground';

/**
 * Handles write methods that require user approval
 */
export async function handleWriteRequest(request: YakklRequest, port: Runtime.Port): Promise<void> {
	const { id, method, params, requiresApproval = true } = request;

	try {
		log.debug('Processing write request:', false, {
			id,
			method,
			requiresApproval,
			timestamp: new Date().toISOString()
		});

		// Most write methods require approval
		if (requiresApproval) {
			await handleApprovalRequest(request, port);
		} else {
			// Some write methods might not need approval (rare)
			const result = await executeWriteMethod(method, params);

			const response: YakklResponse = {
				type: 'YAKKL_RESPONSE:EIP6963',
				id,
				result,
				jsonrpc: '2.0',
				method
			};

			port.postMessage(response);
		}
	} catch (error) {
		log.error('Error in write request:', false, { id, method, error });
		sendErrorResponse(port, id, error);
	}
}

/**
 * Handles methods that require user approval
 */
async function handleApprovalRequest(request: YakklRequest, port: Runtime.Port): Promise<void> {
	const { id, method, params } = request;

	try {
		// Get current tab information
		const tabInfo = await getTabInfoForPort(port);

		// Create pending request
		const pendingRequest: BackgroundPendingRequest = {
			resolve: (result: any) => {
				port.postMessage({
					type: 'YAKKL_RESPONSE:EIP6963',
					id,
					result,
					method,
					jsonrpc: '2.0'
				});
			},
			reject: (error: any) => {
				sendErrorResponse(port, id, error);
			},
			port,
			data: {
				id,
				method,
				params: params || [],
				requiresApproval: true,
				timestamp: Date.now(),
				metaData: {
					method,
					params: params || [],
					metaData: {
						domain: tabInfo.domain,
						icon: tabInfo.icon,
						title: tabInfo.title,
						origin: tabInfo.url,
						isConnected: await verifyDomainConnected(tabInfo.domain),
						message: getApprovalMessage(method, params)
					}
				}
			}
		};

		// Store the pending request
		pendingRequests.set(id, pendingRequest);

		// Show approval popup
		await showEIP6963Popup(method, params || [], port, id);
	} catch (error) {
		log.error('Error handling approval request:', false, error);
		sendErrorResponse(port, id, error);
	}
}

/**
 * Executes write methods that don't require approval
 */
async function executeWriteMethod(method: string, params: any[]): Promise<any> {
	const { getAlchemyProvider } = await import(
		'$lib/managers/providers/network/ethereum_provider/alchemy'
	);
	const provider = await getAlchemyProvider();

	// Execute the method via RPC
	const result = await provider.request({ method, params });

	return result;
}

/**
 * Gets tab information from a port
 */
async function getTabInfoForPort(port: Runtime.Port): Promise<{
	domain: string;
	url: string;
	title: string;
	icon: string;
}> {
	try {
		if (port.sender?.tab?.id) {
			const tab = await browser.tabs.get(port.sender.tab.id);
			return {
				domain: extractSecureDomain(tab.url || ''),
				url: tab.url || '',
				title: tab.title || 'Unknown',
				icon: tab.favIconUrl || '/images/failIcon48x48.png'
			};
		}
	} catch (error) {
		log.error('Error getting tab info:', false, error);
	}

	// Return defaults
	return {
		domain: 'Unknown',
		url: '',
		title: 'Unknown',
		icon: '/images/failIcon48x48.png'
	};
}

/**
 * Gets appropriate approval message for each method
 */
function getApprovalMessage(method: string, params?: any[]): string {
	switch (method) {
		case 'eth_requestAccounts':
			return 'Connect your wallet';

		case 'eth_sendTransaction':
			return 'Confirm transaction';

		case 'personal_sign':
			return params?.[0] ? String(params[0]) : 'Sign message';

		case 'eth_signTypedData_v4':
			return 'Sign typed data';

		case 'wallet_addEthereumChain':
			return 'Add network';

		case 'wallet_switchEthereumChain':
			return 'Switch network';

		case 'wallet_watchAsset':
			return 'Add token';

		default:
			return 'Approve request';
	}
}
