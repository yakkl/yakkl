import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';
import { getSettings } from '$lib/common/stores';
import { setBadgeText, setIconLock, setIconUnlock } from '$lib/utilities/utilities';

export const runtimeHandlers = new Map<string, MessageHandlerFunc>([
  ['runtime.getManifest', async (): Promise<MessageResponse> => {
    try {
      const manifest = browser.runtime.getManifest();
      return { success: true, data: manifest };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['runtime.getURL', async (payload): Promise<MessageResponse> => {
    try {
      const { path } = payload;
      const url = browser.runtime.getURL(path);
      return { success: true, data: url };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['runtime.getPlatformInfo', async (): Promise<MessageResponse> => {
    try {
      const info = await browser.runtime.getPlatformInfo();
      return { success: true, data: info };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['runtime.openOptionsPage', async (): Promise<MessageResponse> => {
    try {
      await browser.runtime.openOptionsPage();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['runtime.reload', async (): Promise<MessageResponse> => {
    try {
      browser.runtime.reload();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);

browser.runtime.onInstalled.addListener(async (details) => {
  // Don't try to send messages during installation - no listeners exist yet
  console.log('Extension installed/updated:', details);
  
  // Set icon based on lock state
  await initializeIconState();
});

browser.runtime.onStartup.addListener(async () => {
  // Set icon based on lock state when browser starts
  await initializeIconState();
});

browser.runtime.onUpdateAvailable.addListener((details) => {
  // Don't try to send messages - store update info if needed
  console.log('Extension update available:', details);
});

async function initializeIconState() {
  try {
    const settings = await getSettings();
    
    // Clear badge text
    await setBadgeText('');
    
    // Set icon based on lock state
    if (!settings || settings.isLocked || !settings.init) {
      await setIconLock();
    } else {
      await setIconUnlock();
    }
  } catch (error) {
    console.error('Failed to initialize icon state:', error);
  }
}