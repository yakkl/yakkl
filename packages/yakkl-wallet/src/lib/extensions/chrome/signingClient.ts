import type { SigningRequest, SigningResponse } from './signingHandler';
import { log } from '$lib/plugins/Logger';
import { browser_ext, browserSvelte } from '$lib/common/environment';

export async function requestSigning(
  type: 'personal_sign' | 'eth_signTypedData_v4',
  params: any[],
  requestId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!browserSvelte) {
        reject(new Error('Not supported in Svelte'));
      }
      
      log.info('Sending signing request', false, { type, params,requestId });

      // Create the request
      const request: SigningRequest = {
        type,
        params,
        requestId
      };

      // Send the request to the background context
      browser_ext.runtime.sendMessage(request).then((response: unknown) => {
        const typedResponse = response as SigningResponse;
        if (typedResponse.error) {
          reject(new Error(typedResponse.error.message));
        } else if (typedResponse.result) {
          resolve(typedResponse.result);
        } else {
          reject(new Error('No result or error in response'));
        }
      }).catch((error: any) => {
        log.error('Error sending signing request', false, error);
        reject(error);
      });

    } catch (error) {
      log.error('Error in requestSigning', false, error);
      reject(error);
    }
  });
}
