import { debug_log } from "$lib/common/debug-error";
import { requestsExternal } from "$lib/common/listeners/background/portListeners";
import { log } from "$lib/plugins/Logger";

export async function onDappListener(event: any, sender: any): Promise<void> {
  try {
    switch(event?.method) {
      case 'get_warning':
        if (event.id) {
          const data = requestsExternal.get(event.id);
          if (data) {
            sender.postMessage({method: 'get_warning', data: data});
          } else {
            // post a message to close the popup
            // send to content.ts an error!!
          }
        } else {
          throw 'No id is present - rejected';
        }
        break;
      case 'get_params':
        if (!event.id) {
          log.error('Dapp - get_params - No event ID is present.');
          return;
        }
        const data = requestsExternal.get(event.id);
        if (!data) {
          // Instead of rejecting, return empty params to indicate no data
          sender.postMessage({ id: event.id, method: 'get_params', type: 'YAKKL_RESPONSE', result: { params: [] } });
          return;
        }
        sender.postMessage({ id: event.id, method: 'get_params', type: 'YAKKL_RESPONSE', result: data });
        break;
      case 'error':
        {
          const data = requestsExternal.get(event.id);
          if (data) {
            const requestData = data.data;
            const sender = (requestData as { sender: any }).sender;
            if (sender) {
              sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', data: event.response.data});
            }
          }
        }
        break;
      default: // Relays to content.ts
        {
          const data = requestsExternal.get(event.id);

          log.debug('Dapp - onDappListener - requestExternal', false, requestsExternal);
          log.debug('Dapp - onDappListener - data', false, data);
          log.debug('Dapp - onDappListener - event', false, event);

          if (data) {
            const requestData = data.data;
            const sender = (requestData as { sender: any }).sender;
            if (sender) {
              sender.postMessage(event);
            } else {
              throw 'Connection to port has been disconnected - rejected';
            }
          } else if (event.id) {

            sender.postMessage({id: event.id, 'jsonrpc': '2.0', method: event.method, type: 'YAKKL_RESPONSE:EIP6963', result: event.result});
          } else {
            log.warn('Warning - No request ID is present - rejected', false, {event: event});
          }
        }
        break;
    }

  } catch (error) {
    log.error(error);
    sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', data: {code: -1, message: error}});
  }
}


