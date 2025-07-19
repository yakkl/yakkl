import { log } from '$lib/common/logger-wrapper';
import { sendNotificationMessage } from '$lib/common/notifications';
import { showExtensionPopup } from '$contexts/background/extensions/chrome/ui';
import { browser_ext } from '$lib/common/environment';

// See example usage below::

/**
 * DAppPopupManager - Handles DApp interaction popups with queue system
 *
 * This class enforces a single active DApp popup with a queue system
 * to ensure user isn't overwhelmed with multiple approval popups.
 */
export class DAppPopupManager {
	private static instance: DAppPopupManager | null = null;
	private initialized = false;

	// Active popup tracking
	private activePopup: {
		requestId: string;
		windowId: number;
		method: string;
		createdAt: number;
	} | null = null;

	// Queue for pending requests
	private requestQueue: Array<{
		requestId: string;
		request: string;
		method: string;
		pinnedLocation: string;
		createdAt: number;
		originTabId?: number;
		originWindowId?: number;
		resolve: (success: boolean) => void;
		reject: (error: Error) => void;
	}> = [];

	// Notification ID for browser notifications
	private notificationId: string | null = null;

	/**
	 * Track origin information with requests
	 */
	private requestsMap = new Map<
		string,
		{
			method: string;
			createdAt: number;
			status: 'pending' | 'active' | 'completed' | 'cancelled';
			originTabId?: number;
			originWindowId?: number;
			linkedRequest?: string;
			result?: any;
		}
	>();

	// Configuration
	private config = {
		maxQueueSize: 10,
		notificationEnabled: true,
		popupWidth: 428,
		popupHeight: 620,
		queueProcessingInterval: 1000, // ms
		maxRequestAge: 3600000, // 1 hour
		notificationTimeout: 15000 // 15 seconds
	};

	private queueTimer: any = null;

	static getInstance(): DAppPopupManager {
		if (!DAppPopupManager.instance) {
			DAppPopupManager.instance = new DAppPopupManager();
		}
		return DAppPopupManager.instance;
	}

	private constructor() {
		// Initialization happens in init()
	}

	/**
	 * Initialize the popup manager
	 */
	async init(): Promise<void> {
		if (this.initialized) return;

		try {
			if (!browser_ext) {
				log.warn('Browser API not available, DAppPopupManager initialization delayed');
				return;
			}

			// Set up listener for window close events
			browser_ext.windows.onRemoved.addListener((windowId) => {
				this.handleWindowClosed(windowId);
			});

			// Start queue processor
			this.queueTimer = setInterval(() => this.processQueue(), this.config.queueProcessingInterval);

			// Clean up stale requests periodically
			setInterval(() => {
				const expiryTime = Date.now() - this.config.maxRequestAge;

				// Clean up stale queue items
				this.requestQueue = this.requestQueue.filter((item) => {
					if (item.createdAt < expiryTime) {
						item.reject(new Error('Request expired while waiting in queue'));
						return false;
					}
					return true;
				});

				// Clean up stale request map entries
				for (const [requestId, data] of this.requestsMap.entries()) {
					if (data.createdAt < expiryTime) {
						this.requestsMap.delete(requestId);
					}
				}
			}, 60000); // Run every minute

			this.initialized = true;
			log.info('[DAppPopupManager] Initialized', false);
		} catch (error) {
			console.error('Failed to initialize DAppPopupManager:', error);
		}
	}

