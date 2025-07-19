import { browser } from '$app/environment';
import { safeClientSendMessage } from '$lib/common/safeClientSendMessage';
import type { ServiceResponse, ErrorState } from '../types';

export abstract class BaseService {
  protected serviceName: string;
  protected port?: any;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    console.log(`[BaseService] ${serviceName} initialized`);
  }

  protected async sendMessage<T>(message: any): Promise<ServiceResponse<T>> {
    console.log(`[BaseService.${this.serviceName}] Sending message:`, {
      messageType: message.type,
      messageId: message.id,
      hasPayload: !!message.payload
    });
    
    try {
      if (!browser) {
        console.error(`[BaseService.${this.serviceName}] Not in browser environment`);
        return {
          success: false,
          error: { hasError: true, message: 'Not in browser environment' }
        };
      }

      const response = await safeClientSendMessage(message);
      
      console.log(`[BaseService.${this.serviceName}] Received response:`, {
        response,
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : []
      });
      
      // Handle error response
      if (response.error || !response.success) {
        console.error(`[BaseService.${this.serviceName}] Error response:`, JSON.stringify(response, null, 2));
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
      console.error(`[BaseService.${this.serviceName}] Caught exception:`, {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
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