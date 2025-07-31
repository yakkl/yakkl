// RequestManager.ts
import type { Runtime } from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';
import type { BackgroundPendingRequest } from '$lib/common/interfaces';

export interface ExtendedBackgroundPendingRequest extends BackgroundPendingRequest {
	promise?: Promise<any>;
}

export interface RequestData {
	id: string;
	method: string;
	timestamp: number;
	port: Runtime.Port;
	status: 'pending' | 'resolved' | 'rejected';
	connectionId?: string;
}

export class RequestManager {
	private activeRequests = new Map<string, RequestData>();

	/**
	 * Add a new request to track
	 * Properly separates request tracking from port management
	 */
	addRequest(requestId: string, request: BackgroundPendingRequest, connectionId?: string): void {
		// Check for duplicate requests
		if (this.activeRequests.has(requestId)) {
			log.info('Duplicate request detected', false, {
				requestId,
				existingStatus: this.activeRequests.get(requestId)?.status
			});
			return;
		}

		const requestData: RequestData = {
			id: requestId,
			method: request.data.method,
			timestamp: Date.now(),
			port: request.port,
			status: 'pending',
			connectionId: connectionId
		};

		this.activeRequests.set(requestId, requestData);

		log.debug('Request added to manager', false, {
			requestId: requestId,
			method: request.data.method,
			portName: request.port.name,
			connectionId: connectionId
		});
	}

	/**
	 * Get a request by its ID
	 */
	getRequest(requestId: string): RequestData | undefined {
		return this.activeRequests.get(requestId);
	}

	/**
	 * Resolve a request with a result
	 */
	resolveRequest(requestId: string, result: any): void {
		const request = this.activeRequests.get(requestId);
		if (!request) {
			log.warn('No request found to resolve', false, { requestId });
			return;
		}

		request.status = 'resolved';

		// Send response through the correct port
		try {
			request.port.postMessage({
				type: 'YAKKL_RESPONSE:EIP6963',
				id: requestId,
				result: result,
				method: request.method
			});

			log.debug('Request resolved', false, {
				requestId: requestId,
				method: request.method
			});
		} catch (error) {
			log.error('Failed to send response', false, { error, requestId });
		}

		// Clean up after a short delay
		setTimeout(() => {
			this.activeRequests.delete(requestId);
		}, 1000);
	}

	/**
	 * Reject a request with an error
	 */
	rejectRequest(requestId: string, error: any): void {
		const request = this.activeRequests.get(requestId);
		if (!request) {
			log.warn('No request found to reject', false, { requestId });
			return;
		}

		request.status = 'rejected';

		// Send error response through the correct port
		try {
			request.port.postMessage({
				type: 'YAKKL_RESPONSE:EIP6963',
				id: requestId,
				error: {
					code: error.code || -32603,
					message: error.message || 'Internal error'
				},
				method: request.method
			});

			log.debug('Request rejected', false, {
				requestId: requestId,
				method: request.method,
				error: error.message
			});
		} catch (err) {
			log.error('Failed to send error response', false, { error: err, requestId });
		}

		// Clean up after a short delay
		setTimeout(() => {
			this.activeRequests.delete(requestId);
		}, 1000);
	}

	/**
	 * Clean up old requests
	 */
	cleanupOldRequests(maxAge: number = 60000): void {
		const now = Date.now();
		const toRemove: string[] = [];

		this.activeRequests.forEach((request, requestId) => {
			if (now - request.timestamp > maxAge) {
				toRemove.push(requestId);
			}
		});

		toRemove.forEach((requestId) => {
			this.rejectRequest(requestId, new Error('Request timeout'));
		});

		log.debug('Cleaned up old requests', false, { count: toRemove.length });
	}
}

// Export a singleton instance
export const requestManager = new RequestManager();
