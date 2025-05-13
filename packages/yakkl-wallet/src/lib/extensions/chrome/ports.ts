import type { Runtime } from 'webextension-polyfill';
import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { getTargetOrigin, safePostMessage } from '$lib/common/origin';

type RuntimePort = Runtime.Port;
const browser_ext = browser;

// Port collections
const portsDapp: RuntimePort[] = [];
const portsInternal: RuntimePort[] = [];
const portsExternal = new Map<number, RuntimePort>();
let mainPort: RuntimePort | undefined;

export class PortManager {
  private port: Runtime.Port | undefined;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async createPort() {
    if (this.port) return true;

    try {
      this.port = browser_ext.runtime.connect({ name: this.name });
      this.port.onMessage.addListener(this.onMessageListener);
      this.port.onDisconnect.addListener(this.onDisconnectListener.bind(this));
      return true;
    } catch (error) {
      log.error("Failed to create port:", false, error);
      return false;
    }
  }

  private onMessageListener(response: any) {
    try {
      if (window && typeof window.postMessage === 'function') {
        if (response.type === 'YAKKL_RESPONSE') {
          post(response, getTargetOrigin());
        }
      } else {
        log.error('Window context invalid for postMessage', false, response);
      }
    } catch (error) {
      log.error("Error processing message:", false, error);
      if (window && typeof window.postMessage === 'function') {
        post(
          { id: response.id, method: response.method, error, type: 'YAKKL_RESPONSE' },
          getTargetOrigin()
        );
      } else {
        log.error('Window context invalid for postMessage', false, response);
      }
    }
  }

  private async onDisconnectListener() {
    if (this.port) {
      this.port.onMessage.removeListener(this.onMessageListener);
      this.port.onDisconnect.removeListener(this.onDisconnectListener.bind(this));
      this.port = undefined;
    }

    // Attempt to reconnect
    await this.createPort();
  }

  public getPort() {
    return this.port;
  }

  public getName() {
    return this.name;
  }
}

function post(message: any, targetOrigin: string | null) {
  safePostMessage(message, targetOrigin, { context: 'ports' });
}

// Helper function to safely send messages
// function safePostMessage(message: any, targetOrigin: string | null) {
//   if (!targetOrigin) {
//     log.warn('Cannot send message - invalid target origin', false);
//     return;
//   }
//   window.postMessage(message, targetOrigin);
// }

// Lifecycle Handlers
export function onConnect(port: RuntimePort) {
    try {
        if (!port) throw "Port is undefined.";
        if (port.name === "main") {
            mainPort = port;
        } else if (port.name === "dapp") {
            portsDapp.push(port);
        } else if (port.name === "internal") {
            portsInternal.push(port);
        } else {
            throw `Unsupported port name: ${port.name}`;
        }
        port.onDisconnect.addListener(() => onDisconnect(port));
    } catch (error) {
        log.error("Port connection error:", false, error);
    }
}

export function onDisconnect(port: RuntimePort) {
    if (mainPort === port) mainPort = undefined;
    // Remove from other collections as necessary
}

export function broadcastToPorts(ports: RuntimePort[], message: any) {
    ports.forEach(port => port.postMessage(message));
}

// Exports
export { mainPort, portsDapp, portsInternal, portsExternal };
