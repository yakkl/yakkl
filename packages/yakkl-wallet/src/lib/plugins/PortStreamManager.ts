// File: PortStreamManager.ts
import { log } from '$plugins/Logger';
import { browser_ext } from '$lib/common/environment';
import type { Runtime } from 'webextension-polyfill';
import { getDuplex } from '$lib/common/duplexShim';
import type { Duplex as StreamDuplex } from 'readable-stream'; // or 'stream'

export interface LightweightDuplex {
  write(chunk: any): void;
  on(event: string, handler: (...args: any[]) => void): void;
  destroy(): void;
  push?(chunk: any): boolean;
}
export class PortDuplexStream {
  private port: Runtime.Port;
  private stream: LightweightDuplex;
  private inflight = 0;

  constructor(port: Runtime.Port, stream: LightweightDuplex) {
    this.port = port;
    this.stream = stream;

    this.port.onMessage.addListener(this._onMessage.bind(this));
    this.port.onDisconnect.addListener(() => this.destroy());
  }

  private _onMessage(message: any) {
    try {
      log.info('PortDuplexStream _onMessage:', false, message);
      this.inflight = Math.max(0, this.inflight - 1);
      this.stream.push(message);
    } catch (err) {
      log.error('PortDuplexStream _onMessage error', false, err);
    }
  }

  write(msg: any) {
    log.info('PortDuplexStream write:', false, msg);
    this.inflight++;
    this.port.postMessage(msg);
  }

  on(event: string, handler: (...args: any[]) => void) {
    log.info('PortDuplexStream on:', false, event);
    this.stream.on(event, handler);
  }

  destroy() {
    log.info('PortDuplexStream destroy:', false);
    this.port.disconnect();
    this.stream.destroy();
  }

  isIdle() {
    return this.inflight === 0;
  }

  async waitForIdle(timeout = 3000) {
    log.info('PortDuplexStream waitForIdle:', false, timeout);
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
      const check = () => {
        if (this.isIdle()) return resolve();
        if (Date.now() - start > timeout) return reject(new Error('Timed out waiting for port to go idle'));
        setTimeout(check, 50);
      };
      check();
    });
  }
}

export async function createPortStream(channelName = 'secure'): Promise<PortDuplexStream> {
  const port = browser_ext.runtime.connect({ name: channelName });
  const Duplex = await getDuplex();

  class WrappedStream extends Duplex {
    constructor() {
      super({ objectMode: true });
    }
    _read() {}
    _write(_chunk: any, _enc: string, cb: () => void) { cb(); }
  }

  const stream = new WrappedStream() as unknown as LightweightDuplex;
  return new PortDuplexStream(port, stream);
}
