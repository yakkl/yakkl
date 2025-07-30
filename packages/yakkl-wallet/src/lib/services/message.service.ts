import { BaseService } from './base.service';
import type { ServiceResponse } from '../types';

class MessageService extends BaseService {
  private static instance: MessageService;

  private constructor() {
    super('MessageService');
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  async send<T = any>(message: any): Promise<ServiceResponse<T>> {
    return this.sendMessage<T>(message);
  }
}

export const messageService = MessageService.getInstance();

// Convenience function for sending messages to background
export async function sendToBackground<T = any>(message: any): Promise<ServiceResponse<T>> {
  return messageService.send<T>(message);
}