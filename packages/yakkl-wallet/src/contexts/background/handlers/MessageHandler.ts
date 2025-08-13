// import browser from 'webextension-polyfill';
// import type { Runtime, Port, MessageSender } from '$lib/types/browser-types';
import type { Runtime } from 'webextension-polyfill';
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
import { browserAPIHandlers } from './browser-api.handler';

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
  ...sensitiveOperationHandlers,
  ...browserAPIHandlers
]);

export async function handleMessage(request: MessageRequest, sender: Runtime.MessageSender): Promise<MessageResponse> {
  try {
    console.log('MessageHandler: Processing message type:', request.type);
    console.log('MessageHandler: Full request:', request);
    console.log('MessageHandler: Available handlers:', Array.from(handlers.keys()));
    console.log('MessageHandler: Looking for handler:', request.type);
    console.log('MessageHandler: Has blockchain handler for yakkl_getTransactionHistory?', handlers.has('yakkl_getTransactionHistory'));

    const handler = handlers.get(request.type);

    if (!handler) {
      console.error('MessageHandler: No handler found for type:', request.type);
      console.error('MessageHandler: Request structure:', JSON.stringify(request, null, 2));
      return {
        success: false,
        error: `Unknown message type: ${request.type}`
      };
    }

    // Handle both payload structure and top-level data structure
    let payload = request.payload;
    
    // Special handling for session messages that might have data at top level
    if (!payload && (request.type.startsWith('yakkl_session.') || 
                     request.type === 'STORE_SESSION_HASH' || 
                     request.type === 'REFRESH_SESSION')) {
      // Extract all properties except type and requestId as payload
      const { type, requestId, ...rest } = request;
      if (Object.keys(rest).length > 0) {
        payload = rest;
      }
    }
    
    if (!payload && request.type === 'yakkl_getTransactionHistory') {
      // If no payload but we have the data at top level, use the request itself as payload
      payload = {
        address: (request as any).address,
        limit: (request as any).limit
      };
    }

    console.log('MessageHandler: Found handler, executing with payload:', payload);
    console.log('MessageHandler: Payload type:', typeof payload);
    console.log('MessageHandler: Payload keys:', payload ? Object.keys(payload) : []);
    return await handler(payload);
  } catch (error) {
    console.error(`Error handling message ${request.type}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function handlePortConnection(port: Runtime.Port): void {
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
