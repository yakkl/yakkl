import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';

export const alarmsHandlers = new Map<string, MessageHandlerFunc>([
  ['alarms.create', async (payload): Promise<MessageResponse> => {
    try {
      const { name, alarmInfo } = payload;
      await browser.alarms.create(name, alarmInfo);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['alarms.get', async (payload): Promise<MessageResponse> => {
    try {
      const { name } = payload || {};
      const alarm = await browser.alarms.get(name);
      return { success: true, data: alarm };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['alarms.getAll', async (): Promise<MessageResponse> => {
    try {
      const alarms = await browser.alarms.getAll();
      return { success: true, data: alarms };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['alarms.clear', async (payload): Promise<MessageResponse> => {
    try {
      const { name } = payload || {};
      const wasCleared = await browser.alarms.clear(name);
      return { success: true, data: wasCleared };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['alarms.clearAll', async (): Promise<MessageResponse> => {
    try {
      const wasCleared = await browser.alarms.clearAll();
      return { success: true, data: wasCleared };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);

browser.alarms.onAlarm.addListener((alarm) => {
  browser.runtime.sendMessage({
    type: 'alarms.onAlarm',
    response: { success: true, data: alarm }
  });
});