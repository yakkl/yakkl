import { BaseService } from './base.service';
import type { ServiceResponse } from '../types';
import { browser } from '$app/environment';

interface IdleStatusResponse {
  verified: boolean;
  idleStatus: {
    isLockdownInitiated: boolean;
    isLoginVerified: boolean;
    previousState: string;
    threshold: number;
    lockDelay: number;
    lastActivity: number;
    timeSinceLastActivity: number;
    contextCount: number;
    protectedContextCount: number;
  };
}

export class SessionVerificationService extends BaseService {
  private static instance: SessionVerificationService;

  private constructor() {
    super();
  }

  static getInstance(): SessionVerificationService {
    if (!SessionVerificationService.instance) {
      SessionVerificationService.instance = new SessionVerificationService();
    }
    return SessionVerificationService.instance;
  }

  async verifyLogin(verified: boolean): Promise<ServiceResponse<IdleStatusResponse>> {
    if (!browser) {
      return {
        success: false,
        error: { hasError: true, message: 'Not in browser environment' }
      };
    }

    try {
      const response = await this.sendMessage<IdleStatusResponse>({
        type: 'session.verifyLogin',
        payload: { 
          verified,
          contextId: window.location.href // Use URL as context identifier
        }
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getIdleStatus(): Promise<ServiceResponse<any>> {
    if (!browser) {
      return {
        success: false,
        error: { hasError: true, message: 'Not in browser environment' }
      };
    }

    try {
      const response = await this.sendMessage<any>({
        type: 'session.getIdleStatus'
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
}