	/**
	 * Configure the manager
	 */
	configure(config: Partial<typeof this.config>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Handle window close event
	 */
	private handleWindowClosed(windowId: number): void {
		// Check if it's our active popup
		if (this.activePopup && this.activePopup.windowId === windowId) {
			log.info('[DAppPopupManager] Active popup closed', false, {
				requestId: this.activePopup.requestId,
				method: this.activePopup.method
			});

			// Update request status
			const requestData = this.requestsMap.get(this.activePopup.requestId);
			if (requestData) {
				this.requestsMap.set(this.activePopup.requestId, {
					...requestData,
					status: 'completed'
				});
			}

			this.activePopup = null;

			// Clear any notification
			this.clearNotification();

			// Process next item in queue
			setTimeout(() => this.processQueue(), 500);
		}
	}

	/**
	 * Process the next item in the queue
	 */
	private async processQueue(): Promise<void> {
		// If we have an active popup or empty queue, do nothing
		if (this.activePopup || this.requestQueue.length === 0) {
			return;
		}

		// Get the next request from the queue
		const nextRequest = this.requestQueue.shift();
		if (!nextRequest) return;

		try {
			log.info('[DAppPopupManager] Processing queued request', false, {
				requestId: nextRequest.requestId,
				method: nextRequest.method,
				queueRemaining: this.requestQueue.length
			});

			// Update status in requests map
			this.requestsMap.set(nextRequest.requestId, {
				method: nextRequest.method,
				createdAt: nextRequest.createdAt,
				status: 'active',
				originTabId: nextRequest.originTabId,
				originWindowId: nextRequest.originWindowId
			});

			// Show the popup
			const result = await showExtensionPopup(
				this.config.popupWidth,
				this.config.popupHeight,
				nextRequest.request,
				nextRequest.pinnedLocation
			);

			// Set as active popup
			this.activePopup = {
				requestId: nextRequest.requestId,
				windowId: result.id,
				method: nextRequest.method,
				createdAt: Date.now()
			};

			// Draw attention to the window
			if (browser_ext?.windows) {
				await browser_ext.windows.update(result.id, { focused: true, drawAttention: true });
			}

			nextRequest.resolve(true);
		} catch (error) {
			log.error('[DAppPopupManager] Failed to process queued request', false, {
				requestId: nextRequest.requestId,
				error
			});

			// Update status
			this.requestsMap.set(nextRequest.requestId, {
				method: nextRequest.method,
				createdAt: nextRequest.createdAt,
				status: 'cancelled',
				originTabId: nextRequest.originTabId,
				originWindowId: nextRequest.originWindowId
			});

			nextRequest.reject(error as Error);

			// Try next request
			setTimeout(() => this.processQueue(), 500);
		}
	}

	/**
	 * Show browser notification for queued requests
	 */
	private async showNotification(queueSize: number) {
		if (!this.config.notificationEnabled) {
			return;
		}

		try {
			const message =
				queueSize === 1
					? '1 DApp request is waiting for your attention'
					: `${queueSize} DApp requests are waiting for your attention`;

			this.notificationId = await sendNotificationMessage('YAKKL Smart Wallet', message);
		} catch (error) {
			console.warn('Notification attempt failed:', error);
			// Don't let notification failures affect core functionality
		}
	}

	/**
	 * Clear any active notification
	 */
	private clearNotification(): void {
		if (!this.notificationId) return;

		try {
			browser_ext.notifications.clear(this.notificationId).catch(() => {});
		} catch (e) {
			// Silently handle errors - notification clearing is not critical
		}

		this.notificationId = null;
	}

	/**
	 * Check if we have an active popup
	 */
	hasActivePopup(): boolean {
		return this.activePopup !== null;
	}

	/**
	 * Get the active request ID
	 */
	getActiveRequestId(): string | null {
		return this.activePopup?.requestId || null;
	}

	/**
	 * Get queue status
	 */
	getQueueStatus(): {
		activePopup: boolean;
		queueSize: number;
		oldestQueuedRequest: number | null;
	} {
		let oldestTime: number | null = null;

		if (this.requestQueue.length > 0) {
			oldestTime = Math.min(...this.requestQueue.map((r) => r.createdAt));
		}

		return {
			activePopup: this.activePopup !== null,
			queueSize: this.requestQueue.length,
			oldestQueuedRequest: oldestTime
		};
	}

	/**
	 * Close the active popup
	 */
	async closeActivePopup(): Promise<boolean> {
		if (!this.activePopup || !browser_ext?.windows) {
			return false;
		}

		try {
			await browser_ext.windows.remove(this.activePopup.windowId);
			this.activePopup = null;
			return true;
		} catch (error) {
			console.error('Failed to close active popup:', error);
			return false;
		}
	}

	/**
	 * Clear the entire request queue
	 */
	clearQueue(): void {
		for (const request of this.requestQueue) {
			request.reject(new Error('Queue cleared by application'));
		}
		this.requestQueue = [];
	}

	/**
	 * Mark a request as complete
	 */
	markRequestComplete(requestId: string, result?: any): void {
		const requestData = this.requestsMap.get(requestId);
		if (requestData) {
			this.requestsMap.set(requestId, {
				...requestData,
				status: 'completed',
				result
			});
		}

		// If this is the active popup, close it
		if (this.activePopup?.requestId === requestId) {
			this.closeActivePopup().catch(() => {});
		}
	}

	/**
	 * Queue or show a DApp popup for a specific request
	 */
	async showDappPopup(
		request: string,
		requestId: string,
		method: string = '',
		pinnedLocation: string = 'M',
		origin?: { tabId?: number; windowId?: number }
	): Promise<boolean> {
		try {
			await this.init();

			const originTabId = origin?.tabId;
			const originWindowId = origin?.windowId;

			// Reject duplicates
			if (this.requestsMap.has(requestId)) {
				const existingRequest = this.requestsMap.get(requestId);
				if (existingRequest?.status === 'pending' || existingRequest?.status === 'active') {
					log.warn('[DAppPopupManager] Duplicate request rejected', false, {
						requestId,
						method
					});
					return false;
				}
			}

			// Check if there's an identical method request from the same origin
			const sameDappPendingRequest = this.findSameDappPendingRequest(
				method,
				originTabId,
				originWindowId
			);

			if (sameDappPendingRequest) {
				log.info('[DAppPopupManager] Similar request from same DApp already in queue', false, {
					requestId,
					existingRequestId: sameDappPendingRequest.requestId,
					method
				});

				// For common read-only methods, just reuse the existing request
				if (this.isCommonReadMethod(method)) {
					// Track this request with a reference to the original
					this.requestsMap.set(requestId, {
						method,
						createdAt: Date.now(),
						status: 'pending',
						originTabId,
						originWindowId,
						linkedRequest: sameDappPendingRequest.requestId
					});

					// Wait for the original request to complete, then mirror the result
					return new Promise((resolve) => {
						const checkInterval = setInterval(() => {
							const original = this.requestsMap.get(sameDappPendingRequest.requestId);
							if (original?.status === 'completed') {
								clearInterval(checkInterval);

								// Mirror the result
								this.requestsMap.set(requestId, {
									...original,
									status: 'completed'
								});

								resolve(true);
							} else if (original?.status === 'cancelled') {
								clearInterval(checkInterval);
								this.requestsMap.set(requestId, {
									...original,
									status: 'cancelled'
								});
								resolve(false);
							}
						}, 200);
					});
				}
			}

			// Track this request
			this.requestsMap.set(requestId, {
				method,
				createdAt: Date.now(),
				status: 'pending',
				originTabId: origin?.tabId,
				originWindowId: origin?.windowId
			});

			// Create promise to handle completion
			return new Promise((resolve, reject) => {
				// Check if queue is too large
				if (this.requestQueue.length >= this.config.maxQueueSize) {
					this.requestsMap.set(requestId, {
						method,
						createdAt: Date.now(),
						status: 'cancelled',
						originTabId: origin?.tabId,
						originWindowId: origin?.windowId
					});

					reject(new Error('Too many pending requests, try again later'));
					return;
				}

				// Add to queue
				this.requestQueue.push({
					requestId,
					request,
					method,
					pinnedLocation,
					createdAt: Date.now(),
					originTabId: origin?.tabId,
					originWindowId: origin?.windowId,
					resolve,
					reject
				});

				// Show notification if needed
				if (this.activePopup && this.requestQueue.length > 0) {
					this.showNotification(this.requestQueue.length);
				}

				// Immediately process queue if no active popup
				if (!this.activePopup) {
					this.processQueue();
				} else {
					log.info('[DAppPopupManager] Request queued, waiting for active popup to close', false, {
						requestId,
						activePopupId: this.activePopup.requestId,
						queuePosition: this.requestQueue.length
					});
				}
			});
		} catch (error) {
			log.error('[DAppPopupManager] Failed to handle popup request', false, {
				requestId,
				method,
				error
			});

			// Update status
			this.requestsMap.set(requestId, {
				method,
				createdAt: Date.now(),
				status: 'cancelled',
				originTabId: origin?.tabId,
				originWindowId: origin?.windowId
			});

			return false;
		}
	}

	/**
	 * Show a popup for a specific method
	 */
	async showPopupForMethod(
		method: string,
		requestId: string,
		pinnedLocation: string = 'M',
		origin?: { tabId?: number; windowId?: number }
	): Promise<boolean> {
		const url = `/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`;
		return this.showDappPopup(url, requestId, method, pinnedLocation, origin);
	}

	/**
	 * Find a similar request from the same DApp
	 */
	private findSameDappPendingRequest(
		method: string,
		tabId?: number,
		windowId?: number
	): { requestId: string } | null {
		// If we don't have origin info, we can't match
		if (!tabId && !windowId) {
			return null;
		}

		// Check the queue first
		for (const item of this.requestQueue) {
			// if (item.method === method) {
			// For window-based matching
			if (windowId && item.originWindowId === windowId) {
				return { requestId: item.requestId };
			}

			// For tab-based matching
			if (tabId && item.originTabId === tabId) {
				return { requestId: item.requestId };
			}
			// }
		}

		// Also check active popup
		if (this.activePopup?.method === method) {
			const activeData = this.requestsMap.get(this.activePopup.requestId);
			if (
				(windowId && activeData?.originWindowId === windowId) ||
				(tabId && activeData?.originTabId === tabId)
			) {
				return { requestId: this.activePopup.requestId };
			}
		}

		return null;
	}

	/**
	 * Check if a method is a common read-only method that can be deduplicated
	 */
	private isCommonReadMethod(method: string): boolean {
		const readMethods = [
			'eth_requestAccounts',
			'eth_accounts',
			'wallet_getPermissions',
			'web3_clientVersion',
			'eth_chainId',
			'net_version'
		];

		return readMethods.includes(method);
	}

	/**
	 * Find any pending request with the same method
	 * This is for common read methods that can be deduplicated across different sources
	 */
	private findAnySamePendingMethod(method: string): { requestId: string } | null {
		// Check the queue first
		for (const item of this.requestQueue) {
			if (item.method === method) {
				return { requestId: item.requestId };
			}
		}

		// Also check active popup
		if (this.activePopup?.method === method) {
			return { requestId: this.activePopup.requestId };
		}

		return null;
	}

	/**
	 * Show a warning to the user that a request from the same DApp is already being processed
	 */
	private showDuplicateRequestWarning(method: string): void {
		try {
			// First try your extension's built-in warning system
			sendNotificationMessage(
				'Request in Progress',
				`A ${method} request from this DApp is already being processed. Please complete that request first.`
			);
			return;
		} catch (error) {
			console.warn('Failed to show duplicate request warning:', error);
		}
	}

	/**
	 * Show a warning about maximum queue size
	 */
	private showMaxQueueWarning(): void {
		try {
			// Try your extension's warning system first
			sendNotificationMessage(
				'Too Many Requests',
				'There are too many pending DApp requests. Please complete some existing requests first.'
			);
			return;
		} catch (error) {
			console.warn('Failed to show max queue warning:', error);
		}
	}

	/**
	 * Get debug data for all tracked requests
	 */
	getDebugData(): Record<string, any> {
		const data: Record<string, any> = {
			activePopup: this.activePopup,
			queueSize: this.requestQueue.length,
			queuedRequests: this.requestQueue.map((r) => ({
				requestId: r.requestId,
				method: r.method,
				age: Math.round((Date.now() - r.createdAt) / 1000) + 's'
			})),
			requests: {}
		};

		for (const [requestId, requestData] of this.requestsMap.entries()) {
			data.requests[requestId] = {
				...requestData,
				age: Math.round((Date.now() - requestData.createdAt) / 1000) + 's'
			};
		}

		return data;
	}
}

// Export singleton instance accessor
export function getDAppPopupManager(): DAppPopupManager {
	return DAppPopupManager.getInstance();
}

// For backward compatibility and easier migration
export async function showDappPopup(
	request: string,
	requestId: string,
	method: string = '',
	pinnedLocation: string = 'M'
): Promise<boolean> {
	return getDAppPopupManager().showDappPopup(request, requestId, method, pinnedLocation);
}

export async function showPopupForMethod(
	method: string,
	requestId: string,
	pinnedLocation: string = 'M'
): Promise<boolean> {
	return getDAppPopupManager().showPopupForMethod(method, requestId, pinnedLocation);
}

// // Access manager directly
// const manager = getDAppPopupManager();

// // Show popup with feedback on queue status
// try {
//   const result = await manager.showPopupForMethod('eth_sign', 'req456');
//   console.log('Popup shown successfully');
// } catch (error) {
//   if (error.message.includes('pending')) {
//     console.log('Request queued, waiting for user to complete previous action');
//   } else {
//     console.error('Failed to show popup:', error);
//   }
// }

// // Check queue status
// const status = manager.getQueueStatus();
// if (status.activePopup) {
//   console.log(`User is currently handling another request (${status.queueSize} more waiting)`);
// }

// // After user completes a transaction
// manager.markRequestComplete('req123', { success: true, txHash: '0x...' });
