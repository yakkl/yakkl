
import { browser_ext, browserSvelte } from '../../environment'; // UI context
import { handleLockDown } from '$lib/common/handlers';
import { handleOnMessageForExtension } from './uiListeners';

export function onMessageUnloadAdd() {
  // +layout.(ts|svelte) gets removed and the new one loaded for each sub layout so the following code is needed to ensure the listeners are added and removed correctly.
  // We add a remove then an add to make sure we don't have multiple listeners for windows. removeListener will be ignored if it doesn't exist.
  if (browserSvelte) {
    if (!browser_ext.runtime.onMessage.hasListener(handleOnMessageForExtension)) {
      browser_ext.runtime.onMessage.addListener(handleOnMessageForExtension);
    }
    addWindowListeners();
  }
}

export function onMessageUnloadRemove() {
  if (browserSvelte) {
    if (browser_ext.runtime.onMessage.hasListener(handleOnMessageForExtension)) {
      browser_ext.runtime.onMessage.removeListener(handleOnMessageForExtension);
    }
    removeWindowListeners();
  }
}

// browser_ext.windows.onRemoved.addListener((windowId) => {
//   log.info(`Window ${windowId} was closed.`);
// });

export function onRemoveWindowListener() {
  if (browserSvelte) {
    if (browser_ext.windows.onRemoved.hasListener(handleOnRemoveWindow)) {
      browser_ext.windows.onRemoved.removeListener(handleOnRemoveWindow);
    }
  }
}

export function handleOnRemoveWindow(windowId: number) {
  if (browserSvelte) {
    // log.info(`Window ${windowId} was closed.`); // Add whatever is needed here...
    // if (windowId === browser_ext.windows.WINDOW_ID_CURRENT) {
    //   handleLockDown();
    // }
  }
}

export function addWindowListeners() {
   window.removeEventListener('unload', handleLockDown);
   window.addEventListener('unload', handleLockDown);
}

export function removeWindowListeners() {
  window.removeEventListener('unload', handleLockDown);
}
