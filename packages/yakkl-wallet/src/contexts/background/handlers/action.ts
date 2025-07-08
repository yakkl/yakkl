import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';
import { sendToExtensionUI } from '$lib/common/safeMessaging';

export const actionHandlers = new Map<string, MessageHandlerFunc>([
  ['action.setBadgeText', async (payload): Promise<MessageResponse> => {
    try {
      await browser.action.setBadgeText(payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.getBadgeText', async (payload): Promise<MessageResponse> => {
    try {
      const text = await browser.action.getBadgeText(payload || {});
      return { success: true, data: text };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.setBadgeBackgroundColor', async (payload): Promise<MessageResponse> => {
    try {
      await browser.action.setBadgeBackgroundColor(payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.getBadgeBackgroundColor', async (payload): Promise<MessageResponse> => {
    try {
      const color = await browser.action.getBadgeBackgroundColor(payload || {});
      return { success: true, data: color };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.setIcon', async (payload): Promise<MessageResponse> => {
    try {
      await browser.action.setIcon(payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.setTitle', async (payload): Promise<MessageResponse> => {
    try {
      await browser.action.setTitle(payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.getTitle', async (payload): Promise<MessageResponse> => {
    try {
      const title = await browser.action.getTitle(payload || {});
      return { success: true, data: title };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.enable', async (payload): Promise<MessageResponse> => {
    try {
      const { tabId } = payload || {};
      await browser.action.enable(tabId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['action.disable', async (payload): Promise<MessageResponse> => {
    try {
      const { tabId } = payload || {};
      await browser.action.disable(tabId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);

browser.action.onClicked.addListener((tab) => {
  sendToExtensionUI({
    type: 'action.clicked',
    response: { success: true, data: { tab } }
  });
});