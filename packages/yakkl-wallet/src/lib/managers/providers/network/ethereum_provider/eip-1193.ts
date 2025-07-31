import { EventEmitter } from 'events';
import type { RequestArguments } from '$lib/common';
import type { Duplex } from 'readable-stream';
import { getWindowOrigin, safePostMessage, getTargetOrigin } from '$lib/common/origin';
import { log } from '$lib/managers/Logger';
import { EIP1193_ERRORS } from './eip-types';
import { getCurrentlySelectedAccounts } from '$lib/common/shortcuts';
import { handleRequestAccounts } from '$contexts/background/extensions/chrome/eip-6963';

export class EIP1193Provider extends EventEmitter {
	private _isConnected: boolean = false;
	private requestId: number = 0;
	private pendingRequests: Map<
		number,
		{
			resolve: (value: any) => void;
			reject: (error: any) => void;
			method: string;
			timestamp: number;
		}
	> = new Map();
	private chainId: string | null = null;
	private networkVersion: string | null = null;
	private cachedAccounts: string[] | null = null;
	private stream: Duplex | null = null;
	private origin: string;
	private isInitialized: boolean = false;
	private initPromise: Promise<void> | null = null;

	constructor(stream?: Duplex) {
		super();
		this.stream = stream || null;
		this.origin = getWindowOrigin();

		// Set up message listener
		this.setupMessageListener();

		// Initialize provider
		this.initPromise = this.initializeFromShortcuts();
	}

	private setupMessageListener() {
		window.addEventListener('message', (event) => {
			log.debug('EIP1193: Message received in content script:', false, {
				event: event.data
			});

			// Validate origin
			if (event.origin !== this.origin && event.origin !== getTargetOrigin()) {
				return;
			}

			const message = event.data;
			if (!message || typeof message !== 'object') {
				return;
			}

			// Handle responses
			if (message.type === 'YAKKL_RESPONSE:EIP1193') {
				this.handleResponse(message);
			}

			// Handle events
			if (message.type === 'YAKKL_EVENT:EIP1193') {
				this.handleEvent(message);
			}
		});
	}

