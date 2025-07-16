import { storageHandlers } from './storage';
import { tabsHandlers } from './tabs';
import { windowsHandlers } from './windows';
import { notificationsHandlers } from './notifications';
import { runtimeHandlers } from './runtime';
import { actionHandlers } from './action';
import { alarmsHandlers } from './alarms';
import { sidePanelHandlers } from './sidePanel';
import { blockchainHandlers } from './blockchain';
import { sessionHandlers } from './session';
import { swapEnhancedHandlers } from './swapEnhanced';
import { cryptoHandlers } from './crypto';
import { sensitiveOperationHandlers } from './sensitiveOperations';
import type { Runtime } from 'webextension-polyfill';

export interface MessageRequest {
  requestId?: number;
  type: string;
  payload?: any;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type MessageHandlerFunc = (payload: any) => Promise<MessageResponse>;

const handlers = new Map<string, MessageHandlerFunc>([
  ...storageHandlers,
  ...tabsHandlers,
  ...windowsHandlers,
  ...notificationsHandlers,
  ...runtimeHandlers,
  ...actionHandlers,
  ...alarmsHandlers,
  ...sidePanelHandlers,
  ...blockchainHandlers,
  ...sessionHandlers,
  ...swapEnhancedHandlers,
  ...cryptoHandlers,
  ...sensitiveOperationHandlers
]);

export async function handleMessage(request: MessageRequest, sender: Runtime.MessageSender): Promise<MessageResponse> {
  try {
    const handler = handlers.get(request.type);
    
    if (!handler) {
      return {
        success: false,
        error: `Unknown message type: ${request.type}`
      };
    }

    return await handler(request.payload);
  } catch (error) {
    console.error(`Error handling message ${request.type}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function handlePortConnection(port: chrome.runtime.Port): void {
  port.onMessage.addListener(async (request: MessageRequest) => {
    try {
      const response = await handleMessage(request, { tab: port.sender?.tab } as Runtime.MessageSender);
      
      if (request.requestId !== undefined) {
        port.postMessage({
          requestId: request.requestId,
          response
        });
      }
    } catch (error) {
      console.error('Error in port message handler:', error);
      if (request.requestId !== undefined) {
        port.postMessage({
          requestId: request.requestId,
          response: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  });
}