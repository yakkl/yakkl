import { log } from '$lib/plugins/Logger';
import { signingManager } from './signingManager';
import type { Runtime } from 'webextension-polyfill';
import browser from 'webextension-polyfill';

export type SigningRequest = {
  type: 'personal_sign' | 'eth_signTypedData_v4';
  params: any[];
  requestId: string;
};

export type SigningResponse = {
  type: 'SIGNING_RESPONSE';
  requestId: string;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
};

// Handle signing requests from UI context
export async function signingRequestListener(
  message: unknown,
  sender: Runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<boolean> {
  try {
    const request = message as SigningRequest;
    if (request.type !== 'personal_sign' && request.type !== 'eth_signTypedData_v4') {
      return false;
    }

    log.info('Handling signing request', false, { request });

    const result = await signingManager.handleSigningRequest(
      request.requestId,
      request.type,
      request.params
    );

    // Send response back through port
    sendResponse({
      type: 'SIGNING_RESPONSE',
      requestId: request.requestId,
      result: result.result
    } as SigningResponse);

    return true;
  } catch (error) {
    log.error('Error handling signing request', false, error);

    // Send error response back through port
    sendResponse({
      type: 'SIGNING_RESPONSE',
      requestId: (message as SigningRequest).requestId,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } as SigningResponse);

    return true;
  }
}
