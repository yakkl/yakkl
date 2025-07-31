/**
 * Type aliases to ensure compatibility between local browser types and webextension-polyfill
 * This helps with gradual migration and type compatibility
 */

import type { Runtime as LocalRuntime, Port as LocalPort, MessageSender as LocalMessageSender } from './browser-types';
import type { Runtime as PolyfillRuntime } from 'webextension-polyfill';

// Re-export types to ensure compatibility
export type RuntimePort = LocalRuntime.Port | LocalPort | PolyfillRuntime.Port;
export type RuntimeMessageSender = LocalRuntime.MessageSender | LocalMessageSender | PolyfillRuntime.MessageSender;

// Helper type guards
export function isPort(obj: any): obj is LocalPort {
  return obj && typeof obj.postMessage === 'function' && typeof obj.disconnect === 'function';
}

export function isMessageSender(obj: any): obj is LocalMessageSender {
  return obj && (obj.tab !== undefined || obj.id !== undefined || obj.url !== undefined);
}