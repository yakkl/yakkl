import { browser } from '$app/environment';
// Mock safeClientSendMessage for Preview 2.0
const safeClientSendMessage = async (message: any) => {
  // Mock implementation for development
  return { success: false, error: 'Mock implementation' };
};
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
      
      if (response.error) {
        return {
          success: false,
          error: {
            hasError: true,
            message: (response.error as any)?.message || 'Unknown error',
            code: (response.error as any)?.code
          }
        };
      }

      return {
        success: true,
        data: (response as any).result
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