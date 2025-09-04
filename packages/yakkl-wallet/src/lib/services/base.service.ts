import { browserSvelte } from '$lib/common/environment';
import messagingService from '$lib/common/messaging';
import type { ServiceResponse, ErrorState } from '../types';
import { log } from '$lib/common/logger-wrapper';

export abstract class BaseService {
  protected serviceName: string;
  protected port?: any;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    log.info(`[BaseService] ${serviceName} initialized`);
  }

  protected async sendMessage<T>(message: any): Promise<ServiceResponse<T>> {
    log.info(`[BaseService.${this.serviceName}] Sending message:`, false, {
      messageType: message.type,
      messageId: message.id,
      hasPayload: !!message.payload
    });

    try {
      if (!browserSvelte) {
        log.warn(`[BaseService.${this.serviceName}] Not in browser environment`);
        return {
          success: false,
          error: { hasError: true, message: 'Not in browser environment' }
        };
      }

      // Check if messaging service is initialized
      if (!messagingService.isInitialized()) {
        log.warn(`[BaseService.${this.serviceName}] Messaging service not initialized`);
        return {
          success: false,
          error: {
            hasError: true,
            message: 'Messaging service not initialized',
            code: 'SERVICE_NOT_INITIALIZED'
          }
        };
      }

      log.debug(`[BaseService.${this.serviceName}] Messaging service is initialized, proceeding with request`);

      // Use messaging service instead of safeClientSendMessage
      let response;
      try {
        log.debug(`[BaseService.${this.serviceName}] Sending message:`, false, {
          type: message.type,
          payload: message.payload,
          serviceName: this.serviceName
        });

        response = await messagingService.sendMessage(message.type, message.payload || {}, {
          priority: 'normal',
          retryOnFail: true,
          waitForResponse: true
        });

        log.debug(`[BaseService.${this.serviceName}] Received response:`, false, {
          success: response.success,
          hasData: !!response.data,
          dataLength: response.data?.length,
          responseType: typeof response,
          responseKeys: Object.keys(response)
        });
      } catch (error) {
        log.warn(`[BaseService.${this.serviceName}] Messaging service error:`, false, error);
        return {
          success: false,
          error: {
            hasError: true,
            message: `Messaging service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'MESSAGING_ERROR'
          }
        };
      }

      log.debug(`[BaseService.${this.serviceName}] Received response:`, false, {
        response,
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : []
      });

      // Handle error response
      if (response.error || !response.success) {
        log.warn(`[BaseService.${this.serviceName}] Error response:`, false, JSON.stringify(response, null, 2));
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Convert timeout errors to warnings to keep error logs clean
      if (errorMessage.includes('timed out after')) {
        log.warn(`[BaseService.${this.serviceName}] Request timeout (will retry with longer timeout):`, false, {
          error: errorMessage,
          messageType: message?.type
        });
      } else {
        log.warn(`[BaseService.${this.serviceName}] Caught exception:`, false, {
          error,
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
      }

      return {
        success: false,
        error: {
          hasError: true,
          message: errorMessage
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
