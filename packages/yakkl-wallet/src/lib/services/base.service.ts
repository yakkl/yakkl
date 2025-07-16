import { browser } from '$app/environment';
import { safeClientSendMessage } from '$lib/common/safeClientSendMessage';
import type { ServiceResponse, ErrorState } from '../types';

export abstract class BaseService {
  protected async sendMessage<T>(message: any): Promise<ServiceResponse<T>> {
    try {
      if (!browser) {
        return {
          success: false,
          error: { hasError: true, message: 'Not in browser environment' }
        };
      }

      const response = await safeClientSendMessage(message);
      
      // Handle error response
      if (response.error || !response.success) {
        return {
          success: false,
          error: {
            hasError: true,
            message: response.error || 'Unknown error',
            code: (response as any)?.code
          }
        };
      }

      // MessageHandler returns { success: boolean, data?: T, error?: string }
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          hasError: true,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  protected handleError(error: any): ErrorState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error?.code
    };
  }
}