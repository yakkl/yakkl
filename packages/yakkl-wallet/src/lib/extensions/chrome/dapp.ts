import { requestManager } from "$lib/extensions/chrome/eip-6963";
import { log } from "$lib/plugins/Logger";
import { verifyDomainConnected } from "$lib/extensions/chrome/verifyDomainConnected";

export async function onDappListener(event: any, sender: any): Promise<void> {
  try {

    log.info('Dapp - onDappListener - event', false,{event, sender});

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
        const request = requestManager.getRequest(event.id); // NOTE: This is the full request object since we're in the background context. When sending, poll, resolve, and reject are not present due to not being serializable.
        log.info('Dapp - get_params - data', false, {request});
        if (request) {
          const isConnected = await verifyDomainConnected(request.data.metaData.metaData.domain);
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
        // Use the sender parameter directly
        if (sender) {
           // No need to look up requestsExternal just for the sender
           sender.postMessage({
             id: event.id,
             jsonrpc: '2.0',
             method: event.method,
             type: 'YAKKL_RESPONSE:EIP6963',
             data: event.response.data
           });
        } else {
           log.error('Dapp - Error case: Sender port is invalid.');
        }
        break;
      default: // Relays to content.ts
        if (sender) {
            // Check if you still need data from requestsExternal for *other purposes* here
            log.info('Dapp - onDappListener - default case', false, event, event.method, sender);

            if (event.id) { // Assuming you just need to forward based on event id/result
               log.info('Dapp - Default case forwarding:', false, event.id, event.result, event.method);
               sender.postMessage({
                 type: 'YAKKL_RESPONSE:EIP6963',
                 id: event.id,
                 method: event.method,
                 result: event.result,
                 jsonrpc: '2.0'
               });
            } else {
               log.warn('Dapp - Default case: No request ID to forward response.', false, {event: event});
            }

        } else {
           log.error('Dapp - Default case: Sender port is invalid.');
        }
        break;
    }

  } catch (error) {
    log.error(error);
    sender.postMessage({
      id: event.id,
      jsonrpc: '2.0',
      method: event.method,
      type: 'YAKKL_RESPONSE:EIP6963',
      error: { code: -1, message: error }
    });
  }
}


