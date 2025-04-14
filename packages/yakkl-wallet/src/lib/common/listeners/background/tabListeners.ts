// import { browserSvelte, browser_ext } from "$lib/common/environment";
import browser from 'webextension-polyfill';
import { isBlacklisted } from "$lib/extensions/chrome/database";
import { portsExternal } from "$lib/extensions/chrome/ports";
import { log } from "$lib/plugins/Logger";
import type { Tabs } from "webextension-polyfill";
import { activeTabBackgroundStore, activeTabUIStore } from "$lib/common/stores";
import { get } from "svelte/store";
import { setObjectInLocalStorage } from "$lib/common/storage";
import { backgroundManager } from "$lib/plugins/BackgroundManager";
import { MessageType } from '$lib/common/types';
import type { WindowFocusData } from '$lib/common/types';

// This should be backend only
const browser_ext = browser;

export async function onTabActivatedListener(activeInfo: Tabs.OnActivatedActiveInfoType) {
  try {
    if (!browser_ext) return;
    const activeTab = { tabId: activeInfo.tabId, windowId: activeInfo.windowId, windowType: '', url: '', title: '', favIconUrl: '', dateTime: new Date().toISOString() };
    const tab = await browser_ext.tabs.get(activeInfo.tabId);
    if (tab) {
      // Can add more properties here if needed
      activeTab.url = tab?.url ?? '';
      activeTab.title = tab?.title ?? '';
      activeTab.favIconUrl = tab?.favIconUrl ?? '';
      const window = await browser_ext.windows.get(activeInfo.windowId);
      if (window) {
        activeTab.windowType = window.type;
      }

      if (activeTab.windowType === 'normal') {
        activeTabBackgroundStore.set(activeTab);
        activeTabUIStore.set(activeTab);
        try {
          await backgroundManager.sendMessage(MessageType.ACTIVE_TAB_CHANGED, activeTab);
          await setObjectInLocalStorage('activeTabBackground', activeTab); // Not sure if this is needed
        } catch (error) {
          log.warn('Error sending active tab changed message:', false, error);
        }
      }
    }
  } catch (error) {
    log.error('Background - onTabActivatedListener', false, error);
  }
}

// Handles tabs.onUpdated
export async function onTabUpdatedListener(tabId: number, changeInfo: any, tabTab: any) {
  try {
    if (!browser_ext) return;

    const activeTab = { tabId: tabId, windowId: 0, windowType: '', url: '', title: '', favIconUrl: '', dateTime: new Date().toISOString() };
      const tab = await browser_ext.tabs.get(tabId);
      if (tab) {
        // Can add more properties here if needed
        activeTab.windowId = tab?.windowId ?? 0;
        activeTab.url = tab?.url ?? '';
        activeTab.title = tab?.title ?? '';
        activeTab.favIconUrl = tab?.favIconUrl ?? '';
        if (activeTab.windowId > 0) {
          const window = await browser_ext.windows.get(activeTab.windowId);
          if (window) {
            activeTab.windowType = window.type;
          }
        }

        if (activeTab.windowType === 'normal') {
          activeTabBackgroundStore.set(activeTab);
          activeTabUIStore.set(activeTab);
          try {
            await backgroundManager.sendMessage(MessageType.TAB_UPDATED, activeTab);
            await setObjectInLocalStorage('activeTabBackground', activeTab); // Not sure if this is needed
          } catch (error) {
            // silent
          }
        }

      // Watching for phishing sites
      if (changeInfo.url) {
          const domain = new URL(changeInfo.url).hostname;
        if (await isBlacklisted(domain)) {
          if (changeInfo.url.endsWith('yid=' + tab.id?.toString())) {
            // The user said 'continue to site'
            log.info('Phishing warning but user elected to proceed to:', changeInfo.url);
            // Bypasses check since it has already been done. If the yid=<whatever the id is> is at the end then it will bypass
          } else {
            log.warn('Attempting to navigate to a known or potential phishing site.', changeInfo.url);
            const url = browser_ext.runtime.getURL('/phishing.html?flaggedSite=' + changeInfo.url + '&yid=' + tab.id);
            browser_ext.tabs.update(tabId, { url: url });
          }
        }
      }
    }
  } catch (error) {
    log.error('Background - OnTabUpdatedListener', false, error);
  }
}

// Handles tabs.onRemoved
export async function onTabRemovedListener(tabId: number, removeInfo: Tabs.OnRemovedRemoveInfoType) {
  try {
    const tab = get(activeTabBackgroundStore);
    if (tab) {
      if (tab.tabId === tabId) {
        activeTabBackgroundStore.set(null);
        try {
          await backgroundManager.sendMessage(MessageType.TAB_REMOVED, null);
          await setObjectInLocalStorage('activeTabBackground', null); // Not sure if this is needed
        } catch (error) {
          // silent
        }
      }
    }
    if (tabId && portsExternal.size > 0) {
      portsExternal.delete(tabId);
    }
  } catch (error) {
    log.error('Background - onTabRemovedListener', false, error);
  }
}

export async function onWindowsFocusChangedListener(windowId: number) {
  try {
    if (!browser_ext) return;
    if (windowId !== browser_ext.windows.WINDOW_ID_NONE) {
      const window = await browser_ext.windows.get(windowId);
      const data: WindowFocusData = {
        windowId,
        type: window.type
      };

      if (window.type === 'normal') {
        const activeTab = { tabId: 0, windowId: windowId, windowType: window.type, url: '', title: '', favIconUrl: '', dateTime: new Date().toISOString() };
        const tabs = await browser_ext.tabs.query({ active: true, windowId: windowId });
        if (tabs.length > 0) {
          activeTab.tabId = tabs[0].id ?? 0;
          activeTab.url = tabs[0].url ?? '';
          activeTab.title = tabs[0].title ?? '';
          activeTab.favIconUrl = tabs[0].favIconUrl ?? '';

          if (activeTab.tabId > 0) {
            activeTabBackgroundStore.set(activeTab);
            activeTabUIStore.set(activeTab); // ??
            await backgroundManager.sendMessage(MessageType.WINDOW_FOCUSED, data);
            await setObjectInLocalStorage('activeTabBackground', activeTab); // Not sure if this is needed
          }
        }
      }
    }
  } catch (error) {
    log.error('Background - onTabRemovedListener', false, error);
  }
}
