import { Duplex } from 'readable-stream';
import { v4 as uuidv4 } from 'uuid';
import { log } from '$lib/managers/Logger';
import EventEmitter from 'events';
import type { EIP6963Provider, EIP6963ProviderInfo, EIP6963ProviderDetail } from './eip-types';
import { EIP1193Provider } from './eip-1193';
import { LOGO_BULLFAV48x48 } from '$lib/common';

// Provider Info for EIP-6963
const eip6963ProviderInfo: EIP6963ProviderInfo = {
	uuid: uuidv4(),
	name: 'YAKKL® Smart Wallet',
	icon: LOGO_BULLFAV48x48,
	rdns: 'com.yakkl',
	walletId: 'yakkl-wallet'
};

// EIP-6963 Provider Implementation
class EIP6963YakklProvider extends EventEmitter implements EIP6963Provider {
	private baseProvider: EIP1193Provider;

	constructor(baseProvider: EIP1193Provider) {
		super();
		this.baseProvider = baseProvider;
		// Forward all events from base provider
		this.baseProvider.on('accountsChanged', (...args) => this.emit('accountsChanged', ...args));
		this.baseProvider.on('chainChanged', (...args) => this.emit('chainChanged', ...args));
		this.baseProvider.on('connect', (...args) => this.emit('connect', ...args));
		this.baseProvider.on('disconnect', (...args) => this.emit('disconnect', ...args));
		this.baseProvider.on('message', (...args) => this.emit('message', ...args));
	}

	// EIP-6963 specific method
	announce(): void {
		log.debug('Provider announced YAKKL® Smart Wallet');
		window.dispatchEvent(
			new CustomEvent('eip6963:announceProvider', {
				detail: getEIP6963ProviderDetail()
			})
		);
	}

	// Delegate EIP-1193 methods to base provider
	request(args: { method: string; params?: unknown[] }): Promise<unknown> {
		return this.baseProvider.request(args);
	}

	isConnected(): boolean {
		return this.baseProvider.isConnected();
	}
}

// Duplex Stream for Communication
class PostMessageDuplexStream extends Duplex {
	private _origin: string;
	private _onMessageBound: (event: MessageEvent) => void;

	constructor(origin: string) {
		super({ objectMode: true });
		this._origin = origin;
		this._onMessageBound = this._onMessage.bind(this);
		window.addEventListener('message', this._onMessageBound, false);
	}

	_read() {
		// No-op required by Duplex interface
	}

	_write(message: any, _encoding: string, callback: (error?: Error) => void) {
		try {
			if (window && typeof window.postMessage === 'function') {
				window.postMessage(message, this._origin);
				callback();
			} else {
				const error = new Error('Window context invalid for postMessage');
				log.error('Error in PostMessageDuplexStream _write', true, error);
				callback(error);
			}
		} catch (error) {
			log.error('Error in PostMessageDuplexStream _write', true, error);
			callback(error instanceof Error ? error : new Error(String(error)));
		}
	}

	_onMessage(event: MessageEvent) {
		try {
			if (event.origin === this._origin && event.data) {
				if (
					event.data.type &&
					(event.data.type === 'YAKKL_REQUEST:EIP6963' ||
						event.data.type === 'YAKKL_RESPONSE:EIP6963' ||
						event.data.type === 'YAKKL_EVENT:EIP6963')
				) {
					log.debug('PostMessageDuplexStream: Message received:', false, {
						event: event.data
					});

					this.push(event.data);
				}
			}
		} catch (error) {
			log.error('Error processing message in PostMessageDuplexStream', true, error);
		}
	}

	_destroy(err: Error | null, callback: (error: Error | null) => void) {
		try {
			window.removeEventListener('message', this._onMessageBound, false);
			callback(err);
		} catch (error) {
			log.error('Error destroying PostMessageDuplexStream', true, error);
			callback(error instanceof Error ? error : new Error(String(error)));
		}
	}
}

// EIP-6963 Provider Detail factory
export function getEIP6963ProviderDetail(): EIP6963ProviderDetail {
	const stream = new PostMessageDuplexStream(window.location.origin);
	const baseProvider = new EIP1193Provider(stream);
	const eip6963Provider = new EIP6963YakklProvider(baseProvider);

	return {
		info: eip6963ProviderInfo,
		provider: eip6963Provider
	};
}

// Declare global interfaces for TypeScript
declare global {
	interface Window {
		yakkl?: EIP6963ProviderDetail;
	}
	interface WindowEventMap {
		'eip6963:announceProvider': CustomEvent<EIP6963ProviderDetail>;
		'eip6963:requestProvider': Event;
	}
}
