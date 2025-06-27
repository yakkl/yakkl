// src/communication/PortStream.ts
import { Runtime } from 'webextension-polyfill';
import EventEmitter from 'events';
import type { StreamMessage } from '../types/messages';

export class PortStream extends EventEmitter {
	private readonly port: Runtime.Port;

	constructor(port: Runtime.Port) {
		super();
		this.port = port;
		this.port.onMessage.addListener(this.handleMessage.bind(this));
		this.port.onDisconnect.addListener(this.handleDisconnect.bind(this));
	}

	public send(message: StreamMessage): void {
		try {
			this.port.postMessage(message);
		} catch (error) {
			console.error('Error sending message:', error);
			this.emit('error', error);
		}
	}

	private handleMessage(message: unknown): void {
		try {
			if (this.isValidMessage(message)) {
				this.emit('message', message);
			}
		} catch (error) {
			console.error('Error handling port message:', error);
			this.emit('error', error);
		}
	}

	private handleDisconnect(): void {
		this.emit('disconnect');
		this.removeAllListeners();
	}

	private isValidMessage(message: unknown): boolean {
		return (
			message !== null &&
			typeof message === 'object' &&
			'type' in message &&
			typeof (message as any).type === 'string'
		);
	}
}
