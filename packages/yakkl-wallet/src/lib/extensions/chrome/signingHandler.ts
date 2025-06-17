import { log } from '$lib/managers/Logger';
import { signingManager } from './signingManager';
import type { Runtime } from 'webextension-polyfill';

export type SigningRequest = {
  type: string; //'personal_sign' | 'eth_signTypedData_v4';
  params: any[];
  requestId: string;
  token: string;
};

// Handle signing requests from UI context
export async function onSigningRequestListener(
  message: unknown,
  sender: Runtime.MessageSender,
): Promise<any> {
  let token = '';

  try {
    if (message && typeof message === 'object' && 'type' in message) {
      const msgType = (message as any).type;
      if (msgType === 'REQUEST_SESSION_PORT' || msgType === 'REGISTER_SESSION_PORT' ||
          msgType === 'UNREGISTER_SESSION_PORT' || msgType === 'STORE_SESSION_HASH' ||
          msgType === 'REFRESH_SESSION') {
        return undefined; // Pass to next listener
      }
    }

    const request = message as SigningRequest;
    log.info('onSigningRequestListener - request:', false, { request });
    log.info('onSigningRequestListener - sender:', false, { sender });
    log.info('onSigningRequestListener - message:', false, { message });

    if (!request || (request.type !== 'personal_sign' && request.type !== 'eth_signTypedData_v4')) {
      log.info('onSigningRequestListener - Method not supported for signing request', false, { request });
      return undefined;
    }

    token = request.token;
    if (!token) {
      log.error('onSigningRequestListener - No session token provided for signing request', false);
      throw new Error('No session token provided');
    }

    log.info('onSigningRequestListener - Handling signing request', false, { request });

    const signingManagerInstance = await signingManager;
    const result = await signingManagerInstance.handleSigningRequest(
      request.requestId,
      request.type,
      request.params,
      token
    );

    log.info('Signing response - signingHandler', false, { result });

    // Format the response for EIP-6963 provider
    if (result.error) {
      return {
        error: {
          code: result.error.code,
          message: result.error.message
        }
      };
    }

    return {
      result: result.result,
      id: request.requestId,
      jsonrpc: '2.0',
      type: 'YAKKL_RESPONSE:EIP6963',
      method: request.type
    };
  } catch (error) {
    log.error('onSigningRequestListener - Error handling signing request', false, error);
    return {
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }
}
