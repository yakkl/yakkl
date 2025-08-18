import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';

export const sidePanelHandlers = new Map<string, MessageHandlerFunc>([
  ['sidePanel.open', async (payload): Promise<MessageResponse> => {
    try {
      if ('sidePanel' in chrome && chrome.sidePanel) {
        await chrome.sidePanel.open(payload || {});
        return { success: true };
      } else {
        return { success: false, error: 'Side panel API not available' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['sidePanel.setOptions', async (payload): Promise<MessageResponse> => {
    try {
      if ('sidePanel' in chrome && chrome.sidePanel) {
        await chrome.sidePanel.setOptions(payload);
        return { success: true };
      } else {
        return { success: false, error: 'Side panel API not available' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['sidePanel.setPanelBehavior', async (payload): Promise<MessageResponse> => {
    try {
      if ('sidePanel' in chrome && chrome.sidePanel && 'setPanelBehavior' in chrome.sidePanel) {
        await chrome.sidePanel.setPanelBehavior(payload);
        return { success: true };
      } else {
        return { success: false, error: 'Side panel behavior API not available' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['sidePanel.getOptions', async (payload): Promise<MessageResponse> => {
    try {
      if ('sidePanel' in chrome && chrome.sidePanel && 'getOptions' in chrome.sidePanel) {
        const options = await (chrome.sidePanel as any).getOptions();
        return { success: true, data: options };
      } else {
        return { success: false, error: 'Side panel options API not available' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['sidePanel.getPanelBehavior', async (): Promise<MessageResponse> => {
    try {
      if ('sidePanel' in chrome && chrome.sidePanel && 'getPanelBehavior' in chrome.sidePanel) {
        const behavior = await (chrome.sidePanel as any).getPanelBehavior();
        return { success: true, data: behavior };
      } else {
        return { success: false, error: 'Side panel behavior API not available' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);
