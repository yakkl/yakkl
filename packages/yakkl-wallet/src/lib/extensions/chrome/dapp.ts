import { requestManager } from "$lib/extensions/chrome/eip-6963";
import { log } from "$lib/plugins/Logger";
import { verifyDomainConnected } from "$lib/extensions/chrome/verifyDomainConnected";

export async function onDappListener(event: any, sender: any): Promise<void> {
  try {
    log.info('Dapp - onDappListener - event: Starting', false, {event, sender});

    switch(event?.method) {
      case 'get_warning':
        const warningData = requestManager.getRequest(event.id);
        if (warningData) {
            sender.postMessage({method: 'get_warning', data: warningData});
        } else {
            // Handle missing data
        }
        break;
      case 'get_params':
        if (!event.id) {
          log.error('Dapp - get_params - No event ID is present.');
          return;
        }
        const request = requestManager.getRequest(event.id);
        if (request) {
          const isConnected = await verifyDomainConnected(request.data.metaData.metaData.domain);
          log.info('Dapp - get_params - isConnected:', false, {isConnected});
          request.data.metaData.metaData.isConnected = isConnected;
          sender.postMessage({
            id: event.id,
            jsonrpc: '2.0',
            method: 'get_params',
            type: 'YAKKL_RESPONSE:EIP6963',
            result: request
          });
        } else {
          sender.postMessage({
            id: event.id,
            jsonrpc: '2.0',
            method: 'get_params',
            type: 'YAKKL_RESPONSE:EIP6963',
            result: { params: [] }
          });
        }
        break;
      case 'error':
        if (sender) {
           sender.postMessage({
             id: event.id,
             jsonrpc: '2.0',
             method: event.method,
             type: 'YAKKL_RESPONSE:EIP6963',
             error: event.response.data
           });
        } else {
           log.error('Dapp - Error case: Sender port is invalid.');
        }
        break;
      default:
        if (sender) {
            log.info('Dapp - onDappListener - default case', false, {event, sender});

            if (event.id) {
               log.info('Dapp - Default case forwarding:', false, {id: event.id, result: event.result, method: event.method});

               // For EIP-1193/EIP-6963 compliance, only send the result or error
               if (event.error) {
                 sender.postMessage({
                   id: event.id,
                   type: event.type,
                   method: event.method,
                   error: event.error
                 });
               } else {
                 sender.postMessage({
                   id: event.id,
                   type: event.type,
                   method: event.method,
                   result: event.result
                 });
               }
            } else {
               log.warn('Dapp - Default case: No request ID to forward response.', false, {event});
            }
        } else {
           log.error('Dapp - Default case: Sender port is invalid.');
        }
        break;
    }
  } catch (error) {
    log.error('Dapp - Error in onDappListener:', false, error);
    if (sender) {
      sender.postMessage({
        id: event?.id,
        jsonrpc: '2.0',
        method: event?.method,
        type: 'YAKKL_RESPONSE:EIP6963',
        error: { code: -1, message: error instanceof Error ? error.message : 'Unknown error occurred' }
      });
    }
  }
}


