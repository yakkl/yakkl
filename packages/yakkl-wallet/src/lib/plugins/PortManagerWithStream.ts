import { getDuplex } from '$lib/common/duplexShim';
import { PortDuplexStream, type LightweightDuplex } from './PortStreamManager';
import { log } from '$lib/common/logger-wrapper';
import { browser_ext, isClient, getBrowserExt } from '$lib/common/environment';
import type { Runtime } from 'webextension-polyfill';
import type { DuplexOptions } from 'stream';

export class PortManagerWithStream {
  private port: Runtime.Port | null = null;
  private stream: PortDuplexStream | null = null;
  private requestId: string | null = null;
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async createPort() {
    if (this.port && this.stream) return true;

    const ext = isClient ? getBrowserExt() : browser_ext;
    if (!ext || !ext.runtime?.connect) {
      log.error('Extension API not available for PortManagerWithStream');
      return false;
    }

    try {
      this.port = ext.runtime.connect({ name: this.name });
      const Duplex = await getDuplex();
      class CustomDuplex extends Duplex implements LightweightDuplex {
        constructor() {
          super({ objectMode: true });
        }

        _read() {}
        _write(_chunk: any, _enc: string, cb: () => void) {
          cb();
        }

        write(chunk: any): void {
          super.write(chunk);
        }

        on(event: string, handler: (...args: any[]) => void): void {
          super.on(event, handler);
        }

        destroy(): void {
          super.destroy();
        }
      }
      const baseStream = new CustomDuplex();
      this.stream = new PortDuplexStream(this.port, baseStream); // Pass both port and stream
      return true;
    } catch (error) {
      log.error('Failed to create port stream', false, error);
      this.port = null;
      this.stream = null;
      return false;
    }
  }

  getStream() {
    return this.stream;
  }

  getPort() {
    return this.port;
  }

  isIdle() {
    return this.stream?.isIdle() ?? true;
  }

  async waitForIdle(timeout = 3000) {
    return this.stream?.waitForIdle(timeout);
  }

  disconnect() {
    try {
      if (this.port && this.requestId) {
        browser_ext.runtime.sendMessage({
          type: 'UNREGISTER_SESSION_PORT',
          requestId: this.requestId
        });
      }
      this.stream?.destroy();
    } catch (err) {
      log.warn('Error destroying port stream', false, err);
    }
    this.stream = null;
    this.port = null;
    this.requestId = null;
  }

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  getRequestId() {
    return this.requestId;
  }

  clearRequestId() {
    this.requestId = null;
  }
}

export function createPortManagerWithStream(name: string = 'secure') {
  return new PortManagerWithStream(name);
}
