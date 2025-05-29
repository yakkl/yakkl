import { browser_ext, browserSvelte } from '../../environment';
import { handleLockDown } from '$lib/common/handlers';
import { log } from '$lib/plugins/Logger';
import { uiListenerManager } from './uiListeners';

export function handleOnRemoveWindow(windowId: number) {
  if (browserSvelte) {
    if (windowId === browser_ext.windows.WINDOW_ID_CURRENT) {
      handleLockDown();
    }
  }
}

// Window-specific event handlers
function handleBeforeUnload() {
  handleLockDown();
}

// Add these window-specific listeners to uiListenerManager
export function addWindowListeners() {
  if (!browserSvelte) return;

  try {
    // @ts-ignore
    if (!window.fencedFrameConfig) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Add window-specific browser extension listeners
    uiListenerManager.add(browser_ext.windows.onRemoved, handleOnRemoveWindow);
  } catch (e) {
    log.warn('Error adding window listeners:', false, e);
  }
}

export function removeWindowListeners() {
  if (!browserSvelte) return;

  try {
    // @ts-ignore
    if (!window.fencedFrameConfig) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    // Remove window-specific browser extension listeners
    uiListenerManager.remove(browser_ext.windows.onRemoved, handleOnRemoveWindow);
  } catch (e) {
    log.warn('Error removing window listeners:', false, e);
  }
}
