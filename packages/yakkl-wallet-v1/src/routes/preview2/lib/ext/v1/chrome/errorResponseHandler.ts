// src/lib/extensions/chrome/utils/errorResponseHandler.ts

import { log } from '$lib/managers/Logger';
import type { Runtime } from 'webextension-polyfill';

/**
 * Standardized error response handler for RPC messages
 * @param port - The port to send the error response through
 * @param id - The request ID to include in the response
 * @param error - The error object or message
 */
export function sendErrorResponse(port: Runtime.Port, id: string, error: any): void {
	try {
		const errorCode = error.code || -32603;
		const errorMessage = error.message || 'Internal error';

		const errorResponse = {
			type: 'YAKKL_RESPONSE:EIP6963',
			id: id,
			jsonrpc: '2.0',
			error: {
				code: errorCode,
				message: errorMessage,
				data: error.data || undefined
			}
		};

		log.debug('Sending error response:', false, {
			id,
			errorCode,
			errorMessage,
			timestamp: new Date().toISOString()
		});

		port.postMessage(errorResponse);
	} catch (sendError) {
		log.error('Failed to send error response:', false, {
			originalError: error,
			sendError,
			id
		});
	}
}
