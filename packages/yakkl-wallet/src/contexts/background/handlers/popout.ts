import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { showPopup } from '$contexts/background/extensions/chrome/ui';
import { log } from '$lib/common/logger-wrapper';

/**
 * Custom popout handlers that use the full authentication flow
 * Created to fix popup window not reopening issue without modifying existing code
 */

export const popoutHandlers = new Map<string, MessageHandlerFunc>([
  // This handler uses the showPopup function from ui.ts which includes authentication checks
  ['popout_with_auth', async (payload): Promise<MessageResponse> => {
    try {
      log.info('popout_with_auth handler called', false, payload);
      
      // Use the showPopup function that handles authentication checks
      await showPopup('', '0');
      
      log.info('popout_with_auth handler completed successfully');
      return { success: true };
    } catch (error) {
      log.error('Failed to open popup window with auth:', false, error);
      return { success: false, error: (error as Error).message };
    }
  }]
]);

/**
 * Helper function to handle popout messages with proper authentication
 * This can be called from the existing popout handler to maintain compatibility
 */
export async function handlePopoutWithAuth(): Promise<void> {
  try {
    await showPopup('', '0');
  } catch (error) {
    log.error('handlePopoutWithAuth failed:', false, error);
    throw error;
  }
}