	private async handleResponse(response: any) {
		const { id, result, error } = response;

		// Find the pending request
		const pendingRequest = this.pendingRequests.get(id);
		if (!pendingRequest) {
			log.info('EIP1193: No pending request found for response:', false, {
				id,
				response
			});
			return;
		}

		// Remove the request from pending
		this.pendingRequests.delete(id);

		// Handle the response
		if (error) {
			pendingRequest.reject({
				code: error.code,
				message: error.message,
				data: error.data
			});
		} else {
			// Update provider state if needed
			const { method } = pendingRequest;
			let finalResult = result;

			// Cache the results for these methods
			if (method === 'eth_chainId') {
				this.chainId = finalResult;
				this.emit('chainChanged', finalResult);
				log.debug('EIP1193: Cached chainId:', false, {
					chainId: finalResult
				});
			} else if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
				// For eth_requestAccounts, use the EIP-6963 implementation
				if (method === 'eth_requestAccounts') {
					try {
						// Use the EIP-6963 implementation to handle the request
						finalResult = await handleRequestAccounts(null, id.toString());

						// Update cached accounts and emit events
						this.cachedAccounts = finalResult;
						this.emit('accountsChanged', finalResult);
						if (finalResult && finalResult.length > 0) {
							this._isConnected = true;
							this.emit('connect', { chainId: this.chainId });
						}
					} catch (error) {
						log.error('Error using EIP-6963 implementation for eth_requestAccounts:', false, error);
						// Don't fallback to original implementation - let the error propagate
						throw error;
					}
				} else {
					// For eth_accounts, use cached accounts if available
					finalResult = this.cachedAccounts = await getCurrentlySelectedAccounts();
				}
			} else if (method === 'net_version') {
				this.networkVersion = finalResult;
			} else if (method === 'wallet_switchEthereumChain') {
				// After switching chains, update chainId
				this.updateChainState();
			}

			// Resolve with the result
			pendingRequest.resolve(finalResult);
		}
	}

	private handleEvent(event: any) {
		const { event: eventName, data } = event;

		// Update state based on event
		switch (eventName) {
			case 'accountsChanged':
				this.cachedAccounts = data;
				this.emit('accountsChanged', data);
				break;
			case 'chainChanged':
				this.chainId = data;
				this.emit('chainChanged', data);
				// Also emit networkChanged for backwards compatibility
				if (data) {
					const networkVersion = parseInt(data, 16).toString();
					this.networkVersion = networkVersion;
					this.emit('networkChanged', networkVersion);
				}
				break;
			case 'connect':
				this._isConnected = true;
				this.emit('connect', { chainId: this.chainId || '0x1' });
				break;
			case 'disconnect':
				this._isConnected = false;
				this.emit('disconnect', { code: 1000, reason: 'Disconnected' });
				break;
			case 'message':
				this.emit('message', data);
				break;
		}
	}

	private async updateChainState(): Promise<void> {
		try {
			// Get chain ID
			const chainId = await this.request({ method: 'eth_chainId', params: [] });
			if (typeof chainId === 'string' && chainId !== this.chainId) {
				this.chainId = chainId;
				this.emit('chainChanged', chainId);
			}

			// Get network version
			const networkVersion = await this.request({ method: 'net_version', params: [] });
			if (typeof networkVersion === 'string' && networkVersion !== this.networkVersion) {
				this.networkVersion = networkVersion;
				this.emit('networkChanged', networkVersion);
			}
		} catch (error) {
			log.error('Error updating chain state:', false, error);
		}
	}

	async request(args: RequestArguments): Promise<unknown> {
		// Ensure provider is initialized
		if (!this.isInitialized && this.initPromise) {
			await this.initPromise;
		}

		const { method, params = [] } = args;
		const id = ++this.requestId;

		// Handle special methods with cached values
		if (method === 'eth_requestAccounts') {
			// If we already have accounts, return them immediately
			if (this.cachedAccounts && this.cachedAccounts.length > 0) {
				log.debug('EIP1193: Using cached accounts for eth_requestAccounts:', false, {
					accounts: this.cachedAccounts
				});
				return this.cachedAccounts;
			}
			// Otherwise, we need to make the request
		} else if (method === 'eth_chainId' && this.chainId) {
			return this.chainId;
		} else if (method === 'net_version' && this.networkVersion) {
			return this.networkVersion;
		} //else if (method === 'eth_accounts' && this.cachedAccounts) {
		//  return this.cachedAccounts;
		//}

		return new Promise((resolve, reject) => {
			// Store the request with its resolve/reject callbacks
			this.pendingRequests.set(id, {
				resolve,
				reject,
				method,
				timestamp: Date.now()
			});

			// Send the request
			const requestMessage = {
				type: 'YAKKL_REQUEST:EIP1193',
				id,
				method,
				params,
				requiresApproval: this.requiresApproval(method)
			};

			safePostMessage(requestMessage, getTargetOrigin(), {
				context: 'content',
				allowRetries: true,
				retryKey: `${method}-${id}`
			});

			// Set a timeout for the request
			setTimeout(() => {
				const request = this.pendingRequests.get(id);
				if (request) {
					request.reject({
						code: EIP1193_ERRORS.TIMEOUT.code,
						message: EIP1193_ERRORS.TIMEOUT.message
					});
					this.pendingRequests.delete(id);
				}
			}, 30000); // 30 second timeout
		});
	}

	private requiresApproval(method: string): boolean {
		const approvalMethods = [
			'eth_requestAccounts',
			'eth_sendTransaction',
			'eth_signTransaction',
			'eth_sign',
			'personal_sign',
			'eth_signTypedData_v4',
			'wallet_addEthereumChain',
			'wallet_switchEthereumChain',
			'wallet_watchAsset'
		];
		return approvalMethods.includes(method);
	}

	isConnected(): boolean {
		return this._isConnected;
	}

	private async initializeFromShortcuts(): Promise<void> {
		try {
			// No longer proactively requesting initial state
			// We'll only cache these values when they're first requested by the dapp
			this.isInitialized = true;
		} catch (error) {
			log.error('EIP1193: Error initializing provider:', false, error);
			// Still mark as initialized to prevent hanging
			this.isInitialized = true;
		}
	}
}
