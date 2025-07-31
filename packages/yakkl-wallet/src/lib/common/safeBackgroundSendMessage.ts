import { log } from '$lib/common/logger-wrapper';
import { browser_ext } from '$lib/common/environment';

export async function safeBackgroundSendMessage<T = any>(
  message: any,
  timeoutMs = 5000
): Promise<T | null> {
  try {
    if (!browser_ext?.runtime?.sendMessage) {
      log.warn('Browser runtime not available for sendMessage');
      return null;
    }

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Message timeout')), timeoutMs);
    });

    // Race between the message and timeout
    const response = await Promise.race([
      browser_ext.runtime.sendMessage(message),
      timeoutPromise
    ]);

    return response as T;
  } catch (error: any) {
    if (error?.message?.includes('Receiving end does not exist')) {
      log.debug('Background script not available', false, { message: message.type });
    } else if (error?.message === 'Message timeout') {
      log.debug('Message timed out', false, { message: message.type, timeoutMs });
    } else {
      log.error('Failed to send message to background', false, error);
    }
    return null;
  }
}
