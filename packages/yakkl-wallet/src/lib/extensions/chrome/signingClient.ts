import type { SigningRequest } from './signingHandler';
import { log } from '$lib/managers/Logger';
import { browser_ext, browserSvelte } from '$lib/common/environment';
import { sessionToken } from '$lib/common/auth/session';
import { get } from 'svelte/store';
import type { YakklResponse } from '$lib/common/interfaces';

// interface SigningResponse {
//   result?: any;
//   error?: {
//     message: string;
//   };
// }

export async function requestSigning(
  requestId: string,
  type: string,
  params: any[],
  token: string
): Promise<YakklResponse> {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called in a browser environment');
  }

  if (!requestId || !type || !params || !token) {
    throw new Error('Missing required parameters for signing request');
  }

  log.info('requestSigning - Sending request to background', false, {
    requestId,
    type,
    params,
    token
  });

  try {
    const response = await browser_ext.runtime.sendMessage({
      type,
      requestId,
      params,
      token
    }) as YakklResponse;

    log.info('requestSigning - Received response from background', false, { response });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (response.error) {
      throw new Error(response.error.message || 'Unknown error occurred');
    }

    return response;
  } catch (error) {
    log.error('requestSigning - Error sending request to background', false, error);
    throw error;
  }
}
