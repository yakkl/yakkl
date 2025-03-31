import { log } from '$lib/plugins/Logger';
import type { ActiveTab } from '$lib/common/interfaces';
import { browser_ext, browserSvelte } from "$lib/common/environment";

/**
 * Opens the side panel on the active tab, excluding extension tabs.
 */
export async function openSidePanelOnActiveTab(): Promise<void> {
  try {
    if (!browserSvelte) {
      log.error('Side panel API not available.', true);
      return;
    }

    let activeTab: ActiveTab | null = null;

    const tabs = await browser_ext.tabs.query({ active: true });
    log.debug('openSidePanel (client) - Active tabs:', false, tabs);

    const realTab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
    if (realTab) {
      const win = await browser_ext.windows.get(realTab.windowId);
      activeTab = {
        tabId: realTab.id,
        windowId: realTab.windowId,
        windowType: win.type,
        url: realTab.url,
        title: realTab.title,
        favIconUrl: realTab.favIconUrl,
        dateTime: new Date().toISOString()
      };
    }

    log.debug('openSidePanel (client) - Active tab:', false, activeTab);

    if (activeTab?.tabId) {
      if (typeof chrome !== 'undefined' && chrome.sidePanel) {
        await chrome.sidePanel.open({ tabId: activeTab.tabId });
        log.debug('openSidePanel (client) - Side panel opened:', false, activeTab);
      } else {
        log.error('Side panel API not available.', true);
      }
    } else {
      log.error('No suitable active tab found to open side panel.', true);
    }
  } catch (error) {
    log.error('Failed to open side panel on active tab:', true, error);
  }
}

/**
 * Closes the side panel on the active tab, excluding extension tabs.
 */
// Note: There is no way to close the side panel on the active tab programmatically. This is only simple workaround.
export async function closeSidePanelOnActiveTab(): Promise<void> {
  try {
    let activeTab: ActiveTab | null = null;

    const tabs = await browser_ext.tabs.query({ active: true });
    log.debug('closeSidePanel (client) - Active tabs:', false, tabs);

    const realTab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
    if (realTab) {
      const win = await browser_ext.windows.get(realTab.windowId);
      activeTab = {
        tabId: realTab.id,
        windowId: realTab.windowId,
        windowType: win.type,
        url: realTab.url,
        title: realTab.title,
        favIconUrl: realTab.favIconUrl,
        dateTime: new Date().toISOString()
      };
    }

    log.debug('closeSidePanel (client) - Active tab:', false, activeTab);

    if (activeTab?.tabId) {
      if (typeof chrome !== 'undefined' && chrome.sidePanel) {
        // Chrome doesn't have a direct `.close()` method; you need to manage visibility behavior manually
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
        log.debug('closeSidePanel (client) - Side panel behavior updated to not open on action click', false);

        // HACK: There's no direct API to programmatically close the side panel yet,
        // so disabling the behavior is the best workaround.
      } else {
        log.error('Side panel API not available.', true);
      }
    } else {
      log.error('No suitable active tab found to close side panel.', true);
    }
  } catch (error) {
    log.error('Failed to close side panel on active tab:', true, error);
  }
}
