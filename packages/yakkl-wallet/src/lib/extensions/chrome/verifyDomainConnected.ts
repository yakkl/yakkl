import { requestManager } from "$lib/extensions/chrome/requestManager";
import { log } from "$lib/plugins/Logger";
// import { getYakklConnectedDomains } from "$lib/common/stores";
import { getObjectFromLocalStorage } from "$lib/common/backgroundStorage";
import type { YakklConnectedDomain } from "$lib/common/interfaces";
import { STORAGE_YAKKL_CONNECTED_DOMAINS } from "$lib/common/constants";

// NOTE: This only works for requests that are in the background context.
export async function verifyDomainConnected(domain: string | null) {
  try {
    if (!domain) {
      return false;
    }
    // const connectedDomains = await getYakklConnectedDomains();
    const connectedDomains = await getObjectFromLocalStorage<YakklConnectedDomain[]>(STORAGE_YAKKL_CONNECTED_DOMAINS);

    log.info('verifyDomainConnected - connectedDomains:', false, {domain, connectedDomains});

    if (connectedDomains) {
      const existingDomainIndex = connectedDomains.findIndex(d => d.domain === domain);
      if (existingDomainIndex === -1) {
        return false;
      }
    }
    return true;
  } catch(error) {
    log.error(error);
    return false;
  }
}

export function verifyDomainConnectedBackground(requestId: string) {
  try {
    const request = requestManager.getRequest(requestId);
    if (!request) {
      return false;
    }
    const domain = request.data.metaData.metaData.domain;
    if (!domain) {
      return false;
    }
    return verifyDomainConnected(domain);
  } catch(error) {
    log.error(error);
    return false;
  }
}
