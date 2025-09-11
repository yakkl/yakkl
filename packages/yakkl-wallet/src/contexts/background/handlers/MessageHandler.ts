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
import { popoutHandlers } from './popout';
import { showPopup } from '$contexts/background/extensions/chrome/ui';

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
  ...browserAPIHandlers,
  ...popoutHandlers,
  
  // Add the standard 'popout' handler used by the UI
  ['popout', async (): Promise<MessageResponse> => {
    try {
      console.log('MessageHandler: Handling popout message');
      // Call showPopup with 'internal' source since this is from our sidepanel/UI
      await showPopup('', '0', 'internal');
      return { success: true };
    } catch (error) {
      console.error('MessageHandler: Failed to open popup:', error);
      return { success: false, error: (error as Error).message };
    }
  }],
  
  // Simple utility handlers
  ['PING', async (): Promise<MessageResponse> => {
    return { success: true, data: 'PONG' };
  }],
  
  ['CLEAR_NOTIFICATION', async (payload): Promise<MessageResponse> => {
    try {
      const notificationId = payload?.notificationId;
      if (notificationId) {
        // Could implement actual notification clearing if needed
        console.log('Clearing notification:', notificationId);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }]
]);

export async function handleMessage(request: MessageRequest, sender: Runtime.MessageSender): Promise<MessageResponse> {
  try {
    // Support both 'type' and 'method' fields for message routing
    const messageType = request.type || (request as any).method;
    
    console.log('MessageHandler: Processing message type:', messageType);
    console.log('MessageHandler: Full request:', request);
    console.log('MessageHandler: Available handlers:', Array.from(handlers.keys()));
    console.log('MessageHandler: Looking for handler:', messageType);
    console.log('MessageHandler: Has GET_NATIVE_BALANCE handler?', handlers.has('GET_NATIVE_BALANCE'));
    console.log('MessageHandler: Has blockchain handler for yakkl_getTransactionHistory?', handlers.has('yakkl_getTransactionHistory'));

    const handler = handlers.get(messageType);

    if (!handler) {
      console.error('MessageHandler: No handler found for type:', messageType);
      console.error('MessageHandler: Request structure:', JSON.stringify(request, null, 2));
      console.error('MessageHandler: Available handlers are:', Array.from(handlers.keys()));
      return {
        success: false,
        error: `Unknown message type: ${messageType}`
      };
    }
    
    // Add specific logging for GET_NATIVE_BALANCE
    if (messageType === 'GET_NATIVE_BALANCE') {
      console.log('MessageHandler: GET_NATIVE_BALANCE handler found, about to execute');
      console.log('MessageHandler: Request data:', (request as any).data);
    }

    // Handle both payload structure and top-level data structure
    // Also support 'params' and 'data' fields used by some messages
    let payload = request.payload || (request as any).params || (request as any).data;
    
    // Add specific logging for GET_NATIVE_BALANCE
    if (messageType === 'GET_NATIVE_BALANCE') {
      console.log('MessageHandler: GET_NATIVE_BALANCE - Initial payload extraction:', {
        hasPayload: !!request.payload,
        hasParams: !!(request as any).params,
        hasData: !!(request as any).data,
        extractedPayload: payload,
        fullRequest: request
      });
    }
    
    // Special handling for messages that have data at top level
    if (!payload) {
      // For UI context messages, extract all properties except type and requestId
      if (messageType && (
        messageType.startsWith('ui_context') ||
        messageType.startsWith('yakkl_session.') || 
        messageType === 'STORE_SESSION_HASH' || 
        messageType === 'REFRESH_SESSION' ||
        messageType === 'yakkl_getTransactionHistory' ||
        messageType === 'GET_NATIVE_BALANCE' ||
        messageType === 'GET_TOKEN_BALANCE'
      )) {
        // Extract all properties except type, method, and requestId as payload
        const { type, method, requestId, ...rest } = request as any;
        if (Object.keys(rest).length > 0) {
          payload = rest;
        } else if ((request as any).data) {
          // If no rest properties but has data field, use that
          payload = (request as any).data;
        }
        
        if (messageType === 'GET_NATIVE_BALANCE') {
          console.log('MessageHandler: GET_NATIVE_BALANCE - After extraction:', {
            extractedRest: rest,
            hasDirectData: !!(request as any).data,
            directData: (request as any).data,
            finalPayload: payload
          });
        }
      }
    }

    console.log('MessageHandler: Found handler, executing with payload:', payload);
    console.log('MessageHandler: Payload type:', typeof payload);
    console.log('MessageHandler: Payload keys:', payload ? Object.keys(payload) : []);
    
    // Wrap handler execution in try-catch to ensure we always return a response
    let response: MessageResponse;
    try {
      response = await handler(payload);
      
      // Ensure response is valid
      if (!response || typeof response !== 'object') {
        console.error('MessageHandler: Handler returned invalid response:', response);
        response = {
          success: false,
          error: 'Handler returned invalid response'
        };
      }
    } catch (handlerError) {
      console.error('MessageHandler: Handler threw error:', {
        messageType,
        error: handlerError instanceof Error ? handlerError.message : handlerError,
        stack: handlerError instanceof Error ? handlerError.stack : undefined
      });
      response = {
        success: false,
        error: handlerError instanceof Error ? handlerError.message : 'Handler execution failed'
      };
    }
    
    // Log the response for GET_NATIVE_BALANCE
    if ((request.type || (request as any).method) === 'GET_NATIVE_BALANCE') {
      console.log('MessageHandler: GET_NATIVE_BALANCE response:', response);
    }
    
    return response;
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
