import { Duplex } from 'stream-browserify';

/**
 * This class is a Duplex stream that wraps a WebExtensions Port. It allows for bi-directional communication between the content script and the background script using the stream protocol provided by Node.js. so that it can also be used with Node.js streams. This is useful for integrating WebExtensions with libraries that expect Node.js streams.
 */

import type { Runtime } from 'webextension-polyfill';
type RuntimePort = Runtime.Port;

type Log = (data: unknown, out: boolean) => void;

export default class PortDuplexStream extends Duplex {
	private _port: RuntimePort;

	private _log: Log;

	/**
	 * @param port - An instance of WebExtensions Runtime.Port.
	 */
	constructor(port: RuntimePort) {
		super({ objectMode: true });
		this._port = port;
		this._port.onMessage.addListener((msg: unknown) => this._onMessage(msg));
		this._port.onDisconnect.addListener(() => this._onDisconnect());
		this._log = () => null;
	}

	/**
	 * Callback triggered when a message is received from
	 * the remote Port associated with this Stream.
	 *
	 * @param msg - Payload from the onMessage listener of the port
	 */
	private _onMessage(msg: unknown): void {
		if (Buffer.isBuffer(msg)) {
			const data: Buffer = Buffer.from(msg);
			this._log(data, false);
			this.push(data);
		} else {
			this._log(msg, false);
			this.push(msg);
		}
	}

	/**
	 * Callback triggered when the remote Port associated with this Stream
	 * disconnects.
	 */
	private _onDisconnect(): void {
		this.destroy();
	}

	/**
	 * Explicitly sets read operations to a no-op.
	 */
	_read(): void {
		return undefined;
	}

	/**
	 * Called internally when data should be written to this writable stream.
	 *
	 * @param msg - Arbitrary object to write
	 * @param encoding - Encoding to use when writing payload
	 * @param cb - Called when writing is complete or an error occurs
	 */
	_write(msg: unknown, _encoding: BufferEncoding, cb: (error?: Error | null) => void): void {
		try {
			if (Buffer.isBuffer(msg)) {
				const data: Record<string, unknown> = msg.toJSON();
				data._isBuffer = true;
				this._log(data, true);
				this._port.postMessage(data);
			} else {
				this._log(msg, true);
				this._port.postMessage(msg);
			}
		} catch (error) {
			return cb(new Error('PortDuplexStream - disconnected'));
		}
		return cb();
	}

	/**
	 * Call to set a custom logger for incoming/outgoing messages
	 *
	 * @param log - the logger function
	 */
	_setLogger(log: Log) {
		this._log = log;
	}
}
