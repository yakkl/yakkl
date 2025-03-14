import { browser_ext } from "./environment";
import { log } from '$plugins/Logger';

export async function isTabValid(tabId: number): Promise<boolean> {
  if (!browser_ext) return;

  try {
    const tab = await browser_ext.tabs.get(tabId);
    // log.info('isTabValid:', false, tab);
    return !!tab; // If tab exists, return true
  } catch (error) {
    log.error(`Tab ${tabId} is no longer valid.`);
    return false;
  }
}
