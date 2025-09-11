// src/lib/extensions/chrome/handlers/simulationMethodHandler.ts

import { log } from '$lib/managers/Logger';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import { sendErrorResponse } from '$contexts/background/extensions/chrome/errorResponseHandler';
import type { Runtime } from 'webextension-polyfill';
import type { YakklResponse } from '$lib/common/interfaces';

/**
 * Cache for gas estimates to avoid repeated calculations
 */
class GasEstimateCache {
	private cache: Map<string, { estimate: string; timestamp: number }> = new Map();
	private readonly CACHE_DURATION = 10000; // 10 seconds

	getCacheKey(params: any): string {
		const tx = Array.isArray(params) ? params[0] : params;
		return JSON.stringify({
			from: tx.from,
			to: tx.to,
			data: tx.data,
			value: tx.value
		});
	}

	get(params: any): string | null {
		const key = this.getCacheKey(params);
		const cached = this.cache.get(key);

		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			log.debug('Using cached gas estimate', false, { key });
			return cached.estimate;
		}

		return null;
	}

	set(params: any, estimate: string): void {
		const key = this.getCacheKey(params);
		this.cache.set(key, { estimate, timestamp: Date.now() });

		// Clean up old entries
		if (this.cache.size > 100) {
			this.cleanup();
		}
	}

	cleanup(): void {
		const now = Date.now();
		for (const [key, value] of this.cache.entries()) {
			if (now - value.timestamp > this.CACHE_DURATION) {
				this.cache.delete(key);
			}
		}
	}
}

const gasEstimateCache = new GasEstimateCache();

/**
 * Handles simulation methods like eth_estimateGas and eth_call
 */
export async function handleSimulationRequest(request: any, port: Runtime.Port): Promise<void> {
	const { id, method, params } = request;

	try {
		log.debug('Processing simulation request:', false, {
			id,
			method,
			timestamp: new Date().toISOString()
		});

		let result;

		switch (method) {
			case 'eth_estimateGas':
				result = await handleEstimateGas(params);
				break;

			case 'eth_call':
				result = await handleEthCall(params);
				break;

			case 'eth_createAccessList':
				result = await handleCreateAccessList(params);
				break;

			default:
				throw new Error(`Unsupported simulation method: ${method}`);
		}

		// Send successful response
		const response: YakklResponse = {
			type: 'YAKKL_RESPONSE:EIP6963',
			id,
			result,
			jsonrpc: '2.0',
			method
		};

		log.debug('Sending simulation response:', false, {
			id,
			method,
			result
		});

		port.postMessage(response);
	} catch (error) {
		log.error('Error in simulation request:', false, { id, method, error });
		sendErrorResponse(port, id, error);
	}
}

/**
 * Handles eth_estimateGas requests with caching
 */
async function handleEstimateGas(params: any[]): Promise<string> {
	try {
		// Check cache first
		const cached = gasEstimateCache.get(params);
		if (cached) {
			return cached;
		}

		// Validate params
		if (!params || params.length === 0) {
			throw new Error('Missing transaction parameters for gas estimation');
		}

		const txParams = Array.isArray(params) ? params[0] : params;

		// Validate required fields
		if (!txParams.to && !txParams.data) {
			throw new Error('Gas estimation requires either "to" address or "data" field');
		}

		// Get chain configuration
		const currentlySelected = await getYakklCurrentlySelected();
		const chainId = currentlySelected?.shortcuts?.chainId || 1;

		// Use your RPC provider
		const gasEstimate = await estimateGasViaRPC(txParams, chainId);

		// Cache the result
		gasEstimateCache.set(params, gasEstimate);

		log.debug('Gas estimation successful:', false, {
			estimate: gasEstimate,
			chainId
		});

		return gasEstimate;
	} catch (error: any) {
		// Provide helpful error messages
		if (error.message?.includes('execution reverted')) {
			throw new Error('Transaction would fail: ' + error.message);
		} else if (error.message?.includes('insufficient funds')) {
			throw new Error('Insufficient balance for transaction');
		}

		throw error;
	}
}

/**
 * Handles eth_call requests
 */
async function handleEthCall(params: any[]): Promise<string> {
	try {
		if (!params || params.length === 0) {
			throw new Error('Missing parameters for eth_call');
		}

		const callParams = params[0];
		const blockNumber = params[1] || 'latest';

		// Get chain configuration
		const currentlySelected = await getYakklCurrentlySelected();
		const chainId = currentlySelected?.shortcuts?.chainId || 1;

		// Make the call via RPC
		const result = await callViaRPC(callParams, blockNumber, chainId);

		return result;
	} catch (error) {
		log.error('Error in eth_call:', false, error);
		throw error;
	}
}

/**
 * Handles eth_createAccessList requests
 */
async function handleCreateAccessList(params: any[]): Promise<any> {
	try {
		if (!params || params.length === 0) {
			throw new Error('Missing parameters for eth_createAccessList');
		}

		// Get chain configuration
		const currentlySelected = await getYakklCurrentlySelected();
		const chainId = currentlySelected?.shortcuts?.chainId || 1;

		// Create access list via RPC
		const result = await createAccessListViaRPC(params[0], chainId);

		return result;
	} catch (error) {
		log.error('Error creating access list:', false, error);
		throw error;
	}
}

/**
 * Estimates gas via RPC provider
 */
async function estimateGasViaRPC(txParams: any, chainId: number): Promise<string> {
	const { getAlchemyProvider } = await import(
		'$lib/managers/providers/network/ethereum_provider/alchemy'
	);
	const provider = getAlchemyProvider();

	// Use your corrected estimateGas method that returns hex string
	const result = await provider.estimateGas(txParams);

	return result;
}

/**
 * Makes eth_call via RPC provider
 */
async function callViaRPC(callParams: any, blockNumber: string, chainId: number): Promise<string> {
	const { getAlchemyProvider } = await import(
		'$lib/managers/providers/network/ethereum_provider/alchemy'
	);
	const provider = getAlchemyProvider();

	const result = await provider.request({
		method: 'eth_call',
		params: [callParams, blockNumber]
	});

	return result;
}

/**
 * Creates access list via RPC provider
 */
async function createAccessListViaRPC(txParams: any, chainId: number): Promise<any> {
	const { getAlchemyProvider } = await import(
		'$lib/managers/providers/network/ethereum_provider/alchemy'
	);
	const provider = getAlchemyProvider();

	const result = await provider.request({
		method: 'eth_createAccessList',
		params: [txParams]
	});

	return result;
}
