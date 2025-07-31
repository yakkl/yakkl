import { log } from '$lib/common/logger-wrapper';
import { safeBackgroundSendMessage } from './safeBackgroundSendMessage';

export async function safeBackgroundSendMessageWithRetry<T = any>(
  message: any,
  timeoutMs = 5000,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T | null> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await safeBackgroundSendMessage<T>(message, timeoutMs);
      
      if (response !== null) {
        return response;
      }
      
      // If null, might be due to extension not ready, wait before retry
      if (attempt < maxRetries - 1) {
        log.debug(`Retrying message, attempt ${attempt + 1}/${maxRetries}`, false, { 
          message: message.type 
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      lastError = error;
      log.debug(`Message attempt ${attempt + 1} failed`, false, { 
        message: message.type,
        error 
      });
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  log.warn('All retry attempts failed', false, { 
    message: message.type,
    attempts: maxRetries,
    lastError 
  });
  
  return null;
}